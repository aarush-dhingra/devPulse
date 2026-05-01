"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const scraper = createApiClient({
  baseURL: "https://www.codechef.com",
  name: "codechef-scrape",
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

const ratingApi = createApiClient({
  baseURL: "https://cp-rating-api.vercel.app",
  name: "codechef-api",
  timeout: 15000,
});

function parseProfileHtml(html, username) {
  const result = {
    profile: { username },
    rating: 0,
    stars: 0,
    globalRank: 0,
    countryRank: 0,
    problemsSolved: 0,
    partialProblems: 0,
    contestsAttended: 0,
    color: null,
    ratingHistory: [],
    contests: [],
    fetchedAt: new Date().toISOString(),
  };

  const totalMatch = html.match(/Total Problems Solved:\s*(\d+)/i);
  if (totalMatch) result.problemsSolved = safeNum(totalMatch[1]);

  const ratingMatch = html.match(/class="rating-number">(\d+)/);
  if (ratingMatch) result.rating = safeNum(ratingMatch[1]);

  const avatarMatch = html.match(/class=['"]profileImage['"][^>]*src=['"]([^'"]+)['"]/);
  if (avatarMatch) result.profile.avatar = avatarMatch[1];

  const countryMatch = html.match(/class="user-country-name"[^>]*>\s*([^<]+)/);
  if (countryMatch) result.profile.country = countryMatch[1].trim();

  const nameMatch = html.match(/class="h2-style">([^<]+)/);
  if (nameMatch) result.profile.username = nameMatch[1].trim();

  const ratingHistoryMatch = html.match(/var\s+all_rating\s*=\s*(\[.*?\]);/s);
  if (ratingHistoryMatch) {
    try {
      const history = JSON.parse(ratingHistoryMatch[1]);
      if (Array.isArray(history) && history.length > 0) {
        result.ratingHistory = history.map((c) => ({
          contestName: c.name || c.code || "",
          rating: safeNum(c.rating),
          rank: safeNum(c.rank),
          date: c.end_date || c.getyear || null,
        }));
        result.contestsAttended = history.length;
        const last = history[history.length - 1];
        if (!result.rating && last) result.rating = safeNum(last.rating);
      }
    } catch {
      logger.debug("Failed to parse CodeChef rating history JSON");
    }
  }

  const starsMatch = html.match(/class="rating"[^>]*>\s*(\d)\s*\u2605/);
  if (starsMatch) result.stars = safeNum(starsMatch[1]);

  return result;
}

async function fetchAll(usernameRaw) {
  const username = String(usernameRaw || "").trim();
  if (!username) {
    const e = new Error("CodeChef handle is required");
    e.code = "CODECHEF_HANDLE_MISSING";
    throw e;
  }

  const errors = [];

  // Strategy 1: scrape the profile page (most reliable — has Total Problems Solved)
  try {
    const { data: html } = await scraper.get(
      `/users/${encodeURIComponent(username)}`
    );
    if (typeof html === "string" && html.includes("Problems Solved")) {
      const shaped = parseProfileHtml(html, username);
      if (shaped.problemsSolved > 0 || shaped.rating > 0) {
        // Augment with cp-rating-api for extra fields (stars, rank) if available
        try {
          const { data: apiData } = await ratingApi.get(
            `/codechef/${encodeURIComponent(username)}`
          );
          if (apiData) {
            if (!shaped.stars && safeNum(apiData.stars))
              shaped.stars = safeNum(apiData.stars);
            if (!shaped.globalRank && safeNum(apiData.globalRank))
              shaped.globalRank = safeNum(apiData.globalRank);
            if (!shaped.countryRank && safeNum(apiData.countryRank))
              shaped.countryRank = safeNum(apiData.countryRank);
            if (!shaped.profile.avatar && apiData.avatar)
              shaped.profile.avatar = apiData.avatar;
            if (!shaped.profile.country && apiData.country)
              shaped.profile.country = apiData.country;
            if (!shaped.contestsAttended && safeNum(apiData.participation))
              shaped.contestsAttended = safeNum(apiData.participation);
          }
        } catch {
          // Non-critical — we already have the main data from HTML
        }
        return shaped;
      }
      errors.push("HTML scrape found page but no solved/rating data");
    } else {
      errors.push("Profile page did not contain expected content");
    }
  } catch (err) {
    errors.push(`scrape: ${err.response?.status || err.message}`);
    logger.warn("CodeChef HTML scrape failed", { username, error: err.message });
  }

  // Strategy 2: cp-rating-api only (fallback)
  try {
    const { data } = await ratingApi.get(
      `/codechef/${encodeURIComponent(username)}`
    );
    if (data && (safeNum(data.problemsSolved) > 0 || safeNum(data.rating) > 0)) {
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
        ratingHistory: [],
        contests: Array.isArray(data.contests) ? data.contests : [],
        fetchedAt: new Date().toISOString(),
      };
    }
    errors.push("cp-rating-api returned no usable data");
  } catch (err) {
    errors.push(`cp-rating-api: ${err.message}`);
    logger.warn("CodeChef API failed", { username, error: err.message });
  }

  const friendly = new Error(
    `CodeChef can't find @${username} — verify the handle on codechef.com`
  );
  friendly.code = "CODECHEF_NOT_FOUND";
  friendly.details = errors;
  throw friendly;
}

module.exports = { fetchAll };
