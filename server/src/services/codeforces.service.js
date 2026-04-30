"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const client = createApiClient({
  baseURL: "https://codeforces.com/api",
  name: "codeforces",
});

async function fetchAll(username) {
  try {
    const [info, ratingHistory, status] = await Promise.all([
      client
        .get(`/user.info`, { params: { handles: username } })
        .then((r) => r.data?.result?.[0])
        .catch(() => null),
      client
        .get(`/user.rating`, { params: { handle: username } })
        .then((r) => r.data?.result || [])
        .catch(() => []),
      client
        .get(`/user.status`, { params: { handle: username, from: 1, count: 500 } })
        .then((r) => r.data?.result || [])
        .catch(() => []),
    ]);

    const accepted = status.filter((s) => s.verdict === "OK");
    const uniqueProblems = new Set(
      accepted.map((s) => `${s.problem.contestId}-${s.problem.index}`)
    );

    const tagCounts = {};
    for (const s of accepted) {
      for (const tag of s.problem.tags || []) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    const dailyMap = {};
    for (const s of accepted) {
      const d = new Date(Number(s.creationTimeSeconds) * 1000);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + 1;
    }
    const dailySubmissions = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      profile: {
        handle: info?.handle || username,
        rank: info?.rank,
        maxRank: info?.maxRank,
        avatar: info?.titlePhoto || info?.avatar,
        country: info?.country,
        organization: info?.organization,
      },
      rating: safeNum(info?.rating),
      maxRating: safeNum(info?.maxRating),
      contestsAttended: ratingHistory.length,
      bestContestPlace: ratingHistory.reduce(
        (acc, c) => Math.min(acc, c.rank || Infinity),
        Infinity
      ),
      submissions: status.length,
      acceptedSubmissions: accepted.length,
      uniqueSolved: uniqueProblems.size,
      tagCounts,
      dailySubmissions,
      ratingHistory: ratingHistory.map((r) => ({
        contestId: r.contestId,
        contestName: r.contestName,
        rank: r.rank,
        oldRating: r.oldRating,
        newRating: r.newRating,
        date: new Date(r.ratingUpdateTimeSeconds * 1000).toISOString(),
      })),
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("Codeforces fetchAll failed", { username, error: err.message });
    throw err;
  }
}

module.exports = { fetchAll };
