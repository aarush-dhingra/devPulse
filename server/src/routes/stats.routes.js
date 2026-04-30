"use strict";

const express = require("express");
const statsController = require("../controllers/stats.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");
const { cache } = require("../middlewares/cache.middleware");

const router = express.Router();

const STATS_TTL = 60 * 60 * 6;

router.get(
  "/me",
  requireAuth,
  cache({ ttl: STATS_TTL, key: (req) => `stats:user:${req.user.id}` }),
  statsController.getMyStats
);

router.get(
  "/u/:username",
  optionalAuth,
  cache({ ttl: STATS_TTL, key: (req) => `stats:user:${req.params.username}` }),
  statsController.getStatsByUsername
);

router.post("/refresh", requireAuth, statsController.refreshMyStats);

module.exports = router;
