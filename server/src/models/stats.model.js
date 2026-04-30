"use strict";

const db = require("../config/db");

async function saveSnapshot({ userId, platform, rawData }) {
  const { rows } = await db.query(
    `INSERT INTO stats_snapshots (user_id, platform, raw_data)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, user_id, platform, raw_data, snapshot_date, created_at`,
    [userId, platform, JSON.stringify(rawData)]
  );
  return rows[0];
}

async function getLatestForUser(userId) {
  const { rows } = await db.query(
    `
    SELECT DISTINCT ON (platform) platform, raw_data, created_at
    FROM stats_snapshots
    WHERE user_id = $1
    ORDER BY platform, created_at DESC
    `,
    [userId]
  );
  const out = {};
  for (const r of rows) out[r.platform] = { ...r.raw_data, _ts: r.created_at };
  return out;
}

async function getLatestForPlatform(userId, platform) {
  const { rows } = await db.query(
    `SELECT raw_data, created_at FROM stats_snapshots
     WHERE user_id = $1 AND platform = $2
     ORDER BY created_at DESC LIMIT 1`,
    [userId, platform]
  );
  if (!rows[0]) return null;
  return { ...rows[0].raw_data, _ts: rows[0].created_at };
}

async function pruneOld({ keepPerPlatform = 30 } = {}) {
  // Keeps the latest N snapshots per (user, platform).
  await db.query(
    `
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY user_id, platform ORDER BY created_at DESC
      ) AS rn
      FROM stats_snapshots
    )
    DELETE FROM stats_snapshots WHERE id IN (
      SELECT id FROM ranked WHERE rn > $1
    )
    `,
    [keepPerPlatform]
  );
}

module.exports = {
  saveSnapshot,
  getLatestForUser,
  getLatestForPlatform,
  pruneOld,
};
