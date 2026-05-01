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

async function getHistory(userId, platform, limit = 60) {
  const { rows } = await db.query(
    `
    SELECT raw_data, created_at
    FROM (
      SELECT raw_data, created_at
      FROM stats_snapshots
      WHERE user_id = $1 AND platform = $2
      ORDER BY created_at DESC
      LIMIT $3
    ) recent
    ORDER BY created_at ASC
    `,
    [userId, platform, limit]
  );
  return rows;
}

async function getMultiPlatformHistory(userId, platforms, limit = 60) {
  const { rows } = await db.query(
    `
    WITH ranked AS (
      SELECT
        platform,
        raw_data,
        created_at,
        ROW_NUMBER() OVER (
          PARTITION BY platform ORDER BY created_at DESC
        ) AS rn
      FROM stats_snapshots
      WHERE user_id = $1 AND platform = ANY($2::text[])
    )
    SELECT platform, raw_data, created_at
    FROM ranked
    WHERE rn <= $3
    ORDER BY platform, created_at ASC
    `,
    [userId, platforms, limit]
  );
  const grouped = {};
  for (const p of platforms) grouped[p] = [];
  for (const r of rows) {
    if (!grouped[r.platform]) grouped[r.platform] = [];
    grouped[r.platform].push(r);
  }
  return grouped;
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
  getHistory,
  getMultiPlatformHistory,
  pruneOld,
};
