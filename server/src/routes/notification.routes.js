"use strict";

const express = require("express");
const { requireAuth } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/notification.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/",                    ctrl.list);
router.get("/unread-count",        ctrl.unreadCount);
router.post("/read-all",           ctrl.markAllRead);
router.patch("/:id/read",          ctrl.markOneRead);

module.exports = router;
