"use strict";

const nodemailer = require("nodemailer");
const env = require("../config/env");
const logger = require("../utils/logger");

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST) {
    logger.warn("Email disabled — SMTP_HOST not configured");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT || 587,
    secure: (env.SMTP_PORT || 587) === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    logger.info("Skipping email (no SMTP)", { to, subject });
    return { skipped: true };
  }
  const info = await t.sendMail({
    from: env.EMAIL_FROM || "DevPulse <noreply@devpulse.dev>",
    to,
    subject,
    html,
    text,
  });
  logger.info("Email sent", { to, subject, messageId: info.messageId });
  return { sent: true, messageId: info.messageId };
}

function renderWeeklyDigest({ user, stats, devscore }) {
  const gh = stats.github || {};
  const lc = stats.leetcode || {};
  const wt = stats.wakatime || {};
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0f172a;color:#f8fafc;border-radius:16px">
      <h1 style="margin:0 0 4px;font-size:24px">Hey ${user.name || user.username} 👋</h1>
      <p style="color:#94a3b8;margin:0 0 24px">Here's your DevPulse this week</p>

      <div style="background:#1e293b;padding:20px;border-radius:12px;margin-bottom:16px">
        <div style="font-size:14px;color:#94a3b8">DevScore</div>
        <div style="font-size:40px;font-weight:800">${devscore?.score ?? 0}</div>
      </div>

      <ul style="list-style:none;padding:0;margin:0">
        <li style="padding:12px;background:#1e293b;border-radius:8px;margin-bottom:8px">
          <strong>GitHub</strong> · ${gh.contributions?.total ?? 0} contributions
        </li>
        <li style="padding:12px;background:#1e293b;border-radius:8px;margin-bottom:8px">
          <strong>LeetCode</strong> · ${lc.solved?.total ?? 0} solved
        </li>
        <li style="padding:12px;background:#1e293b;border-radius:8px;margin-bottom:8px">
          <strong>Wakatime</strong> · ${Math.round(wt.hoursLast7Days ?? 0)} hrs (last 7 days)
        </li>
      </ul>

      <a href="${env.CLIENT_URL}/dashboard" style="display:inline-block;margin-top:24px;background:#3b82f6;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">Open Dashboard →</a>
    </div>
  `;
}

module.exports = { sendMail, renderWeeklyDigest };
