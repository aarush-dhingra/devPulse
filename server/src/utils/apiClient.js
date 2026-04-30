"use strict";

const axios = require("axios");
const axiosRetry = require("axios-retry").default;
const logger = require("./logger");

function createApiClient(options = {}) {
  const {
    baseURL,
    headers = {},
    timeout = 15000,
    retries = 3,
    retryDelay = (count) => Math.min(1000 * 2 ** count, 8000),
    name = baseURL || "api",
  } = options;

  const instance = axios.create({ baseURL, headers, timeout });

  axiosRetry(instance, {
    retries,
    retryDelay,
    retryCondition: (error) => {
      if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
      const status = error.response?.status;
      return status === 429 || (status >= 500 && status < 600);
    },
  });

  instance.interceptors.request.use((config) => {
    config.metadata = { startedAt: Date.now() };
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const ms = Date.now() - (response.config.metadata?.startedAt || Date.now());
      logger.debug("HTTP OK", {
        client: name,
        url: response.config.url,
        status: response.status,
        ms,
      });
      return response;
    },
    (error) => {
      const ms = Date.now() - (error.config?.metadata?.startedAt || Date.now());
      logger.warn("HTTP error", {
        client: name,
        url: error.config?.url,
        status: error.response?.status,
        ms,
        message: error.message,
      });
      return Promise.reject(error);
    }
  );

  return instance;
}

module.exports = { createApiClient };
