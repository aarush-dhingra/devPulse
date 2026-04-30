"use strict";

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const passport = require("passport");

const env = require("./config/env");
const logger = require("./utils/logger");
const { globalLimiter } = require("./middlewares/rateLimit.middleware");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const apiRoutes = require("./routes");

require("./config/passport");

const app = express();

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  morgan(env.isProd ? "combined" : "dev", {
    stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) },
    skip: (req) => req.path === "/api/health",
  })
);

app.use(globalLimiter);

app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.json({ name: "DevPulse API", status: "running", docs: "/api/health" });
});

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
