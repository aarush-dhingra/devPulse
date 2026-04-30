"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const scraper = createApiClient({
  baseURL: "https://www.geeksforgeeks.org",
  name: "gfg-scrape",
  timeout: 18000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    Accept: "text/html,application/xhtml+xml",
  },
});

const primary = createApiClient({
  baseURL: "https://geeks-for-geeks-stats-api.vercel.app",
  name: "gfg-primary",
});

const fallback = createApiClient({
  baseURL: "https://geeks-for-geeks-api.vercel.app",
  name: "gfg-fallback",
});

function shapePrimary(data, username) {
  return {
    profile: {
      username,
      name: data?.info?.name,
      institute: data?.info?.institute,
      instituteRank: safeNum(data?.info?.instituteRank),
    },
    score: safeNum(data?.info?.codingScore),
    problemsSolved: safeNum(data?.info?.totalProblemsSolved),
    streak: safeNum(data?.info?.currentStreak),
    maxStreak: safeNum(data?.info?.maxStreak),
    monthlyScore: safeNum(data?.info?.monthlyScore),
    solvedDetails: data?.solvedStats || {},
    fetchedAt: new Date().toISOString(),
  };
}

function shapeFallback(data, username) {
  // The fallback API returns a slightly different shape — flat fields.
  const info = data?.userInfo || data || {};
  return {
    profile: {
      username,
      name: info.name || info.userName,
      institute: info.institute_name || info.institute,
      instituteRank: safeNum(info.institute_rank ?? info.instituteRank),
    },
    score: safeNum(info.codingScore ?? info.coding_score),
    problemsSolved: safeNum(info.totalProblemsSolved ?? info.total_problems_solved),
    streak: safeNum(info.currentStreak ?? info.current_streak),
    maxStreak: safeNum(info.maxStreak ?? info.max_streak),
    monthlyScore: safeNum(info.monthlyScore ?? info.monthly_score),
    solvedDetails: data?.solvedStats || data?.solved_stats || {},
    fetchedAt: new Date().toISOString(),
  };
}

function looksValid(shaped) {
  if (!shaped) return false;
  return (
    safeNum(shaped.problemsSolved) > 0 ||
    safeNum(shaped.score) > 0 ||
    !!shaped.profile?.name
  );
}

/**
 * Pull stats out of the GFG profile page HTML by parsing the embedded
 * `self.__next_f.push([1, "...userData...{...}..."])` payloads.
 *
 * The page renders Next.js streaming chunks, each of which is a JSON-encoded
 * string that itself contains JSON. We don't try to parse the whole structure;
 * instead we walk the chunk that contains `userData` and grab the inner
 * `data: {...}` object which has all the practice stats.
 */
function shapeFromHtml(html, username) {
  if (!html || typeof html !== "string") return null;

  // Find a chunk containing the userData payload
  const marker = '\\"userData\\":';
  const idx = html.indexOf(marker);
  if (idx === -1) return null;

  // Pick out the inner data:{...} block — it's wrapped inside an outer JSON
  // string that was already escaped once. We look for the closest `data:{`
  // after `userData`.
  const dataIdx = html.indexOf('\\"data\\":', idx);
  if (dataIdx === -1) return null;
  const braceStart = html.indexOf("{", dataIdx);
  if (braceStart === -1) return null;

  // Walk balanced braces, accounting for backslash-escaped quotes/braces.
  let depth = 0;
  let i = braceStart;
  let inString = false;
  for (; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "\\") {
      i += 1;
      continue;
    }
    if (ch === '"' && html[i - 1] !== "\\") inString = !inString;
    if (inString) continue;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        i += 1;
        break;
      }
    }
  }
  if (depth !== 0) return null;
  const escaped = html.slice(braceStart, i);
  // Reverse one level of JSON escaping (the outer string was JSON-stringified).
  let unescaped;
  try {
    unescaped = JSON.parse(`"${escaped.replace(/"/g, '\\"').replace(/\\\\"/g, '\\"')}"`);
  } catch {
    // Fall back to manual unescape of the common escape sequences.
    unescaped = escaped.replace(/\\"/g, '"').replace(/\\\\/g, "\\").replace(/\\n/g, "\n");
  }

  let parsed;
  try { parsed = JSON.parse(unescaped); }
  catch {
    try { parsed = JSON.parse(escaped.replace(/\\"/g, '"')); }
    catch { return null; }
  }
  if (!parsed || typeof parsed !== "object") return null;

  const name = parsed.name || null;
  const institute = parsed.institute_name || null;

  // Look for a "name" extraction up in the mentor block as a profile fallback.
  const mentorMatch = html.match(/\\"mentor\\":\\{[^]*?\\"name\\":\\"([^"\\]*)\\"/);
  const mentorName = mentorMatch ? mentorMatch[1] : null;

  return {
    profile: {
      username,
      name: name || mentorName || username,
      institute,
      instituteRank: safeNum(parsed.institute_rank),
    },
    score: safeNum(parsed.score ?? parsed.coding_score ?? parsed.codingScore),
    problemsSolved: safeNum(parsed.total_problems_solved ?? parsed.totalProblemsSolved),
    streak: safeNum(parsed.pod_solved_current_streak ?? parsed.currentStreak),
    maxStreak: safeNum(parsed.pod_solved_longest_streak ?? parsed.maxStreak),
    monthlyScore: safeNum(parsed.monthly_score ?? parsed.monthlyScore),
    solvedDetails: {},
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchAll(usernameRaw) {
  const username = String(usernameRaw || "").trim();
  if (!username) {
    const e = new Error("GFG handle is required");
    e.code = "GFG_HANDLE_MISSING";
    throw e;
  }
  const encoded = encodeURIComponent(username);
  const errors = [];

  // Strategy 1: scrape the official profile page. This is the most reliable
  // because it doesn't depend on third-party APIs that go up and down.
  for (const path of [`/profile/${encoded}`, `/user/${encoded}`]) {
    try {
      const { data } = await scraper.get(path);
      const shaped = shapeFromHtml(data, username);
      if (looksValid(shaped)) return shaped;
    } catch (err) {
      errors.push(`scrape ${path}: ${err.message}`);
      logger.warn("GFG scrape failed", { path, username, error: err.message });
    }
  }

  // Strategy 2: third-party stats API.
  try {
    const { data } = await primary.get(`/api`, { params: { userName: username } });
    const shaped = shapePrimary(data, username);
    if (looksValid(shaped)) return shaped;
    errors.push("primary returned empty");
  } catch (err) {
    errors.push(`primary: ${err.message}`);
    logger.warn("GFG primary failed", { username, error: err.message });
  }

  // Strategy 3: alternate third-party API.
  try {
    const { data } = await fallback.get(`/${encoded}`);
    const shaped = shapeFallback(data, username);
    if (looksValid(shaped)) return shaped;
    errors.push("fallback returned empty");
  } catch (err) {
    errors.push(`fallback: ${err.message}`);
    logger.warn("GFG fallback failed", { username, error: err.message });
  }

  const friendly = new Error(
    `GFG can't find @${username} — verify the handle on geeksforgeeks.org`
  );
  friendly.code = "GFG_NOT_FOUND";
  friendly.details = errors;
  throw friendly;
}

module.exports = { fetchAll };
