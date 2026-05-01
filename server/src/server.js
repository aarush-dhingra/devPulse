"use strict";

const env = require("./config/env");
const logger = require("./utils/logger");
const app = require("./app");
const db = require("./config/db");

async function start() {
  try {
    const ok = await db.ping();
    if (ok) logger.info("Postgres connection OK");
  } catch (err) {
    logger.error("Postgres connection failed at startup", {
      error: err.message,
    });
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`DevVitals API listening on http://localhost:${env.PORT}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
      logger.info("HTTP server closed");
      db.pool.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });
  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
  });
}

start();
