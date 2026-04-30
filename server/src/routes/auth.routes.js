"use strict";

const express = require("express");
const passport = require("passport");
const env = require("../config/env");
const authController = require("../controllers/auth.controller");
const { authLimiter } = require("../middlewares/rateLimit.middleware");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/signup", authLimiter, authController.signup);
router.post("/login", authLimiter, authController.login);

router.get(
  "/github",
  authLimiter,
  passport.authenticate("github", {
    scope: ["read:user", "user:email"],
    session: false,
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${env.CLIENT_URL}/login?error=github`,
  }),
  authController.githubCallback
);

router.get("/me", requireAuth, authController.me);
router.post("/logout", authController.logout);

module.exports = router;
