"use strict";

const { ZodError } = require("zod");
const logger = require("../utils/logger");
const env = require("../config/env");

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "ValidationError",
      message: "Invalid request data",
      details: err.flatten(),
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  if (status >= 500) {
    logger.error("Unhandled error", {
      method: req.method,
      url: req.originalUrl,
      message,
      stack: err.stack,
    });
  } else {
    logger.warn("Handled error", {
      method: req.method,
      url: req.originalUrl,
      status,
      message,
    });
  }

  res.status(status).json({
    error: err.name || "Error",
    message,
    ...(err.details ? { details: err.details } : {}),
    ...(env.isDev && status >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = { HttpError, notFoundHandler, errorHandler };
