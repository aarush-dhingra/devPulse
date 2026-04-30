"use strict";

const express = require("express");
const { z } = require("zod");
const goalController = require("../controllers/goal.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const goalModel = require("../models/goal.model");

const router = express.Router();

const createSchema = z.object({
  title: z.string().min(1).max(140),
  kind: z.enum(goalModel.VALID_KINDS),
  target: z.coerce.number().int().positive(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "deadline must be YYYY-MM-DD")
    .optional()
    .nullable(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(140).optional(),
  target: z.coerce.number().int().positive().optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

router.get("/", requireAuth, goalController.listMyGoals);
router.post("/", requireAuth, validate({ body: createSchema }), goalController.createGoal);
router.patch(
  "/:id",
  requireAuth,
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: updateSchema,
  }),
  goalController.updateGoal
);
router.delete(
  "/:id",
  requireAuth,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  goalController.deleteGoal
);

module.exports = router;
