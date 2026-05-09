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
  const u = encodeURIComponent(username);
  try {
    const [
      profileRes, solvedRes, badgesRes, contestRes, calendarRes,
      fullProfileRes, skillRes, contestHistoryRes, languageRes,
    ] = await Promise.all([
      client.get(`/${u}`).catch(() => null),
      client.get(`/${u}/solved`).catch(() => null),
      client.get(`/${u}/badges`).catch(() => null),
      client.get(`/${u}/contest`).catch(() => null),
      client.get(`/${u}/calendar`).catch(() => null),
      client.get(`/${u}/profile`).catch(() => null),
      client.get(`/${u}/skill`).catch(() => null),
      client.get(`/${u}/contest/history`).catch(() => null),
      client.get(`/${u}/language`).catch(() => null),
    ]);

    const profile = profileRes?.data || {};
    const solved = solvedRes?.data || {};
    const badges = badgesRes?.data?.badges || [];
    const contest = contestRes?.data || {};
    const fullProfile = fullProfileRes?.data || {};

    const easy = safeNum(solved.easySolved);
    const medium = safeNum(solved.mediumSolved);
    const hard = safeNum(solved.hardSolved);
    const total = safeNum(solved.solvedProblem || easy + medium + hard);

    const calRaw =
      calendarRes?.data?.submissionCalendar ??
      calendarRes?.data?.matchedUser?.userCalendar?.submissionCalendar ??
      fullProfile.submissionCalendar ??
      null;
    const dailySubmissions = normalizeCalendar(calRaw);

    const totalSubs = safeNum(solved.totalSubmissionNum?.[0]?.submissions);
    const acSubs = safeNum(solved.acSubmissionNum?.[0]?.submissions);
    const acceptanceRate = totalSubs > 0
      ? Math.round((acSubs / totalSubs) * 1000) / 10
      : 0;

    const recentSolves = (fullProfile.recentSubmissions || [])
      .filter((s) => s.statusDisplay === "Accepted")
      .slice(0, 10)
      .map((s) => ({
        title: s.title,
        titleSlug: s.titleSlug,
        timestamp: s.timestamp,
        lang: s.lang,
      }));

    const totalEasy = safeNum(fullProfile.totalEasy);
    const totalMedium = safeNum(fullProfile.totalMedium);
    const totalHard = safeNum(fullProfile.totalHard);

    const skillData = skillRes?.data || {};
    const skillStats = {
      fundamental:  skillData.fundamental  || [],
      intermediate: skillData.intermediate || [],
      advanced:     skillData.advanced     || [],
    };

    const contestHistory = (contestHistoryRes?.data?.contestHistory || [])
      .map((c) => ({
        title:     c.contest?.title,
        startTime: c.contest?.startTime,
        rating:    c.rating,
        ranking:   c.ranking,
        solved:    c.problemsSolved,
        total:     c.totalProblems,
        trend:     c.trendDirection,
      }));

    const languageStats = (languageRes?.data?.languageProblemCount || [])
      .sort((a, b) => b.problemsSolved - a.problemsSolved);

    return {
      profile: {
        username: profile.username || username,
        name: profile.name,
        avatar: profile.avatar,
        ranking: safeNum(profile.ranking || fullProfile.ranking),
        reputation: safeNum(profile.reputation || fullProfile.reputation),
        country: profile.country,
      },
      solved: { total, easy, medium, hard },
      acceptanceRate,
      totalEasy,
      totalMedium,
      totalHard,
      contest: {
        rating: safeNum(contest.contestRating),
        attended: safeNum(contest.contestAttend),
        topPercentage: safeNum(contest.contestTopPercentage),
      },
      badges,
      dailySubmissions,
      recentSolves,
      skillStats,
      contestHistory,
      languageStats,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("LeetCode fetchAll failed", { username, error: err.message });
    throw err;
  }
}

module.exports = { fetchAll };
