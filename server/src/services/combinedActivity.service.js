"use strict";

const statsModel = require("../models/stats.model");
const { buildQuality } = require("./platformQuality.service");

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
function snapshotDeltas(snapshots, extractor, { includeInitial = false } = {}) {
  const dayMap = {};
  if (!snapshots || snapshots.length < 1) return dayMap;

  if (includeInitial) {
    const first = extractor(snapshots[0].raw_data);
    const firstDay = dateKey(new Date(snapshots[0].created_at));
    const hasInitial = Object.values(first).some((v) => Number(v || 0) > 0);
    if (hasInitial) dayMap[firstDay] = { ...first };
  }

  if (snapshots.length < 2) return dayMap;

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

function bucketGfgCalendar(stats) {
  const days = stats?.gfg?.activityCalendar || [];
  const m = {};
  for (const d of days) {
    if (!d?.date) continue;
    m[d.date] = (m[d.date] || 0) + Number(d.count || 0);
  }
  return m;
}

function codechefExtractor(raw) {
  return { total: Number(raw?.problemsSolved || 0) };
}

function hasTrustedCumulativeMetric(platform, raw) {
  const quality = raw?.quality || buildQuality(platform, raw);
  if (!quality.valid || quality.confidence === "profile-only") return false;

  if (platform === "gfg") {
    return (
      Number(raw?.problemsSolved || 0) > 0 ||
      Number(raw?.score || 0) > 0 ||
      Number(raw?.streak || 0) > 0 ||
      Number(raw?.maxStreak || 0) > 0 ||
      Number(raw?.monthlyScore || 0) > 0 ||
      Number(raw?.articlesPublished || 0) > 0 ||
      Number(raw?.potdSolved || 0) > 0 ||
      (Array.isArray(raw?.activityCalendar) && raw.activityCalendar.length > 0)
    );
  }

  if (platform === "codechef") {
    return (
      Number(raw?.problemsSolved || 0) > 0 ||
      Number(raw?.partialProblems || 0) > 0 ||
      Number(raw?.rating || 0) > 0 ||
      Number(raw?.contestsAttended || 0) > 0 ||
      (Array.isArray(raw?.ratingHistory) && raw.ratingHistory.length > 0)
    );
  }

  return true;
}

function trustedHistory(platform, snapshots = []) {
  if (platform !== "gfg" && platform !== "codechef") return snapshots;
  return snapshots.filter((snapshot) =>
    hasTrustedCumulativeMetric(platform, snapshot.raw_data)
  );
}

function atcoderExtractor(raw) {
  return { total: Number(raw?.uniqueSolved || 0) };
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
  const history = trustedHistory(
    "gfg",
    await statsModel.getHistory(userId, "gfg", 60)
  );
  if (!history || history.length < 1) return {};
  const deltas = snapshotDeltas(history, gfgExtractor, { includeInitial: true });
  const m = {};
  for (const [day, d] of Object.entries(deltas)) {
    if (d.total > 0) m[day] = d.total;
  }
  return m;
}

async function bucketCodechefFromHistory(userId) {
  const history = trustedHistory(
    "codechef",
    await statsModel.getHistory(userId, "codechef", 60)
  );
  if (!history || history.length < 1) return {};
  const deltas = snapshotDeltas(history, codechefExtractor, { includeInitial: true });
  const m = {};
  for (const [day, d] of Object.entries(deltas)) {
    if (d.total > 0) m[day] = d.total;
  }
  return m;
}

function bucketAtcoder(stats) {
  const days = stats?.atcoder?.dailySubmissions || [];
  const m = {};
  for (const d of days) {
    if (!d?.date) continue;
    m[d.date] = (m[d.date] || 0) + Number(d.count || 0);
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
  const gfgCalendar = bucketGfgCalendar(stats);

  const [gfgBucket, codechefBucket] = await Promise.all([
    Object.keys(gfgCalendar).length ? gfgCalendar : bucketGfgFromHistory(userId),
    bucketCodechefFromHistory(userId),
  ]);

  const sources = {
    github:     bucketGithub(stats),
    leetcode:   bucketLeetcode(stats),
    codeforces: bucketCodeforces(stats),
    wakatime:   bucketWakatime(stats),
    gfg:        gfgBucket,
    codechef:   codechefBucket,
    atcoder:    bucketAtcoder(stats),
  };

  const perDayBreakdown = {};
  for (const date of dates) {
    const breakdown = {
      github:     Number(sources.github[date]     || 0),
      leetcode:   Number(sources.leetcode[date]   || 0),
      codeforces: Number(sources.codeforces[date] || 0),
      wakatime:   Number(sources.wakatime[date]   || 0),
      gfg:        Number(sources.gfg[date]        || 0),
      codechef:   Number(sources.codechef[date]   || 0),
      atcoder:    Number(sources.atcoder[date]    || 0),
    };
    const total =
      breakdown.github +
      breakdown.leetcode +
      breakdown.codeforces +
      breakdown.wakatime +
      breakdown.gfg +
      breakdown.codechef +
      breakdown.atcoder;
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

  const dateSet = new Set(dates);
  const perPlatform = Object.fromEntries(
    Object.entries(sources).map(([k, m]) => [
      k,
      Object.entries(m).reduce((a, [d, v]) => a + (dateSet.has(d) ? Number(v || 0) : 0), 0),
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

/* ─── buildProblemsSeries (hybrid: snapshot deltas + calendar fallback) ── */

/**
 * Daily problem-activity series using a hybrid approach:
 *
 * 1. **Snapshot deltas** (primary, accurate): for every day where we have
 *    two consecutive snapshots, we diff `solved.easy/medium/hard` to get
 *    exact per-difficulty counts.
 *
 * 2. **Calendar fallback** (historical): when exact difficulty deltas are
 *    unavailable, we keep the activity in an `unknown` bucket. This avoids
 *    showing fake Easy/Medium/Hard spikes from submission-only calendars.
 *
 * This ensures the chart shows full historical activity while being exact
 * for recent days where snapshot data exists.
 */
async function buildProblemsSeries(userId, days = 90) {
  const stats = await statsModel.getLatestForUser(userId);
  const dates = windowDates(days);
  const emptyRow = () => ({ easy: 0, medium: 0, hard: 0, unknown: 0, total: 0 });

  /* ── snapshot deltas (accurate recent data) ── */
  const history = await statsModel.getMultiPlatformHistory(
    userId,
    ["leetcode", "codeforces", "gfg", "codechef", "atcoder"],
    60
  );
  history.gfg = trustedHistory("gfg", history.gfg || []);
  history.codechef = trustedHistory("codechef", history.codechef || []);

  const lcDeltas       = snapshotDeltas(history.leetcode   || [], lcExtractor);
  const cfDeltas       = snapshotDeltas(history.codeforces || [], cfExtractor);
  const gfgDeltas      = snapshotDeltas(history.gfg        || [], gfgExtractor, { includeInitial: true });
  const codechefDeltas = snapshotDeltas(history.codechef   || [], codechefExtractor, { includeInitial: true });
  const atcoderDeltas  = snapshotDeltas(history.atcoder    || [], atcoderExtractor);

  const lcCalendar = {};
  for (const d of stats?.leetcode?.dailySubmissions || []) {
    if (d?.date) lcCalendar[d.date] = Number(d.count || 0);
  }
  const cfCalendar = {};
  for (const d of stats?.codeforces?.dailySubmissions || []) {
    if (d?.date) cfCalendar[d.date] = Number(d.count || 0);
  }
  const atcoderCalendar = {};
  for (const d of stats?.atcoder?.dailySubmissions || []) {
    if (d?.date) atcoderCalendar[d.date] = Number(d.count || 0);
  }
  const gfgCalendar = bucketGfgCalendar(stats);

  /* ── merge: deltas take priority, calendar fills gaps ── */
  const daily = dates.map((date) => {
    const lcDelta = lcDeltas[date];
    const lcCount = lcDelta
      ? Number(lcDelta.total || 0)
      : Number(lcCalendar[date] || 0);
    const lcEasy = lcDelta
      ? Number(lcDelta.easy || 0)
      : 0;
    const lcMedium = lcDelta
      ? Number(lcDelta.medium || 0)
      : 0;
    const lcHard = lcDelta
      ? Number(lcDelta.hard || 0)
      : 0;
    const lcUnknown = lcDelta
      ? Math.max(0, Number(lcDelta.total || 0) - lcEasy - lcMedium - lcHard)
      : lcCount;

    const cfTotal = cfDeltas[date]
      ? Number(cfDeltas[date].total || 0)
      : Number(cfCalendar[date] || 0);
    const acTotal = atcoderDeltas[date]
      ? Number(atcoderDeltas[date].total || 0)
      : Number(atcoderCalendar[date] || 0);
    const gfgTotal = gfgDeltas[date]
      ? Number(gfgDeltas[date].total || 0)
      : Number(gfgCalendar[date] || 0);
    const codechefTotal = Number(codechefDeltas[date]?.total || 0);

    const unknown = lcUnknown + cfTotal + acTotal + gfgTotal + codechefTotal;
    const easy = lcEasy;
    const medium = lcMedium;
    const hard = lcHard;
    const total = easy + medium + hard + unknown;

    if (total === 0) return { date, ...emptyRow(), breakdown: {} };

    return {
      date,
      easy,
      medium,
      hard,
      unknown,
      total,
      breakdown: {
        leetcode: lcCount,
        codeforces: cfTotal,
        gfg: gfgTotal,
        codechef: codechefTotal,
        atcoder: acTotal,
      },
    };
  });

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
