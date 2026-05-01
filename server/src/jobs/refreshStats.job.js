"use strict";

const db = require("../config/db");
const platformModel = require("../models/platform.model");
const statsModel = require("../models/stats.model");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const badgeModel = require("../models/badge.model");
const { recomputeForUser } = require("../services/score.service");
const { safeDel } = require("../config/redis");
const { decrypt } = require("../utils/crypto");
const logger = require("../utils/logger");

const githubService = require("../services/github.service");
const leetcodeService = require("../services/leetcode.service");
const gfgService = require("../services/gfg.service");
const codeforcesService = require("../services/codeforces.service");
const wakatimeService = require("../services/wakatime.service");
const codechefService = require("../services/codechef.service");
const atcoderService = require("../services/atcoder.service");

const FETCHERS = {
  github: async (p) => {
    let userToken = null;
    if (p.api_key) {
      try { userToken = decrypt(p.api_key); } catch { /* ignore */ }
    }
    return githubService.fetchAll(p.platform_username, userToken);
  },
  leetcode: async (p) => leetcodeService.fetchAll(p.platform_username),
  gfg: async (p) => gfgService.fetchAll(p.platform_username),
  codeforces: async (p) => codeforcesService.fetchAll(p.platform_username),
  codechef: async (p) => codechefService.fetchAll(p.platform_username),
  atcoder: async (p) => atcoderService.fetchAll(p.platform_username),
  wakatime: async (p) => wakatimeService.fetchAll({ encryptedApiKey: p.api_key }),
};

async function refreshUser(userId) {
  const platforms = await platformModel.listForUser(userId);
  const results = [];
  for (const p of platforms) {
    const fetcher = FETCHERS[p.platform_name];
    if (!fetcher) continue;

    // Fetch full row including encrypted api_key
    const full = await platformModel.findOne(userId, p.platform_name);
    try {
      const t0 = Date.now();
      const data = await fetcher(full);
      await statsModel.saveSnapshot({
        userId,
        platform: p.platform_name,
        rawData: data,
      });
      await platformModel.updateStatus(userId, p.platform_name, "connected");
      results.push({ platform: p.platform_name, ok: true, ms: Date.now() - t0 });
      await followModel.recordEvent({
        userId,
        platform: p.platform_name,
        eventType: "stats_refreshed",
        data: { fetchedAt: new Date().toISOString() },
      });
    } catch (err) {
      logger.warn("Platform refresh failed", {
        userId,
        platform: p.platform_name,
        error: err.message,
      });
      await platformModel.updateStatus(
        userId,
        p.platform_name,
        "error",
        err.message?.slice(0, 500)
      );
      results.push({
        platform: p.platform_name,
        ok: false,
        error: err.message,
      });
    }
  }

  const score = await recomputeForUser(userId);
  await evaluateBadges(userId);

  // Bust cached stats payload so the next /stats/me sees fresh data.
  const user = await userModel.findById(userId);
  if (user) {
    await safeDel(`stats:user:${userId}`).catch(() => {});
    await safeDel(`stats:user:${user.username}`).catch(() => {});
  }

  return { userId, results, score };
}

async function evaluateBadges(userId) {
  const stats = await statsModel.getLatestForUser(userId);

  const checks = [
    {
      slug: "problem-slayer",
      met: (stats.leetcode?.solved?.total ?? 0) >= 500,
    },
    {
      slug: "polyglot",
      met:
        Object.keys(stats.github?.repos?.languages || {}).length >= 5 ||
        (stats.wakatime?.languages || []).length >= 5,
    },
    {
      slug: "streak-master",
      met: Math.max(
        stats.github?.contributions?.streakCurrent ?? 0,
        stats.gfg?.streak ?? 0
      ) >= 30,
    },
    {
      slug: "open-source-hero",
      met: (stats.github?.contributions?.mergedPRs ?? 0) >= 10,
    },
  ];

  for (const c of checks) {
    if (c.met) await badgeModel.award(userId, c.slug);
  }
}

async function refreshAllUsers() {
  const { rows } = await db.query(`SELECT id FROM users`);
  const out = [];
  for (const u of rows) {
    try {
      out.push(await refreshUser(u.id));
    } catch (err) {
      logger.warn("refreshAllUsers user failed", {
        userId: u.id,
        error: err.message,
      });
    }
  }
  return { count: out.length };
}

module.exports = { refreshUser, refreshAllUsers, evaluateBadges };
