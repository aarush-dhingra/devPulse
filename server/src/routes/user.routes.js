"use strict";

const express = require("express");
const userController = require("../controllers/user.controller");
const { requireAuth, optionalAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/me", requireAuth, userController.getMe);
router.patch("/me", requireAuth, userController.updateMe);

router.get("/u/:username", optionalAuth, userController.getPublicProfile);

module.exports = router;
