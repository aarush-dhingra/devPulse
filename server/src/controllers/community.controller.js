"use strict";

const { z } = require("zod");
const db = require("../config/db");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const postModel = require("../models/post.model");
const notifModel = require("../models/notification.model");
const { HttpError } = require("../middlewares/error.middleware");

const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
  media_urls: z.array(z.string().url()).max(4).optional().default([]),
});

const editPostSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  media_urls: z.array(z.string().url()).max(4).optional(),
});

const replySchema = z.object({
  content: z.string().min(1).max(500),
  parent_id: z.string().uuid().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Follow / Unfollow
// ---------------------------------------------------------------------------

async function follow(req, res, next) {
  try {
    const target = await userModel.findByUsername(req.params.username);
    if (!target) throw new HttpError(404, "User not found");
    if (target.id === req.user.id) throw new HttpError(400, "Cannot follow yourself");
    const created = await followModel.follow(req.user.id, target.id);
    if (created) {
      await notifModel.create({ userId: target.id, actorId: req.user.id, type: "follow" });
    }
    res.json({ ok: true, created });
  } catch (err) {
    next(err);
  }
}

async function unfollow(req, res, next) {
  try {
    const target = await userModel.findByUsername(req.params.username);
    if (!target) throw new HttpError(404, "User not found");
    const removed = await followModel.unfollow(req.user.id, target.id);
    res.json({ ok: true, removed });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Activity feed (legacy)
// ---------------------------------------------------------------------------

async function getFeed(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const events = await followModel.getFeed(req.user.id, { limit, offset });
    res.json({ events, limit, offset });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Followers / Following
// ---------------------------------------------------------------------------

async function getFollowers(req, res, next) {
  try {
    const target = await userModel.findByUsername(req.params.username);
    if (!target) throw new HttpError(404, "User not found");
    const followers = await followModel.listFollowers(target.id);
    res.json({ followers });
  } catch (err) {
    next(err);
  }
}

async function getFollowing(req, res, next) {
  try {
    const target = await userModel.findByUsername(req.params.username);
    if (!target) throw new HttpError(404, "User not found");
    const following = await followModel.listFollowing(target.id);
    res.json({ following });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Posts feed
// ---------------------------------------------------------------------------

async function listPosts(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const cursor = req.query.cursor || null;
    const feed = req.query.feed === "following" ? "following" : "all";
    const posts = await postModel.listFeed({
      limit,
      cursor,
      feed,
      viewerId: req.user?.id || null,
    });
    const nextCursor = posts.length === limit ? posts[posts.length - 1].created_at : null;
    res.json({ posts, nextCursor });
  } catch (err) {
    next(err);
  }
}

async function getPost(req, res, next) {
  try {
    const post = await postModel.findById(req.params.id, req.user?.id || null);
    if (!post) throw new HttpError(404, "Post not found");
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const { content, media_urls } = createPostSchema.parse(req.body);
    const post = await postModel.create({ userId: req.user.id, content, mediaUrls: media_urls });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

async function editPost(req, res, next) {
  try {
    const parsed = editPostSchema.parse(req.body);
    const updated = await postModel.editOwn({
      postId: req.params.id,
      userId: req.user.id,
      content: parsed.content,
      mediaUrls: parsed.media_urls,
    });
    if (!updated) throw new HttpError(404, "Post not found or not yours");
    res.json({ post: updated });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    const ok = await postModel.deleteOwn({ userId: req.user.id, postId: req.params.id });
    if (!ok) throw new HttpError(404, "Post not found");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Likes
// ---------------------------------------------------------------------------

async function toggleLike(req, res, next) {
  try {
    const result = await postModel.toggleLike({ userId: req.user.id, postId: req.params.id });

    if (result.liked) {
      const post = await postModel.findById(req.params.id);
      if (post && post.user_id !== req.user.id) {
        await notifModel.create({
          userId: post.user_id,
          actorId: req.user.id,
          type: "like",
          postId: req.params.id,
        });
      }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Bookmarks
// ---------------------------------------------------------------------------

async function toggleBookmark(req, res, next) {
  try {
    const result = await postModel.toggleBookmark({ userId: req.user.id, postId: req.params.id });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listBookmarks(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = parseInt(req.query.offset, 10) || 0;
    const posts = await postModel.listBookmarks(req.user.id, { limit, offset });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Replies
// ---------------------------------------------------------------------------

async function listReplies(req, res, next) {
  try {
    const cursor = req.query.cursor || null;
    const replies = await postModel.listReplies(req.params.id, { cursor });
    res.json({ replies });
  } catch (err) {
    next(err);
  }
}

async function createReply(req, res, next) {
  try {
    const { content, parent_id } = replySchema.parse(req.body);
    const reply = await postModel.addReply({
      postId: req.params.id,
      userId: req.user.id,
      content,
      parentId: parent_id || null,
    });

    const post = await postModel.findById(req.params.id);
    if (post && post.user_id !== req.user.id) {
      await notifModel.create({
        userId: post.user_id,
        actorId: req.user.id,
        type: "comment",
        postId: req.params.id,
      });
    }

    res.status(201).json({ reply });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// User posts
// ---------------------------------------------------------------------------

async function getUserPosts(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const offset = parseInt(req.query.offset, 10) || 0;
    const posts = await postModel.listByUser(req.params.username, {
      limit,
      offset,
      viewerId: req.user?.id || null,
    });
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// User search & suggestions
// ---------------------------------------------------------------------------

async function searchUsers(req, res, next) {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) return res.json({ users: [] });

    const { rows } = await db.query(
      `SELECT u.id, u.username, u.name, u.avatar_url, u.devscore,
              (SELECT COUNT(*)::INT FROM follows WHERE following_id = u.id) AS followers_count,
              ${req.user ? `EXISTS(SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = u.id)` : `FALSE`} AS is_following_me
       FROM users u
       WHERE u.is_public = TRUE
         AND (LOWER(u.username) LIKE LOWER($1) OR LOWER(u.name) LIKE LOWER($1))
       ORDER BY u.devscore DESC
       LIMIT 20`,
      req.user ? [`%${q}%`, req.user.id] : [`%${q}%`]
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
}

async function suggestedPeople(req, res, next) {
  try {
    const viewerId = req.user?.id;
    const { rows } = await db.query(
      `SELECT u.id, u.username, u.name, u.avatar_url, u.devscore,
              (SELECT COUNT(*)::INT FROM follows WHERE following_id = u.id) AS followers_count
       FROM users u
       WHERE u.is_public = TRUE
         AND u.id != $1
         AND NOT EXISTS (
           SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id
         )
       ORDER BY u.devscore DESC
       LIMIT 5`,
      [viewerId]
    );
    res.json({ suggestions: rows });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Follower / following counts for a user profile
// ---------------------------------------------------------------------------

async function getUserProfile(req, res, next) {
  try {
    const target = await userModel.findByUsername(req.params.username);
    if (!target) throw new HttpError(404, "User not found");

    const [{ rows: fc }, { rows: fg }] = await Promise.all([
      db.query(`SELECT COUNT(*)::INT AS count FROM follows WHERE following_id = $1`, [target.id]),
      db.query(`SELECT COUNT(*)::INT AS count FROM follows WHERE follower_id = $1`, [target.id]),
    ]);

    const isFollowing = req.user
      ? await followModel.isFollowing(req.user.id, target.id)
      : false;

    res.json({
      user: {
        ...target,
        followers_count: fc[0].count,
        following_count: fg[0].count,
        is_following: isFollowing,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  follow,
  unfollow,
  getFeed,
  getFollowers,
  getFollowing,
  listPosts,
  getPost,
  createPost,
  editPost,
  deletePost,
  toggleLike,
  toggleBookmark,
  listBookmarks,
  listReplies,
  createReply,
  getUserPosts,
  searchUsers,
  suggestedPeople,
  getUserProfile,
};
