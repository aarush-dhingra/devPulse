"use strict";

const userModel = require("../models/user.model");
const statsModel = require("../models/stats.model");
const { computeDevScore, tierFor } = require("../utils/devScore");
const { HttpError } = require("../middlewares/error.middleware");
const { topN } = require("../utils/formatters");

function buildSvgCard({ user, devscore, tier, topLanguages, topStats }) {
  const lang = topLanguages.slice(0, 4).map((l, i) => `
    <rect x="${40 + i * 130}" y="320" width="${110}" height="6" rx="3" fill="${tier.color}" opacity="${1 - i * 0.15}" />
    <text x="${40 + i * 130}" y="346" fill="#cbd5e1" font-size="14" font-family="Inter">${escapeXml(l.key || l.name || "")}</text>
  `).join("");

  const stats = topStats.map((s, i) => `
    <text x="${40 + i * 200}" y="220" fill="#94a3b8" font-size="14" font-family="Inter">${escapeXml(s.label)}</text>
    <text x="${40 + i * 200}" y="252" fill="#f8fafc" font-size="28" font-weight="700" font-family="Inter">${escapeXml(String(s.value))}</text>
  `).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="380" viewBox="0 0 900 380">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="900" height="380" rx="24" fill="url(#bg)"/>
  <text x="40" y="64" fill="#f8fafc" font-size="32" font-weight="700" font-family="Inter">${escapeXml(user.name || user.username)}</text>
  <text x="40" y="92" fill="#94a3b8" font-size="16" font-family="Inter">@${escapeXml(user.username)} · DevVitals</text>

  <g transform="translate(640,40)">
    <circle cx="100" cy="100" r="92" fill="none" stroke="#1e293b" stroke-width="14"/>
    <circle cx="100" cy="100" r="92" fill="none" stroke="${tier.color}"
            stroke-width="14" stroke-linecap="round"
            stroke-dasharray="${(devscore.score / 1000) * 578} 578"
            transform="rotate(-90 100 100)"/>
    <text x="100" y="96" fill="#f8fafc" font-size="40" font-weight="800" text-anchor="middle" font-family="Inter">${devscore.score}</text>
    <text x="100" y="124" fill="#94a3b8" font-size="14" text-anchor="middle" font-family="Inter">DevScore</text>
    <text x="100" y="160" fill="${tier.color}" font-size="16" font-weight="600" text-anchor="middle" font-family="Inter">${escapeXml(tier.name)}</text>
  </g>

  ${stats}
  <text x="40" y="304" fill="#cbd5e1" font-size="14" font-family="Inter">Top Languages</text>
  ${lang}
</svg>`;
}

function escapeXml(s = "") {
  return String(s).replace(/[<>&"']/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  }[c]));
}

async function buildCardData(username) {
  const user = await userModel.findByUsername(username);
  if (!user) throw new HttpError(404, "User not found");
  if (!user.is_public) throw new HttpError(403, "Profile is private");

  const stats = await statsModel.getLatestForUser(user.id);
  const ds = computeDevScore(stats);
  const tier = tierFor(ds.score);

  const langMap =
    stats.github?.repos?.languages ||
    Object.fromEntries(
      (stats.wakatime?.languages || []).map((l) => [l.name, l.percent])
    );
  const topLanguages = topN(langMap, 5);

  const topStats = [
    {
      label: "GitHub Commits",
      value: stats.github?.commits?.totalSearched ??
        stats.github?.contributions?.total ?? 0,
    },
    {
      label: "LeetCode Solved",
      value: stats.leetcode?.solved?.total ?? 0,
    },
    {
      label: "Wakatime Hrs (30d)",
      value: Math.round(stats.wakatime?.hoursLast30Days ?? 0),
    },
    { label: "CF Rating", value: stats.codeforces?.rating ?? 0 },
  ].slice(0, 4);

  return { user, devscore: ds, tier, topLanguages, topStats };
}

async function generateCard(req, res, next) {
  try {
    const data = await buildCardData(req.params.username);
    const svg = buildSvgCard(data);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(svg);
  } catch (err) {
    next(err);
  }
}

async function generateCardSvg(req, res, next) {
  return generateCard(req, res, next);
}

module.exports = { generateCard, generateCardSvg, buildCardData, buildSvgCard };
