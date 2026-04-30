"use strict";

const express = require("express");
const { z } = require("zod");
const communityController = require("../controllers/community.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");

const router = express.Router();

// follows
router.post(
  "/follow/:username",
  requireAuth,
  validate({ params: z.object({ username: z.string().min(1) }) }),
  communityController.follow
);
router.delete(
  "/follow/:username",
  requireAuth,
  validate({ params: z.object({ username: z.string().min(1) }) }),
  communityController.unfollow
);

// activity feed (events from followed users)
router.get("/feed", requireAuth, communityController.getFeed);

// followers/following
router.get("/u/:username/followers", optionalAuth, communityController.getFollowers);
router.get("/u/:username/following", optionalAuth, communityController.getFollowing);

// posts
router.get("/posts", optionalAuth, communityController.listPosts);
router.post("/posts", requireAuth, communityController.createPost);
router.delete("/posts/:id", requireAuth, communityController.deletePost);
router.post("/posts/:id/like", requireAuth, communityController.toggleLike);
router.get("/posts/:id/replies", optionalAuth, communityController.listReplies);
router.post("/posts/:id/replies", requireAuth, communityController.createReply);

module.exports = router;
