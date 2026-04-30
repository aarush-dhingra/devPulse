"use strict";

const goalModel = require("../models/goal.model");
const { HttpError } = require("../middlewares/error.middleware");

async function listMyGoals(req, res, next) {
  try {
    const goals = await goalModel.listWithProgress(req.user.id);
    res.json({ goals });
  } catch (err) {
    next(err);
  }
}

async function createGoal(req, res, next) {
  try {
    const { title, kind, target, deadline } = req.body;
    const goal = await goalModel.create({
      userId: req.user.id,
      title: title.trim(),
      kind,
      target: Number(target),
      deadline: deadline || null,
    });
    res.status(201).json({ goal });
  } catch (err) {
    next(err);
  }
}

async function updateGoal(req, res, next) {
  try {
    const { id } = req.params;
    const { title, target, deadline } = req.body;
    const updated = await goalModel.update({
      userId: req.user.id,
      id,
      title: title?.trim(),
      target: target != null ? Number(target) : null,
      deadline: deadline ?? null,
    });
    if (!updated) throw new HttpError(404, "Goal not found");
    res.json({ goal: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteGoal(req, res, next) {
  try {
    const ok = await goalModel.remove({ userId: req.user.id, id: req.params.id });
    if (!ok) throw new HttpError(404, "Goal not found");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMyGoals, createGoal, updateGoal, deleteGoal };
