/**
 * TodayFocus — compact hero panel with today's score and user-defined tasks.
 * The score is auto-derived from today's stats; the task list is fully
 * user-defined via SmartTasks.
 */
import { useMemo } from "react";
import SmartTasks from "./SmartTasks";

/* ─── score computation ─────────────────────────────────────── */

function computeScore(stats) {
  const todayIso     = new Date().toISOString().slice(0, 10);
  const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const gh  = stats?.github     || {};
  const lc  = stats?.leetcode   || {};
  const wt  = stats?.wakatime   || {};
  const cf  = stats?.codeforces || {};
  const gfg = stats?.gfg        || {};
  const cc  = stats?.codechef   || {};
  const ac  = stats?.atcoder    || {};

  const dayCount = (arr, iso) => Number((arr || []).find((d) => d.date === iso)?.count || 0);
  const dayHours = (arr, iso) => Number((arr || []).find((d) => d.date === iso)?.hours || 0);

  /* Today's raw values */
  const todayCodingH  = dayHours(wt.dailyHours, todayIso);
  const todayProblems = dayCount(lc.dailySubmissions, todayIso)
                      + dayCount(cf.dailySubmissions, todayIso)
                      + dayCount(ac.dailySubmissions, todayIso);
  const todayCommits  = dayCount(gh.contributions?.heatmap, todayIso);

  /* Yesterday's raw values for delta */
  const yCodingH  = dayHours(wt.dailyHours, yesterdayIso);
  const yProblems = dayCount(lc.dailySubmissions, yesterdayIso)
                  + dayCount(cf.dailySubmissions, yesterdayIso)
                  + dayCount(ac.dailySubmissions, yesterdayIso);
  const yCommits  = dayCount(gh.contributions?.heatmap, yesterdayIso);

  /* Score (0–100) */
  const dailyAvgCoding = Number(wt.dailyAverageHours || 0);
  const allSolved      = Number(lc.solved?.total || 0)
                       + Number(cf.uniqueSolved || 0)
                       + Number(gfg.problemsSolved || 0)
                       + Number(cc.problemsSolved || 0)
                       + Number(ac.uniqueSolved || ac.acCount || 0);
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
  const scoreDelta  = yScore > 0
    ? Math.round(((dailyScore - yScore) / yScore) * 100)
    : (dailyScore > 0 ? 100 : 0);

  const scoreLevel  = dailyScore >= 70 ? "good" : dailyScore >= 35 ? "warn" : "danger";
  const scoreLabel  = dailyScore >= 70 ? "Good" : dailyScore >= 35 ? "Average" : "Low";

  return { dailyScore, scoreLevel, scoreLabel, scoreDelta };
}

/* ─── score ring ────────────────────────────────────────────── */

const SCORE_META = {
  good:   { color: "#10b981", glow: "rgba(16,185,129,0.35)" },
  warn:   { color: "#fbbf24", glow: "rgba(251,191,36,0.30)" },
  danger: { color: "#ef4444", glow: "rgba(239,68,68,0.30)"  },
};

function ScoreRing({ score, level, label, delta }) {
  const SIZE = 156;
  const R = 66;
  const C = 2 * Math.PI * R;
  const { color, glow } = SCORE_META[level];
  const dash = C * (Math.max(0, Math.min(100, score)) / 100);

  const deltaColor = delta > 0 ? "#10b981" : delta < 0 ? "#ef4444" : "#94a3b8";
  const deltaArrow = delta > 0 ? "↗" : delta < 0 ? "↘" : "·";

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div className="text-[10px] uppercase tracking-widest text-ink-faint">Today's Score</div>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox="0 0 156 156" width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
          <circle cx="78" cy="78" r={R} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
          <circle
            cx="78" cy="78" r={R}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${C - dash}`}
            style={{
              filter: `drop-shadow(0 0 16px ${color})`,
              transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline">
            <span
              className="font-display font-bold text-5xl leading-none tabular-nums"
              style={{ color, textShadow: `0 0 24px ${glow}` }}
            >
              {score}
            </span>
            <span className="text-xs text-ink-faint ml-1">/100</span>
          </div>
          <span className="text-xs font-semibold mt-1" style={{ color }}>
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

/* ─── main component ────────────────────────────────────────── */

export default function TodayFocus({ stats = {} }) {
  const { dailyScore, scoreLevel, scoreLabel, scoreDelta } = useMemo(
    () => computeScore(stats),
    [stats]
  );

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

      <div className="relative px-4 py-3">
        {/* Body: score + tasks */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch">
          <ScoreRing
            score={dailyScore}
            level={scoreLevel}
            label={scoreLabel}
            delta={scoreDelta}
          />

          <div className="hidden sm:block w-px bg-white/[0.06] self-stretch" />

          <SmartTasks stats={stats} />
        </div>
      </div>
    </div>
  );
}
