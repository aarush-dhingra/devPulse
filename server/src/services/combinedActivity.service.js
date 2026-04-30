"use strict";

const statsModel = require("../models/stats.model");

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Build a 365-day window of dates ending today (UTC, day-precision).
 */
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

async function buildHeatmap(userId) {
  const stats = await statsModel.getLatestForUser(userId);
  const dates = windowDates(365);
  const totals = emptyMap(dates);

  const sources = {
    github: bucketGithub(stats),
    leetcode: bucketLeetcode(stats),
    codeforces: bucketCodeforces(stats),
    wakatime: bucketWakatime(stats),
  };

  const perDayBreakdown = {};
  for (const date of dates) {
    const breakdown = {
      github: Number(sources.github[date] || 0),
      leetcode: Number(sources.leetcode[date] || 0),
      codeforces: Number(sources.codeforces[date] || 0),
      wakatime: Number(sources.wakatime[date] || 0),
    };
    // Summed intensity: counts directly + wakatime hours scaled (1h ≈ 1 unit)
    const total =
      breakdown.github +
      breakdown.leetcode +
      breakdown.codeforces +
      breakdown.wakatime;
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

/**
 * Multi-line problems-solved series (cumulative) by day.
 *
 * The submission-calendar APIs return daily *submission* counts (not unique
 * problems), so naively cumulating them can wildly exceed the user's actual
 * solved count. We use a two-pass approach:
 *
 * 1. Build raw per-day submission counts inside the window.
 * 2. Compute each platform's contribution INSIDE the window as a fraction of
 *    its total submissions ever (window_sum / all_time_sum), then multiply
 *    that fraction by the platform's known total problems solved. This gives
 *    an anchored end-value (cumulative-at-end ≤ total problems solved).
 * 3. Finally scale each day proportionally so the cumulative line ends at the
 *    anchored value.
 */
async function buildProblemsSeries(userId, days = 90) {
  const stats = await statsModel.getLatestForUser(userId);
  const dates = windowDates(days);

  const seriesFor = (allDays, totalSolved) => {
    const out = Object.fromEntries(dates.map((d) => [d, 0]));
    if (!Array.isArray(allDays) || !allDays.length || !Number.isFinite(totalSolved) || totalSolved <= 0) {
      return dates.map((date) => ({ date, value: 0 }));
    }
    let allTimeSum = 0;
    let windowSum = 0;
    for (const d of allDays) {
      const c = Number(d.count || 0);
      if (!c) continue;
      allTimeSum += c;
      if (d.date in out) {
        out[d.date] += c;
        windowSum += c;
      }
    }
    if (windowSum <= 0) {
      return dates.map((date) => ({ date, value: 0 }));
    }
    // Fraction of all-time submissions that fall inside our window.
    const windowFrac = allTimeSum > 0 ? windowSum / allTimeSum : 1;
    // Anchored end value — cap at totalSolved so we never exceed reality.
    const targetEnd = Math.min(totalSolved, Math.round(totalSolved * windowFrac));
    // Scale daily counts so cumulative ends exactly at targetEnd.
    const scale = targetEnd / windowSum;
    let cum = 0;
    return dates.map((date) => {
      cum += Number(out[date] || 0) * scale;
      return { date, value: Math.round(cum) };
    });
  };

  const lcSolved = Number(stats?.leetcode?.solved?.total || 0);
  const cfSolved = Number(stats?.codeforces?.uniqueSolved || 0);
  const gfgSolved = Number(stats?.gfg?.problemsSolved || 0);

  const lcSeries = seriesFor(stats?.leetcode?.dailySubmissions, lcSolved);
  const cfSeries = seriesFor(stats?.codeforces?.dailySubmissions, cfSolved);

  // GFG has no daily endpoint; smear current total flat across the window so
  // the line gently rises rather than stair-stepping at the end.
  const gfgPerDay = gfgSolved && dates.length > 0 ? gfgSolved / dates.length : 0;
  const gfgSeries = dates.map((date, i) => ({ date, value: Math.round(gfgPerDay * (i + 1)) }));

  return dates.map((date, i) => ({
    date,
    leetcode: lcSeries[i].value,
    codeforces: cfSeries[i].value,
    gfg: gfgSeries[i].value,
  }));
}

/**
 * Daily Wakatime hours (and a weekly aggregation) for the bar chart.
 */
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

  // Weekly aggregate (last 12 weeks)
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
