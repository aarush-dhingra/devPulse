"use strict";

const pomodoroModel = require("../models/pomodoro.model");

async function startSession(req, res, next) {
  try {
    const { kind, durationSeconds } = req.body;
    const session = await pomodoroModel.start({
      userId: req.user.id,
      kind,
      durationSeconds: Number(durationSeconds),
    });
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

async function finishSession(req, res, next) {
  try {
    const { id } = req.params;
    const { completed } = req.body || {};
    const session = await pomodoroModel.finish({
      userId: req.user.id,
      id,
      completed: completed !== false,
    });
    res.json({ session });
  } catch (err) {
    next(err);
  }
}

async function logSession(req, res, next) {
  try {
    const { kind, durationSeconds } = req.body;
    const session = await pomodoroModel.logCompleted({
      userId: req.user.id,
      kind,
      durationSeconds: Number(durationSeconds),
    });
    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
}

async function listToday(req, res, next) {
  try {
    const [sessions, summary] = await Promise.all([
      pomodoroModel.listToday(req.user.id),
      pomodoroModel.summary(req.user.id),
    ]);
    res.json({ sessions, summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { startSession, finishSession, logSession, listToday };
