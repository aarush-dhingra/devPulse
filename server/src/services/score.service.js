"use strict";

const db = require("../config/db");
const { computeDevScore } = require("../utils/devScore");
const userModel = require("../models/user.model");
const statsModel = require("../models/stats.model");

async function recomputeForUser(userId) {
  const stats = await statsModel.getLatestForUser(userId);
  const result = computeDevScore(stats);
  await userModel.updateDevScore(userId, result.score);
  return result;
}

async function percentileFor(userId) {
  const { rows } = await db.query(
    `
    WITH me AS (SELECT devscore FROM users WHERE id = $1)
    SELECT
      (SELECT COUNT(*) FROM users WHERE is_public = TRUE) AS total,
      (SELECT COUNT(*) FROM users WHERE is_public = TRUE
        AND devscore <= (SELECT devscore FROM me)) AS rank
    `,
    [userId]
  );
  const total = Number(rows[0]?.total || 0);
  const rank = Number(rows[0]?.rank || 0);
  if (!total) return 0;
  return Math.round((rank / total) * 100);
}

module.exports = { recomputeForUser, percentileFor };
