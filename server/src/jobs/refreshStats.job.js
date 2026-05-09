"use strict";

const db = require("../config/db");
const platformModel = require("../models/platform.model");
const statsModel = require("../models/stats.model");
const userModel = require("../models/user.model");
const followModel = require("../models/follow.model");
const badgeModel = require("../models/badge.model");
const { recomputeForUser } = require("../services/score.service");
const { assertUsableSnapshot } = require("../services/platformQuality.service");
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

function normalizeBeforeSave(platform, data) {
  if (platform === "gfg" || platform === "codechef") {
    return assertUsableSnapshot(platform, data);
  }
  return data;
}

function normalizeTitle(value) {
  return String(value || "").trim().toLowerCase();
}

function difficultyCount(raw, difficulty) {
  const details = raw?.solvedDetails || {};
  return Number(details[difficulty] || details[difficulty.toUpperCase()] || 0);
}

function deriveGfgRecentSolves(previous, current) {
  const currentLists = current?.solvedProblems || {};
  const previousLists = previous?.solvedProblems || {};
  const derived = [];
  const today = new Date().toISOString().slice(0, 10);

  for (const difficulty of ["school", "basic", "easy", "medium", "hard"]) {
    const currentProblems = currentLists[difficulty] || [];
    if (!currentProblems.length) continue;

    const previousTitles = new Set(
      (previousLists[difficulty] || []).map((problem) => normalizeTitle(problem.title))
    );
    const countDelta = Math.max(
      0,
      difficultyCount(current, difficulty) - difficultyCount(previous, difficulty)
    );

    const newProblems = currentProblems.filter((problem) => {
      const title = normalizeTitle(problem.title);
      return title && !previousTitles.has(title);
    });
    const selected = newProblems.length
      ? newProblems
      : countDelta > 0
        ? currentProblems.slice(0, countDelta)
        : [];

    for (const problem of selected.slice(0, Math.max(countDelta, selected.length))) {
      derived.push({
        type: "solved",
        title: problem.title,
        difficulty,
        date: today,
        url: problem.url,
        source: "gfg-breakdown-diff",
      });
    }
  }

  return derived;
}

function fallbackGfgSolvedActivity(current) {
  const out = [];
  const today = new Date().toISOString().slice(0, 10);
  const lists = current?.solvedProblems || {};
  for (const difficulty of ["hard", "medium", "easy", "basic", "school"]) {
    for (const problem of lists[difficulty] || []) {
      out.push({
        type: "solved",
        title: problem.title,
        difficulty,
        date: today,
        url: problem.url,
        source: "gfg-breakdown-current",
      });
      if (out.length >= 10) return out;
    }
  }
  return out;
}

async function enrichGfgBeforeSave(userId, data) {
  const previous = await statsModel.getLatestForPlatform(userId, "gfg");
  const derived = deriveGfgRecentSolves(previous, data);
  const fallback = !data.recentActivity?.length ? fallbackGfgSolvedActivity(data) : [];
  if (!derived.length && !fallback.length) return data;

  const seen = new Set();
  const recentActivity = [...derived, ...fallback, ...(data.recentActivity || [])]
    .filter((item) => {
      const key = `${item.type || "activity"}:${normalizeTitle(item.title)}:${item.date || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);

  return { ...data, recentActivity };
}

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
      let fetched = await fetcher(full);
      if (p.platform_name === "gfg") {
        fetched = await enrichGfgBeforeSave(userId, fetched);
      }
      const data = normalizeBeforeSave(p.platform_name, fetched);
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
