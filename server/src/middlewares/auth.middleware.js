"use strict";

const { verifyToken, COOKIE_NAME } = require("../utils/jwt");
const userModel = require("../models/user.model");
const { HttpError } = require("./error.middleware");

function readToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice("Bearer ".length);
  return null;
}

async function attachUser(req) {
  const token = readToken(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    const user = await userModel.findById(payload.sub);
    if (!user) return null;
    req.user = user;
    return user;
  } catch {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const user = await attachUser(req);
    if (!user) return next(new HttpError(401, "Authentication required"));
    next();
  } catch (err) {
    next(err);
  }
}

async function optionalAuth(req, res, next) {
  try {
    await attachUser(req);
  } catch {
    /* ignore */
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
