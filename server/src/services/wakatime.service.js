"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const { decrypt } = require("../utils/crypto");
const logger = require("../utils/logger");

const client = createApiClient({
  baseURL: "https://wakatime.com/api/v1",
  name: "wakatime",
});

function authHeader(encryptedKey) {
  const apiKey = decrypt(encryptedKey);
  if (!apiKey) throw new Error("Wakatime API key missing or invalid");
  const b64 = Buffer.from(apiKey).toString("base64");
  return { Authorization: `Basic ${b64}` };
}

async function fetchAll({ encryptedApiKey }) {
  try {
    const headers = authHeader(encryptedApiKey);

    const today = new Date();
    const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().slice(0, 10);

    const [stats7, stats30, summariesYear] = await Promise.all([
      client
        .get(`/users/current/stats/last_7_days`, { headers })
        .then((r) => r.data?.data)
        .catch(() => null),
      client
        .get(`/users/current/stats/last_30_days`, { headers })
        .then((r) => r.data?.data)
        .catch(() => null),
      client
        .get(`/users/current/summaries`, {
          headers,
          params: { start: fmt(yearAgo), end: fmt(today) },
        })
        .then((r) => r.data?.data || [])
        .catch(() => []),
    ]);

    const dailyHours = (summariesYear || []).map((row) => ({
      date: row?.range?.date || row?.range?.start?.slice(0, 10),
      hours: safeNum(row?.grand_total?.total_seconds) / 3600,
    })).filter((d) => d.date);

    const totalHours7 = safeNum(stats7?.total_seconds) / 3600;
    const totalHours30 = safeNum(stats30?.total_seconds) / 3600;
    const dailyAverageHours =
      safeNum(stats7?.daily_average) / 3600;

    const languages = (stats30?.languages || []).map((l) => ({
      name: l.name,
      hours: safeNum(l.total_seconds) / 3600,
      percent: safeNum(l.percent),
    }));
    const editors = (stats30?.editors || []).map((e) => ({
      name: e.name,
      hours: safeNum(e.total_seconds) / 3600,
      percent: safeNum(e.percent),
    }));
    const projects = (stats30?.projects || []).map((p) => ({
      name: p.name,
      hours: safeNum(p.total_seconds) / 3600,
      percent: safeNum(p.percent),
    }));

    return {
      hoursLast7Days: totalHours7,
      hoursLast30Days: totalHours30,
      dailyAverageHours,
      languages,
      editors,
      projects,
      dailyHours,
      bestDay: stats30?.best_day
        ? {
            date: stats30.best_day.date,
            hours: safeNum(stats30.best_day.total_seconds) / 3600,
          }
        : null,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("Wakatime fetchAll failed", { error: err.message });
    throw err;
  }
}

module.exports = { fetchAll };
