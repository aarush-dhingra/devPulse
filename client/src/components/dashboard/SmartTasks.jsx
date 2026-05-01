/**
 * SmartTasks — auto-tracked, user-defined productivity panel.
 *
 * • Empty by default — shows "No tasks yet" with a "+ Add Task" CTA
 * • Add Task is a modal: Title (optional) · Platform · Task Type · Target
 * • Auto-tracked types pull progress live from the dashboard `stats`
 *   (Problems → LeetCode/Codeforces, Commits → GitHub, Coding Time → WakaTime)
 * • Each task row shows a progress bar, current/target value, and a status
 *   pill: Pending / In Progress / Completed
 * • Custom tasks have a manual ✓ toggle
 */
import { useEffect, useRef, useState } from "react";
import Modal from "../ui/Modal";
import { useSmartTasks } from "../../hooks/useSmartTasks";
import PlatformLogo from "../ui/PlatformLogo";

/* ─── metadata ───────────────────────────────────────────────── */

const TYPE_META = {
  problems:   { icon: "🧩", label: "Problems",    unit: "solved",  accentColor: "#ffa116" },
  commits:    { icon: "💻", label: "Commits",     unit: "commits", accentColor: "#94a3b8" },
  codingTime: { icon: "⏱️", label: "Coding Time", unit: "hrs",     accentColor: "#22d3ee" },
  custom:     { icon: "🎯", label: "Custom",      unit: "",        accentColor: "#A78BFA" },
};

const PLATFORM_OPTIONS = {
  problems: [
    { id: "all",        label: "All Problems Platforms" },
    { id: "leetcode",   label: "LeetCode" },
    { id: "codeforces", label: "Codeforces" },
    { id: "gfg",        label: "GeeksForGeeks" },
  ],
  commits:    [{ id: "github",   label: "GitHub" }],
  codingTime: [{ id: "wakatime", label: "WakaTime" }],
  custom:     [{ id: "manual",   label: "Manual (no platform)" }],
};

const DEFAULT_TARGETS = { problems: 2, commits: 2, codingTime: 2, custom: 1 };

const STATUS_STYLES = {
  completed:   "text-emerald-400 bg-emerald-500/12 border-emerald-500/25",
  in_progress: "text-orange-400  bg-orange-500/12  border-orange-500/25",
  pending:     "text-amber-400   bg-amber-500/12   border-amber-500/25",
};

/* ─── Add-Task modal body ────────────────────────────────────── */

function AddTaskModalBody({ onAdd, onCancel }) {
  const [type,     setType]     = useState("problems");
  const [title,    setTitle]    = useState("");
  const [target,   setTarget]   = useState(DEFAULT_TARGETS.problems);
  const [platform, setPlatform] = useState("all");
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const handleTypeChange = (t) => {
    setType(t);
    setTarget(DEFAULT_TARGETS[t] ?? 1);
    const opts = PLATFORM_OPTIONS[t];
    setPlatform(opts?.[0]?.id ?? "all");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!target || Number(target) < 1) return;
    onAdd({ type, title, target: Number(target), platform });
  };

  const typeMeta  = TYPE_META[type];
  const platOpts  = PLATFORM_OPTIONS[type];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <label className="block">
        <span className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1">
          Task Title <span className="normal-case text-ink-faint/70">(optional)</span>
        </span>
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="e.g. Finish weekly contest problems"
          className="input"
        />
      </label>

      {/* Task Type */}
      <div>
        <span className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1.5">
          Task Type
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(TYPE_META).map(([id, m]) => (
            <button
              key={id}
              type="button"
              onClick={() => handleTypeChange(id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border transition ${
                type === id
                  ? "text-black font-bold border-transparent"
                  : "text-ink-muted border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
              style={type === id ? { background: m.accentColor } : {}}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Platform */}
      <label className="block">
        <span className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1">
          Platform
        </span>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="input"
        >
          {platOpts.map((p) => (
            <option key={p.id} value={p.id} className="bg-black">{p.label}</option>
          ))}
        </select>
      </label>

      {/* Target */}
      <label className="block">
        <span className="block text-[10px] uppercase tracking-widest text-ink-faint mb-1">
          Target value <span className="normal-case text-ink-faint/70">({typeMeta.unit || "units"})</span>
        </span>
        <input
          type="number"
          min="1"
          max={type === "codingTime" ? 24 : 500}
          step={type === "codingTime" ? 0.5 : 1}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="input tabular-nums"
          required
        />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-xl px-5 py-2 text-sm font-bold transition hover:opacity-90"
          style={{ background: typeMeta.accentColor, color: "#000" }}
        >
          Add Task
        </button>
      </div>
    </form>
  );
}

/* ─── single task row ────────────────────────────────────────── */

function TaskRow({ task, onRemove, onToggleManual }) {
  const meta    = TYPE_META[task.type] || TYPE_META.custom;
  const isDone  = task.done;
  const isAuto  = task.autotrack;

  const valueText = task.type === "codingTime"
    ? `${task.progress.toFixed(1)} / ${task.target}h`
    : `${task.progress} / ${task.target}`;

  return (
    <div
      className="relative group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-300"
      style={{
        borderColor: isDone ? `${meta.accentColor}40` : "rgba(255,255,255,0.06)",
        background:  isDone ? `${meta.accentColor}08` : "rgba(255,255,255,0.02)",
        boxShadow:   isDone ? `0 0 16px ${meta.accentColor}15` : "none",
      }}
    >
      {/* Icon */}
      <span
        className={`shrink-0 text-base transition-all duration-300 ${isDone ? "scale-110" : "opacity-80"}`}
        style={isDone ? { filter: `drop-shadow(0 0 6px ${meta.accentColor})` } : {}}
      >
        {isDone ? "✅" : meta.icon}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[12px] font-medium truncate ${isDone ? "line-through text-ink-muted" : "text-ink"}`}>
            {task.title}
          </span>
          {task.platform && task.platform !== "all" && task.platform !== "manual" && (
            <span className="inline-flex items-center gap-1 text-[10px] text-ink-faint">
              <PlatformLogo platform={task.platform} size={9} brand color="currentColor" />
              {task.platform}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${task.pct}%`,
                background: isDone ? "#10b981" : meta.accentColor,
                boxShadow: isDone ? "0 0 8px #10b98166" : `0 0 6px ${meta.accentColor}66`,
              }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-ink-faint shrink-0 w-16 text-right">
            {valueText}
          </span>
        </div>
      </div>

      {/* Status pill */}
      <span
        className={`shrink-0 text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-bold ${STATUS_STYLES[task.status]}`}
        title={isAuto ? "Auto-tracked from connected platforms" : "Manual task"}
      >
        {task.statusLabel}
      </span>

      {/* Actions (hover) */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
        {!isAuto && (
          <button
            onClick={() => onToggleManual(task.id)}
            className="w-6 h-6 grid place-items-center rounded-full border border-white/10 text-[11px] hover:border-accent-500/30 transition"
            title={isDone ? "Mark incomplete" : "Mark done"}
          >
            {isDone ? "↩" : "✓"}
          </button>
        )}
        <button
          onClick={() => onRemove(task.id)}
          className="w-6 h-6 grid place-items-center rounded-full border border-white/10 text-[11px] text-ink-faint hover:text-red-400 hover:border-red-500/30 transition"
          title="Remove task"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/* ─── summary bar ────────────────────────────────────────────── */

function SummaryBar({ summary }) {
  const { total, completed } = summary;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total && total > 0;

  return (
    <div className="flex items-center gap-3">
      <div className="text-[10px] uppercase tracking-widest text-ink-faint shrink-0">Today's Tasks</div>
      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: allDone
              ? "linear-gradient(90deg, #10b981, #22d3ee)"
              : "linear-gradient(90deg, #A78BFA, #22d3ee)",
            boxShadow: allDone ? "0 0 8px rgba(16,185,129,0.5)" : "none",
          }}
        />
      </div>
      <span className={`text-[11px] font-bold tabular-nums shrink-0 ${allDone ? "text-emerald-400" : "text-ink-muted"}`}>
        {completed}/{total}
        {allDone && <span className="ml-1">✓</span>}
      </span>
    </div>
  );
}

/* ─── main export ────────────────────────────────────────────── */

export default function SmartTasks({ stats }) {
  const { tasks, summary, addTask, removeTask, toggleManual } = useSmartTasks(stats);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAdd = (fields) => {
    addTask(fields);
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-2 min-w-0 flex-1">
      {/* Summary */}
      <SummaryBar summary={summary} />

      {/* Task list */}
      <div className="space-y-1.5">
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onRemove={removeTask}
            onToggleManual={toggleManual}
          />
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-6 px-3 rounded-lg border border-dashed border-white/[0.08] bg-white/[0.02]">
            <div className="text-3xl opacity-50">🗂️</div>
            <p className="text-[12px] font-medium text-ink-muted mt-1.5">No tasks yet</p>
            <p className="text-[10px] text-ink-faint mt-0.5">
              Add your first goal — auto-tracked from your connected platforms.
            </p>
          </div>
        )}
      </div>

      {/* Add button */}
      <button
        onClick={() => setModalOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.12] py-2 text-[11px] text-ink-faint hover:text-accent-300 hover:border-accent-500/30 transition-all duration-200"
      >
        <span className="text-base leading-none">+</span>
        Add Task
      </button>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New Task"
      >
        <AddTaskModalBody
          onAdd={handleAdd}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
