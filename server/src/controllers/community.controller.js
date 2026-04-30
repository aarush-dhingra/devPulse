"use strict";

const { z } = require("zod");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const postModel = require("../models/post.model");
const { HttpError } = require("../middlewares/error.middleware");

const createPostSchema = z.object({
  content: z.string().min(1).max(1000),
});
const replySchema = z.object({
  content: z.string().min(1).max(500),
});

async function follow(req, res, next) {
  try {
    const target = await userModel.findByUsername(req.params.username);
    if (!target) throw new HttpError(404, "User not found");
    if (target.id === req.user.id)
      throw new HttpError(400, "Cannot follow yourself");
    const created = await followModel.follow(req.user.id, target.id);
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

async function listPosts(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const posts = await postModel.listFeed({
      limit,
      offset,
      viewerId: req.user?.id || null,
    });
    res.json({ posts, limit, offset });
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const { content } = createPostSchema.parse(req.body);
    const post = await postModel.create({ userId: req.user.id, content });
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

async function deletePost(req, res, next) {
  try {
    const ok = await postModel.deleteOwn({
      userId: req.user.id,
      postId: req.params.id,
    });
    if (!ok) throw new HttpError(404, "Post not found");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function toggleLike(req, res, next) {
  try {
    const result = await postModel.toggleLike({
      userId: req.user.id,
      postId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function listReplies(req, res, next) {
  try {
    const replies = await postModel.listReplies(req.params.id);
    res.json({ replies });
  } catch (err) {
    next(err);
  }
}

async function createReply(req, res, next) {
  try {
    const { content } = replySchema.parse(req.body);
    const reply = await postModel.addReply({
      postId: req.params.id,
      userId: req.user.id,
      content,
    });
    res.status(201).json({ reply });
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
  createPost,
  deletePost,
  toggleLike,
  listReplies,
  createReply,
};
