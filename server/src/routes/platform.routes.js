"use strict";

const express = require("express");
const { z } = require("zod");
const platformController = require("../controllers/platform.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");

const router = express.Router();

const PLATFORMS = ["github", "leetcode", "gfg", "codeforces", "codechef", "atcoder", "wakatime", "devto"];

const connectSchema = z.object({
  platform: z.enum(PLATFORMS),
  username: z.string().min(1).max(80),
  apiKey: z.string().min(1).max(200).optional(),
});

router.get("/", requireAuth, platformController.listMyPlatforms);

router.post(
  "/connect",
  requireAuth,
  validate({ body: connectSchema }),
  platformController.connectPlatform
);

router.delete(
  "/:platform",
  requireAuth,
  validate({ params: z.object({ platform: z.enum(PLATFORMS) }) }),
  platformController.disconnectPlatform
);

module.exports = router;
