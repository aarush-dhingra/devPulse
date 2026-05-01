"use strict";

const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const statsRoutes = require("./stats.routes");
const platformRoutes = require("./platform.routes");
const leaderboardRoutes = require("./leaderboard.routes");
const communityRoutes = require("./community.routes");
const cardRoutes = require("./card.routes");
const badgeRoutes = require("./badge.routes");
const goalRoutes = require("./goal.routes");
const pomodoroRoutes = require("./pomodoro.routes");
const dashboardRoutes = require("./dashboard.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "devvitals-api",
    time: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/stats", statsRoutes);
router.use("/platform", platformRoutes);
router.use("/leaderboard", leaderboardRoutes);
router.use("/community", communityRoutes);
router.use("/card", cardRoutes);
router.use("/badge", badgeRoutes);
router.use("/goals", goalRoutes);
router.use("/pomodoro", pomodoroRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;
