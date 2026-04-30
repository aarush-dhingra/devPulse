"use strict";

const db = require("../config/db");

const FIELDS = `
  id, user_id, platform_name, platform_username, status,
  last_synced, last_error, created_at, updated_at
`;

async function listForUser(userId) {
  const { rows } = await db.query(
    `SELECT ${FIELDS} FROM platforms WHERE user_id = $1 ORDER BY platform_name`,
    [userId]
  );
  return rows;
}

async function findOne(userId, platformName) {
  const { rows } = await db.query(
    `SELECT ${FIELDS}, api_key
     FROM platforms WHERE user_id = $1 AND platform_name = $2`,
    [userId, platformName]
  );
  return rows[0] || null;
}

async function upsertPlatform({
  userId,
  platformName,
  platformUsername,
  apiKey = null,
  status = "pending",
}) {
  const { rows } = await db.query(
    `
    INSERT INTO platforms (user_id, platform_name, platform_username, api_key, status)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, platform_name) DO UPDATE SET
      platform_username = EXCLUDED.platform_username,
      api_key           = COALESCE(EXCLUDED.api_key, platforms.api_key),
      status            = EXCLUDED.status,
      last_error        = NULL,
      updated_at        = NOW()
    RETURNING ${FIELDS}
    `,
    [userId, platformName, platformUsername, apiKey, status]
  );
  return rows[0];
}

async function updateStatus(userId, platformName, status, lastError = null) {
  const { rows } = await db.query(
    `UPDATE platforms
     SET status = $1, last_error = $2, last_synced = CASE WHEN $1 = 'connected' THEN NOW() ELSE last_synced END,
         updated_at = NOW()
     WHERE user_id = $3 AND platform_name = $4
     RETURNING ${FIELDS}`,
    [status, lastError, userId, platformName]
  );
  return rows[0] || null;
}

async function deletePlatform(userId, platformName) {
  const { rowCount } = await db.query(
    `DELETE FROM platforms WHERE user_id = $1 AND platform_name = $2`,
    [userId, platformName]
  );
  return rowCount > 0;
}

module.exports = {
  listForUser,
  findOne,
  upsertPlatform,
  updateStatus,
  deletePlatform,
};
