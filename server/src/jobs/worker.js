"use strict";

const { Worker } = require("bullmq");
const env = require("../config/env");
const logger = require("../utils/logger");
const { QUEUE_NAME, getConnection, getQueue } = require("./queue");
const { refreshUser, refreshAllUsers } = require("./refreshStats.job");
const { sendWeeklyDigest } = require("./weeklyDigest.job");

if (!env.REDIS_URL) {
  logger.warn("Worker not started — REDIS_URL is not configured");
  process.exit(0);
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    logger.info("Job started", { name: job.name, id: job.id });
    switch (job.name) {
      case "refresh-user":
        return refreshUser(job.data.userId);
      case "refresh-all-users":
        return refreshAllUsers();
      case "weekly-digest":
        return sendWeeklyDigest();
      default:
        logger.warn("Unknown job", { name: job.name });
        return null;
    }
  },
  { connection: getConnection(), concurrency: 4 }
);

worker.on("completed", (job, result) => {
  logger.info("Job completed", { name: job.name, id: job.id, result });
});
worker.on("failed", (job, err) => {
  logger.warn("Job failed", { name: job?.name, id: job?.id, error: err.message });
});

// Schedule recurring jobs (cron)
async function scheduleRecurring() {
  const queue = getQueue();
  if (!queue) return;
  // Refresh all users every 6 hours
  await queue.add(
    "refresh-all-users",
    {},
    {
      repeat: { pattern: "0 */6 * * *" },
      jobId: "cron:refresh-all-users",
      removeOnComplete: true,
    }
  );
  // Weekly digest every Monday 09:00 UTC
  await queue.add(
    "weekly-digest",
    {},
    {
      repeat: { pattern: "0 9 * * 1" },
      jobId: "cron:weekly-digest",
      removeOnComplete: true,
    }
  );
  logger.info("Recurring jobs scheduled");
}

scheduleRecurring().catch((err) =>
  logger.error("Failed to schedule recurring jobs", { error: err.message })
);

logger.info("DevPulse worker running");
