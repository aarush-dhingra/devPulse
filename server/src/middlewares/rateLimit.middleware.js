"use strict";

const rateLimit = require("express-rate-limit");

function makeLimiter({ windowMs = 60_000, max = 60, name = "default" } = {}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "RateLimitExceeded",
      message: `Too many requests (${name}). Please slow down.`,
    },
  });
}

const globalLimiter = makeLimiter({
  windowMs: 60_000,
  max: 120,
  name: "global",
});

const authLimiter = makeLimiter({
  windowMs: 15 * 60_000,
  max: 30,
  name: "auth",
});

const heavyLimiter = makeLimiter({
  windowMs: 60_000,
  max: 10,
  name: "heavy",
});

module.exports = { makeLimiter, globalLimiter, authLimiter, heavyLimiter };
