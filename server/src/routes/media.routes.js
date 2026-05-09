"use strict";

const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");
const { uploadMedia } = require("../controllers/media.controller");

const router = express.Router();

// POST /media/upload  — upload one image or video (up to 4 files)
router.post("/upload", requireAuth, upload.single("file"), uploadMedia);

module.exports = router;
