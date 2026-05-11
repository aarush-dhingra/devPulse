"use strict";

const notifModel = require("../models/notification.model");

async function list(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const offset = parseInt(req.query.offset) || 0;
    const notifications = await notifModel.listForUser(req.user.id, { limit, offset });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const count = await notifModel.unreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await notifModel.markAllRead(req.user.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function markOneRead(req, res, next) {
  try {
    const updated = await notifModel.markOneRead(req.params.id, req.user.id);
    if (!updated) return res.status(404).json({ error: "Notification not found" });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markAllRead, markOneRead };
