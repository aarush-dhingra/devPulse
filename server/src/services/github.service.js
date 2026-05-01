"use strict";

const env = require("../config/env");
const { createApiClient } = require("../utils/apiClient");
const { topN, safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const REST_BASE = "https://api.github.com";
const GRAPHQL_URL = "https://api.github.com/graphql";

// Build auth headers, preferring a per-user token then the shared env token.
const restHeaders = (userToken) => {
  const token = userToken || env.GITHUB_API_TOKEN || null;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "DevVitals-Server",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const restClient = createApiClient({
  baseURL: REST_BASE,
  headers: restHeaders(),   // default (env token or none); overridden per-request below
  name: "github-rest",
});

const graphqlClient = createApiClient({
  baseURL: GRAPHQL_URL,
  headers: restHeaders(),
  name: "github-graphql",
});

async function getUser(username, userToken) {
  const { data } = await restClient.get(`/users/${encodeURIComponent(username)}`, {
    headers: restHeaders(userToken),
  });
  return data;
}

async function getRepos(username, userToken, { perPage = 100, maxPages = 3 } = {}) {
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { data } = await restClient.get(
      `/users/${encodeURIComponent(username)}/repos`,
      {
        params: { per_page: perPage, page, sort: "updated" },
        headers: restHeaders(userToken),
      }
    );
    all.push(...data);
    if (data.length < perPage) break;
  }
  return all;
}

async function getCommitCount(username, userToken) {
  try {
    const { data } = await restClient.get(`/search/commits`, {
      params: { q: `author:${username}`, per_page: 1 },
      headers: {
        Accept: "application/vnd.github.cloak-preview+json",
        ...(userToken || env.GITHUB_API_TOKEN
          ? { Authorization: `Bearer ${userToken || env.GITHUB_API_TOKEN}` }
          : {}),
      },
    });
    return safeNum(data?.total_count, 0);
  } catch (err) {
    logger.warn("GitHub commit search failed", { username, error: err.message });
    return 0;
  }
}

async function getContributions(username, userToken) {
  const token = userToken || env.GITHUB_API_TOKEN;
  if (!token) {
    logger.warn("No GitHub token available — skipping contributions GraphQL", { username });
    return { totalContributions: 0, weeks: [], streakCurrent: 0, streakLongest: 0 };
  }
  const query = `
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays { date contributionCount }
            }
          }
          totalPullRequestContributions
          totalIssueContributions
        }
        pullRequests(states: MERGED) { totalCount }
      }
    }
  `;
  try {
    const { data } = await graphqlClient.post("", {
      query,
      variables: { login: username },
    }, { headers: restHeaders(token) });

    const cal = data?.data?.user?.contributionsCollection?.contributionCalendar;
    const days = (cal?.weeks || [])
      .flatMap((w) => w.contributionDays)
      .map((d) => ({ date: d.date, count: d.contributionCount }));

    const { current, longest } = computeStreaks(days);

    return {
      totalContributions: safeNum(cal?.totalContributions, 0),
      mergedPRs: safeNum(data?.data?.user?.pullRequests?.totalCount, 0),
      pullRequestContributions: safeNum(
        data?.data?.user?.contributionsCollection?.totalPullRequestContributions, 0
      ),
      issueContributions: safeNum(
        data?.data?.user?.contributionsCollection?.totalIssueContributions, 0
      ),
      heatmap: days,
      streakCurrent: current,
      streakLongest: longest,
    };
  } catch (err) {
    logger.warn("GitHub GraphQL contributions failed", { username, error: err.message });
    return { totalContributions: 0, mergedPRs: 0, heatmap: [], streakCurrent: 0, streakLongest: 0 };
  }
}

function computeStreaks(days) {
  if (!days?.length) return { current: 0, longest: 0 };
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let current = 0;
  let longest = 0;
  let run = 0;
  for (const d of sorted) {
    if (d.count > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  // Current streak counts back from today
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (sorted[i].count > 0) current += 1;
    else break;
  }
  return { current, longest };
}

function aggregateRepos(repos) {
  const languages = {};
  let stars = 0;
  let forks = 0;
  let originalRepos = 0;
  let topRepo = null;
  const list = [];

  for (const r of repos) {
    if (r.fork) continue;
    originalRepos += 1;
    stars += safeNum(r.stargazers_count);
    forks += safeNum(r.forks_count);
    if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;
    const item = {
      name: r.name,
      url: r.html_url,
      description: r.description,
      stars: safeNum(r.stargazers_count),
      forks: safeNum(r.forks_count),
      language: r.language,
      pushedAt: r.pushed_at,
    };
    list.push(item);
    if (!topRepo || (r.stargazers_count || 0) > (topRepo.stars || 0)) {
      topRepo = item;
    }
  }

  list.sort(
    (a, b) =>
      (b.stars || 0) - (a.stars || 0) ||
      new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0)
  );

  return {
    totalRepos: originalRepos,
    stars,
    forks,
    languages,
    topLanguages: topN(languages, 8),
    topRepo,
    list: list.slice(0, 12),
  };
}

async function fetchAll(username, userToken) {
  const [user, repos, contributions, commitCount] = await Promise.all([
    getUser(username, userToken),
    getRepos(username, userToken),
    getContributions(username, userToken),
    getCommitCount(username, userToken),
  ]);

  const repoStats = aggregateRepos(repos);

  return {
    profile: {
      username: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      blog: user.blog,
      company: user.company,
      followers: user.followers,
      following: user.following,
      publicRepos: user.public_repos,
      createdAt: user.created_at,
    },
    contributions: {
      total: contributions.totalContributions,
      mergedPRs: contributions.mergedPRs,
      pullRequestContributions: contributions.pullRequestContributions,
      issueContributions: contributions.issueContributions,
      streakCurrent: contributions.streakCurrent,
      streakLongest: contributions.streakLongest,
      heatmap: contributions.heatmap,
    },
    commits: { totalSearched: commitCount },
    repos: repoStats,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = {
  getUser,
  getRepos,
  getCommitCount,
  getContributions,
  fetchAll,
};
