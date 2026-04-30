"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const primary = createApiClient({
  baseURL: "https://geeks-for-geeks-stats-api.vercel.app",
  name: "gfg-primary",
});

const fallback = createApiClient({
  baseURL: "https://geeks-for-geeks-api.vercel.app",
  name: "gfg-fallback",
});

function shapePrimary(data, username) {
  return {
    profile: {
      username,
      name: data?.info?.name,
      institute: data?.info?.institute,
      instituteRank: safeNum(data?.info?.instituteRank),
    },
    score: safeNum(data?.info?.codingScore),
    problemsSolved: safeNum(data?.info?.totalProblemsSolved),
    streak: safeNum(data?.info?.currentStreak),
    maxStreak: safeNum(data?.info?.maxStreak),
    monthlyScore: safeNum(data?.info?.monthlyScore),
    solvedDetails: data?.solvedStats || {},
    fetchedAt: new Date().toISOString(),
  };
}

function shapeFallback(data, username) {
  // The fallback API returns a slightly different shape — flat fields.
  const info = data?.userInfo || data || {};
  return {
    profile: {
      username,
      name: info.name || info.userName,
      institute: info.institute_name || info.institute,
      instituteRank: safeNum(info.institute_rank ?? info.instituteRank),
    },
    score: safeNum(info.codingScore ?? info.coding_score),
    problemsSolved: safeNum(info.totalProblemsSolved ?? info.total_problems_solved),
    streak: safeNum(info.currentStreak ?? info.current_streak),
    maxStreak: safeNum(info.maxStreak ?? info.max_streak),
    monthlyScore: safeNum(info.monthlyScore ?? info.monthly_score),
    solvedDetails: data?.solvedStats || data?.solved_stats || {},
    fetchedAt: new Date().toISOString(),
  };
}

function looksValid(shaped) {
  if (!shaped) return false;
  return (
    safeNum(shaped.problemsSolved) > 0 ||
    safeNum(shaped.score) > 0 ||
    !!shaped.profile?.name
  );
}

async function fetchAll(usernameRaw) {
  const username = String(usernameRaw || "").trim();
  if (!username) {
    const e = new Error("GFG handle is required");
    e.code = "GFG_HANDLE_MISSING";
    throw e;
  }
  const encoded = encodeURIComponent(username);

  let primaryErr = null;
  try {
    const { data } = await primary.get(`/api`, { params: { userName: username } });
    const shaped = shapePrimary(data, username);
    if (looksValid(shaped)) return shaped;
    primaryErr = new Error("GFG primary returned empty profile");
  } catch (err) {
    primaryErr = err;
    logger.warn("GFG primary failed, trying fallback", { username, error: err.message });
  }

  try {
    const { data } = await fallback.get(`/${encoded}`);
    const shaped = shapeFallback(data, username);
    if (looksValid(shaped)) return shaped;
  } catch (err) {
    logger.warn("GFG fallback failed", { username, error: err.message });
  }

  const friendly = new Error(
    `GFG can't find @${username} — verify the handle on geeksforgeeks.org`
  );
  friendly.code = "GFG_NOT_FOUND";
  friendly.cause = primaryErr;
  throw friendly;
}

module.exports = { fetchAll };
