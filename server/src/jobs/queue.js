"use strict";

const { Queue, QueueEvents } = require("bullmq");
const env = require("../config/env");
const { makeClient } = require("../config/redis");
const logger = require("../utils/logger");

const QUEUE_NAME = "devpulse-jobs";

let queue = null;
let queueEvents = null;

function getConnection() {
  return makeClient("bullmq");
}

function getQueue() {
  if (!env.REDIS_URL) return null;
  if (!queue) {
    const connection = getConnection();
    if (!connection) return null;
    queue = new Queue(QUEUE_NAME, { connection });
    queueEvents = new QueueEvents(QUEUE_NAME, { connection: getConnection() });
    queueEvents.on("failed", ({ jobId, failedReason }) =>
      logger.warn("Job failed", { jobId, failedReason })
    );
    queueEvents.on("completed", ({ jobId }) =>
      logger.debug("Job completed", { jobId })
    );
  }
  return queue;
}

const DEFAULT_OPTS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 86_400, count: 1000 },
  removeOnFail: { age: 7 * 86_400 },
};

async function queueRefreshUser(userId, reason = "manual") {
  const q = getQueue();
  if (q) {
    return q.add(
      "refresh-user",
      { userId, reason },
      { ...DEFAULT_OPTS, jobId: `refresh-user:${userId}` }
    );
  }
  // No Redis available — run inline. Awaitable so callers can wait for
  // fresh data; if used as fire-and-forget, errors are logged.
  logger.info("Running refresh inline (no Redis)", { userId, reason });
  // Lazy-require to avoid loading platform services on cold start.
  const { refreshUser } = require("./refreshStats.job");
  return refreshUser(userId);
}

async function queueRefreshAllUsers() {
  const q = getQueue();
  if (!q) return null;
  return q.add("refresh-all-users", {}, DEFAULT_OPTS);
}

async function queueWeeklyDigest() {
  const q = getQueue();
  if (!q) return null;
  return q.add("weekly-digest", {}, DEFAULT_OPTS);
}

module.exports = {
  QUEUE_NAME,
  getQueue,
  getConnection,
  queueRefreshUser,
  queueRefreshAllUsers,
  queueWeeklyDigest,
};
