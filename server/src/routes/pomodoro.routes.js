"use strict";

const express = require("express");
const { z } = require("zod");
const pomodoroController = require("../controllers/pomodoro.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const pomodoroModel = require("../models/pomodoro.model");

const router = express.Router();

const startSchema = z.object({
  kind: z.enum(pomodoroModel.VALID_KINDS),
  durationSeconds: z.coerce.number().int().min(60).max(7200),
});
const logSchema = startSchema;

router.get("/today", requireAuth, pomodoroController.listToday);

router.post(
  "/start",
  requireAuth,
  validate({ body: startSchema }),
  pomodoroController.startSession
);

router.post(
  "/log",
  requireAuth,
  validate({ body: logSchema }),
  pomodoroController.logSession
);

router.post(
  "/:id/finish",
  requireAuth,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ completed: z.boolean().optional() }).optional(),
  }),
  pomodoroController.finishSession
);

module.exports = router;
