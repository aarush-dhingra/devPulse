"use strict";

const db = require("../config/db");

async function listFeed({ limit = 30, offset = 0, viewerId = null } = {}) {
  const { rows } = await db.query(
    `
    SELECT
      p.id, p.content, p.likes, p.created_at,
      u.id AS user_id, u.username, u.name, u.avatar_url, u.devscore,
      (SELECT COUNT(*)::int FROM community_replies r WHERE r.post_id = p.id) AS reply_count,
      ${
        viewerId
          ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3)`
          : `FALSE`
      } AS liked_by_me
    FROM community_posts p
    JOIN users u ON u.id = p.user_id
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
    `,
    viewerId ? [limit, offset, viewerId] : [limit, offset]
  );
  return rows;
}

async function create({ userId, content }) {
  const { rows } = await db.query(
    `INSERT INTO community_posts (user_id, content) VALUES ($1, $2)
     RETURNING id, content, likes, created_at`,
    [userId, content]
  );
  return rows[0];
}

async function deleteOwn({ userId, postId }) {
  const { rowCount } = await db.query(
    `DELETE FROM community_posts WHERE id = $1 AND user_id = $2`,
    [postId, userId]
  );
  return rowCount > 0;
}

async function toggleLike({ userId, postId }) {
  const { rows: existing } = await db.query(
    `SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
  );
  if (existing.length) {
    await db.query(
      `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );
    await db.query(
      `UPDATE community_posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1`,
      [postId]
    );
    return { liked: false };
  }
  await db.query(
    `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`,
    [postId, userId]
  );
  await db.query(
    `UPDATE community_posts SET likes = likes + 1 WHERE id = $1`,
    [postId]
  );
  return { liked: true };
}

async function listReplies(postId) {
  const { rows } = await db.query(
    `
    SELECT r.id, r.content, r.created_at,
           u.id AS user_id, u.username, u.name, u.avatar_url
    FROM community_replies r
    JOIN users u ON u.id = r.user_id
    WHERE r.post_id = $1
    ORDER BY r.created_at ASC
    `,
    [postId]
  );
  return rows;
}

async function addReply({ postId, userId, content }) {
  const { rows } = await db.query(
    `INSERT INTO community_replies (post_id, user_id, content)
     VALUES ($1, $2, $3) RETURNING id, content, created_at`,
    [postId, userId, content]
  );
  return rows[0];
}

module.exports = {
  listFeed,
  create,
  deleteOwn,
  toggleLike,
  listReplies,
  addReply,
};
