"use strict";

const cheerio = require("cheerio");
const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const { assertUsableSnapshot } = require("./platformQuality.service");
const logger = require("../utils/logger");

const HTML_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const authPractice = createApiClient({
  baseURL: "https://auth.geeksforgeeks.org",
  name: "gfg-auth-practice",
  timeout: 18000,
  headers: HTML_HEADERS,
});

const scraper = createApiClient({
  baseURL: "https://www.geeksforgeeks.org",
  name: "gfg-scrape",
  timeout: 18000,
  headers: HTML_HEADERS,
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
    source: "gfg-third-party-primary",
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
    source: "gfg-third-party-fallback",
    fetchedAt: new Date().toISOString(),
  };
}

function tryUsable(shaped) {
  if (!shaped) return null;
  try {
    return assertUsableSnapshot("gfg", shaped);
  } catch {
    return null;
  }
}

function countSubmissionBucket(bucket) {
  if (!bucket) return 0;
  if (Array.isArray(bucket)) return bucket.length;
  if (typeof bucket === "object") return Object.keys(bucket).length;
  return 0;
}

function normalizeSolvedDetails(submissions = {}) {
  const out = {};
  for (const [difficulty, bucket] of Object.entries(submissions || {})) {
    const key = String(difficulty).toLowerCase();
    out[key] = countSubmissionBucket(bucket);
  }
  return out;
}

function findDeep(root, predicate, depth = 0, seen = new Set()) {
  if (!root || typeof root !== "object" || depth > 10 || seen.has(root)) return null;
  seen.add(root);
  if (predicate(root)) return root;
  for (const value of Object.values(root)) {
    const found = findDeep(value, predicate, depth + 1, seen);
    if (found) return found;
  }
  return null;
}

function shapeFromAuthPracticeHtml(html, username) {
  if (!html || typeof html !== "string") return null;

  const $ = cheerio.load(html);
  const raw = $("script#__NEXT_DATA__[type='application/json']").html() ||
    $("script#__NEXT_DATA__").html();
  if (!raw) return shapeFromHtml(html, username, "gfg-auth-practice-stream");

  let nextData;
  try {
    nextData = JSON.parse(raw);
  } catch {
    return null;
  }

  const pageProps = nextData?.props?.pageProps || {};
  const userInfo =
    pageProps.userInfo ||
    pageProps.userData ||
    findDeep(pageProps, (node) =>
      safeNum(node.total_problems_solved ?? node.totalProblemsSolved) > 0 ||
      safeNum(node.score ?? node.coding_score ?? node.codingScore) > 0 ||
      typeof node.institute_name === "string" ||
      typeof node.profile_image_url === "string"
    );
  if (!userInfo) return null;

  const submissions =
    pageProps.userSubmissionsInfo ||
    pageProps.userSubmissions ||
    pageProps.submissionsInfo ||
    {};
  const solvedDetails = normalizeSolvedDetails(submissions);
  const solvedFromSubmissions = Object.values(solvedDetails)
    .reduce((sum, count) => sum + safeNum(count), 0);

  return {
    profile: {
      username,
      name: userInfo.name || userInfo.display_name || username,
      avatar: userInfo.profile_image_url || userInfo.profileImage || null,
      institute: userInfo.institute_name || userInfo.institute || null,
      instituteRank: safeNum(userInfo.institute_rank ?? userInfo.instituteRank),
    },
    score: safeNum(userInfo.score ?? userInfo.coding_score ?? userInfo.codingScore),
    problemsSolved: safeNum(
      userInfo.total_problems_solved ??
        userInfo.totalProblemsSolved ??
        solvedFromSubmissions
    ),
    streak: safeNum(
      userInfo.pod_solved_current_streak ??
        userInfo.current_streak ??
        userInfo.currentStreak
    ),
    maxStreak: safeNum(
      userInfo.pod_solved_longest_streak ??
        userInfo.pod_solved_global_longest_streak ??
        userInfo.max_streak ??
        userInfo.maxStreak
    ),
    monthlyScore: safeNum(userInfo.monthly_score ?? userInfo.monthlyScore),
    solvedDetails,
    source: "gfg-auth-practice-next-data",
    fetchedAt: new Date().toISOString(),
  };
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
function shapeFromHtml(html, username, source = "gfg-profile-stream") {
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
    source,
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

  // Strategy 1: structured Next.js data from the official auth/practice page.
  try {
    const { data } = await authPractice.get(`/user/${encoded}/practice/`);
    const shaped = tryUsable(shapeFromAuthPracticeHtml(data, username));
    if (shaped) return shaped;
    errors.push("auth practice returned no trusted stats");
  } catch (err) {
    errors.push(`auth practice: ${err.message}`);
    logger.warn("GFG auth practice failed", { username, error: err.message });
  }

  // Strategy 2: scrape the public profile page streaming payload.
  for (const path of [`/profile/${encoded}`, `/user/${encoded}`]) {
    try {
      const { data } = await scraper.get(path);
      const shaped = tryUsable(shapeFromHtml(data, username));
      if (shaped) return shaped;
      errors.push(`scrape ${path}: returned no trusted stats`);
    } catch (err) {
      errors.push(`scrape ${path}: ${err.message}`);
      logger.warn("GFG scrape failed", { path, username, error: err.message });
    }
  }

  // Strategy 3: third-party stats API.
  try {
    const { data } = await primary.get(`/api`, { params: { userName: username } });
    const shaped = tryUsable(shapePrimary(data, username));
    if (shaped) return shaped;
    errors.push("primary returned empty");
  } catch (err) {
    errors.push(`primary: ${err.message}`);
    logger.warn("GFG primary failed", { username, error: err.message });
  }

  // Strategy 4: alternate third-party API.
  try {
    const { data } = await fallback.get(`/${encoded}`);
    const shaped = tryUsable(shapeFallback(data, username));
    if (shaped) return shaped;
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
