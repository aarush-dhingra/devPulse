"use strict";

const { Pool } = require("pg");
const env = require("./env");
const logger = require("../utils/logger");

const isSupabase = /supabase\.(co|com)/i.test(env.DATABASE_URL || "");
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Supabase always requires SSL (even in dev). Self-signed cert is fine here.
  ssl: env.isProd || isSupabase ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  logger.error("Unexpected Postgres pool error", { error: err.message });
});

async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn("Slow query", { duration, text: text.slice(0, 120) });
    }
    return result;
  } catch (err) {
    logger.error("DB query failed", {
      text: text.slice(0, 120),
      error: err.message,
    });
    throw err;
  }
}

async function getClient() {
  return pool.connect();
}

async function ping() {
  const { rows } = await pool.query("SELECT 1 AS ok");
  return rows[0]?.ok === 1;
}

module.exports = {
  pool,
  query,
  getClient,
  ping,
};
