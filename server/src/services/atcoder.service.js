"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const kenkoooo = createApiClient({
  baseURL: "https://kenkoooo.com/atcoder",
  name: "atcoder-kenkoooo",
  timeout: 20000,
});

const atcoder = createApiClient({
  baseURL: "https://atcoder.jp",
  name: "atcoder-official",
  timeout: 15000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  },
});

async function fetchAll(usernameRaw) {
  const username = String(usernameRaw || "").trim();
  if (!username) {
    const e = new Error("AtCoder handle is required");
    e.code = "ATCODER_HANDLE_MISSING";
    throw e;
  }

  const encoded = encodeURIComponent(username);
  const errors = [];

  let contestHistory = [];
  let submissions = [];

  // Fetch contest rating history from AtCoder's official endpoint
  try {
    const { data } = await atcoder.get(`/users/${encoded}/history/json`);
    if (Array.isArray(data)) contestHistory = data;
  } catch (err) {
    errors.push(`history: ${err.message}`);
    logger.warn("AtCoder history fetch failed", { username, error: err.message });
  }

  // Fetch submissions from kenkoooo API (paginated, up to 500 most recent)
  try {
    const { data } = await kenkoooo.get(
      `/atcoder-api/v3/user/submissions`,
      { params: { user: username, from_second: 0 } }
    );
    if (Array.isArray(data)) submissions = data;
  } catch (err) {
    errors.push(`submissions: ${err.message}`);
    logger.warn("AtCoder submissions fetch failed", { username, error: err.message });
  }

  // Fetch AC count ranking
  let acRank = null;
  try {
    const { data } = await kenkoooo.get(
      `/atcoder-api/v3/user/ac_rank`,
      { params: { user: username } }
    );
    acRank = data;
  } catch (err) {
    errors.push(`ac_rank: ${err.message}`);
  }

  if (contestHistory.length === 0 && submissions.length === 0 && !acRank) {
    const friendly = new Error(
      `AtCoder can't find @${username} — verify the handle on atcoder.jp`
    );
    friendly.code = "ATCODER_NOT_FOUND";
    friendly.details = errors;
    throw friendly;
  }

  // Derive stats from contest history
  const latestContest = contestHistory.length > 0
    ? contestHistory[contestHistory.length - 1]
    : null;
  const rating = safeNum(latestContest?.NewRating);
  const maxRating = contestHistory.reduce(
    (max, c) => Math.max(max, safeNum(c.NewRating)),
    0
  );

  // Derive unique AC problems
  const accepted = submissions.filter((s) => s.result === "AC");
  const uniqueProblems = new Set(accepted.map((s) => s.problem_id));

  // Build daily submissions calendar from accepted submissions
  const dailyMap = {};
  for (const s of accepted) {
    const d = new Date(s.epoch_second * 1000);
    if (Number.isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = (dailyMap[key] || 0) + 1;
  }
  const dailySubmissions = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    profile: {
      username,
      country: latestContest?.Country || null,
    },
    rating,
    maxRating,
    contestsAttended: contestHistory.length,
    uniqueSolved: uniqueProblems.size,
    totalSubmissions: submissions.length,
    acceptedSubmissions: accepted.length,
    acRank: safeNum(acRank?.rank),
    acCount: safeNum(acRank?.count),
    dailySubmissions,
    ratingHistory: contestHistory.map((c) => ({
      contestName: c.ContestName || c.contestName,
      newRating: safeNum(c.NewRating),
      oldRating: safeNum(c.OldRating),
      performance: safeNum(c.Performance),
      place: safeNum(c.Place),
      date: c.EndTime || new Date(c.epoch_second * 1000).toISOString(),
    })),
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { fetchAll };
