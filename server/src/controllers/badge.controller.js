"use strict";

const badgeModel = require("../models/badge.model");
const userModel = require("../models/user.model");
const { HttpError } = require("../middlewares/error.middleware");

async function listAll(req, res, next) {
  try {
    res.json({ badges: badgeModel.listAll() });
  } catch (err) {
    next(err);
  }
}

async function listForUser(req, res, next) {
  try {
    const user = await userModel.findByUsername(req.params.username);
    if (!user) throw new HttpError(404, "User not found");
    const badges = await badgeModel.listForUser(user.id);
    res.json({ badges });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const badges = await badgeModel.listForUser(req.user.id);
    res.json({ badges });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAll, listForUser, listMine };
