"use strict";

const Redis = require("ioredis");
const env = require("./env");
const logger = require("../utils/logger");

let redis = null;

function makeClient(label = "client") {
  if (!env.REDIS_URL) {
    logger.warn(`Redis disabled — REDIS_URL not set (${label})`);
    return null;
  }
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 0,   // don't queue commands — fail immediately if disconnected
    enableOfflineQueue: false, // same: throw instead of queuing while reconnecting
    lazyConnect: false,
    retryStrategy: (times) => {
      if (times > 10) return null; // give up after 10 attempts
      return Math.min(times * 200, 5000);
    },
  });
  client.on("connect", () => logger.info(`Redis connected (${label})`));
  client.on("error", (err) =>
    logger.error(`Redis error (${label})`, { error: err.message })
  );
  return client;
}

function getRedis() {
  if (!redis) redis = makeClient("primary");
  // If the client gave up reconnecting (status === "end"), clear it
  if (redis && redis.status === "end") {
    redis = null;
    return null;
  }
  return redis;
}

async function safeGet(key) {
  const client = getRedis();
  if (!client) return null;
  try {
    return await client.get(key);
  } catch (err) {
    logger.warn("Redis GET failed", { key, error: err.message });
    return null;
  }
}

async function safeSet(key, value, ttlSeconds) {
  const client = getRedis();
  if (!client) return false;
  try {
    if (ttlSeconds) {
      await client.set(key, value, "EX", ttlSeconds);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (err) {
    logger.warn("Redis SET failed", { key, error: err.message });
    return false;
  }
}

async function safeDel(key) {
  const client = getRedis();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (err) {
    logger.warn("Redis DEL failed", { key, error: err.message });
    return false;
  }
}

module.exports = {
  getRedis,
  makeClient,
  safeGet,
  safeSet,
  safeDel,
};
