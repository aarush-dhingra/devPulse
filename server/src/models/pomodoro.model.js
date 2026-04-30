"use strict";

const db = require("../config/db");

const FIELDS = `id, user_id, kind, duration_seconds, completed, started_at, ended_at`;

const VALID_KINDS = ["focus", "short_break", "long_break"];

async function start({ userId, kind, durationSeconds }) {
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`Invalid pomodoro kind: ${kind}`);
  }
  const { rows } = await db.query(
    `INSERT INTO pomodoro_sessions (user_id, kind, duration_seconds)
     VALUES ($1, $2, $3)
     RETURNING ${FIELDS}`,
    [userId, kind, durationSeconds]
  );
  return rows[0];
}

async function finish({ userId, id, completed = true }) {
  const { rows } = await db.query(
    `UPDATE pomodoro_sessions
       SET completed = $1, ended_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING ${FIELDS}`,
    [completed, id, userId]
  );
  return rows[0] || null;
}

async function logCompleted({ userId, kind, durationSeconds }) {
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`Invalid pomodoro kind: ${kind}`);
  }
  const { rows } = await db.query(
    `INSERT INTO pomodoro_sessions (user_id, kind, duration_seconds, completed, started_at, ended_at)
     VALUES ($1, $2, $3, TRUE, NOW() - ($3 || ' seconds')::interval, NOW())
     RETURNING ${FIELDS}`,
    [userId, kind, durationSeconds]
  );
  return rows[0];
}

async function listToday(userId) {
  const { rows } = await db.query(
    `SELECT ${FIELDS} FROM pomodoro_sessions
     WHERE user_id = $1
       AND started_at >= date_trunc('day', NOW())
     ORDER BY started_at DESC`,
    [userId]
  );
  return rows;
}

async function summary(userId) {
  const { rows } = await db.query(
    `
    SELECT
      COALESCE(SUM(CASE WHEN completed AND kind='focus'
                        AND started_at >= date_trunc('day', NOW())
                        THEN duration_seconds END), 0)::int AS focus_today_seconds,
      COALESCE(SUM(CASE WHEN completed AND kind='focus'
                        AND started_at >= date_trunc('week', NOW())
                        THEN duration_seconds END), 0)::int AS focus_week_seconds,
      COALESCE(SUM(CASE WHEN completed AND kind='focus'
                        AND started_at >= date_trunc('day', NOW())
                        THEN 1 END), 0)::int AS focus_sessions_today
    FROM pomodoro_sessions
    WHERE user_id = $1
    `,
    [userId]
  );
  const r = rows[0] || {};
  return {
    focusTodaySeconds: Number(r.focus_today_seconds || 0),
    focusTodayMinutes: Math.round(Number(r.focus_today_seconds || 0) / 60),
    focusWeekSeconds: Number(r.focus_week_seconds || 0),
    focusWeekMinutes: Math.round(Number(r.focus_week_seconds || 0) / 60),
    focusSessionsToday: Number(r.focus_sessions_today || 0),
  };
}

module.exports = {
  VALID_KINDS,
  start,
  finish,
  logCompleted,
  listToday,
  summary,
};
