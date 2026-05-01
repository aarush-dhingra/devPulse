import { Link } from "react-router-dom";
import Sparkline from "./Sparkline";
import PlatformLogo from "../ui/PlatformLogo";
import { PLATFORM_BY_ID } from "../../utils/constants";
import { formatNumber } from "../../utils/formatters";
import EmptyState from "../ui/EmptyState";

export default function PlatformOverview({ stats = {}, platforms = [] }) {
  const rows = (platforms || [])
    .filter((p) =>
      ["github", "leetcode", "codeforces", "codechef", "atcoder", "gfg", "wakatime"].includes(p.platform_name)
    )
    .map((p) => buildRow(p, stats[p.platform_name]))
    .filter(Boolean);

  if (!rows.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-base mb-2">Platform Overview</h3>
        <EmptyState
          icon="🔌"
          title="No platforms connected"
          description="Head to Settings to wire up GitHub, LeetCode, Codeforces, CodeChef, AtCoder, GFG, or Wakatime."
        />
      </div>
    );
  }

  return (
    <div className="panel-pad flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Platform Overview</h3>
        <Link to="/settings" className="text-[11px] text-accent-300 hover:text-accent-200">
          Manage →
        </Link>
      </div>

      <ul className="flex-1 divide-y divide-white/[0.04] overflow-hidden">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              to={r.href}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition group"
            >
              {/* Logo */}
              <div
                className="w-8 h-8 rounded-lg grid place-items-center ring-1 ring-white/[0.08] shrink-0"
                style={{
                  background: r.bg,
                  boxShadow: `0 0 14px ${r.color}22`,
                }}
              >
                <PlatformLogo platform={r.id} size={16} color={r.color} />
              </div>

              {/* Name + 2 metrics */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold leading-tight">{r.name}</span>
                  <StatusDot status={r.status} />
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {r.metricA && (
                    <span className="text-[11px] text-ink-muted leading-none">
                      <span className="text-ink-faint">{r.metricA.label} </span>
                      <span className="text-ink font-medium tabular-nums">{r.metricA.value}</span>
                    </span>
                  )}
                  {r.metricB && (
                    <span className="text-[11px] text-ink-muted leading-none">
                      <span className="text-ink-faint">{r.metricB.label} </span>
                      <span className="text-ink font-medium tabular-nums">{r.metricB.value}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Sparkline */}
              {r.spark?.length > 1 && (
                <div className="hidden sm:block shrink-0 opacity-80 group-hover:opacity-100 transition">
                  <Sparkline values={r.spark} color={r.color} width={80} height={22} />
                </div>
              )}

              {/* Delta badge */}
              {r.delta != null && (
                <div
                  className="shrink-0 text-[11px] font-semibold tabular-nums"
                  style={{ color: r.delta >= 0 ? "#10b981" : "#ef4444" }}
                >
                  {r.delta >= 0 ? "▲" : "▼"} {Math.abs(r.delta).toFixed(1)}%
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        to="/settings"
        className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between
                   text-[12px] text-ink-muted hover:text-accent-300 transition"
      >
        <span>View all platforms</span>
        <span>›</span>
      </Link>
    </div>
  );
}

function StatusDot({ status }) {
  const map = { connected: "#10b981", pending: "#f59e0b", error: "#ef4444" };
  const c = map[status] || "#64748b";
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${status === "pending" ? "animate-pulseGlow" : ""}`}
      style={{ background: c, boxShadow: `0 0 6px ${c}` }}
    />
  );
}

function deltaPct(spark) {
  if (!spark || spark.length < 2) return null;
  const recent = spark.slice(-Math.max(1, Math.floor(spark.length / 2)));
  const older  = spark.slice(0, Math.max(1, Math.floor(spark.length / 2)));
  const sumRecent = recent.reduce((s, v) => s + (v || 0), 0);
  const sumOlder  = older.reduce((s, v) => s + (v || 0), 0);
  if (!sumOlder) return sumRecent > 0 ? 100 : null;
  return ((sumRecent - sumOlder) / sumOlder) * 100;
}

function buildRow(p, data) {
  const meta = PLATFORM_BY_ID[p.platform_name];
  if (!meta) return null;

  const base = {
    id: p.platform_name,
    name: meta.name,
    color: meta.color,
    bg: meta.bg,
    status: p.status,
    href: `/dashboard/${p.platform_name}`,
    spark: [],
    delta: null,
    metricA: null,
    metricB: null,
  };

  if (!data) {
    return {
      ...base,
      metricA: { label: "", value: p.platform_username ? `@${p.platform_username}` : "—" },
    };
  }

  switch (p.platform_name) {
    case "github": {
      const spark = weekSeries(data.contributions?.heatmap);
      return {
        ...base,
        spark,
        delta: deltaPct(spark),
        metricA: { label: "Commits", value: formatNumber(data.commits?.totalSearched ?? data.contributions?.total ?? 0) },
        metricB: { label: "PRs", value: formatNumber(data.contributions?.mergedPRs ?? 0) },
      };
    }
    case "leetcode": {
      const spark = solveSpark(data.solved);
      return {
        ...base,
        spark,
        delta: null,
        metricA: { label: "Solved", value: formatNumber(data.solved?.total ?? 0) },
        metricB: { label: "Rating", value: formatNumber(data.rating ?? 0) },
      };
    }
    case "codeforces": {
      const spark = (data.ratingHistory || []).slice(-12).map((r) => r.newRating);
      return {
        ...base,
        spark,
        delta: deltaPct(spark),
        metricA: { label: "Rating", value: formatNumber(data.rating ?? 0) },
        metricB: { label: "Global Rank", value: data.profile?.rank ? `#${formatNumber(data.profile.rank)}` : "—" },
      };
    }
    case "gfg": {
      return {
        ...base,
        spark: [],
        delta: null,
        metricA: { label: "Solved", value: formatNumber(data.problemsSolved ?? 0) },
        metricB: { label: "Score", value: formatNumber(data.score ?? 0) },
      };
    }
    case "wakatime": {
      const spark = (data.dailyHours || []).slice(-14).map((d) => d.hours || 0);
      return {
        ...base,
        spark,
        delta: deltaPct(spark),
        metricA: { label: "Time", value: `${Math.round(data.hoursLast30Days ?? 0)} hrs` },
        metricB: { label: "Daily Avg", value: `${((data.dailyAverageHours ?? 0)).toFixed(1)} hrs` },
      };
    }
    default:
      return base;
  }
}

function weekSeries(heatmap = []) {
  if (!heatmap?.length) return [];
  const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date)).slice(-84);
  const weeks = [];
  for (let i = 0; i < sorted.length; i += 7) {
    weeks.push(sorted.slice(i, i + 7).reduce((s, d) => s + (d.count || 0), 0));
  }
  return weeks;
}

function solveSpark(solved = {}) {
  return [
    solved.easy || 0,
    (solved.medium || 0) * 1.2,
    (solved.hard || 0) * 1.5,
    solved.total || 0,
  ];
}
