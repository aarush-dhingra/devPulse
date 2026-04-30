"use strict";

const db = require("../config/db");

async function follow(followerId, followingId) {
  const { rows } = await db.query(
    `INSERT INTO follows (follower_id, following_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [followerId, followingId]
  );
  return rows.length > 0;
}

async function unfollow(followerId, followingId) {
  const { rowCount } = await db.query(
    `DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId]
  );
  return rowCount > 0;
}

async function isFollowing(followerId, followingId) {
  const { rows } = await db.query(
    `SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2 LIMIT 1`,
    [followerId, followingId]
  );
  return rows.length > 0;
}

async function listFollowers(userId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await db.query(
    `
    SELECT u.id, u.username, u.name, u.avatar_url, u.devscore
    FROM follows f
    JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = $1
    ORDER BY f.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );
  return rows;
}

async function listFollowing(userId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await db.query(
    `
    SELECT u.id, u.username, u.name, u.avatar_url, u.devscore
    FROM follows f
    JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = $1
    ORDER BY f.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );
  return rows;
}

async function getFeed(userId, { limit = 30, offset = 0 } = {}) {
  const { rows } = await db.query(
    `
    SELECT a.id, a.user_id, a.platform, a.event_type, a.event_data, a.created_at,
           u.username, u.name, u.avatar_url
    FROM activity_events a
    JOIN follows f ON f.following_id = a.user_id
    JOIN users u ON u.id = a.user_id
    WHERE f.follower_id = $1
    ORDER BY a.created_at DESC
    LIMIT $2 OFFSET $3
    `,
    [userId, limit, offset]
  );
  return rows;
}

async function recordEvent({ userId, platform, eventType, data = {} }) {
  await db.query(
    `INSERT INTO activity_events (user_id, platform, event_type, event_data)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [userId, platform, eventType, JSON.stringify(data)]
  );
}

module.exports = {
  follow,
  unfollow,
  isFollowing,
  listFollowers,
  listFollowing,
  getFeed,
  recordEvent,
};
