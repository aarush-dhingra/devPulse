"use strict";

const cheerio = require("cheerio");
const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const { assertUsableSnapshot } = require("./platformQuality.service");
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
  const $ = cheerio.load(html);
  const text = $("body").text();
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
    source: "codechef-profile-html",
    fetchedAt: new Date().toISOString(),
  };

  const fullName =
    $(".user-details-container .h2-style").first().text().trim() ||
    $(".user-details-container h1").first().text().trim() ||
    $(".h2-style").first().text().trim();
  if (fullName) result.profile.name = fullName;

  const avatar =
    $(".profileImage").attr("src") ||
    $(".user-details-container img").first().attr("src") ||
    null;
  if (avatar) result.profile.avatar = avatar;

  const country =
    $(".user-country-name").first().text().trim() ||
    $(".user-details-container .country").first().text().trim();
  if (country) result.profile.country = country;

  const institution =
    $(".user-institution").first().text().trim() ||
    $(".user-details-container .institution").first().text().trim();
  if (institution) result.profile.institution = institution;

  const ratingText = $(".rating-number").first().text().trim();
  if (ratingText) result.rating = safeNum(ratingText.replace(/[^\d]/g, ""));

  const ratingColorClass = $(".rating-header .rating").first().attr("class") ||
    $(".rating").first().attr("class") ||
    "";
  const colorMatch = ratingColorClass.match(/(?:rating|star)-?([a-z]+)/i);
  if (colorMatch) result.color = colorMatch[1];

  const totalMatch = text.match(/Total Problems Solved:\s*(\d+)/i) ||
    html.match(/Total Problems Solved:\s*(\d+)/i);
  if (totalMatch) result.problemsSolved = safeNum(totalMatch[1]);

  const partialMatch = text.match(/Partially Solved:\s*(\d+)/i) ||
    text.match(/Partial Problems Solved:\s*(\d+)/i);
  if (partialMatch) result.partialProblems = safeNum(partialMatch[1]);

  $(".rating-ranks li, .rating-ranks .inline-list li, .rank-stats li").each((_, el) => {
    const rowText = $(el).text().replace(/\s+/g, " ").trim();
    const number = safeNum(rowText.replace(/[^\d]/g, ""));
    if (/global/i.test(rowText)) result.globalRank = number;
    if (/country/i.test(rowText)) result.countryRank = number;
  });

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

  const starsText = $(".rating").first().text().trim() ||
    $(".rating-header").first().text().trim();
  const starsMatch = starsText.match(/(\d)\s*\u2605/) ||
    html.match(/class="rating"[^>]*>\s*(\d)\s*\u2605/);
  if (starsMatch) result.stars = safeNum(starsMatch[1]);

  return result;
}

function augmentFromApi(shaped, apiData = {}) {
  if (!apiData || typeof apiData !== "object") return shaped;

  if (!shaped.rating && safeNum(apiData.rating))
    shaped.rating = safeNum(apiData.rating);
  if (!shaped.stars && safeNum(apiData.stars))
    shaped.stars = safeNum(apiData.stars);
  if (!shaped.globalRank && safeNum(apiData.globalRank))
    shaped.globalRank = safeNum(apiData.globalRank);
  if (!shaped.countryRank && safeNum(apiData.countryRank))
    shaped.countryRank = safeNum(apiData.countryRank);
  if (!shaped.problemsSolved && safeNum(apiData.problemsSolved))
    shaped.problemsSolved = safeNum(apiData.problemsSolved);
  if (!shaped.partialProblems && safeNum(apiData.partialProblems))
    shaped.partialProblems = safeNum(apiData.partialProblems);
  if (!shaped.profile.avatar && apiData.avatar)
    shaped.profile.avatar = apiData.avatar;
  if (!shaped.profile.country && apiData.country)
    shaped.profile.country = apiData.country;
  if (!shaped.contestsAttended && safeNum(apiData.participation))
    shaped.contestsAttended = safeNum(apiData.participation);
  if (!shaped.contests.length && Array.isArray(apiData.contests))
    shaped.contests = apiData.contests;

  return shaped;
}

function shapeFromRatingApi(data, username) {
  return {
    profile: {
      username: data.username || username,
      name: data.name || data.fullName || null,
      avatar: data.avatar || null,
      country: data.country || null,
      institution: data.institution || null,
    },
    rating: safeNum(data.rating ?? data.currentRating),
    stars: safeNum(data.stars),
    globalRank: safeNum(data.globalRank),
    countryRank: safeNum(data.countryRank),
    problemsSolved: safeNum(data.problemsSolved),
    partialProblems: safeNum(data.partialProblems),
    contestsAttended: safeNum(data.participation ?? data.totalContests),
    color: data.color || null,
    ratingHistory: Array.isArray(data.ratingHistory) ? data.ratingHistory : [],
    contests: Array.isArray(data.contests) ? data.contests : [],
    source: "codechef-rating-api",
    fetchedAt: new Date().toISOString(),
  };
}

function tryUsable(shaped) {
  if (!shaped) return null;
  try {
    return assertUsableSnapshot("codechef", shaped);
  } catch {
    return null;
  }
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
    if (typeof html === "string" && /Problems Solved|rating-number|user-details/i.test(html)) {
      const shaped = parseProfileHtml(html, username);
      if (shaped.problemsSolved > 0 || shaped.rating > 0 || shaped.profile?.name) {
        // Augment with cp-rating-api for extra fields (stars, rank) if available
        try {
          const { data: apiData } = await ratingApi.get(
            `/codechef/${encodeURIComponent(username)}`
          );
          augmentFromApi(shaped, apiData);
        } catch {
          // Non-critical — we already have the main data from HTML
        }
        const trusted = tryUsable(shaped);
        if (trusted) return trusted;
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
    const shaped = tryUsable(shapeFromRatingApi(data || {}, username));
    if (shaped) return shaped;
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
