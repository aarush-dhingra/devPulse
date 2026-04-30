"use strict";

const express = require("express");
const { z } = require("zod");
const dashboardController = require("../controllers/dashboard.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");

const router = express.Router();

router.get("/heatmap", requireAuth, dashboardController.heatmap);

router.get(
  "/series",
  requireAuth,
  validate({
    query: z
      .object({ period: z.enum(["7d", "30d", "90d", "1y", "365d"]).optional() })
      .passthrough(),
  }),
  dashboardController.series
);

module.exports = router;
