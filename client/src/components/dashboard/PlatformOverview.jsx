import { Link } from "react-router-dom";
import Sparkline from "./Sparkline";
import { PLATFORM_BY_ID } from "../../utils/constants";
import { formatNumber } from "../../utils/formatters";
import EmptyState from "../ui/EmptyState";

export default function PlatformOverview({ stats = {}, platforms = [] }) {
  const connected = (platforms || []).filter(
    (p) => p.platform_name !== "github" || p.last_synced
  );

  const rows = (platforms || [])
    .filter((p) => ["github", "leetcode", "codeforces", "gfg", "wakatime", "devto"].includes(p.platform_name))
    .map((p) => buildRow(p, stats[p.platform_name]))
    .filter(Boolean);

  if (!rows.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Platform Overview</h3>
        <EmptyState
          icon="🔌"
          title="No platforms connected"
          description="Head to Settings to wire up GitHub, LeetCode, Codeforces, GFG, Wakatime or Dev.to."
        />
      </div>
    );
  }

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg">Platform Overview</h3>
        <Link to="/settings" className="text-xs text-accent-300 hover:text-accent-200">
          Manage →
        </Link>
      </div>
      <ul className="divide-y divide-white/5">
        {rows.map((r) => (
          <Link
            key={r.id}
            to={r.href}
            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 py-3 px-2 -mx-2 rounded-xl hover:bg-white/[0.03] transition group"
          >
            <div
              className="w-10 h-10 rounded-xl grid place-items-center text-lg ring-1 ring-white/10"
              style={{ background: r.bg, color: r.color }}
            >
              {r.icon}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm flex items-center gap-2">
                {r.name}
                <StatusDot status={r.status} />
              </div>
              <div className="text-xs text-ink-muted truncate">
                {r.metricsLabel}
              </div>
            </div>
            <div className="hidden sm:block">
              <Sparkline values={r.spark} color={r.color} width={100} height={26} />
            </div>
            <div className="text-right">
              <div className="text-sm font-bold tabular-nums">{r.primaryDisplay}</div>
              {r.secondary && (
                <div className="text-[11px] text-ink-faint">{r.secondary}</div>
              )}
            </div>
          </Link>
        ))}
      </ul>
    </div>
  );
}

function StatusDot({ status }) {
  const map = {
    connected: "#10b981",
    pending: "#f59e0b",
    error: "#ef4444",
  };
  const c = map[status] || "#64748b";
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${
        status === "pending" ? "animate-pulseGlow" : ""
      }`}
      style={{ background: c, boxShadow: `0 0 6px ${c}` }}
    />
  );
}

function buildRow(p, data) {
  const meta = PLATFORM_BY_ID[p.platform_name];
  if (!meta) return null;

  const base = {
    id: p.platform_name,
    name: meta.name,
    icon: meta.icon,
    color: meta.color,
    bg: meta.bg,
    status: p.status,
    href: `/dashboard/${p.platform_name}`,
  };

  if (!data) {
    return {
      ...base,
      metricsLabel: p.platform_username
        ? `@${p.platform_username}`
        : "Connect to fetch stats",
      primaryDisplay: "—",
      secondary: "no data",
      spark: [],
    };
  }

  switch (p.platform_name) {
    case "github":
      return {
        ...base,
        metricsLabel: `${formatNumber(data.contributions?.total ?? 0)} contributions · ${formatNumber(data.repos?.totalRepos ?? 0)} repos`,
        primaryDisplay: formatNumber(data.commits?.totalSearched ?? data.contributions?.total ?? 0),
        secondary: "commits",
        spark: weekSeries(data.contributions?.heatmap),
      };
    case "leetcode":
      return {
        ...base,
        metricsLabel: `E ${data.solved?.easy ?? 0} · M ${data.solved?.medium ?? 0} · H ${data.solved?.hard ?? 0}`,
        primaryDisplay: formatNumber(data.solved?.total ?? 0),
        secondary: "solved",
        spark: solveSpark(data.solved),
      };
    case "codeforces":
      return {
        ...base,
        metricsLabel: `${data.profile?.rank || "—"} · ${data.contestsAttended ?? 0} contests`,
        primaryDisplay: formatNumber(data.rating ?? 0),
        secondary: "rating",
        spark: (data.ratingHistory || []).slice(-12).map((r) => r.newRating),
      };
    case "gfg":
      return {
        ...base,
        metricsLabel: `${formatNumber(data.problemsSolved ?? 0)} solved · streak ${data.streak ?? 0}d`,
        primaryDisplay: formatNumber(data.score ?? 0),
        secondary: "score",
        spark: [],
      };
    case "wakatime":
      return {
        ...base,
        metricsLabel: `${(data.dailyAverageHours ?? 0).toFixed?.(1) || 0}h/day avg`,
        primaryDisplay: `${Math.round(data.hoursLast30Days ?? 0)}h`,
        secondary: "last 30d",
        spark: (data.languages || []).slice(0, 8).map((l) => l.hours || 0),
      };
    case "devto":
      return {
        ...base,
        metricsLabel: `${data.totalReactions ?? 0} reactions · ${data.totalComments ?? 0} comments`,
        primaryDisplay: formatNumber(data.articleCount ?? 0),
        secondary: "articles",
        spark: [],
      };
    default:
      return base;
  }
}

function weekSeries(heatmap = []) {
  if (!heatmap.length) return [];
  // last 12 weeks of contributions, summed per week
  const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date)).slice(-84);
  const weeks = [];
  for (let i = 0; i < sorted.length; i += 7) {
    weeks.push(sorted.slice(i, i + 7).reduce((s, d) => s + (d.count || 0), 0));
  }
  return weeks;
}

function solveSpark(solved = {}) {
  return [solved.easy || 0, (solved.medium || 0) * 1.2, (solved.hard || 0) * 1.5, solved.total || 0];
}
