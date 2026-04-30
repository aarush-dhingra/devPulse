"use strict";

const { clamp, safeNum } = require("./formatters");

/**
 * Normalize raw values to 0–100 with a soft logarithmic curve.
 * Anchors give "what value should map to 100".
 */
function norm(value, anchor, { logScale = false } = {}) {
  const v = Math.max(0, safeNum(value));
  if (!anchor) return 0;
  if (logScale) {
    const ratio = Math.log10(v + 1) / Math.log10(anchor + 1);
    return clamp(ratio * 100, 0, 100);
  }
  return clamp((v / anchor) * 100, 0, 100);
}

const ANCHORS = {
  githubCommits: 5000,
  leetcodeWeighted: 1500,
  wakatimeHours30d: 200,
  codeforcesRating: 2400,
  gfgScore: 5000,
};

const WEIGHTS = {
  github: 0.3,
  leetcode: 0.25,
  wakatime: 0.2,
  codeforces: 0.15,
  gfg: 0.1,
};

function computeDevScore(stats = {}) {
  const gh = stats.github || {};
  const lc = stats.leetcode || {};
  const wt = stats.wakatime || {};
  const cf = stats.codeforces || {};
  const gfg = stats.gfg || {};

  const githubCommits = safeNum(
    gh.commits?.totalSearched ??
      gh.contributions?.total ??
      0
  );

  const leetcodeWeighted =
    safeNum(lc.solved?.easy) * 1 +
    safeNum(lc.solved?.medium) * 3 +
    safeNum(lc.solved?.hard) * 5;

  const wakatimeHours = safeNum(wt.hoursLast30Days);
  const codeforcesRating = safeNum(cf.rating);
  const gfgScore = safeNum(gfg.score);

  const components = {
    github: norm(githubCommits, ANCHORS.githubCommits, { logScale: true }),
    leetcode: norm(leetcodeWeighted, ANCHORS.leetcodeWeighted, {
      logScale: true,
    }),
    wakatime: norm(wakatimeHours, ANCHORS.wakatimeHours30d),
    codeforces: norm(codeforcesRating, ANCHORS.codeforcesRating),
    gfg: norm(gfgScore, ANCHORS.gfgScore, { logScale: true }),
  };

  const weighted =
    components.github * WEIGHTS.github +
    components.leetcode * WEIGHTS.leetcode +
    components.wakatime * WEIGHTS.wakatime +
    components.codeforces * WEIGHTS.codeforces +
    components.gfg * WEIGHTS.gfg;

  // Map [0..100] to [0..1000]
  const score = Math.round(weighted * 10);

  return {
    score: clamp(score, 0, 1000),
    components,
    weights: WEIGHTS,
    raw: {
      githubCommits,
      leetcodeWeighted,
      wakatimeHours,
      codeforcesRating,
      gfgScore,
    },
  };
}

function tierFor(score) {
  if (score >= 900) return { name: "Legend", color: "#f59e0b" };
  if (score >= 750) return { name: "Elite", color: "#a855f7" };
  if (score >= 600) return { name: "Pro", color: "#3b82f6" };
  if (score >= 400) return { name: "Skilled", color: "#10b981" };
  if (score >= 200) return { name: "Rising", color: "#06b6d4" };
  return { name: "Rookie", color: "#64748b" };
}

module.exports = { computeDevScore, tierFor, ANCHORS, WEIGHTS };
