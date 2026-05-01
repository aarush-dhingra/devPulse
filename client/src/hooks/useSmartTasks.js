/**
 * useSmartTasks — persistent, auto-tracked task system.
 *
 * Tasks are stored in localStorage. Auto-tracked types (problems, commits,
 * codingTime) derive their `progress` value live from the dashboard stats
 * prop so no manual completion is needed.
 *
 * Task schema:
 *   id        – unique string
 *   type      – "problems" | "commits" | "codingTime" | "custom"
 *   title     – display label
 *   target    – numeric target
 *   platform  – "all" | "leetcode" | "codeforces" | "gfg" | "github" | "wakatime"
 *   autotrack – boolean (false only for "custom")
 *   createdAt – timestamp
 */
import { useCallback, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "devpulse:smart-tasks:v2";

/* Default tasks shown on first load (before user customises) */
const DEFAULT_TASKS = [
  {
    id: "default-problems",
    type: "problems",
    title: "Solve problems",
    target: 2,
    platform: "all",
    autotrack: true,
    createdAt: 0,
  },
  {
    id: "default-commits",
    type: "commits",
    title: "Push commits",
    target: 2,
    platform: "github",
    autotrack: true,
    createdAt: 0,
  },
  {
    id: "default-coding",
    type: "codingTime",
    title: "Deep work",
    target: 2,
    platform: "wakatime",
    autotrack: true,
    createdAt: 0,
  },
];

/* ─── helpers ────────────────────────────────────────────────── */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persist(tasks) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
}

/**
 * Compute today's raw progress for auto-tracked types.
 */
function getTodayProgress(type, platform, stats) {
  if (!stats) return 0;
  const todayIso = new Date().toISOString().slice(0, 10);
  const gh  = stats.github     || {};
  const lc  = stats.leetcode   || {};
  const wt  = stats.wakatime   || {};
  const cf  = stats.codeforces || {};

  switch (type) {
    case "problems": {
      const lcCount = Number((lc.dailySubmissions || []).find((d) => d.date === todayIso)?.count || 0);
      const cfCount = Number((cf.dailySubmissions || []).find((d) => d.date === todayIso)?.count || 0);
      if (platform === "leetcode")   return lcCount;
      if (platform === "codeforces") return cfCount;
      return lcCount + cfCount;
    }
    case "commits":
      return Number((gh.contributions?.heatmap || []).find((d) => d.date === todayIso)?.count || 0);
    case "codingTime":
      return Number((wt.dailyHours || []).find((d) => d.date === todayIso)?.hours || 0);
    default:
      return 0;
  }
}

/* ─── hook ───────────────────────────────────────────────────── */

export function useSmartTasks(stats) {
  const [rawTasks, setRawTasks] = useState(() => load() ?? DEFAULT_TASKS);
  /* Manual toggle state for "custom" tasks (keyed by task id) */
  const [manualDone, setManualDone] = useState({});

  /* Stable setter that also persists */
  const setTasks = useCallback((updater) => {
    setRawTasks((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }, []);

  const addTask = useCallback((fields) => {
    const task = {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type:      fields.type     ?? "custom",
      title:     (fields.title?.trim() || autoTitle(fields.type, fields.target, fields.platform)),
      target:    Number(fields.target) || 1,
      platform:  fields.platform ?? "all",
      autotrack: fields.type !== "custom",
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, task]);
  }, [setTasks]);

  const removeTask = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, [setTasks]);

  const toggleManual = useCallback((id) => {
    setManualDone((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  /* Compute progress for every task */
  const tasks = useMemo(() => {
    return rawTasks.map((task) => {
      if (task.type === "custom") {
        const done = !!manualDone[task.id];
        return {
          ...task,
          progress:   done ? task.target : 0,
          done,
          pct:        done ? 100 : 0,
          justDone:   false,
        };
      }
      const progress = getTodayProgress(task.type, task.platform, stats);
      const pct      = task.target > 0 ? Math.min(100, Math.round((progress / task.target) * 100)) : 0;
      return {
        ...task,
        progress,
        done:     progress >= task.target,
        pct,
        justDone: false,
      };
    });
  }, [rawTasks, stats, manualDone]);

  const summary = useMemo(() => {
    const completed = tasks.filter((t) => t.done).length;
    return { total: tasks.length, completed, remaining: tasks.length - completed };
  }, [tasks]);

  return { tasks, summary, addTask, removeTask, toggleManual };
}

/* ─── helpers ────────────────────────────────────────────────── */

function autoTitle(type, target, platform) {
  const t = Number(target) || 1;
  switch (type) {
    case "problems":
      return `Solve ${t} problem${t > 1 ? "s" : ""}${platform && platform !== "all" ? ` on ${capitalize(platform)}` : ""}`;
    case "commits":
      return `Push ${t} commit${t > 1 ? "s" : ""} to GitHub`;
    case "codingTime":
      return `Code for ${t}h on WakaTime`;
    default:
      return "Custom task";
  }
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
