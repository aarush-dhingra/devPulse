"use strict";

const platformModel = require("../models/platform.model");
const statsModel = require("../models/stats.model");
const { encrypt } = require("../utils/crypto");
const { queueRefreshUser } = require("../jobs/queue");
const { HttpError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");

const githubService = require("../services/github.service");
const leetcodeService = require("../services/leetcode.service");
const gfgService = require("../services/gfg.service");
const codeforcesService = require("../services/codeforces.service");
const wakatimeService = require("../services/wakatime.service");
const devtoService = require("../services/devto.service");

async function preflightFetch(platform, username, apiKey) {
  switch (platform) {
    case "leetcode":
      return leetcodeService.fetchAll(username);
    case "gfg":
      return gfgService.fetchAll(username);
    case "codeforces":
      return codeforcesService.fetchAll(username);
    case "devto":
      return devtoService.fetchAll(username);
    case "wakatime":
      return wakatimeService.fetchAll({ encryptedApiKey: apiKey });
    case "github":
    default:
      return null;
  }
}

async function listMyPlatforms(req, res, next) {
  try {
    const platforms = await platformModel.listForUser(req.user.id);
    res.json({ platforms });
  } catch (err) {
    next(err);
  }
}

async function connectPlatform(req, res, next) {
  try {
    const { platform, username, apiKey } = req.body;

    let storedKey = null;
    if (platform === "wakatime") {
      if (!apiKey) throw new HttpError(400, "Wakatime requires an API key");
      try {
        storedKey = encrypt(apiKey);
      } catch (err) {
        logger.error("Failed to encrypt API key", { error: err.message });
        throw new HttpError(500, "Server cannot store credentials securely");
      }
    }

    let preflighted = null;
    let preflightErr = null;
    try {
      preflighted = await preflightFetch(platform, username, storedKey);
    } catch (err) {
      preflightErr = err;
    }

    if (preflightErr && platform !== "github") {
      throw new HttpError(
        400,
        preflightErr.message ||
          `Could not connect to ${platform}. Check the handle and try again.`
      );
    }

    const row = await platformModel.upsertPlatform({
      userId: req.user.id,
      platformName: platform,
      platformUsername: username,
      apiKey: storedKey,
      status: preflighted ? "connected" : "pending",
    });

    if (preflighted) {
      try {
        await statsModel.saveSnapshot({
          userId: req.user.id,
          platform,
          rawData: preflighted,
        });
        await platformModel.updateStatus(req.user.id, platform, "connected");
      } catch (err) {
        logger.warn("Could not save preflight snapshot", { platform, error: err.message });
      }
    }

    queueRefreshUser(req.user.id, `connect:${platform}`).catch(() => {});

    res.json({ platform: row });
  } catch (err) {
    next(err);
  }
}

async function disconnectPlatform(req, res, next) {
  try {
    const { platform } = req.params;
    const ok = await platformModel.deletePlatform(req.user.id, platform);
    if (!ok) throw new HttpError(404, "Platform not connected");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMyPlatforms,
  connectPlatform,
  disconnectPlatform,
};
