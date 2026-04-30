"use strict";

const db = require("../config/db");
const bcrypt = require("bcrypt");

const PUBLIC_FIELDS = `
  id, github_id, username, name, avatar_url, email, bio,
  is_public, devscore, auth_provider, created_at, updated_at
`;

const BCRYPT_ROUNDS = 10;

async function findById(id) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByGithubId(githubId) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE github_id = $1`,
    [githubId]
  );
  return rows[0] || null;
}

async function findByUsername(username) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE LOWER(username) = LOWER($1)`,
    [username]
  );
  return rows[0] || null;
}

async function upsertFromGithub(profile) {
  const {
    githubId,
    username,
    name,
    avatarUrl,
    email,
    bio,
  } = profile;

  const { rows } = await db.query(
    `
    INSERT INTO users (github_id, username, name, avatar_url, email, bio)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (github_id) DO UPDATE SET
      username   = EXCLUDED.username,
      name       = COALESCE(EXCLUDED.name, users.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      email      = COALESCE(EXCLUDED.email, users.email),
      bio        = COALESCE(EXCLUDED.bio, users.bio),
      updated_at = NOW()
    RETURNING ${PUBLIC_FIELDS}
    `,
    [githubId, username, name, avatarUrl, email, bio]
  );
  return rows[0];
}

async function updateProfile(userId, patch) {
  const allowed = ["name", "bio", "is_public"];
  const sets = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${key} = $${i++}`);
      values.push(patch[key]);
    }
  }
  if (sets.length === 0) return findById(userId);
  values.push(userId);
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(", ")}, updated_at = NOW()
     WHERE id = $${i} RETURNING ${PUBLIC_FIELDS}`,
    values
  );
  return rows[0] || null;
}

async function updateDevScore(userId, score) {
  await db.query(`UPDATE users SET devscore = $1, updated_at = NOW() WHERE id = $2`,
    [Math.round(score), userId]);
}

async function listTopByDevScore({ limit = 50, offset = 0 } = {}) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS} FROM users
     WHERE is_public = TRUE
     ORDER BY devscore DESC, created_at ASC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

async function findByEmail(email) {
  const { rows } = await db.query(
    `SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

async function isUsernameTaken(username) {
  const { rows } = await db.query(
    `SELECT 1 FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1`,
    [username]
  );
  return rows.length > 0;
}

async function createWithPassword({ email, username, name, password }) {
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rows } = await db.query(
    `
    INSERT INTO users (email, username, name, password_hash, auth_provider)
    VALUES ($1, $2, $3, $4, 'local')
    RETURNING ${PUBLIC_FIELDS}
    `,
    [email, username, name || null, hash]
  );
  return rows[0];
}

async function verifyPassword(user, plaintext) {
  if (!user?.password_hash) return false;
  return bcrypt.compare(plaintext, user.password_hash);
}

module.exports = {
  findById,
  findByGithubId,
  findByUsername,
  findByEmail,
  isUsernameTaken,
  createWithPassword,
  verifyPassword,
  upsertFromGithub,
  updateProfile,
  updateDevScore,
  listTopByDevScore,
};
