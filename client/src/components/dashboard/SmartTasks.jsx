/**
 * SmartTasks — auto-tracked, user-defined productivity task panel.
 *
 * • Shows summary: X / Y done
 * • Each task: icon, title, progress bar, "X / target" count, badge (Auto / Manual)
 * • Completion state: green glow + animated checkmark
 * • Inline "Add Task" form: type selector → target → platform → title
 * • Delete button per task
 */
import { useEffect, useRef, useState } from "react";
import { useSmartTasks } from "../../hooks/useSmartTasks";

/* ─── metadata ───────────────────────────────────────────────── */

const TYPE_META = {
  problems:   { icon: "🧩", label: "Problems",    unit: "solved",  accentColor: "#ffa116" },
  commits:    { icon: "💻", label: "Commits",     unit: "commits", accentColor: "#94a3b8" },
  codingTime: { icon: "⏱️", label: "Coding Time", unit: "hrs",     accentColor: "#22d3ee" },
  custom:     { icon: "🎯", label: "Custom",      unit: "",        accentColor: "#A78BFA" },
};

const PLATFORM_OPTIONS = {
  problems:   [
    { id: "all",        label: "All Platforms" },
    { id: "leetcode",   label: "LeetCode" },
    { id: "codeforces", label: "Codeforces" },
  ],
  commits:    [{ id: "github",   label: "GitHub" }],
  codingTime: [{ id: "wakatime", label: "WakaTime" }],
  custom:     [],
};

const DEFAULT_TARGETS = { problems: 2, commits: 2, codingTime: 2, custom: 1 };

/* ─── AddTask inline form ───────────────────────────────────── */

function AddTaskForm({ onAdd, onCancel }) {
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
    setTitle("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!target || Number(target) < 1) return;
    onAdd({ type, title, target: Number(target), platform });
  };

  const typeMeta  = TYPE_META[type];
  const platOpts  = PLATFORM_OPTIONS[type];
  const showPlat  = platOpts.length > 1;

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 rounded-xl border border-accent-500/25 bg-accent-500/[0.06] p-3 space-y-2.5"
    >
      <div className="text-[10px] uppercase tracking-widest text-accent-300 mb-1">New Task</div>

      {/* Type selector */}
      <div className="flex gap-1 flex-wrap">
        {Object.entries(TYPE_META).map(([id, m]) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTypeChange(id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition ${
              type === id
                ? "text-black font-bold border-transparent"
                : "text-ink-muted border-white/10 bg-white/[0.03] hover:border-white/20"
            }`}
            style={type === id ? { background: m.accentColor } : {}}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Target + platform row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 flex-1">
          <span className="text-[10px] text-ink-faint uppercase tracking-wider">Target</span>
          <input
            type="number"
            min="1"
            max={type === "codingTime" ? 24 : 200}
            step={type === "codingTime" ? 0.5 : 1}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="bg-transparent text-ink font-bold text-sm w-14 text-right focus:outline-none tabular-nums"
            required
          />
          <span className="text-[10px] text-ink-faint">{typeMeta.unit}</span>
        </div>

        {showPlat && (
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-ink focus:outline-none"
          >
            {platOpts.map((p) => (
              <option key={p.id} value={p.id} className="bg-black">{p.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Optional title */}
      <input
        ref={titleRef}
        type="text"
        placeholder={`Custom label (optional)`}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={60}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-ink placeholder-ink-faint focus:outline-none focus:border-accent-500/40 transition"
      />

      {/* Actions */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="submit"
          className="flex-1 rounded-lg py-1.5 text-[11px] font-bold uppercase tracking-wider transition hover:opacity-90"
          style={{ background: typeMeta.accentColor, color: "#000" }}
        >
          Add Task
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 rounded-lg py-1.5 text-[11px] text-ink-muted border border-white/10 hover:border-white/20 transition"
        >
          Cancel
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

  const unit    = task.type === "codingTime"
    ? `${task.progress.toFixed(1)} / ${task.target}h`
    : `${task.progress} / ${task.target}`;

  return (
    <div
      className="relative group flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-300"
      style={{
        borderColor: isDone ? `${meta.accentColor}40` : "rgba(255,255,255,0.06)",
        background: isDone ? `${meta.accentColor}08` : "rgba(255,255,255,0.02)",
        boxShadow: isDone ? `0 0 16px ${meta.accentColor}15` : "none",
      }}
    >
      {/* Status icon */}
      <span
        className={`shrink-0 text-base transition-all duration-300 ${isDone ? "scale-110" : "opacity-70"}`}
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
          {/* Auto / Manual badge */}
          <span
            className={`shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-bold ${
              isAuto
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : "text-ink-faint bg-white/[0.03] border-white/[0.06]"
            }`}
          >
            {isAuto ? "Auto" : "Manual"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${task.pct}%`,
                background: isDone ? "#10b981" : meta.accentColor,
                boxShadow: isDone ? `0 0 8px #10b98166` : `0 0 6px ${meta.accentColor}66`,
              }}
            />
          </div>
          <span className="text-[10px] tabular-nums text-ink-faint shrink-0 w-16 text-right">
            {unit}
          </span>
        </div>
      </div>

      {/* Toggle (custom) or delete */}
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

/* ─── Summary bar ────────────────────────────────────────────── */

function SummaryBar({ summary }) {
  const { total, completed, remaining } = summary;
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
  const [showForm, setShowForm] = useState(false);

  const handleAdd = (fields) => {
    addTask(fields);
    setShowForm(false);
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

        {tasks.length === 0 && !showForm && (
          <div className="text-center py-3 text-[11px] text-ink-faint">
            No tasks yet — add one below
          </div>
        )}
      </div>

      {/* Add form / button */}
      {showForm ? (
        <AddTaskForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/[0.12] py-2 text-[11px] text-ink-faint hover:text-accent-300 hover:border-accent-500/30 transition-all duration-200"
        >
          <span className="text-base leading-none">+</span>
          Add Task
        </button>
      )}
    </div>
  );
}
