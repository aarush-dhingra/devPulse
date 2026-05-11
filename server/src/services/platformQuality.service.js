"use strict";

const { safeNum } = require("../utils/formatters");

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function objectHasValues(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.length > 0;
  return Object.values(value).some((v) => {
    if (typeof v === "number") return v > 0;
    if (typeof v === "string") return v.trim().length > 0;
    return objectHasValues(v);
  });
}

function hasMeaningfulName(profile = {}) {
  if (!hasText(profile.name)) return false;
  if (!hasText(profile.username)) return true;
  return profile.name.trim().toLowerCase() !== profile.username.trim().toLowerCase();
}

function buildQuality(platform, data) {
  if (!data || typeof data !== "object") {
    return { valid: false, reason: "empty_payload" };
  }

  if (platform === "gfg") {
    const hasMetrics =
      safeNum(data.score) > 0 ||
      safeNum(data.problemsSolved) > 0 ||
      safeNum(data.streak) > 0 ||
      safeNum(data.maxStreak) > 0 ||
      safeNum(data.monthlyScore) > 0 ||
      safeNum(data.articlesPublished) > 0 ||
      safeNum(data.potdSolved) > 0 ||
      objectHasValues(data.solvedDetails) ||
      objectHasValues(data.solvedProblems) ||
      objectHasValues(data.topicStats) ||
      objectHasValues(data.activityCalendar);
    const hasProfileEvidence =
      hasMeaningfulName(data.profile) ||
      hasText(data.profile?.institute) ||
      safeNum(data.profile?.instituteRank) > 0;

    return {
      valid: hasMetrics || hasProfileEvidence,
      confidence: hasMetrics ? "high" : hasProfileEvidence ? "profile-only" : "none",
      reason: hasMetrics || hasProfileEvidence ? null : "zero_gfg_payload",
    };
  }

  if (platform === "codechef") {
    const hasMetrics =
      safeNum(data.rating) > 0 ||
      safeNum(data.problemsSolved) > 0 ||
      safeNum(data.partialProblems) > 0 ||
      safeNum(data.contestsAttended) > 0 ||
      safeNum(data.globalRank) > 0 ||
      safeNum(data.countryRank) > 0 ||
      (Array.isArray(data.ratingHistory) && data.ratingHistory.length > 0) ||
      (Array.isArray(data.contests) && data.contests.length > 0);
    const hasProfileEvidence =
      hasMeaningfulName(data.profile) ||
      hasText(data.profile?.avatar) ||
      hasText(data.profile?.country) ||
      hasText(data.profile?.institution);

    return {
      valid: hasMetrics || hasProfileEvidence,
      confidence: hasMetrics ? "high" : hasProfileEvidence ? "profile-only" : "none",
      reason: hasMetrics || hasProfileEvidence ? null : "zero_codechef_payload",
    };
  }

  return { valid: true, confidence: "unchecked", reason: null };
}

function assertUsableSnapshot(platform, data) {
  const quality = buildQuality(platform, data);
  if (!quality.valid) {
    const err = new Error(
      `${platform} returned no trustworthy profile or stats data`
    );
    err.code = "PLATFORM_DATA_UNTRUSTED";
    err.quality = quality;
    throw err;
  }
  return {
    ...data,
    quality: {
      ...(data.quality || {}),
      ...quality,
      checkedAt: new Date().toISOString(),
    },
  };
}

module.exports = { buildQuality, assertUsableSnapshot };
