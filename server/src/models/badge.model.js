"use strict";

const db = require("../config/db");

const BADGES = {
  "problem-slayer": {
    slug: "problem-slayer",
    name: "Problem Slayer",
    description: "Solved 500+ LeetCode problems",
    icon: "⚔️",
  },
  polyglot: {
    slug: "polyglot",
    name: "Polyglot",
    description: "Used 5+ programming languages",
    icon: "🌐",
  },
  "night-owl": {
    slug: "night-owl",
    name: "Night Owl",
    description: "Most coding between 10pm–2am",
    icon: "🦉",
  },
  "streak-master": {
    slug: "streak-master",
    name: "Streak Master",
    description: "30-day combined coding streak",
    icon: "🔥",
  },
  "open-source-hero": {
    slug: "open-source-hero",
    name: "Open Source Hero",
    description: "10+ PRs merged to external repos",
    icon: "🦸",
  },
};

function listAll() {
  return Object.values(BADGES);
}

async function award(userId, slug) {
  if (!BADGES[slug]) return null;
  const { rows } = await db.query(
    `INSERT INTO badges (user_id, badge_slug)
     VALUES ($1, $2)
     ON CONFLICT (user_id, badge_slug) DO NOTHING
     RETURNING id, user_id, badge_slug, awarded_at`,
    [userId, slug]
  );
  return rows[0] || null;
}

async function listForUser(userId) {
  const { rows } = await db.query(
    `SELECT badge_slug, awarded_at FROM badges
     WHERE user_id = $1 ORDER BY awarded_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    ...BADGES[r.badge_slug],
    slug: r.badge_slug,
    awardedAt: r.awarded_at,
  }));
}

module.exports = { BADGES, listAll, award, listForUser };
