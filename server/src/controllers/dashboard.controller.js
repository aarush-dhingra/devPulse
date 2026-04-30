"use strict";

const combinedActivity = require("../services/combinedActivity.service");

async function heatmap(req, res, next) {
  try {
    const data = await combinedActivity.buildHeatmap(req.user.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function series(req, res, next) {
  try {
    const period = String(req.query.period || "90d").toLowerCase();
    const days =
      period === "7d" ? 7 :
      period === "30d" ? 30 :
      period === "1y" || period === "365d" ? 365 :
      90;

    const [problems, codingTime] = await Promise.all([
      combinedActivity.buildProblemsSeries(req.user.id, days),
      combinedActivity.buildCodingTimeSeries(req.user.id, Math.min(days, 90)),
    ]);
    res.json({ period, days, problems, codingTime });
  } catch (err) {
    next(err);
  }
}

module.exports = { heatmap, series };
