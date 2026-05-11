"use strict";

const express = require("express");
const { z } = require("zod");
const ctrl = require("../controllers/community.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");

const router = express.Router();

const usernameParam = validate({ params: z.object({ username: z.string().min(1) }) });

// ── Follows ─────────────────────────────────────────────────────────────────
router.post("/follow/:username",    requireAuth, usernameParam, ctrl.follow);
router.delete("/follow/:username",  requireAuth, usernameParam, ctrl.unfollow);

// ── Activity feed (legacy events from followed users) ────────────────────────
router.get("/feed", requireAuth, ctrl.getFeed);

// ── User profiles ────────────────────────────────────────────────────────────
router.get("/u/:username",           optionalAuth, ctrl.getUserProfile);
router.get("/u/:username/followers", optionalAuth, ctrl.getFollowers);
router.get("/u/:username/following", optionalAuth, ctrl.getFollowing);
router.get("/u/:username/posts",     optionalAuth, ctrl.getUserPosts);

// ── Posts ────────────────────────────────────────────────────────────────────
router.get("/posts",       optionalAuth, ctrl.listPosts);
router.post("/posts",      requireAuth,  ctrl.createPost);
router.get("/posts/:id",   optionalAuth, ctrl.getPost);
router.patch("/posts/:id", requireAuth,  ctrl.editPost);
router.delete("/posts/:id",requireAuth,  ctrl.deletePost);

router.post("/posts/:id/like",     requireAuth, ctrl.toggleLike);
router.post("/posts/:id/bookmark", requireAuth, ctrl.toggleBookmark);

router.get("/posts/:id/replies",  optionalAuth, ctrl.listReplies);
router.post("/posts/:id/replies", requireAuth,  ctrl.createReply);

// ── Bookmarks ────────────────────────────────────────────────────────────────
router.get("/bookmarks", requireAuth, ctrl.listBookmarks);

// ── People discovery ─────────────────────────────────────────────────────────
router.get("/search",      optionalAuth, ctrl.searchUsers);
router.get("/suggestions", requireAuth,  ctrl.suggestedPeople);

module.exports = router;
