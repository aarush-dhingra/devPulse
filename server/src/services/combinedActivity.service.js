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
 * Daily (NOT cumulative) problems-solved series, broken down per platform.
 * Each row is `{ date, leetcode, codeforces, gfg }` representing the number
 * of problems solved that calendar day.
 *
 * Submission-calendar APIs return daily *submission* counts (multiple
 * submissions per problem are possible). To produce a "problems solved"
 * approximation we scale each platform's daily counts so the in-window sum
 * equals the platform's window-share of its lifetime solved total. The
 * result honours the relative shape of the user's activity but never
 * over-counts beyond what they've actually solved.
 *
 * For ranges > 90 days we bucket weekly so the chart stays readable.
 */
async function buildProblemsSeries(userId, days = 90) {
  const stats = await statsModel.getLatestForUser(userId);
  const dates = windowDates(days);

  const dailyFor = (allDays, totalSolved) => {
    const out = Object.fromEntries(dates.map((d) => [d, 0]));
    if (
      !Array.isArray(allDays) ||
      !allDays.length ||
      !Number.isFinite(totalSolved) ||
      totalSolved <= 0
    ) {
      return out;
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
    if (windowSum <= 0) return out;
    const windowFrac = allTimeSum > 0 ? windowSum / allTimeSum : 1;
    const target = Math.min(totalSolved, Math.round(totalSolved * windowFrac));
    if (target <= 0) {
      for (const k of Object.keys(out)) out[k] = 0;
      return out;
    }
    const scale = target / windowSum;
    // Distribute as fractional values, then round so the rounded sum is
    // close to target (largest-remainder method).
    const scaled = {};
    let runningInt = 0;
    const remainders = [];
    for (const date of dates) {
      const v = (out[date] || 0) * scale;
      const floor = Math.floor(v);
      scaled[date] = floor;
      runningInt += floor;
      remainders.push({ date, frac: v - floor });
    }
    let leftover = target - runningInt;
    remainders.sort((a, b) => b.frac - a.frac);
    for (const r of remainders) {
      if (leftover <= 0) break;
      scaled[r.date] += 1;
      leftover -= 1;
    }
    return scaled;
  };

  const lcSolved = Number(stats?.leetcode?.solved?.total || 0);
  const cfSolved = Number(stats?.codeforces?.uniqueSolved || 0);
  const gfgSolved = Number(stats?.gfg?.problemsSolved || 0);

  const lcDaily = dailyFor(stats?.leetcode?.dailySubmissions, lcSolved);
  const cfDaily = dailyFor(stats?.codeforces?.dailySubmissions, cfSolved);

  // GFG has no daily endpoint — distribute total evenly so the bars are
  // visible but don't fake daily granularity.
  const gfgDaily = Object.fromEntries(dates.map((d) => [d, 0]));
  if (gfgSolved > 0 && dates.length > 0) {
    const per = gfgSolved / dates.length;
    let acc = 0;
    let placed = 0;
    for (const d of dates) {
      acc += per;
      const whole = Math.floor(acc);
      const inc = whole - placed;
      gfgDaily[d] = inc;
      placed = whole;
    }
  }

  const daily = dates.map((date) => ({
    date,
    leetcode: Number(lcDaily[date] || 0),
    codeforces: Number(cfDaily[date] || 0),
    gfg: Number(gfgDaily[date] || 0),
  }));

  // Bucket weekly for long ranges so the chart isn't a wall of bars.
  if (days > 90) {
    const weekMap = {};
    for (const d of daily) {
      const dt = new Date(d.date + "T00:00:00Z");
      const dow = dt.getUTCDay();
      const monday = new Date(dt.getTime() - ((dow + 6) % 7) * DAY_MS);
      const wk = dateKey(monday);
      if (!weekMap[wk]) weekMap[wk] = { date: wk, leetcode: 0, codeforces: 0, gfg: 0 };
      weekMap[wk].leetcode += d.leetcode;
      weekMap[wk].codeforces += d.codeforces;
      weekMap[wk].gfg += d.gfg;
    }
    return Object.values(weekMap).sort((a, b) => a.date.localeCompare(b.date));
  }

  return daily;
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
