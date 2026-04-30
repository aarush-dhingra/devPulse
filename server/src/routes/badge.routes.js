"use strict";

const express = require("express");
const badgeController = require("../controllers/badge.controller");
const { optionalAuth, requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/all", badgeController.listAll);
router.get("/u/:username", optionalAuth, badgeController.listForUser);
router.get("/me", requireAuth, badgeController.listMine);

module.exports = router;
