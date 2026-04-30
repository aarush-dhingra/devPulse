"use strict";

const userModel = require("../models/user.model");
const platformModel = require("../models/platform.model");
const statsModel = require("../models/stats.model");
const badgeModel = require("../models/badge.model");
const { computeDevScore, tierFor } = require("../utils/devScore");
const { percentileFor } = require("../services/score.service");
const { queueRefreshUser } = require("../jobs/queue");
const { HttpError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");

async function buildPayloadForUser(user) {
  const [platforms, latest, badges, percentile] = await Promise.all([
    platformModel.listForUser(user.id),
    statsModel.getLatestForUser(user.id),
    badgeModel.listForUser(user.id),
    percentileFor(user.id).catch(() => 0),
  ]);

  const devscore = computeDevScore(latest);

  return {
    user,
    platforms,
    stats: latest,
    devscore: {
      score: devscore.score,
      components: devscore.components,
      tier: tierFor(devscore.score),
      percentile,
    },
    badges,
  };
}

async function getMyStats(req, res, next) {
  try {
    let payload = await buildPayloadForUser(req.user);

    // First-time experience: if there are connected platforms but zero
    // snapshots yet, run a refresh inline so the dashboard isn't empty
    // on first visit (especially when the BullMQ worker isn't running).
    const hasNoStats = Object.keys(payload.stats || {}).length === 0;
    const hasUnsyncedPlatform = (payload.platforms || []).some(
      (p) =>
        p.last_synced == null &&
        (p.status === "pending" || p.status === "connected")
    );
    if (hasNoStats && hasUnsyncedPlatform) {
      try {
        const { refreshUser } = require("../jobs/refreshStats.job");
        logger.info("Auto-refreshing stats inline on first visit", {
          userId: req.user.id,
        });
        await refreshUser(req.user.id);
        payload = await buildPayloadForUser(req.user);
      } catch (err) {
        logger.warn("Inline auto-refresh failed", {
          userId: req.user.id,
          error: err.message,
        });
      }
    }

    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function getStatsByUsername(req, res, next) {
  try {
    const { username } = req.params;
    const user = await userModel.findByUsername(username);
    if (!user) throw new HttpError(404, "User not found");
    if (!user.is_public && req.user?.id !== user.id) {
      throw new HttpError(403, "This profile is private");
    }
    const payload = await buildPayloadForUser(user);
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

async function refreshMyStats(req, res, next) {
  try {
    // queueRefreshUser awaits the inline run when Redis is unavailable,
    // or returns immediately after enqueueing when Redis is available.
    await queueRefreshUser(req.user.id, "manual");
    const payload = await buildPayloadForUser(req.user);
    res.json({ ok: true, ...payload });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyStats, getStatsByUsername, refreshMyStats };
