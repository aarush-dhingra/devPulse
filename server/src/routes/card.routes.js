"use strict";

const express = require("express");
const cardController = require("../controllers/card.controller");
const { heavyLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

router.get("/:username", heavyLimiter, cardController.generateCard);
router.get("/:username/svg", heavyLimiter, cardController.generateCardSvg);

module.exports = router;
