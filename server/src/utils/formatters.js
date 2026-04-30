"use strict";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function topN(map, n = 5) {
  return Object.entries(map || {})
    .map(([key, value]) => ({ key, value: safeNum(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

function sumValues(map) {
  return Object.values(map || {}).reduce((acc, v) => acc + safeNum(v), 0);
}

function percent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function dedupeBy(arr, key) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = typeof key === "function" ? key(item) : item[key];
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

module.exports = { clamp, safeNum, topN, sumValues, percent, dedupeBy };
