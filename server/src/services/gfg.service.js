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

const practiceApi = createApiClient({
  baseURL: "https://practiceapi.geeksforgeeks.org",
  name: "gfg-practice-api",
  timeout: 18000,
  headers: {
    ...HTML_HEADERS,
    Accept: "application/json, text/plain, */*",
    Referer: "https://www.geeksforgeeks.org/",
    Origin: "https://www.geeksforgeeks.org",
  },
});

function shapePrimary(data, username) {
  const solvedStats = data?.solvedStats || {};
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
    solvedDetails: normalizeSolvedDetails(solvedStats),
    solvedProblems: normalizeSolvedProblemLists(solvedStats),
    source: "gfg-third-party-primary",
    fetchedAt: new Date().toISOString(),
  };
}

function shapeFallback(data, username) {
  // The fallback API returns a slightly different shape — flat fields.
  const info = data?.userInfo || data || {};
  const solvedStats = data?.solvedStats || data?.solved_stats || {};
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
    solvedDetails: normalizeSolvedDetails(solvedStats),
    solvedProblems: normalizeSolvedProblemLists(solvedStats),
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
  if (typeof bucket === "number") return safeNum(bucket);
  if (typeof bucket === "string") return safeNum(bucket);
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

function walk(root, visitor, depth = 0, seen = new Set()) {
  if (!root || typeof root !== "object" || depth > 12 || seen.has(root)) return;
  seen.add(root);
  visitor(root);
  if (Array.isArray(root)) {
    for (const item of root) walk(item, visitor, depth + 1, seen);
    return;
  }
  for (const value of Object.values(root)) walk(value, visitor, depth + 1, seen);
}

function decodeRscText(value = "") {
  return String(value)
    .replace(/\\"/g, '"')
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

function extractObjectAfterKey(html, key) {
  if (!html || !key) return null;
  const markers = [`\\"${key}\\":`, `"${key}":`];

  for (const marker of markers) {
    const markerIndex = html.indexOf(marker);
    if (markerIndex === -1) continue;
    const braceStart = html.indexOf("{", markerIndex + marker.length);
    if (braceStart === -1) continue;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = braceStart; i < html.length; i += 1) {
      const ch = html[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = !inString;
      if (inString) continue;
      if (ch === "{") depth += 1;
      if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          const raw = html.slice(braceStart, i + 1);
          for (const candidate of [raw, decodeRscText(raw)]) {
            try {
              return JSON.parse(candidate);
            } catch {
              // Try the next representation.
            }
          }
          break;
        }
      }
    }
  }
  return null;
}

function firstNumber(...values) {
  for (const value of values) {
    const n = safeNum(value);
    if (n > 0) return n;
  }
  return 0;
}

function normalizeDate(value) {
  if (!value) return null;
  if (typeof value === "number") {
    const dt = new Date(value > 1e12 ? value : value * 1000);
    return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const dt = new Date(text);
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString().slice(0, 10);
}

function pickText(node, keys) {
  for (const key of keys) {
    const value = node?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeDifficulty(value) {
  const key = String(value || "").toLowerCase().trim();
  if (key.includes("school")) return "school";
  if (key.includes("basic")) return "basic";
  if (key.includes("easy")) return "easy";
  if (key.includes("medium")) return "medium";
  if (key.includes("hard")) return "hard";
  return key || "unknown";
}

// Known non-problem labels from GFG stats summary objects.
const GFG_NON_PROBLEM_LABELS = new Set([
  "coding score", "problems solved", "institute rank", "articles published",
  "monthly score", "current streak", "max streak", "longest streak",
  "potd solved", "school", "basic", "easy", "medium", "hard",
  "total", "score", "rank", "streak",
]);

function isPlausibleProblemTitle(title) {
  if (!title || typeof title !== "string") return false;
  const t = title.trim();
  if (t.length < 4) return false;
  if (/^\d+$/.test(t)) return false;
  if (t.endsWith(":")) return false;
  if (/^\d+\s+(day|days)/i.test(t)) return false;
  if (GFG_NON_PROBLEM_LABELS.has(t.toLowerCase())) return false;
  return true;
}

function normalizeProblemEntry(entry) {
  if (!entry) return null;
  if (typeof entry === "string") {
    const title = entry.trim();
    if (!isPlausibleProblemTitle(title)) return null;
    return { title };
  }
  if (typeof entry !== "object") return null;
  const title = pickText(entry, [
    "pname",          // GFG submissions API: { pname: "...", slug: "...", user_subtime: "..." }
    "title",
    "name",
    "problem_name",
    "problemName",
    "problem_title",
    "problemTitle",
  ]);
  if (!title || !isPlausibleProblemTitle(title)) return null;
  return {
    title,
    url: pickText(entry, ["url", "link", "href", "problem_url", "problemUrl"]),
    slug: pickText(entry, ["slug", "problem_slug", "problemSlug"]),
  };
}

function normalizeProblemBucket(bucket) {
  if (!bucket) return [];
  if (Array.isArray(bucket)) return bucket.map(normalizeProblemEntry).filter(Boolean);
  if (typeof bucket === "object") {
    // If ALL values are primitives (numbers/strings/null), this is a stats-summary
    // map like { "Coding Score": 33 }, not a problem list — skip it entirely.
    const values = Object.values(bucket);
    const isStatMap = values.length > 0 && values.every((v) => v === null || typeof v !== "object");
    if (isStatMap) return [];
    return Object.entries(bucket)
      .map(([key, value]) => normalizeProblemEntry(value) || normalizeProblemEntry(key))
      .filter(Boolean);
  }
  return [];
}

function normalizeSolvedProblemLists(submissions = {}) {
  const out = {};
  for (const [difficulty, bucket] of Object.entries(submissions || {})) {
    const key = normalizeDifficulty(difficulty);
    const problems = normalizeProblemBucket(bucket);
    if (problems.length) out[key] = uniqueBy(problems, (problem) => problem.title.toLowerCase());
  }
  return out;
}

function parseBreakdownCountsFromText(text = "") {
  const counts = {};
  for (const difficulty of ["school", "basic", "easy", "medium", "hard"]) {
    const match = text.match(new RegExp(`${difficulty}\\s*\\((\\d+)\\)`, "i"));
    counts[difficulty] = match ? safeNum(match[1]) : 0;
  }
  return counts;
}

function parseVisibleProblemLines(text = "", difficulty, expectedCount) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hardIndex = lines.findIndex((line) => /^hard\s*\(\d+\)$/i.test(line));
  if (hardIndex === -1) return [];
  const candidates = lines
    .slice(hardIndex + 1)
    .filter((line) => !/^no\s+.+\s+level\s+problems\s+solved\.$/i.test(line))
    .filter((line) => !/^(school|basic|easy|medium|hard)\s*\(\d+\)$/i.test(line));
  return candidates.slice(0, expectedCount || candidates.length).map((title) => ({
    title,
    difficulty,
  }));
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeTopicStats(roots = []) {
  const out = [];
  for (const root of roots) {
    walk(root, (node) => {
      if (Array.isArray(node)) return;
      const name = pickText(node, [
        "tag_name",
        "tagName",
        "topic_name",
        "topicName",
        "category",
        "name",
        "title",
      ]);
      const solved = firstNumber(
        node.solved,
        node.solved_count,
        node.solvedCount,
        node.count,
        node.problem_count,
        node.problemCount,
        node.total
      );
      if (!name || !solved) return;
      const normalized = name.toLowerCase();
      if (["easy", "medium", "hard", "school", "basic"].includes(normalized)) return;
      out.push({ name, solved });
    });
  }
  return uniqueBy(out, (item) => item.name.toLowerCase())
    .sort((a, b) => b.solved - a.solved)
    .slice(0, 12);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeActivityCalendar(roots = []) {
  const byDate = {};
  for (const root of roots) {
    walk(root, (node) => {
      if (Array.isArray(node)) return;

      // Format A: { date: "YYYY-MM-DD", count: N, ... } — standard per-submission node.
      const dateField = normalizeDate(
        node.date || node.submission_date || node.submissionDate ||
        node.created_at || node.createdAt || node.day
      );
      if (dateField) {
        // Only count nodes that have an explicit positive count — never default to 1,
        // as that causes stat-data nodes (which just happen to have a date field) to
        // be counted as activity.
        const count = firstNumber(node.count, node.submissions);
        if (count) byDate[dateField] = (byDate[dateField] || 0) + count;
        return;
      }

      // Format B: { "YYYY-MM-DD": N, "YYYY-MM-DD": M, ... } — date-keyed heatmap.
      // GFG often serialises its contribution calendar in this format. Only treat as
      // a heatmap when every key in the object looks like an ISO date string.
      const keys = Object.keys(node);
      if (keys.length >= 1 && keys.every((k) => ISO_DATE_RE.test(k))) {
        for (const [k, v] of Object.entries(node)) {
          const n = typeof v === "number" ? v : safeNum(v);
          if (n > 0) byDate[k] = (byDate[k] || 0) + n;
        }
      }
    });
  }
  return Object.entries(byDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Known GFG profile stat labels that are NOT problem titles.
const GFG_STAT_LABELS = new Set([
  "coding score", "problems solved", "institute rank", "articles published",
  "monthly score", "current streak", "max streak", "longest streak",
  "potd solved", "school", "basic", "easy", "medium", "hard",
]);

function normalizeRecentActivity(roots = []) {
  const out = [];
  for (const root of roots) {
    walk(root, (node) => {
      if (Array.isArray(node)) return;
      // Only use problem-specific keys — never "name" or "title" alone, as those
      // match every stat row on the profile page.
      const title = pickText(node, [
        "problem_name",
        "problemName",
        "problem_title",
        "problemTitle",
        "article_title",
        "articleTitle",
      ]);
      if (!title) return;
      // Must look like an actual problem title (length > 3, not a raw number, not a stat label).
      if (title.length <= 3) return;
      if (/^\d+$/.test(title.trim())) return;
      if (GFG_STAT_LABELS.has(title.toLowerCase().trim())) return;
      // Must have an explicit date — bare stat objects don't track submission dates.
      const date = normalizeDate(node.date || node.created_at || node.createdAt || node.submission_date || node.submissionDate);
      if (!date) return;
      const type = pickText(node, ["type", "eventType", "activityType", "status"]) || "activity";
      const difficulty = pickText(node, ["difficulty", "level", "problem_level", "problemLevel"]);
      const url = pickText(node, ["url", "link", "href", "problem_url", "problemUrl"]);
      out.push({ type, title, difficulty, date, url });
    });
  }
  return uniqueBy(out, (item) => `${item.type}:${item.title}:${item.date || ""}`).slice(0, 10);
}

function normalizePotdHistory(roots = []) {
  const out = [];
  for (const root of roots) {
    walk(root, (node) => {
      if (Array.isArray(node)) return;
      const blob = JSON.stringify(node).toLowerCase();
      if (!blob.includes("potd") && !blob.includes("problem of the day")) return;
      const title = pickText(node, ["problem_name", "problemName", "title", "name"]) || "Problem of the Day";
      const date = normalizeDate(node.date || node.created_at || node.createdAt || node.solved_at || node.solvedAt);
      const status = pickText(node, ["status", "result"]) || (node.solved ? "Solved" : "Attempted");
      out.push({ title, date, status });
    });
  }
  return uniqueBy(out, (item) => `${item.title}:${item.date || ""}`).slice(0, 10);
}

function parseActivityPage(html, username) {
  if (!html || typeof html !== "string") return {};

  // Calendar-only roots: pure per-day activity sources.
  // Keep these separate from stats/problem roots so that cumulative
  // per-difficulty counts in submissionsInfo/solvedStats don't get
  // mis-attributed as single-day activity in normalizeActivityCalendar.
  const calendarRoots = [
    extractObjectAfterKey(html, "activityData"),
    extractObjectAfterKey(html, "userActivity"),
    extractObjectAfterKey(html, "calendarData"),
    extractObjectAfterKey(html, "heatMap"),
    extractObjectAfterKey(html, "heatmap"),
    extractObjectAfterKey(html, "submissionCalendar"),
    extractObjectAfterKey(html, "activityCalendar"),
    extractObjectAfterKey(html, "activityHeatmap"),
    extractObjectAfterKey(html, "contributions"),
    extractObjectAfterKey(html, "userContributions"),
    extractObjectAfterKey(html, "dailyActivity"),
  ].filter(Boolean);

  const activityRoots = [
    ...calendarRoots,
    extractObjectAfterKey(html, "recentActivity"),
    extractObjectAfterKey(html, "potdData"),
    // Note: submissionsInfo / userSubmissionsInfo / solvedStats are intentionally
    // excluded here. On the activity tab page those keys contain cumulative
    // stats-summary objects (not per-problem lists), which contaminate both the
    // calendar (wrong dates) and solvedProblems (garbage titles like month names).
    // Actual problem data is extracted from userSubmissionsInfo in shapeFromAuthPracticeHtml.
  ].filter(Boolean);

  const userData = extractObjectAfterKey(html, "userData");
  const info = userData?.data || userData?.userData?.data || {};
  const articleCount = extractObjectAfterKey(html, "articleCount") || {};

  const activityCalendar = normalizeActivityCalendar(calendarRoots);
  const topicStats = normalizeTopicStats(activityRoots);
  const totalTopics = topicStats.reduce((sum, item) => sum + item.solved, 0);

  return {
    profile: {
      username,
      name: info.name,
      avatar: info.profile_image_url || info.profileImage || null,
      institute: info.institute_name || info.institute || null,
      instituteRank: safeNum(info.institute_rank ?? info.instituteRank),
    },
    score: safeNum(info.score ?? info.coding_score ?? info.codingScore),
    problemsSolved: safeNum(info.total_problems_solved ?? info.totalProblemsSolved),
    streak: safeNum(info.pod_solved_current_streak ?? info.currentStreak),
    maxStreak: safeNum(info.pod_solved_longest_streak ?? info.maxStreak),
    monthlyScore: safeNum(info.monthly_score ?? info.monthlyScore),
    articlesPublished: safeNum(articleCount.total_articles_published ?? articleCount.totalArticlesPublished),
    potdSolved: safeNum(info.pod_correct_submissions_count ?? info.potdSolved),
    activityCalendar,
    recentActivity: normalizeRecentActivity(activityRoots),
    potdHistory: normalizePotdHistory(activityRoots),
    topicStats,
    topicMastery: topicStats.map((item) => ({
      ...item,
      percent: totalTopics > 0 ? Math.round((item.solved / totalTopics) * 1000) / 10 : 0,
    })),
  };
}

async function parseRenderedActivityPage(username, encoded) {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    return {};
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(HTML_HEADERS["User-Agent"]);
    await page.goto(`https://www.geeksforgeeks.org/profile/${encoded}?tab=activity`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await page.waitForFunction(
      () => document.body?.innerText?.includes("Problems Breakdown"),
      { timeout: 20000 }
    ).catch(() => {});

    const initialText = await page.evaluate(() => document.body.innerText || "");
    const solvedDetails = parseBreakdownCountsFromText(initialText);
    const solvedProblems = {};

    for (const difficulty of ["school", "basic", "easy", "medium", "hard"]) {
      await page.evaluate((label) => {
        const pattern = new RegExp(`^${label}\\s*\\(\\d+\\)$`, "i");
        const nodes = [...document.querySelectorAll("button, div, span, a")];
        const target = nodes.find((node) => pattern.test((node.innerText || node.textContent || "").trim()));
        if (target) target.click();
      }, difficulty);
      await new Promise((resolve) => setTimeout(resolve, 350));
      const text = await page.evaluate(() => document.body.innerText || "");
      const problems = parseVisibleProblemLines(text, difficulty, solvedDetails[difficulty]);
      if (problems.length) solvedProblems[difficulty] = problems;
    }

    return {
      solvedDetails,
      solvedProblems,
      source: "gfg-rendered-activity",
    };
  } catch (err) {
    logger.warn("GFG rendered activity scrape failed", { username, error: err.message });
    return {};
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function parsePotdItemsFromText(text = "") {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items = [];
  let year = new Date().getFullYear();
  const monthMap = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };
  const datePattern = /^(\d{1,2})\s+([A-Za-z]+)$/;

  for (let i = 0; i < lines.length; i += 1) {
    if (/^20\d{2}$/.test(lines[i])) {
      year = safeNum(lines[i]) || year;
      continue;
    }
    const dateMatch = lines[i].match(datePattern);
    if (!dateMatch || monthMap[dateMatch[2].toLowerCase()] == null) continue;

    const dateLabel = lines[i];
    const title = lines[i + 1];
    if (!title || /^(Problem Of The Day|Powered by|Previous Problems|Redeem)$/i.test(title)) continue;

    const windowLines = lines.slice(i + 2, i + 12);
    const status = windowLines.find((line) => /^(Solved|Solve Problem)$/i.test(line)) || "Open";
    const meta = windowLines.find((line) => /^(School|Basic|Easy|Medium|Hard)/i.test(line) && /%$/.test(line));
    const difficulty = meta?.match(/^(School|Basic|Easy|Medium|Hard)/i)?.[1] || null;
    const accuracy = meta?.match(/(\d+(?:\.\d+)?%)$/)?.[1] || null;
    const parsedDate = new Date(Date.UTC(year, monthMap[dateMatch[2].toLowerCase()], safeNum(dateMatch[1])))
      .toISOString()
      .slice(0, 10);

    items.push({
      date: parsedDate,
      dateLabel,
      title,
      difficulty,
      accuracy,
      status: /^solved$/i.test(status) ? "Solved" : "Open",
      url: "https://www.geeksforgeeks.org/problem-of-the-day",
    });
  }

  return uniqueBy(items, (item) => `${item.dateLabel}:${item.title}`).slice(0, 8);
}

async function parseRenderedPotdPage() {
  let puppeteer;
  try {
    puppeteer = require("puppeteer");
  } catch {
    return {};
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setUserAgent(HTML_HEADERS["User-Agent"]);
    await page.goto("https://www.geeksforgeeks.org/problem-of-the-day", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await page.waitForFunction(
      () => document.body?.innerText?.includes("Previous Problems"),
      { timeout: 20000 }
    ).catch(() => {});
    const text = await page.evaluate(() => document.body.innerText || "");
    const potdHistory = parsePotdItemsFromText(text);
    return {
      publicPotd: potdHistory[0] || null,
      potdHistory,
    };
  } catch (err) {
    logger.warn("GFG POTD page scrape failed", { error: err.message });
    return {};
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function mergeActivityEnrichment(base, enrichment = {}) {
  const mergedProfile = {
    ...(base.profile || {}),
    ...Object.fromEntries(
      Object.entries(enrichment.profile || {}).filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== 0)
    ),
  };
  const merged = { ...base, profile: mergedProfile };
  for (const key of [
    "score",
    "problemsSolved",
    "streak",
    "maxStreak",
    "monthlyScore",
    "articlesPublished",
    "potdSolved",
  ]) {
    if (safeNum(enrichment[key]) > 0) merged[key] = safeNum(enrichment[key]);
  }
  for (const key of ["activityCalendar", "recentActivity", "potdHistory", "topicStats", "topicMastery"]) {
    if (Array.isArray(enrichment[key]) && enrichment[key].length) merged[key] = enrichment[key];
  }
  if (enrichment.publicPotd) merged.publicPotd = enrichment.publicPotd;
  for (const key of ["solvedDetails", "solvedProblems"]) {
    if (
      enrichment[key] &&
      typeof enrichment[key] === "object" &&
      Object.values(enrichment[key]).some((value) => {
        if (Array.isArray(value)) return value.length > 0;
        return safeNum(value) > 0;
      })
    ) {
      merged[key] = enrichment[key];
    }
  }
  return merged;
}

/**
 * Fetch the full submission history from GFG's practice API.
 * Returns shaped enrichment data: activityCalendar, recentActivity,
 * solvedDetails, solvedProblems, and problemsSolved.
 *
 * Response shape:
 *   { status: "success", result: { Medium: { id: { pname, slug, lang, user_subtime } } }, count: N }
 */
async function fetchSubmissionsData(username) {
  try {
    const { data } = await practiceApi.post(
      "/api/v1/user/problems/submissions/",
      { handle: username }
    );

    if (data?.status !== "success" || !data?.result) return null;

    // Reuse the same extractor used for __NEXT_DATA__ (same shape).
    const parsed = extractCalendarFromSubmissions(data.result);
    if (!parsed?.activityCalendar?.length) return null;

    const solvedDetails = normalizeSolvedDetails(data.result);
    const solvedProblems = normalizeSolvedProblemLists(data.result);
    const totalSolved = safeNum(data.count) ||
      Object.values(solvedDetails).reduce((s, n) => s + n, 0);

    logger.info("GFG submissions API ok", {
      username,
      total: totalSolved,
      activeDays: parsed.activityCalendar.length,
    });

    return {
      activityCalendar: parsed.activityCalendar,
      recentActivity: parsed.recentActivity,
      solvedDetails,
      solvedProblems,
      problemsSolved: totalSolved || undefined,
    };
  } catch (err) {
    logger.warn("GFG submissions API failed", { username, error: err.message });
    return null;
  }
}

async function enrichFromActivityPage(shaped, username, encoded, errors) {
  // Primary enrichment: direct submissions API → gives exact per-day activityCalendar,
  // per-problem recentActivity, and accurate difficulty breakdown.
  const submissionsEnrichment = await fetchSubmissionsData(username);
  if (submissionsEnrichment) {
    shaped = mergeActivityEnrichment(shaped, submissionsEnrichment);
  }

  // Secondary enrichment: HTML scrape of the activity tab → fills in topic stats,
  // POTD history, and any calendar data not covered by the submissions API.
  try {
    const { data } = await scraper.get(`/profile/${encoded}?tab=activity`);
    const enrichment = parseActivityPage(data, username);
    let merged = mergeActivityEnrichment(shaped, enrichment);
    // Only run puppeteer if we still have no problem list after both passes.
    if (!Object.keys(merged.solvedProblems || {}).length) {
      const rendered = await parseRenderedActivityPage(username, encoded);
      merged = mergeActivityEnrichment(merged, rendered);
    }
    const potd = await parseRenderedPotdPage();
    merged = mergeActivityEnrichment(merged, potd);
    return tryUsable(merged) || shaped;
  } catch (err) {
    errors.push(`activity scrape: ${err.message}`);
    logger.warn("GFG activity scrape failed", { username, error: err.message });
    const rendered = await parseRenderedActivityPage(username, encoded);
    const potd = await parseRenderedPotdPage();
    return tryUsable(mergeActivityEnrichment(mergeActivityEnrichment(shaped, rendered), potd)) || shaped;
  }
}

/**
 * Given a submissions object of the form:
 *   { Difficulty: { submissionId: { pname, slug, lang, user_subtime } } }
 *
 * Extract per-day activityCalendar from user_subtime and build recentActivity.
 * This works for both __NEXT_DATA__ pageProps.userSubmissionsInfo and the
 * practiceapi response's result field (same shape).
 */
function extractCalendarFromSubmissions(submissions) {
  if (!submissions || typeof submissions !== "object") return null;
  const byDate = {};
  const recent = [];

  for (const [difficulty, bucket] of Object.entries(submissions)) {
    if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) continue;
    const diffKey = normalizeDifficulty(difficulty);

    for (const problem of Object.values(bucket)) {
      if (!problem || typeof problem !== "object") continue;
      const { pname, slug, user_subtime } = problem;
      const date = user_subtime ? String(user_subtime).slice(0, 10) : null;
      if (!date || !ISO_DATE_RE.test(date)) continue;

      byDate[date] = (byDate[date] || 0) + 1;
      if (pname) {
        recent.push({
          type: "solved",
          title: pname,
          difficulty: diffKey,
          date,
          url: slug ? `https://www.geeksforgeeks.org/problems/${slug}/1` : null,
        });
      }
    }
  }

  const activityCalendar = Object.entries(byDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!activityCalendar.length) return null;

  recent.sort((a, b) => b.date.localeCompare(a.date));
  return { activityCalendar, recentActivity: recent.slice(0, 10) };
}

/**
 * Walk a parsed JSON object and find the best date-keyed heatmap object,
 * i.e. an object whose keys are ALL ISO date strings (YYYY-MM-DD).
 * Returns null if no suitable object is found.
 */
function findDateKeyedCalendar(root, seen = new Set()) {
  if (!root || typeof root !== "object" || seen.has(root)) return null;
  seen.add(root);
  if (!Array.isArray(root)) {
    const keys = Object.keys(root);
    if (keys.length >= 2 && keys.every((k) => ISO_DATE_RE.test(k))) return root;
  }
  for (const value of Object.values(root)) {
    const found = findDateKeyedCalendar(value, seen);
    if (found) return found;
  }
  return null;
}

function shapeFromAuthPracticeHtml(html, username) {
  if (!html || typeof html !== "string") return null;

  const $ = cheerio.load(html);
  const raw = $("script#__NEXT_DATA__[type='application/json']").html() ||
    $("script#__NEXT_DATA__").html();
  if (!raw) {
    // RSC streaming format — no __NEXT_DATA__ tag. Get profile data from the
    // streaming chunks, then also try to extract submissions from the same chunks
    // so we can derive activityCalendar from user_subtime.
    const shaped = shapeFromHtml(html, username, "gfg-auth-practice-stream");
    if (!shaped) return null;

    const submissionsObj =
      extractObjectAfterKey(html, "userSubmissionsInfo") ||
      extractObjectAfterKey(html, "userSubmissions") ||
      extractObjectAfterKey(html, "submissionsInfo");

    if (submissionsObj) {
      const fromSubs = extractCalendarFromSubmissions(submissionsObj);
      if (fromSubs?.activityCalendar?.length) {
        logger.info("GFG calendar extracted from RSC stream", {
          username,
          activeDays: fromSubs.activityCalendar.length,
          total: fromSubs.activityCalendar.reduce((s, r) => s + r.count, 0),
        });
        return {
          ...shaped,
          activityCalendar: fromSubs.activityCalendar,
          recentActivity: fromSubs.recentActivity,
          solvedDetails: normalizeSolvedDetails(submissionsObj),
          solvedProblems: normalizeSolvedProblemLists(submissionsObj),
        };
      }
    }
    return shaped;
  }

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
  const solvedProblems = normalizeSolvedProblemLists(submissions);
  const solvedFromSubmissions = Object.values(solvedDetails)
    .reduce((sum, count) => sum + safeNum(count), 0);

  // Primary: extract per-day calendar from user_subtime in each submission entry.
  // This gives exact submission dates matching GFG's own heatmap.
  const calendarFromSubmissions = extractCalendarFromSubmissions(submissions);

  // Fallback: look for a date-keyed heatmap object in pageProps
  // (e.g. { "YYYY-MM-DD": N }) in case GFG embeds it separately.
  const calendarFallbackRoot =
    pageProps.heatMap ||
    pageProps.heatmap ||
    pageProps.calendarData ||
    pageProps.activityCalendar ||
    pageProps.submissionCalendar ||
    findDateKeyedCalendar(pageProps);
  const calendarFromHeatmap = calendarFallbackRoot
    ? normalizeActivityCalendar([calendarFallbackRoot])
    : null;

  // Prefer user_subtime-derived calendar (more granular); fall back to heatmap keys.
  const activityCalendar =
    (calendarFromSubmissions?.activityCalendar?.length && calendarFromSubmissions.activityCalendar) ||
    (calendarFromHeatmap?.length && calendarFromHeatmap) ||
    null;

  const recentFromSubmissions = calendarFromSubmissions?.recentActivity || null;

  if (activityCalendar) {
    logger.info("GFG calendar extracted from __NEXT_DATA__", {
      username,
      activeDays: activityCalendar.length,
      total: activityCalendar.reduce((s, r) => s + r.count, 0),
    });
  }

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
    solvedProblems,
    ...(activityCalendar ? { activityCalendar } : {}),
    ...(recentFromSubmissions ? { recentActivity: recentFromSubmissions } : {}),
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
    if (shaped) return enrichFromActivityPage(shaped, username, encoded, errors);
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
      if (shaped) return enrichFromActivityPage(shaped, username, encoded, errors);
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
    if (shaped) return enrichFromActivityPage(shaped, username, encoded, errors);
    errors.push("primary returned empty");
  } catch (err) {
    errors.push(`primary: ${err.message}`);
    logger.warn("GFG primary failed", { username, error: err.message });
  }

  // Strategy 4: alternate third-party API.
  try {
    const { data } = await fallback.get(`/${encoded}`);
    const shaped = tryUsable(shapeFallback(data, username));
    if (shaped) return enrichFromActivityPage(shaped, username, encoded, errors);
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
