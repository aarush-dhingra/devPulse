"use strict";

const db = require("../config/db");
const statsModel = require("../models/stats.model");
const { computeDevScore } = require("../utils/devScore");
const emailService = require("../services/email.service");
const logger = require("../utils/logger");

async function sendWeeklyDigest() {
  const { rows: users } = await db.query(
    `SELECT id, username, name, email FROM users
     WHERE email IS NOT NULL AND is_public = TRUE`
  );
  const out = [];
  for (const user of users) {
    try {
      const stats = await statsModel.getLatestForUser(user.id);
      const devscore = computeDevScore(stats);
      const html = emailService.renderWeeklyDigest({ user, stats, devscore });
      await emailService.sendMail({
        to: user.email,
        subject: `Your DevPulse — DevScore ${devscore.score}`,
        html,
      });
      out.push({ userId: user.id, ok: true });
    } catch (err) {
      logger.warn("Weekly digest failed", { userId: user.id, error: err.message });
      out.push({ userId: user.id, ok: false, error: err.message });
    }
  }
  return { count: out.length };
}

module.exports = { sendWeeklyDigest };
