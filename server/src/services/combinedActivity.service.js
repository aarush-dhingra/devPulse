"use strict";

const statsModel = require("../models/stats.model");

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function windowDates(days = 365) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const out = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    out.push(dateKey(new Date(today.getTime() - i * DAY_MS)));
  }
  return out;
}

function emptyMap(dates) {
  const m = {};
  for (const d of dates) m[d] = 0;
  return m;
}

/* ─── snapshot-delta engine ──────────────────────────────────────── */

/**
 * Compute per-day deltas from an ordered (ASC) array of snapshots.
 *
 * For each consecutive pair we diff the cumulative totals and attribute
 * the positive change to the calendar day of the later snapshot.
 * Multiple snapshots on the same day are collapsed (summed).
 *
 * `extractor(raw_data)` → `{ easy: N, medium: N, ... }` (cumulative).
 * Returns `{ "2026-05-01": { easy: 3, medium: 0, ... }, ... }`.
 */
function snapshotDeltas(snapshots, extractor) {
  const dayMap = {};
  if (!snapshots || snapshots.length < 2) return dayMap;

  let prev = extractor(snapshots[0].raw_data);
  for (let i = 1; i < snapshots.length; i += 1) {
    const curr = extractor(snapshots[i].raw_data);
    const day = dateKey(new Date(snapshots[i].created_at));

    const delta = {};
    let hasPositive = false;
    for (const k of Object.keys(curr)) {
      const diff = Math.max(0, (Number(curr[k]) || 0) - (Number(prev[k]) || 0));
      delta[k] = diff;
      if (diff > 0) hasPositive = true;
    }

    if (hasPositive) {
      if (!dayMap[day]) {
        dayMap[day] = delta;
      } else {
        for (const k of Object.keys(delta)) {
          dayMap[day][k] = (dayMap[day][k] || 0) + delta[k];
        }
      }
    }
    prev = curr;
  }
  return dayMap;
}

function lcExtractor(raw) {
  const s = raw?.solved || {};
  return {
    easy:   Number(s.easy   || 0),
    medium: Number(s.medium || 0),
    hard:   Number(s.hard   || 0),
    total:  Number(s.total  || 0),
  };
}

function cfExtractor(raw) {
  return { total: Number(raw?.uniqueSolved || 0) };
}

function gfgExtractor(raw) {
  return { total: Number(raw?.problemsSolved || 0) };
}

/* ─── heatmap bucket helpers ─────────────────────────────────────── */

function bucketGithub(stats) {
  const days = stats?.github?.contributions?.heatmap || [];
  const m = {};
  for (const d of days) {
    if (!d?.date) continue;
    m[d.date] = (m[d.date] || 0) + Number(d.count || 0);
  }
  return m;
}

function bucketLeetcode(stats) {
  const days = stats?.leetcode?.dailySubmissions || [];
  const m = {};
  for (const d of days) {
    if (!d?.date) continue;
    m[d.date] = (m[d.date] || 0) + Number(d.count || 0);
  }
  return m;
}

function bucketCodeforces(stats) {
  const days = stats?.codeforces?.dailySubmissions || [];
  const m = {};
  for (const d of days) {
    if (!d?.date) continue;
    m[d.date] = (m[d.date] || 0) + Number(d.count || 0);
  }
  return m;
}

function bucketWakatime(stats) {
  const days = stats?.wakatime?.dailyHours || [];
  const m = {};
  for (const d of days) {
    if (!d?.date) continue;
    m[d.date] = (m[d.date] || 0) + Number(d.hours || 0);
  }
  return m;
}

async function bucketGfgFromHistory(userId) {
  const history = await statsModel.getHistory(userId, "gfg", 60);
  if (!history || history.length < 2) return {};
  const deltas = snapshotDeltas(history, gfgExtractor);
  const m = {};
  for (const [day, d] of Object.entries(deltas)) {
    if (d.total > 0) m[day] = d.total;
  }
  return m;
}

/* ─── streaks ────────────────────────────────────────────────────── */

function computeStreaks(orderedDates, totalsMap) {
  let current = 0;
  let longest = 0;
  let run = 0;
  for (const d of orderedDates) {
    if ((totalsMap[d] || 0) > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  for (let i = orderedDates.length - 1; i >= 0; i -= 1) {
    if ((totalsMap[orderedDates[i]] || 0) > 0) current += 1;
    else break;
  }
  return { current, longest };
}

/* ─── buildHeatmap ───────────────────────────────────────────────── */

async function buildHeatmap(userId, days = 365) {
  const stats = await statsModel.getLatestForUser(userId);
  const dates = windowDates(days);
  const totals = emptyMap(dates);

  const gfgBucket = await bucketGfgFromHistory(userId);

  const sources = {
    github:     bucketGithub(stats),
    leetcode:   bucketLeetcode(stats),
    codeforces: bucketCodeforces(stats),
    wakatime:   bucketWakatime(stats),
    gfg:        gfgBucket,
  };

  const perDayBreakdown = {};
  for (const date of dates) {
    const breakdown = {
      github:     Number(sources.github[date]     || 0),
      leetcode:   Number(sources.leetcode[date]   || 0),
      codeforces: Number(sources.codeforces[date] || 0),
      wakatime:   Number(sources.wakatime[date]   || 0),
      gfg:        Number(sources.gfg[date]        || 0),
    };
    const total =
      breakdown.github +
      breakdown.leetcode +
      breakdown.codeforces +
      breakdown.wakatime +
      breakdown.gfg;
    totals[date] = Number(total.toFixed(2));
    perDayBreakdown[date] = breakdown;
  }

  const heatmap = dates.map((date) => ({
    date,
    count: totals[date],
    breakdown: perDayBreakdown[date],
  }));

  let bestDay = null;
  let totalActiveDays = 0;
  let totalCount = 0;
  for (const cell of heatmap) {
    if (cell.count > 0) totalActiveDays += 1;
    totalCount += cell.count;
    if (!bestDay || cell.count > bestDay.count) bestDay = cell;
  }
  const { current, longest } = computeStreaks(dates, totals);

  const perPlatform = Object.fromEntries(
    Object.entries(sources).map(([k, m]) => [
      k,
      Object.values(m).reduce((a, b) => a + Number(b || 0), 0),
    ])
  );

  return {
    heatmap,
    total: Number(totalCount.toFixed(2)),
    totalActiveDays,
    bestDay,
    streakCurrent: current,
    streakLongest: longest,
    perPlatform,
  };
}

/* ─── buildProblemsSeries (snapshot-delta approach) ───────────────── */

/**
 * Daily problems-solved series using the snapshot-delta approach.
 *
 * Instead of interpreting unreliable submission calendars, we compare
 * consecutive stats_snapshots. If snapshot N has `solved.easy = 20` and
 * snapshot N+1 has `solved.easy = 23`, we know exactly 3 easy problems
 * were solved between the two snapshots.
 *
 * Each row is `{ date, easy, medium, hard, total }` — real per-difficulty
 * counts with no approximation.
 *
 * For ranges > 90 days we bucket weekly so the chart stays readable.
 */
async function buildProblemsSeries(userId, days = 90) {
  const dates = windowDates(days);
  const emptyRow = () => ({ easy: 0, medium: 0, hard: 0, total: 0 });

  const history = await statsModel.getMultiPlatformHistory(
    userId,
    ["leetcode", "codeforces", "gfg"],
    60
  );

  const lcDeltas  = snapshotDeltas(history.leetcode  || [], lcExtractor);
  const cfDeltas  = snapshotDeltas(history.codeforces || [], cfExtractor);
  const gfgDeltas = snapshotDeltas(history.gfg        || [], gfgExtractor);

  const daily = dates.map((date) => {
    const lc  = lcDeltas[date]  || {};
    const cf  = cfDeltas[date]  || {};
    const gfg = gfgDeltas[date] || {};

    const easy   = Number(lc.easy   || 0) + Number(gfg.total || 0);
    const medium = Number(lc.medium || 0);
    const hard   = Number(lc.hard   || 0) + Number(cf.total  || 0);
    const total  = easy + medium + hard;

    return { date, easy, medium, hard, total };
  });

  if (days > 90) {
    const weekMap = {};
    for (const d of daily) {
      const dt = new Date(d.date + "T00:00:00Z");
      const dow = dt.getUTCDay();
      const monday = new Date(dt.getTime() - ((dow + 6) % 7) * DAY_MS);
      const wk = dateKey(monday);
      if (!weekMap[wk]) weekMap[wk] = { date: wk, ...emptyRow() };
      weekMap[wk].easy   += d.easy;
      weekMap[wk].medium += d.medium;
      weekMap[wk].hard   += d.hard;
      weekMap[wk].total  += d.total;
    }
    return Object.values(weekMap).sort((a, b) => a.date.localeCompare(b.date));
  }

  return daily;
}

/* ─── buildCodingTimeSeries ──────────────────────────────────────── */

async function buildCodingTimeSeries(userId, days = 30) {
  const stats = await statsModel.getLatestForUser(userId);
  const dates = windowDates(days);
  const dailyWk = {};
  for (const d of stats?.wakatime?.dailyHours || []) {
    if (d?.date) dailyWk[d.date] = Number(d.hours || 0);
  }
  const daily = dates.map((date) => ({
    date,
    hours: Number((dailyWk[date] || 0).toFixed(2)),
  }));

  const weekMap = {};
  for (const d of daily) {
    const dt = new Date(d.date + "T00:00:00Z");
    const day = dt.getUTCDay();
    const monday = new Date(dt.getTime() - ((day + 6) % 7) * DAY_MS);
    const wk = dateKey(monday);
    weekMap[wk] = (weekMap[wk] || 0) + d.hours;
  }
  const weekly = Object.entries(weekMap)
    .map(([weekStart, hours]) => ({ weekStart, hours: Number(hours.toFixed(2)) }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return { daily, weekly };
}

module.exports = {
  buildHeatmap,
  buildProblemsSeries,
  buildCodingTimeSeries,
};
