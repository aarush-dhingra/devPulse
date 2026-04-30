"use strict";

const { safeGet, safeSet } = require("../config/redis");
const logger = require("../utils/logger");

/**
 * Express middleware that caches GET responses in Redis.
 * Skips caching when REDIS is unavailable or response status is non-2xx.
 *
 * @param {object} options
 * @param {number} options.ttl - seconds to cache
 * @param {(req:import('express').Request)=>string} [options.key] - custom key fn
 */
function cache({ ttl = 60, key } = {}) {
  return async (req, res, next) => {
    if (req.method !== "GET") return next();

    const cacheKey = key
      ? key(req)
      : `cache:${req.originalUrl}`;

    try {
      const cached = await safeGet(cacheKey);
      if (cached) {
        res.setHeader("X-Cache", "HIT");
        try {
          return res.status(200).json(JSON.parse(cached));
        } catch {
          // fall through if malformed
        }
      }
    } catch (err) {
      logger.warn("cache.middleware GET failed", { error: err.message });
    }

    res.setHeader("X-Cache", "MISS");

    const originalJson = res.json.bind(res);
    res.json = (payload) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          safeSet(cacheKey, JSON.stringify(payload), ttl).catch(() => {});
        } catch (err) {
          logger.warn("cache.middleware SET failed", { error: err.message });
        }
      }
      return originalJson(payload);
    };
    next();
  };
}

module.exports = { cache };
