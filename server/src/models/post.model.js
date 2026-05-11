"use strict";

const db = require("../config/db");

// ---------------------------------------------------------------------------
// Feed queries
// ---------------------------------------------------------------------------

/**
 * Cursor-based paginated feed.
 * feed = "all" | "following"
 * cursor = ISO timestamp (returns posts older than cursor)
 */
async function listFeed({ limit = 20, cursor = null, feed = "all", viewerId = null } = {}) {
  const likedExpr = viewerId
    ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $${cursor ? 4 : 3})`
    : `FALSE`;

  const bookmarkedExpr = viewerId
    ? `EXISTS(SELECT 1 FROM bookmarks bm WHERE bm.post_id = p.id AND bm.user_id = $${cursor ? 4 : 3})`
    : `FALSE`;

  let whereClause = "";
  const params = [];

  if (feed === "following" && viewerId) {
    whereClause = `WHERE p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = $1
    ) OR p.user_id = $1`;
    params.push(viewerId);
  }

  if (cursor) {
    const nextParam = `$${params.length + 1}`;
    whereClause = whereClause
      ? `${whereClause} AND p.created_at < ${nextParam}`
      : `WHERE p.created_at < ${nextParam}`;
    params.push(cursor);
  }

  const limitParam = `$${params.length + 1}`;
  params.push(limit);

  if (viewerId) params.push(viewerId);

  const { rows } = await db.query(
    `SELECT
       p.id, p.content, p.likes, p.created_at, p.media_urls, p.edited_at, p.reply_count,
       u.id AS user_id, u.username, u.name, u.avatar_url, u.devscore,
       ${likedExpr} AS liked_by_me,
       ${bookmarkedExpr} AS bookmarked_by_me
     FROM community_posts p
     JOIN users u ON u.id = p.user_id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT ${limitParam}`,
    params
  );
  return rows;
}

async function create({ userId, content, mediaUrls = [] }) {
  const { rows } = await db.query(
    `INSERT INTO community_posts (user_id, content, media_urls)
     VALUES ($1, $2, $3)
     RETURNING id, content, likes, created_at, media_urls, reply_count`,
    [userId, content, mediaUrls]
  );
  return rows[0];
}

async function findById(postId, viewerId = null) {
  const likedExpr = viewerId
    ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2)`
    : `FALSE`;
  const bookmarkedExpr = viewerId
    ? `EXISTS(SELECT 1 FROM bookmarks bm WHERE bm.post_id = p.id AND bm.user_id = $2)`
    : `FALSE`;

  const params = viewerId ? [postId, viewerId] : [postId];

  const { rows } = await db.query(
    `SELECT
       p.id, p.content, p.likes, p.created_at, p.media_urls, p.edited_at, p.reply_count,
       u.id AS user_id, u.username, u.name, u.avatar_url, u.devscore,
       ${likedExpr} AS liked_by_me,
       ${bookmarkedExpr} AS bookmarked_by_me
     FROM community_posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    params
  );
  return rows[0] ?? null;
}

async function editOwn({ postId, userId, content, mediaUrls }) {
  const sets = [];
  const params = [];
  let i = 1;

  if (content !== undefined) { sets.push(`content = $${i++}`); params.push(content); }
  if (mediaUrls !== undefined) { sets.push(`media_urls = $${i++}`); params.push(mediaUrls); }
  sets.push(`edited_at = NOW()`);

  if (!sets.length) return null;

  params.push(postId, userId);
  const { rows } = await db.query(
    `UPDATE community_posts SET ${sets.join(", ")}
     WHERE id = $${i} AND user_id = $${i + 1}
     RETURNING id, content, media_urls, edited_at`,
    params
  );
  return rows[0] ?? null;
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
    await db.query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    const { rows } = await db.query(
      `UPDATE community_posts SET likes = GREATEST(likes - 1, 0) WHERE id = $1 RETURNING likes`,
      [postId]
    );
    return { liked: false, likes: rows[0]?.likes ?? 0 };
  }
  await db.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
  const { rows } = await db.query(
    `UPDATE community_posts SET likes = likes + 1 WHERE id = $1 RETURNING likes`,
    [postId]
  );
  return { liked: true, likes: rows[0]?.likes ?? 0 };
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

async function toggleBookmark({ userId, postId }) {
  const { rows: existing } = await db.query(
    `SELECT 1 FROM bookmarks WHERE post_id = $1 AND user_id = $2`,
    [postId, userId]
  );
  if (existing.length) {
    await db.query(`DELETE FROM bookmarks WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
    return { bookmarked: false };
  }
  await db.query(`INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2)`, [userId, postId]);
  return { bookmarked: true };
}

async function listBookmarks(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT
       p.id, p.content, p.likes, p.created_at, p.media_urls, p.edited_at, p.reply_count,
       u.id AS user_id, u.username, u.name, u.avatar_url, u.devscore,
       TRUE AS bookmarked_by_me,
       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) AS liked_by_me
     FROM bookmarks bm
     JOIN community_posts p ON p.id = bm.post_id
     JOIN users u ON u.id = p.user_id
     WHERE bm.user_id = $1
     ORDER BY bm.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

async function listReplies(postId, { limit = 50, cursor = null } = {}) {
  const params = [postId];
  let cursorClause = "";
  if (cursor) {
    params.push(cursor);
    cursorClause = `AND r.created_at > $2`;
  }
  params.push(limit);

  const { rows } = await db.query(
    `SELECT
       r.id, r.content, r.created_at, r.parent_id, r.likes,
       u.id AS user_id, u.username, u.name, u.avatar_url
     FROM community_replies r
     JOIN users u ON u.id = r.user_id
     WHERE r.post_id = $1 ${cursorClause}
     ORDER BY r.created_at ASC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

async function addReply({ postId, userId, content, parentId = null }) {
  const { rows } = await db.query(
    `INSERT INTO community_replies (post_id, user_id, content, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, content, created_at, parent_id`,
    [postId, userId, content, parentId]
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// User posts feed
// ---------------------------------------------------------------------------

async function listByUser(username, { limit = 20, offset = 0, viewerId = null } = {}) {
  const likedExpr = viewerId
    ? `EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $3)`
    : `FALSE`;
  const bookmarkedExpr = viewerId
    ? `EXISTS(SELECT 1 FROM bookmarks bm WHERE bm.post_id = p.id AND bm.user_id = $3)`
    : `FALSE`;

  const params = viewerId ? [username, limit, viewerId, offset] : [username, limit, offset];

  const { rows } = await db.query(
    `SELECT
       p.id, p.content, p.likes, p.created_at, p.media_urls, p.edited_at, p.reply_count,
       u.id AS user_id, u.username, u.name, u.avatar_url, u.devscore,
       ${likedExpr} AS liked_by_me,
       ${bookmarkedExpr} AS bookmarked_by_me
     FROM community_posts p
     JOIN users u ON u.id = p.user_id
     WHERE u.username = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $${viewerId ? 4 : 3}`,
    params
  );
  return rows;
}

module.exports = {
  listFeed,
  create,
  findById,
  editOwn,
  deleteOwn,
  toggleLike,
  toggleBookmark,
  listBookmarks,
  listReplies,
  addReply,
  listByUser,
};
