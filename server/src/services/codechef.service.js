"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const api = createApiClient({
  baseURL: "https://cp-rating-api.vercel.app",
  name: "codechef-api",
  timeout: 15000,
});

const scraper = createApiClient({
  baseURL: "https://www.codechef.com",
  name: "codechef-scrape",
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    Accept: "application/json, text/html",
  },
});

function shapeFromApi(data, username) {
  if (!data || typeof data !== "object") return null;
  return {
    profile: {
      username: data.username || username,
      avatar: data.avatar || null,
      country: data.country || null,
    },
    rating: safeNum(data.rating),
    stars: safeNum(data.stars),
    globalRank: safeNum(data.globalRank),
    countryRank: safeNum(data.countryRank),
    problemsSolved: safeNum(data.problemsSolved),
    partialProblems: safeNum(data.partialProblems),
    contestsAttended: safeNum(data.participation),
    color: data.color || null,
    contests: Array.isArray(data.contests) ? data.contests : [],
    fetchedAt: new Date().toISOString(),
  };
}

function shapeFromScrape(data, username) {
  if (!data || typeof data !== "object") return null;
  return {
    profile: {
      username: data.name || username,
      avatar: data.profile_image || null,
      country: data.country || null,
    },
    rating: safeNum(data.currentRating || data.rating),
    stars: safeNum(data.stars),
    globalRank: safeNum(data.globalRank || data.global_rank),
    countryRank: safeNum(data.countryRank || data.country_rank),
    problemsSolved: safeNum(
      data.fully_solved?.count ?? data.problemsSolved ?? data.problem_fully_solved
    ),
    partialProblems: safeNum(
      data.partially_solved?.count ?? data.partialProblems ?? data.problem_partially_solved
    ),
    contestsAttended: safeNum(data.contest_participate ?? data.contestsAttended),
    color: data.color || null,
    ratingHistory: Array.isArray(data.ratingData) ? data.ratingData : [],
    contests: [],
    fetchedAt: new Date().toISOString(),
  };
}

function looksValid(shaped) {
  if (!shaped) return false;
  return (
    safeNum(shaped.problemsSolved) > 0 ||
    safeNum(shaped.rating) > 0 ||
    !!shaped.profile?.username
  );
}

async function fetchAll(usernameRaw) {
  const username = String(usernameRaw || "").trim();
  if (!username) {
    const e = new Error("CodeChef handle is required");
    e.code = "CODECHEF_HANDLE_MISSING";
    throw e;
  }

  const errors = [];

  // Strategy 1: cp-rating-api (most reliable third-party)
  try {
    const { data } = await api.get(`/codechef/${encodeURIComponent(username)}`);
    const shaped = shapeFromApi(data, username);
    if (looksValid(shaped)) return shaped;
    errors.push("cp-rating-api returned empty");
  } catch (err) {
    errors.push(`cp-rating-api: ${err.message}`);
    logger.warn("CodeChef API failed", { username, error: err.message });
  }

  // Strategy 2: scrape CodeChef's internal API
  try {
    const { data } = await scraper.get(
      `/api/list/handle/${encodeURIComponent(username)}`,
      { headers: { Accept: "application/json" } }
    );
    const shaped = shapeFromScrape(data, username);
    if (looksValid(shaped)) return shaped;
    errors.push("scrape returned empty");
  } catch (err) {
    errors.push(`scrape: ${err.message}`);
    logger.warn("CodeChef scrape failed", { username, error: err.message });
  }

  const friendly = new Error(
    `CodeChef can't find @${username} — verify the handle on codechef.com`
  );
  friendly.code = "CODECHEF_NOT_FOUND";
  friendly.details = errors;
  throw friendly;
}

module.exports = { fetchAll };
