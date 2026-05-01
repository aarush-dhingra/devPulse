/**
 * TodayFocus — hero panel with score, today's tasks, optional warning banner,
 * and a "Start Focus Session" CTA. Read-only display of three core tasks
 * (Problems, Commits, Coding) auto-derived from today's stats.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DateRangeBar from "./DateRangeBar";
import PlatformLogo from "../ui/PlatformLogo";

/* ─── greeting helpers ──────────────────────────────────────── */

const GREETINGS = {
  0: "Burning the midnight oil",
  5: "Good morning",
  12: "Good afternoon",
  17: "Good evening",
  22: "Late night vibes",
};
function greeting() {
  const h = new Date().getHours();
  const keys = Object.keys(GREETINGS).map(Number).sort((a, b) => b - a);
  return GREETINGS[keys.find((k) => h >= k) ?? 0];
}

/* ─── score + tasks computation ─────────────────────────────── */

function computeFocus(stats) {
  const todayIso     = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const gh  = stats?.github     || {};
  const lc  = stats?.leetcode   || {};
  const wt  = stats?.wakatime   || {};
  const cf  = stats?.codeforces || {};
  const gfg = stats?.gfg        || {};

  /* Today's raw values */
  const todayCodingH  = Number((wt.dailyHours        || []).find((d) => d.date === todayIso)?.hours || 0);
  const todayLC       = Number((lc.dailySubmissions  || []).find((d) => d.date === todayIso)?.count || 0);
  const todayCF       = Number((cf.dailySubmissions  || []).find((d) => d.date === todayIso)?.count || 0);
  const todayProblems = todayLC + todayCF;
  const todayCommits  = Number((gh.contributions?.heatmap || []).find((d) => d.date === todayIso)?.count || 0);

  /* Yesterday's raw values for delta */
  const yCodingH  = Number((wt.dailyHours        || []).find((d) => d.date === yesterdayIso)?.hours || 0);
  const yLC       = Number((lc.dailySubmissions  || []).find((d) => d.date === yesterdayIso)?.count || 0);
  const yCF       = Number((cf.dailySubmissions  || []).find((d) => d.date === yesterdayIso)?.count || 0);
  const yProblems = yLC + yCF;
  const yCommits  = Number((gh.contributions?.heatmap || []).find((d) => d.date === yesterdayIso)?.count || 0);

  /* Score (0–100) */
  const dailyAvgCoding = Number(wt.dailyAverageHours || 0);
  const allSolved      = Number(lc.solved?.total || 0) + Number(cf.uniqueSolved || 0) + Number(gfg.problemsSolved || 0);
  const dailyAvgProbs  = allSolved > 0 ? Math.max(1, Math.round(allSolved / 90)) : 2;
  const streak         = Math.max(Number(gh.contributions?.streakCurrent || 0), Number(gfg.streak || 0));

  const codingPts  = dailyAvgCoding > 0
    ? Math.min(40, Math.round((todayCodingH / dailyAvgCoding) * 40))
    : Math.min(40, Math.round(todayCodingH * 8));
  const problemPts = Math.min(30, Math.round((todayProblems / dailyAvgProbs) * 30));
  const commitPts  = Math.min(20, todayCommits * 7);
  const streakPts  = streak > 0 ? 10 : 0;
  const dailyScore = codingPts + problemPts + commitPts + streakPts;

  /* Yesterday score for delta */
  const yCodingPts  = dailyAvgCoding > 0
    ? Math.min(40, Math.round((yCodingH / dailyAvgCoding) * 40))
    : Math.min(40, Math.round(yCodingH * 8));
  const yProblemPts = Math.min(30, Math.round((yProblems / dailyAvgProbs) * 30));
  const yCommitPts  = Math.min(20, yCommits * 7);
  const yScore      = yCodingPts + yProblemPts + yCommitPts + (streak > 0 ? 10 : 0);
  const scoreDelta  = yScore > 0 ? Math.round(((dailyScore - yScore) / yScore) * 100) : (dailyScore > 0 ? 100 : 0);

  const scoreLevel  = dailyScore >= 70 ? "good" : dailyScore >= 35 ? "warn" : "danger";
  const scoreLabel  = dailyScore >= 70 ? "Good" : dailyScore >= 35 ? "Average" : "Low";

  /* Tasks — three fixed slots */
  const problemTarget = 2;
  const commitTarget  = 2;
  const codingTarget  = Math.max(2, Math.round(dailyAvgCoding || 2));

  const tasks = [
    {
      id: "problems",
      platform: "leetcode",
      accent: "#ffa116",
      title: todayProblems >= problemTarget
        ? "Daily problems done"
        : `Solve ${problemTarget - todayProblems} more problem${problemTarget - todayProblems > 1 ? "s" : ""}`,
      progress: todayProblems,
      target: problemTarget,
      progressLabel: `${todayProblems} / ${problemTarget}`,
      status: todayProblems >= problemTarget ? "done" : todayProblems > 0 ? "in_progress" : "pending",
      statusLabel: todayProblems >= problemTarget ? "Complete" : todayProblems > 0 ? "In Progress" : "Pending",
    },
    {
      id: "commits",
      platform: "github",
      accent: "#94a3b8",
      title: todayCommits >= commitTarget
        ? `${todayCommits} commits pushed`
        : `Push ${commitTarget - todayCommits} more commit${commitTarget - todayCommits > 1 ? "s" : ""}`,
      progress: todayCommits,
      target: commitTarget,
      progressLabel: `${todayCommits} / ${commitTarget}`,
      status: todayCommits >= commitTarget ? "done" : todayCommits > 0 ? "in_progress" : "pending",
      statusLabel: todayCommits >= commitTarget ? "Complete" : todayCommits > 0 ? "In Progress" : "Pending",
    },
    {
      id: "coding",
      platform: "wakatime",
      accent: "#22d3ee",
      title: todayCodingH >= codingTarget
        ? `${todayCodingH.toFixed(1)}h coded today`
        : `Code for ${(codingTarget - todayCodingH).toFixed(1)} more hour${(codingTarget - todayCodingH) > 1 ? "s" : ""}`,
      progress: todayCodingH,
      target: codingTarget,
      progressLabel: `${todayCodingH.toFixed(1)}h / ${codingTarget}h`,
      status: todayCodingH >= codingTarget ? "done" : todayCodingH > 0 ? "in_progress" : "tracking",
      statusLabel: todayCodingH >= codingTarget ? "Complete" : todayCodingH > 0 ? "In Progress" : "Track Time",
    },
  ];

  /* Alert banner — single most-relevant warning */
  let alert = null;
  const todayTotal = todayCodingH + todayProblems + todayCommits;
  if (todayTotal === 0) {
    alert = {
      level: "danger",
      msg: "No coding detected today. Start a focus session or solve a problem to build momentum.",
    };
  } else if (streak > 2 && todayCodingH === 0 && todayProblems === 0 && todayCommits < 1) {
    alert = {
      level: "danger",
      msg: `${streak}-day streak at risk. Push a commit or solve a problem before the day ends.`,
    };
  } else if (dailyAvgCoding > 0 && todayCodingH > 0 && todayCodingH < dailyAvgCoding * 0.4) {
    alert = {
      level: "warn",
      msg: `Only ${todayCodingH.toFixed(1)}h coded — well below your ${dailyAvgCoding.toFixed(1)}h daily average.`,
    };
  }

  return { dailyScore, scoreLevel, scoreLabel, scoreDelta, tasks, alert };
}

/* ─── score ring ────────────────────────────────────────────── */

const SCORE_META = {
  good:   { color: "#10b981", glow: "rgba(16,185,129,0.35)" },
  warn:   { color: "#fbbf24", glow: "rgba(251,191,36,0.30)" },
  danger: { color: "#ef4444", glow: "rgba(239,68,68,0.30)"  },
};

function ScoreRing({ score, level, label, delta }) {
  const R = 50;
  const C = 2 * Math.PI * R;
  const { color, glow } = SCORE_META[level];
  const dash = C * (Math.max(0, Math.min(100, score)) / 100);

  const deltaColor = delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#94a3b8";
  const deltaArrow = delta > 0 ? "↗" : delta < 0 ? "↘" : "·";

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div className="text-[10px] uppercase tracking-widest text-ink-faint">Today's Score</div>
      <div className="relative" style={{ width: 116, height: 116 }}>
        <svg viewBox="0 0 120 120" width="116" height="116" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
          <circle
            cx="60" cy="60" r={R}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            style={{
              filter: `drop-shadow(0 0 12px ${color})`,
              transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline">
            <span
              className="font-display font-bold text-3xl leading-none tabular-nums"
              style={{ color, textShadow: `0 0 20px ${glow}` }}
            >
              {score}
            </span>
            <span className="text-[10px] text-ink-faint ml-0.5">/100</span>
          </div>
          <span className="text-[11px] font-semibold mt-0.5" style={{ color }}>
            {label}
          </span>
        </div>
      </div>
      <div className="text-[10px] tabular-nums font-semibold" style={{ color: deltaColor }}>
        {deltaArrow} {Math.abs(delta)}% vs yesterday
      </div>
    </div>
  );
}

/* ─── status chips ──────────────────────────────────────────── */

const STATUS_STYLES = {
  done:        "text-emerald-400 bg-emerald-500/12 border-emerald-500/25",
  in_progress: "text-orange-400  bg-orange-500/12  border-orange-500/25",
  pending:     "text-amber-400   bg-amber-500/12   border-amber-500/25",
  tracking:    "text-cyan-400    bg-cyan-500/12    border-cyan-500/25",
};

const PLATFORM_LABEL = {
  github:   "GitHub",
  leetcode: "LeetCode",
  wakatime: "WakaTime",
};

/* ─── task row ──────────────────────────────────────────────── */

function TaskRow({ task }) {
  const pct  = task.target > 0 ? Math.min(100, Math.round((task.progress / task.target) * 100)) : 0;
  const done = task.status === "done";

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] px-3 py-2.5 transition-all duration-150">
      {/* Status dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{
          background: done ? "#10b981" : task.accent,
          boxShadow: `0 0 6px ${done ? "#10b981" : task.accent}88`,
        }}
      />

      {/* Title + platform */}
      <div className="min-w-0 w-[200px] shrink-0">
        <div className={`text-[12px] font-medium truncate ${done ? "text-ink-muted line-through" : "text-ink"}`}>
          {task.title}
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-ink-faint">
          <PlatformLogo platform={task.platform} size={10} brand color="currentColor" />
          {PLATFORM_LABEL[task.platform]}
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden min-w-[60px]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: done
              ? "linear-gradient(90deg, #10b981, #22d3ee)"
              : `linear-gradient(90deg, ${task.accent}, ${task.accent}aa)`,
            boxShadow: `0 0 8px ${(done ? "#10b981" : task.accent)}66`,
          }}
        />
      </div>

      {/* Progress text */}
      <span className="text-[11px] tabular-nums text-ink-muted shrink-0 w-16 text-right">
        {task.progressLabel}
      </span>

      {/* Status chip */}
      <span
        className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-bold shrink-0 ${STATUS_STYLES[task.status]}`}
      >
        {task.statusLabel}
      </span>
    </div>
  );
}

/* ─── alert banner ──────────────────────────────────────────── */

const ALERT_STYLES = {
  danger: "border-red-500/30   bg-red-500/[0.08]   text-red-300",
  warn:   "border-amber-500/30 bg-amber-500/[0.08] text-amber-300",
};
const ALERT_ICON = { danger: "⚠", warn: "ℹ" };

function AlertBanner({ alert, onCta }) {
  if (!alert) return null;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 mb-3 text-[11px] ${ALERT_STYLES[alert.level]}`}
    >
      <span className="text-sm leading-none mt-0.5">{ALERT_ICON[alert.level]}</span>
      <div className="flex-1">{alert.msg}</div>
      {alert.level === "danger" && (
        <button
          onClick={onCta}
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider underline hover:no-underline"
        >
          Start now →
        </button>
      )}
    </div>
  );
}

/* ─── main component ────────────────────────────────────────── */

export default function TodayFocus({
  user,
  stats = {},
  period,
  onPeriodChange,
  refreshing,
  onRefresh,
}) {
  const navigate = useNavigate();
  const { dailyScore, scoreLevel, scoreLabel, scoreDelta, tasks, alert } = useMemo(
    () => computeFocus(stats),
    [stats]
  );
  const name = user?.name?.split(" ")[0] || user?.username || "Dev";
  const startFocus = () => navigate("/dashboard#focus-mode");

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #0d0d0d 100%)",
        boxShadow: "0 0 0 1px rgba(139,92,246,0.18), 0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.04) inset",
      }}
    >
      {/* Top gradient accent */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, transparent, #8b5cf6 30%, #22d3ee 65%, transparent)" }}
      />
      {/* Ambient glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-50"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 70%)" }} />

      <div className="relative px-5 py-4">
        {/* Header row: greeting + CTA */}
        <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="font-display font-bold text-xl leading-tight">
              {greeting()}, {name} <span className="ml-1">👋</span>
            </h2>
            <p className="text-[12px] text-ink-faint italic mt-0.5">
              "Code. Learn. Optimize. Repeat."
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DateRangeBar
              period={period}
              onChange={onPeriodChange}
              refreshing={refreshing}
              onRefresh={onRefresh}
              compact
            />
            <button
              onClick={startFocus}
              className="rounded-lg px-4 py-2 text-[12px] font-bold uppercase tracking-wider transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 0 18px rgba(124,58,237,0.4), 0 1px 0 rgba(255,255,255,0.08) inset",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 28px rgba(124,58,237,0.6), 0 1px 0 rgba(255,255,255,0.1) inset"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 18px rgba(124,58,237,0.4), 0 1px 0 rgba(255,255,255,0.08) inset"; }}
            >
              ▶ Start Focus Session
            </button>
          </div>
        </div>

        {/* Body: score + tasks */}
        <div className="flex flex-col sm:flex-row gap-5 items-stretch">
          {/* Score */}
          <ScoreRing
            score={dailyScore}
            level={scoreLevel}
            label={scoreLabel}
            delta={scoreDelta}
          />

          {/* Divider */}
          <div className="hidden sm:block w-px bg-white/[0.06] self-stretch" />

          {/* Tasks */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase tracking-widest text-ink-faint">Today's Tasks</div>
            </div>

            {/* Conditional alert banner */}
            <AlertBanner alert={alert} onCta={startFocus} />

            <div className="space-y-1.5">
              {tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
