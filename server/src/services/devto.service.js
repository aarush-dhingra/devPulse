"use strict";

const { createApiClient } = require("../utils/apiClient");
const { safeNum } = require("../utils/formatters");
const logger = require("../utils/logger");

const client = createApiClient({
  baseURL: "https://dev.to/api",
  name: "devto",
});

async function fetchAll(username) {
  try {
    const { data: articles = [] } = await client.get(`/articles`, {
      params: { username, per_page: 100 },
    });

    let totalReactions = 0;
    let totalComments = 0;
    const tags = {};
    for (const a of articles) {
      totalReactions += safeNum(a.public_reactions_count);
      totalComments += safeNum(a.comments_count);
      for (const t of a.tag_list || []) tags[t] = (tags[t] || 0) + 1;
    }

    return {
      profile: { username },
      articleCount: articles.length,
      totalReactions,
      totalComments,
      tags,
      topArticles: [...articles]
        .sort(
          (a, b) =>
            safeNum(b.public_reactions_count) - safeNum(a.public_reactions_count)
        )
        .slice(0, 5)
        .map((a) => ({
          title: a.title,
          url: a.url,
          reactions: safeNum(a.public_reactions_count),
          comments: safeNum(a.comments_count),
          publishedAt: a.published_at,
        })),
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    logger.warn("Dev.to fetchAll failed", { username, error: err.message });
    throw err;
  }
}

module.exports = { fetchAll };
