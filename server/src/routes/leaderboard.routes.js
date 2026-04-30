"use strict";

const express = require("express");
const leaderboardController = require("../controllers/leaderboard.controller");
const { cache } = require("../middlewares/cache.middleware");

const router = express.Router();

const ONE_HOUR = 60 * 60;

router.get(
  "/",
  cache({
    ttl: ONE_HOUR,
    key: (req) => `lb:${req.query.metric || "devscore"}:${req.query.limit || 50}:${req.query.offset || 0}`,
  }),
  leaderboardController.getLeaderboard
);

module.exports = router;
