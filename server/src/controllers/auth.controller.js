"use strict";

const { z } = require("zod");
const env = require("../config/env");
const { signToken, COOKIE_NAME, cookieOptions } = require("../utils/jwt");
const { queueRefreshUser } = require("../jobs/queue");
const userModel = require("../models/user.model");
const { HttpError } = require("../middlewares/error.middleware");
const logger = require("../utils/logger");

const signupSchema = z.object({
  email: z.string().email().max(254),
  username: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_-]+$/u, "Username can only contain letters, numbers, _ and -"),
  name: z.string().min(1).max(100).optional(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

function setSessionCookie(res, user) {
  const token = signToken({ sub: user.id, username: user.username });
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

function safeUser(u) {
  if (!u) return null;
  const { password_hash, ...rest } = u;
  return rest;
}

async function signup(req, res, next) {
  try {
    const body = signupSchema.parse(req.body);
    const existingEmail = await userModel.findByEmail(body.email);
    if (existingEmail) throw new HttpError(409, "Email already registered");
    const existingUser = await userModel.isUsernameTaken(body.username);
    if (existingUser) throw new HttpError(409, "Username already taken");

    const user = await userModel.createWithPassword(body);
    setSessionCookie(res, user);
    res.status(201).json({ user: safeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await userModel.findByEmail(email);
    const ok = user && (await userModel.verifyPassword(user, password));
    if (!ok) throw new HttpError(401, "Invalid email or password");
    setSessionCookie(res, user);
    res.json({ user: safeUser(user) });
  } catch (err) {
    next(err);
  }
}

async function githubCallback(req, res, next) {
  try {
    const user = req.user;
    if (!user) return res.redirect(`${env.CLIENT_URL}/login?error=no_user`);
    setSessionCookie(res, user);
    queueRefreshUser(user.id, "login").catch((err) =>
      logger.warn("Failed to queue refresh on login", { error: err.message })
    );
    res.redirect(`${env.CLIENT_URL}/dashboard`);
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: safeUser(req.user) });
}

async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  res.json({ ok: true });
}

module.exports = { signup, login, githubCallback, me, logout };
