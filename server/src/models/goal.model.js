"use strict";

const db = require("../config/db");
const statsModel = require("./stats.model");

const FIELDS = `id, user_id, title, kind, target, baseline, deadline, completed_at, created_at`;

const VALID_KINDS = [
  "leetcode_solves",
  "github_commits",
  "wakatime_hours",
  "streak",
  "custom",
];

async function listForUser(userId) {
  const { rows } = await db.query(
    `SELECT ${FIELDS} FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function findById(id, userId) {
  const { rows } = await db.query(
    `SELECT ${FIELDS} FROM goals WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] || null;
}

async function create({ userId, title, kind, target, deadline = null }) {
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`Invalid goal kind: ${kind}`);
  }
  const baseline = await currentValueFor(userId, kind);
  const { rows } = await db.query(
    `INSERT INTO goals (user_id, title, kind, target, baseline, deadline)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${FIELDS}`,
    [userId, title, kind, target, baseline, deadline]
  );
  return rows[0];
}

async function update({ userId, id, title, target, deadline }) {
  const { rows } = await db.query(
    `UPDATE goals
       SET title = COALESCE($1, title),
           target = COALESCE($2, target),
           deadline = COALESCE($3, deadline)
     WHERE id = $4 AND user_id = $5
     RETURNING ${FIELDS}`,
    [title ?? null, target ?? null, deadline ?? null, id, userId]
  );
  return rows[0] || null;
}

async function remove({ userId, id }) {
  const { rowCount } = await db.query(
    `DELETE FROM goals WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rowCount > 0;
}

async function markCompleted({ userId, id }) {
  await db.query(
    `UPDATE goals SET completed_at = NOW()
     WHERE id = $1 AND user_id = $2 AND completed_at IS NULL`,
    [id, userId]
  );
}

/**
 * Derives the user's current "value" for a given goal kind from the latest
 * stats snapshot. Used both at goal creation (baseline) and on each fetch
 * so progress is always live.
 */
async function currentValueFor(userId, kind) {
  const stats = await statsModel.getLatestForUser(userId);
  switch (kind) {
    case "leetcode_solves":
      return Number(stats.leetcode?.solved?.total ?? 0);
    case "github_commits":
      return Number(
        stats.github?.contributions?.total ??
          stats.github?.commits?.totalSearched ??
          0
      );
    case "wakatime_hours":
      return Math.round(Number(stats.wakatime?.hoursLast30Days ?? 0));
    case "streak":
      return Math.max(
        Number(stats.github?.contributions?.streakCurrent ?? 0),
        Number(stats.gfg?.streak ?? 0)
      );
    case "custom":
    default:
      return 0;
  }
}

/**
 * Returns goals for a user with computed `current` and `progress` (0..1) based
 * on the delta from baseline. Auto-stamps completed_at on first crossing.
 */
async function listWithProgress(userId) {
  const goals = await listForUser(userId);
  if (!goals.length) return goals;

  const stats = await statsModel.getLatestForUser(userId);
  const cache = {};
  const valueFor = (kind) => {
    if (cache[kind] != null) return cache[kind];
    switch (kind) {
      case "leetcode_solves":
        cache[kind] = Number(stats.leetcode?.solved?.total ?? 0);
        break;
      case "github_commits":
        cache[kind] = Number(
          stats.github?.contributions?.total ??
            stats.github?.commits?.totalSearched ??
            0
        );
        break;
      case "wakatime_hours":
        cache[kind] = Math.round(Number(stats.wakatime?.hoursLast30Days ?? 0));
        break;
      case "streak":
        cache[kind] = Math.max(
          Number(stats.github?.contributions?.streakCurrent ?? 0),
          Number(stats.gfg?.streak ?? 0)
        );
        break;
      default:
        cache[kind] = 0;
    }
    return cache[kind];
  };

  const out = [];
  for (const g of goals) {
    const cur = valueFor(g.kind);
    const delta = Math.max(0, cur - Number(g.baseline ?? 0));
    const progress = Math.max(0, Math.min(1, delta / Number(g.target)));
    if (progress >= 1 && !g.completed_at) {
      await markCompleted({ userId, id: g.id });
      g.completed_at = new Date().toISOString();
    }
    out.push({ ...g, current: cur, delta, progress });
  }
  return out;
}

module.exports = {
  VALID_KINDS,
  listForUser,
  listWithProgress,
  findById,
  create,
  update,
  remove,
  currentValueFor,
};
