"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const client = createApiClient({
  baseURL: "https://alfa-leetcode-api.onrender.com",
  name: "leetcode",
  timeout: 20000,
});

function normalizeCalendar(rawCalendar) {
  if (!rawCalendar) return [];
  let map = rawCalendar;
  if (typeof rawCalendar === "string") {
    try { map = JSON.parse(rawCalendar); } catch { map = {}; }
  }
  return Object.entries(map).map(([ts, count]) => {
    const d = new Date(Number(ts) * 1000);
    if (Number.isNaN(d.getTime())) return null;
    return {
      date: d.toISOString().slice(0, 10),
      count: Number(count) || 0,
    };
  }).filter(Boolean);
}

async function fetchAll(username) {
  try {
    const [profileRes, solvedRes, badgesRes, contestRes, calendarRes] = await Promise.all([
      client.get(`/${encodeURIComponent(username)}`).catch(() => null),
      client.get(`/${encodeURIComponent(username)}/solved`).catch(() => null),
      client.get(`/${encodeURIComponent(username)}/badges`).catch(() => null),
      client.get(`/${encodeURIComponent(username)}/contest`).catch(() => null),
      client.get(`/${encodeURIComponent(username)}/calendar`).catch(() => null),
    ]);

    const profile = profileRes?.data || {};
    const solved = solvedRes?.data || {};
    const badges = badgesRes?.data?.badges || [];
    const contest = contestRes?.data || {};

    const easy = safeNum(solved.easySolved);
    const medium = safeNum(solved.mediumSolved);
    const hard = safeNum(solved.hardSolved);
    const total = safeNum(solved.solvedProblem || easy + medium + hard);

    const calRaw =
      calendarRes?.data?.submissionCalendar ??
      calendarRes?.data?.matchedUser?.userCalendar?.submissionCalendar ??
      null;
    const dailySubmissions = normalizeCalendar(calRaw);

    return {
      profile: {
        username: profile.username || username,
        name: profile.name,
        avatar: profile.avatar,
        ranking: safeNum(profile.ranking),
        reputation: safeNum(profile.reputation),
        country: profile.country,
      },
      solved: { total, easy, medium, hard },
      acceptanceRate: safeNum(profile.acceptanceRate),
      contest: {
        rating: safeNum(contest.contestRating),
        attended: safeNum(contest.contestAttend),
        topPercentage: safeNum(contest.contestTopPercentage),
      },
      badges,
      dailySubmissions,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("LeetCode fetchAll failed", { username, error: err.message });
    throw err;
  }
}

module.exports = { fetchAll };
