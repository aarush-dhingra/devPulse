"use strict";

const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signToken(payload, options = {}) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: "devpulse",
    ...options,
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET, { issuer: "devpulse" });
}

const COOKIE_NAME = "devpulse_token";

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.isProd ? "lax" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

module.exports = { signToken, verifyToken, COOKIE_NAME, cookieOptions };
