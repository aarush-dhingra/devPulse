"use strict";

const { z } = require("zod");
const userModel = require("../models/user.model");
const db = require("../config/db");

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  metric: z
    .enum(["devscore", "github", "leetcode", "codeforces", "wakatime", "codechef", "atcoder"])
    .default("devscore"),
});

async function getLeaderboard(req, res, next) {
  try {
    const { limit, offset, metric } = querySchema.parse(req.query);

    if (metric === "devscore") {
      const rows = await userModel.listTopByDevScore({ limit, offset });
      const { rows: countRows } = await db.query(
        `SELECT COUNT(*)::int AS total FROM users WHERE is_public = TRUE`
      );
      return res.json({
        metric,
        limit,
        offset,
        total: countRows[0].total,
        results: rows,
      });
    }

    // platform-specific leaderboards: rank by latest snapshot value
    const platformMetric = metric;
    const { rows } = await db.query(
      `
      WITH latest AS (
        SELECT DISTINCT ON (user_id) user_id, raw_data, created_at
        FROM stats_snapshots
        WHERE platform = $1
        ORDER BY user_id, created_at DESC
      )
      SELECT u.id, u.username, u.name, u.avatar_url, u.devscore,
             l.raw_data
      FROM latest l
      JOIN users u ON u.id = l.user_id
      WHERE u.is_public = TRUE
      ORDER BY u.devscore DESC
      LIMIT $2 OFFSET $3
      `,
      [platformMetric, limit, offset]
    );

    res.json({
      metric,
      limit,
      offset,
      total: rows.length,
      results: rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLeaderboard };
