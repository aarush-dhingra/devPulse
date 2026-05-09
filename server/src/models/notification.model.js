"use strict";

const db = require("../config/db");

/**
 * Create a notification.
 * Skips if actor === target (no self-notifications).
 */
async function create({ userId, actorId, type, postId = null }) {
  if (userId === actorId) return null;
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, actor_id, type, post_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [userId, actorId, type, postId]
  );
  return rows[0];
}

/**
 * List notifications for a user with actor info and post preview.
 */
async function listForUser(userId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT
       n.id,
       n.type,
       n.is_read,
       n.created_at,
       n.post_id,
       json_build_object(
         'id',         a.id,
         'username',   a.username,
         'name',       a.name,
         'avatar_url', a.avatar_url
       ) AS actor,
       CASE WHEN n.post_id IS NOT NULL
         THEN json_build_object(
           'id',              p.id,
           'content_preview', LEFT(p.content, 80)
         )
         ELSE NULL
       END AS post
     FROM notifications n
     JOIN users a ON a.id = n.actor_id
     LEFT JOIN community_posts p ON p.id = n.post_id
     WHERE n.user_id = $1
     ORDER BY n.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return rows;
}

/**
 * Mark all unread notifications as read for the user.
 */
async function markAllRead(userId) {
  await db.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}

/**
 * Mark a single notification as read.
 */
async function markOneRead(notifId, userId) {
  const { rows } = await db.query(
    `UPDATE notifications SET is_read = TRUE
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [notifId, userId]
  );
  return rows[0] ?? null;
}

/**
 * Return the count of unread notifications for a user.
 */
async function unreadCount(userId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::INT AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rows[0].count;
}

module.exports = { create, listForUser, markAllRead, markOneRead, unreadCount };
