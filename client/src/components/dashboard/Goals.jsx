import { useEffect, useState } from "react";
import Button from "../ui/Button";
import { goalsApi } from "../../api/goals.api";
import EmptyState from "../ui/EmptyState";
import PlatformLogo from "../ui/PlatformLogo";

const KIND_META = {
  leetcode_solves: { label: "LeetCode solves", platform: "leetcode", emoji: "🧩", accent: "#ffa116" },
  github_commits: { label: "GitHub commits", platform: "github", emoji: "🐙", accent: "#e6edf3" },
  wakatime_hours: { label: "Wakatime hours (30d)", platform: "wakatime", emoji: "⏱️", accent: "#22d3ee" },
  streak: { label: "Streak (days)", emoji: "🔥", accent: "#fb923c" },
  custom: { label: "Custom", emoji: "🎯", accent: "#94a3b8" },
};

function KindIcon({ kind, size = 16, color }) {
  const m = KIND_META[kind];
  if (!m) return null;
  if (m.platform) {
    return <PlatformLogo platform={m.platform} size={size} color={color || m.accent} />;
  }
  return <span className="text-base leading-none">{m.emoji}</span>;
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const list = await goalsApi.list();
      setGoals(list || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (payload) => {
    await goalsApi.create(payload);
    setShowAdd(false);
    load();
  };

  const handleDelete = async (id) => {
    await goalsApi.remove(id);
    load();
  };

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg">Goals</h3>
        <Button size="sm" onClick={() => setShowAdd((v) => !v)}>
          {showAdd ? "Cancel" : "+ Add"}
        </Button>
      </div>

      {showAdd && <AddGoalForm onSubmit={handleAdd} onCancel={() => setShowAdd(false)} />}

      {error && (
        <div className="mb-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-muted">Loading goals…</div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No goals yet"
          description="Set a target and DevPulse will auto-track your progress from live stats."
          action={
            <button
              onClick={() => document.querySelector('[data-add-goal]')?.click()}
              className="text-[11px] text-accent-300 hover:underline"
            >
              → Add your first goal
            </button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {goals.map((g) => {
            const meta = KIND_META[g.kind] || KIND_META.custom;
            const pct = Math.round((g.progress || 0) * 100);
            const done = !!g.completed_at || pct >= 100;
            return (
              <li
                key={g.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] hover:border-accent-500/30 transition px-3 py-2.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <KindIcon kind={g.kind} size={14} />
                  <span className="font-semibold text-sm truncate flex-1">{g.title}</span>
                  {done && (
                    <span className="pill-good text-[10px]">Achieved</span>
                  )}
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="text-[11px] text-ink-faint hover:text-rose-300"
                  >
                    Delete
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-muted">
                  <span>{meta.label}</span>
                  <span className="ml-auto tabular-nums">
                    {Math.max(0, (g.current ?? 0) - (g.baseline ?? 0))} / {g.target}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, pct)}%`,
                      background: `linear-gradient(90deg, ${meta.accent}, #22d3ee)`,
                      boxShadow: `0 0 10px ${meta.accent}66`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AddGoalForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("leetcode_solves");
  const [target, setTarget] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setErr("Title is required");
    if (!Number.isFinite(Number(target)) || Number(target) <= 0) {
      return setErr("Target must be a positive number");
    }
    setSubmitting(true);
    setErr(null);
    try {
      await onSubmit({ title: title.trim(), kind, target: Number(target) });
    } catch (e2) {
      setErr(e2.response?.data?.message || e2.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-3 rounded-xl border border-accent-500/20 bg-accent-500/5 p-3 space-y-2"
    >
      <input
        autoFocus
        className="input"
        placeholder="Goal title (e.g. Hit 600 LC solves)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="input"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {Object.entries(KIND_META).map(([k, m]) => (
            <option key={k} value={k}>
              {m.emoji} {m.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          className="input"
          placeholder="Target (e.g. 50)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </div>
      {err && <div className="text-xs text-rose-400">{err}</div>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={submitting}>
          Create goal
        </Button>
      </div>
    </form>
  );
}
