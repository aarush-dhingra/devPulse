"use strict";

const { z } = require("zod");
const userModel = require("../models/user.model");
const platformModel = require("../models/platform.model");
const badgeModel = require("../models/badge.model");
const { HttpError } = require("../middlewares/error.middleware");

const updateSchema = z
  .object({
    name: z.string().max(100).optional(),
    bio: z.string().max(500).optional(),
    is_public: z.boolean().optional(),
  })
  .strict();

async function getMe(req, res, next) {
  try {
    const platforms = await platformModel.listForUser(req.user.id);
    const badges = await badgeModel.listForUser(req.user.id);
    res.json({ user: req.user, platforms, badges });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const patch = updateSchema.parse(req.body);
    const updated = await userModel.updateProfile(req.user.id, patch);
    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
}

async function getPublicProfile(req, res, next) {
  try {
    const { username } = req.params;
    const user = await userModel.findByUsername(username);
    if (!user) throw new HttpError(404, "User not found");
    if (!user.is_public && req.user?.id !== user.id) {
      throw new HttpError(403, "This profile is private");
    }
    const platforms = await platformModel.listForUser(user.id);
    const badges = await badgeModel.listForUser(user.id);
    res.json({ user, platforms, badges });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, updateMe, getPublicProfile };
