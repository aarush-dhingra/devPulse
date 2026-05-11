import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  Cell,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Line,
  LineChart,
} from "recharts";
import Sparkline from "../components/dashboard/Sparkline";
import StatCard from "../components/dashboard/StatCard";
import CodingHoursChart from "../components/dashboard/CodingHoursChart";
import SolveBreakdown from "../components/dashboard/SolveBreakdown";
import DateRangeBar, { periodToDays } from "../components/dashboard/DateRangeBar";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { PLATFORM_BY_ID, colorForLang } from "../utils/constants";
import { chartTheme } from "../utils/chartConfigs";
import ChartTooltip from "../components/ui/ChartTooltip";
import PlatformLogo, { PLATFORM_LOGO_PATHS } from "../components/ui/PlatformLogo";
import { platformApi } from "../api/platform.api";

const PERIOD_COPY = {
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "1y": "last year",
};

const ACTIVITY_UNITS = {
  github: "contributions",
  leetcode: "accepted submissions",
  codeforces: "accepted submissions",
  codechef: "verified activity",
  atcoder: "accepted submissions",
  wakatime: "hours",
  gfg: "verified activity",
};

const FALLBACK_ACCENT = {
  atcoder: "#b0c4de",
  wakatime: "#22d3ee",
};

export default function PlatformDetail({
  platform,
  data,
  heatmap,
  series,
  period = "90d",
  onPeriodChange,
}) {
  const meta = PLATFORM_BY_ID[platform];
  if (!meta) {
    return (
      <EmptyState
        icon="❓"
        title="Unknown platform"
        description={`No platform called "${platform}".`}
        action={<Link to="/dashboard"><Button>Back to dashboard</Button></Link>}
      />
    );
  }

  const stats = data.stats?.[platform];
  const conn = data.platforms?.find((p) => p.platform_name === platform);
  const accent = platformAccent(platform);
  const activity = useMemo(
    () => buildPlatformActivity(platform, stats, heatmap, series),
    [platform, stats, heatmap, series]
  );

  return (
    <div className="space-y-5 stagger-fade">
      <div className="flex items-center gap-4 mb-2">
        {PLATFORM_LOGO_PATHS[meta.id] ? (
          <PlatformLogo platform={meta.id} size={32} color={accent} />
        ) : (
          <span style={{ color: accent }} className="text-3xl">
            {meta.icon}
          </span>
        )}
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{meta.name} Overview</h1>
          <p className="text-sm text-ink-muted mt-1">
            {conn?.platform_username ? `@${conn.platform_username}` : "Not connected"}
            {conn?.last_synced && ` · synced ${new Date(conn.last_synced).toLocaleString()}`}
          </p>
        </div>
      </div>

      {!stats ? (
        <EmptyState
          icon={meta.icon}
          title={conn ? "Stats are pending sync" : `Connect ${meta.name}`}
          description={conn
            ? "Hit the Refresh button in the top bar to fetch fresh data."
            : `Add your ${meta.name} username in Settings to start tracking.`}
          action={
            <Link to="/settings">
              <Button>{conn ? "Manage" : "Connect"}</Button>
            </Link>
          }
        />
      ) : (
        <>
          {onPeriodChange && <DateRangeBar period={period} onChange={onPeriodChange} />}
          <PlatformBody
            platform={platform}
            stats={stats}
            activity={activity}
            period={period}
            accent={accent}
          />
        </>
      )}
    </div>
  );
}

function PlatformBody({ platform, stats, activity, period, accent }) {
  switch (platform) {
    case "github":     return <GitHubBody stats={stats} activity={activity} period={period} accent={accent} />;
    case "leetcode":   return <LeetCodeBody stats={stats} activity={activity} period={period} accent={accent} />;
    case "codeforces": return <CodeforcesBody stats={stats} activity={activity} period={period} accent={accent} />;
    case "codechef":   return <CodeChefBody stats={stats} activity={activity} period={period} accent={accent} />;
    case "atcoder":    return <AtCoderBody stats={stats} activity={activity} period={period} accent={accent} />;
    case "wakatime":   return <WakatimeBody stats={stats} activity={activity} period={period} accent={accent} />;
    case "gfg":        return <GFGBody stats={stats} activity={activity} period={period} accent={accent} />;
    default:           return null;
  }
}

function GitHubBody({ stats, activity, period, accent }) {
  const command = buildGitHubCommand(stats, activity);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <GitHubMetricCard label="Total Commits" value={command.totalContributions} sub={command.recent7 > 0 ? `↑ ${command.recent7} last 7d` : undefined} color="#22d3ee" spark={command.yearSpark} icon="✏️" />
        <GitHubMetricCard label="Period Commits" value={command.periodContributions} sub={command.recent30 > 0 ? `↑ ${command.recent30} last 30d` : undefined} color="#8b5cf6" spark={command.spark} icon="📊" />
        <GitHubMetricCard label="Merged PRs" value={command.mergedPRs} sub={command.pullRequestContributions > 0 ? `${command.pullRequestContributions} total PR activity` : undefined} color="#fb923c" spark={command.spark} icon="🚀" />
        <GitHubMetricCard label="Public Repos" value={command.repoCount} sub={command.originalRepoCount !== command.repoCount ? `${command.originalRepoCount} owned` : undefined} color="#38bdf8" spark={command.repoSpark} icon="📦" />
        <GitHubMetricCard label="Stars Earned" value={command.stars} sub={command.forks > 0 ? `${command.forks} forks` : undefined} color="#a855f7" spark={command.repoSpark} icon="⭐" />
        <GitHubMetricCard label="Contribution Score" value={command.grade} color="#fbbf24" format="raw" icon="🏆" sub={command.gradeCopy} />
      </div>

      <div className="grid xl:grid-cols-[1.5fr_2fr_1fr] gap-3 items-stretch">
        <GitHubHeatmapPanel command={command} period={period} />
        <GitHubActivityTimeline command={command} accent={accent} />
        <GitHubLanguageDonut command={command} />
      </div>

      <div className="grid xl:grid-cols-[1fr_1.5fr_1.5fr] gap-3 items-stretch">
        <GitHubRhythmPanel command={command} accent={accent} />
        <GitHubStreakJourney command={command} accent={accent} />
        <GitHubRepoBreakdown command={command} />
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr_1fr] gap-3 items-stretch">
        <GitHubRecentActivity command={command} />
        <GitHubGlance command={command} />
        <GitHubVelocityGauge command={command} accent={accent} />
      </div>
    </div>
  );
}

function GitHubMetricCard({ label, value, sub, color, spark, format = "number", icon }) {
  const display = format === "raw" ? value : Number(value || 0).toLocaleString();
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-4 relative flex flex-col justify-between min-h-[132px]">
      <div>
        <div className="flex items-start justify-between">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-1">{label}</div>
          {icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: `${color}1A`, color: color }}>
              {icon}
            </div>
          )}
        </div>
        <div className="text-3xl font-display font-bold tabular-nums text-white mt-1">{display}</div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="mb-1">
          {sub && (
            <div className={`text-[10px] font-medium ${sub.startsWith("↑") ? "text-emerald-400" : "text-ink-faint"}`}>{sub}</div>
          )}
        </div>
        {spark?.length ? (
          <div className="ml-auto w-20">
            <Sparkline values={spark} color={color} width={80} height={24} showArea={false} strokeWidth={2} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

const GH_GREEN = "#22c55e";

function githubGreen(level) {
  if (level === 0) return "rgba(255,255,255,0.05)";
  const opacity = [0, 0.22, 0.45, 0.70, 1][level];
  return `rgba(34,197,94,${opacity})`;
}

function GitHubHeatmapPanel({ command, period }) {
  if (!command.rows.length) {
    return (
      <div className="panel-pad !bg-transparent border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Contribution Heatmap</h3>
        <EmptyState icon="📅" title="No GitHub activity" description="Refresh after your next contribution to populate the grid." />
      </div>
    );
  }
  const { weeks, p95 } = heatmapWeeks(command.rows, periodToDays(period));

  // Build month labels (show month name above first week of each new month)
  const monthLabels = [];
  let lastGhMonth = null;
  weeks.forEach((week, wi) => {
    const firstReal = week.find(Boolean);
    if (!firstReal) return;
    const m = firstReal.date.slice(5, 7);
    if (m !== lastGhMonth) {
      lastGhMonth = m;
      const d = new Date(`${firstReal.date}T00:00:00Z`);
      monthLabels.push({ x: wi * 15, label: d.toLocaleString("default", { month: "short" }) });
    }
  });

  const CELL = 12;
  const STRIDE = 15;
  const LEFT = 28;
  const TOP = monthLabels.length ? 20 : 6;
  const svgW = Math.max(weeks.length * STRIDE + LEFT, 320);
  const svgH = TOP + 7 * STRIDE;

  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-base">Contribution Heatmap</h3>
        <span className="text-[10px] text-ink-faint">{PERIOD_COPY[period] || "range"}</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} className="block">
          {/* Month labels */}
          {monthLabels.map(({ x, label }) => (
            <text key={`m-${x}`} x={LEFT + x} y={13} fill="rgba(148,163,184,0.7)" fontSize="9">{label}</text>
          ))}
          {/* Day-of-week labels */}
          {["Mon", "Wed", "Fri"].map((day, i) => (
            <text key={day} x={0} y={TOP + 10 + i * 30} fill="rgba(148,163,184,0.55)" fontSize="9">{day}</text>
          ))}
          {/* Cells */}
          <g transform={`translate(${LEFT},${TOP})`}>
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                const isBest = day && day.count === command.bestDay?.count && day.date === command.bestDay?.date;
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={wi * STRIDE}
                    y={di * STRIDE}
                    width={CELL}
                    height={CELL}
                    rx={3}
                    fill={day ? githubGreen(bucket(day.count, p95)) : "rgba(255,255,255,0.05)"}
                    stroke={isBest ? "#86efac" : "transparent"}
                    strokeWidth={1.2}
                  >
                    {day && <title>{`${day.date}: ${day.count} contributions`}</title>}
                  </rect>
                );
              })
            )}
          </g>
        </svg>
      </div>
      {/* Legend */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="h-2.5 w-2.5 rounded-sm" style={{ background: githubGreen(level) }} />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Stats row — fills the empty space below the heatmap */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "This period", value: command.periodContributions.toLocaleString() },
          { label: "Best day", value: command.bestDay ? `${command.bestDay.count} commits` : "—", sub: command.bestDay ? new Date(`${command.bestDay.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null },
          { label: "Longest streak", value: `${command.longestStreak}d` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
            <div className="text-[9px] uppercase tracking-widest text-ink-faint mb-1">{label}</div>
            <div className="text-sm font-display font-bold text-white tabular-nums">{value}</div>
            {sub && <div className="text-[10px] text-ink-faint mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function GitHubActivityTimeline({ command, accent }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Activity Timeline</h3>
        <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-ink-muted">Weekly</span>
      </div>
      <div className="h-60">
        <ResponsiveContainer>
          <LineChart data={command.weekly} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="count" name="Commits" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="prEstimate" name="Pull Requests" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GitHubLanguageDonut({ command }) {
  if (!command.languages.length) {
    return (
      <div className="panel-pad !bg-transparent border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Top Languages</h3>
        <EmptyState icon="🧪" title="No language data" description="Repository languages appear after GitHub sync." />
      </div>
    );
  }
  const top = command.languages[0];
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <h3 className="font-display font-bold text-base mb-3">Top Languages</h3>
      <div className="relative h-52">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={command.languages} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={2} stroke="transparent">
              {command.languages.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip formatValue={(v, entry) => `${entry?.payload?.pct ?? v}%`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-sm font-bold text-white">{top.name}</div>
            <div className="text-lg font-display font-bold text-ink-muted">{top.pct}%</div>
          </div>
        </div>
      </div>
      <div className="space-y-1.5 mt-2">
        {command.languages.map((lang) => (
          <div key={lang.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: lang.color }} />
            <span className="truncate text-ink-muted font-medium">{lang.name}</span>
            <span className="ml-auto text-ink tabular-nums">{lang.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GitHubRhythmPanel({ command, accent }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Commit Activity by Time</h3>
        <div className="text-right">
          <div className="text-[10px] text-ink-faint">Peak Time</div>
          <div className="text-sm font-bold text-white">{command.peakWeekday.label}</div>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={command.weekday}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar name="Contributions" dataKey="count" stroke={accent} fill={accent} fillOpacity={0.3} />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-xs text-ink-muted text-center">
        You're a {command.peakWeekday.label === 'Sat' || command.peakWeekday.label === 'Sun' ? 'weekend' : 'weekday'} coder! 🌙
      </div>
    </div>
  );
}

function GitHubStreakJourney({ command, accent }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Streak Journey</h3>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
          Longest: {command.longestStreak} days
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <AreaChart data={command.streakJourney} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="github-streak-journey" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area dataKey="streak" name="Streak" stroke={accent} strokeWidth={2} fill="url(#github-streak-journey)" activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GitHubRepoBreakdown({ command }) {
  if (!command.repos.length) {
    return (
      <div className="panel-pad !bg-transparent border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Top Repositories</h3>
        <EmptyState icon="📦" title="No repository data" description="Public repositories appear after GitHub sync." />
      </div>
    );
  }
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <h3 className="font-display font-bold text-base mb-4">Top Repositories</h3>
      <div className="space-y-3">
        {command.repos.map((repo) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 hover:bg-white/[0.03] px-2 py-1.5 rounded-lg transition group"
          >
            <span className="text-base shrink-0">📦</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink group-hover:text-accent-300 transition-colors truncate">
                {repo.name}
              </div>
              <div className="text-[11px] text-ink-faint">{repo.language || "Unknown"}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-[11px] text-ink-faint tabular-nums">
              {repo.stars > 0 && <span className="flex items-center gap-0.5">⭐ {repo.stars}</span>}
              {repo.forks > 0 && <span className="flex items-center gap-0.5">⑂ {repo.forks}</span>}
              {repo.pushedAt && (
                <span className="text-ink-faint">
                  {new Date(repo.pushedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function GitHubRecentActivity({ command }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <h3 className="font-display font-bold text-base mb-4">Recent Activity</h3>
      <div className="space-y-5">
        {command.achievements.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-sm">{item.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="text-[11px] text-ink-muted">{item.value} achieved</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GitHubGlance({ command }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <h3 className="font-display font-bold text-base mb-4">GitHub Stats at a Glance</h3>
      <div className="grid grid-cols-5 gap-3 text-center">
        {[
          ["Followers", command.followers, "👥"],
          ["Following", command.following, "👀"],
          ["Public Repos", command.repoCount, "📦"],
          ["Gists", command.gists, "📝"],
          ["Stars Earned", command.stars, "⭐"],
        ].map(([label, value, icon]) => (
          <div key={label} className="flex flex-col items-center">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-xs mb-2">
              {icon}
            </div>
            <div className="text-lg font-bold text-white mb-1 tabular-nums">{Number(value || 0).toLocaleString()}</div>
            <div className="text-[10px] text-ink-muted leading-tight">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GitHubVelocityGauge({ command, accent }) {
  const bars = [20, 30, 25, 45, 60, 47, 30, 20, 50, 70, 85, 90, 60, 45, 30];
  const data = bars.map((v, i) => ({ value: v, index: i }));
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-base">Contribution Velocity</h3>
        <span className="text-[10px] text-ink-muted border border-white/10 rounded px-2 py-0.5">Last 90 days</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-6 items-center">
        <div className="h-28">
          <ResponsiveContainer>
            <BarChart data={data}>
              <Bar dataKey="value" fill={accent} radius={[2, 2, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-right">
          <div className="text-4xl font-display font-bold text-white">{command.velocityScore}</div>
          <div className="text-xs text-ink-muted max-w-[120px] leading-tight mt-1">
            You're in the top <strong className="text-white">18%</strong> of developers!
          </div>
        </div>
      </div>
    </div>
  );
}
function LeetCodeBody({ stats, activity, period, accent }) {
  const command = buildLeetCodeCommand(stats, activity);
  return (
    <div className="space-y-4">
      {/* ROW 1: Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <LeetCodeMetricCard label="Contest Rating" value={command.contestRating} sub={command.contestTopPct !== "—" ? `Top ${command.contestTopPct}%` : ""} spark={command.spark} color="#8b5cf6" />
        <LeetCodeMetricCard label="Global Rank" value={command.globalRank !== "—" ? `#${command.globalRank.toLocaleString()}` : "—"} color="#22c55e" trend={command.recent30 > 0 ? `${command.recent30} this month` : null} />
        <LeetCodeMetricCard label="Problems Solved" value={command.total} color="#38bdf8" trend={command.recent30 > 0 ? `${command.recent30} this month` : null} />
        <LeetCodeMetricCard label="Reputation" value={command.reputation} color="#f59e0b" sub="Community" />
        <LeetCodeBadgeCard count={command.badgesCount} badges={command.badges} />
      </div>

      {/* ROW 2: Donut, Trend, Small Cards */}
      <div className="grid xl:grid-cols-[1.1fr_2fr_0.9fr] gap-3 items-stretch">
        <LeetCodeSolvedDonut command={command} />
        <LeetCodeTrendChart command={command} accent={accent} period={period} />
        <div className="flex flex-col gap-3">
          <LeetCodeMetricCard label="Acceptance Rate" value={`${command.acceptanceRate}%`} color="#10b981" spark={command.spark} />
          <LeetCodeConsistencyCard command={command} />
        </div>
      </div>

      {/* ROW 3: Heatmap, Solve Progress, Problem Tags */}
      <div className="grid xl:grid-cols-[2fr_1fr_1fr] gap-3 items-stretch">
        <LeetCodeHeatmapPanel command={command} accent={accent} period={period} />
        <LeetCodeLanguageStats command={command} />
        <LeetCodeTopTags command={command} />
      </div>

      {/* ROW 4: Recent Solves, Contest Performance, Radar, Streak */}
      <div className="grid xl:grid-cols-[1fr_1fr_1fr_1fr] gap-3 items-stretch">
        <LeetCodeRecentSolves command={command} />
        <LeetCodeContestPerformance command={command} />
        <LeetCodeRhythmPanel command={command} accent={accent} />
        <LeetCodeStreakJourney command={command} accent={accent} />
      </div>

      {/* ROW 5: Daily Challenge + Upcoming Contests */}
      <div className="grid xl:grid-cols-[1fr_1fr] gap-3 items-stretch">
        <LeetCodeDailyChallenge />
        <LeetCodeUpcomingContests />
      </div>
    </div>
  );
}

function buildLeetCodeCommand(stats, activity) {
  const solved = stats.solved || {};
  const easy = Number(solved.easy || 0);
  const medium = Number(solved.medium || 0);
  const hard = Number(solved.hard || 0);
  const total = Number(solved.total || 0);
  
  const recent30 = activity.rows.slice(-30).reduce((sum, row) => sum + Number(row.count || 0), 0);
  const weekday = buildWeekdayTotals(activity.rows);
  const spark = activity.weekly.map(w => w.count);

  const rawRating = stats.contest?.rating;
  const contestRating = rawRating ? Math.round(rawRating) : "—";

  const allTags = [
    ...(stats.skillStats?.fundamental  || []),
    ...(stats.skillStats?.intermediate || []),
    ...(stats.skillStats?.advanced     || []),
  ].sort((a, b) => b.problemsSolved - a.problemsSolved).slice(0, 10);

  return {
    ...activity,
    easy,
    medium,
    hard,
    total,
    recent30,
    globalRank: stats.profile?.ranking || "—",
    reputation: stats.profile?.reputation || 0,
    contestRating,
    contestTopPct: stats.contest?.topPercentage || "—",
    acceptanceRate: stats.acceptanceRate || 0,
    badges: stats.badges || [],
    badgesCount: stats.badges?.length || 0,
    weekday,
    spark,
    streakLongest: activity.streakLongest || 0,
    streakCurrent: activity.streakCurrent || 0,
    recentSolves: stats.recentSolves || [],
    topTags: allTags,
    contestHistory: stats.contestHistory || [],
    totalEasy: stats.totalEasy || 0,
    totalMedium: stats.totalMedium || 0,
    totalHard: stats.totalHard || 0,
    languageStats: stats.languageStats || [],
  };
}

function LeetCodeMetricCard({ label, value, sub, trend, color, spark }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#080b18] px-4 py-4 relative flex flex-col justify-between min-h-[110px]">
      <div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted mb-2">{label}</div>
        <div className="text-3xl font-display font-bold tabular-nums text-white">{value}</div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="mb-0.5">
          {trend && <div className="text-[10px] text-emerald-400 font-medium">↑ {trend}</div>}
          {sub && !trend && <div className="text-[10px] text-ink-faint">{sub}</div>}
        </div>
        {spark?.length ? (
          <div className="ml-auto w-16 h-6">
            <Sparkline values={spark} color={color} width={64} height={24} showArea={false} strokeWidth={2} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LeetCodeBadgeCard({ count, badges = [] }) {
  const iconUrl = (icon) =>
    icon?.startsWith("http") ? icon : `https://leetcode.com${icon}`;
  return (
    <div className="rounded-2xl border border-white/5 bg-[#080b18] px-4 py-3 flex flex-col min-h-[110px]">
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted mb-2">Badges Earned</div>
      <div className="flex-1 flex flex-wrap gap-1.5 items-start content-start overflow-y-auto" style={{ maxHeight: 56 }}>
        {badges.length > 0
          ? badges.map((b) => (
              <img
                key={b.id}
                src={iconUrl(b.icon)}
                title={b.displayName}
                alt={b.displayName}
                className="w-8 h-8 object-contain"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ))
          : <span className="text-ink-faint text-xs">No badges yet</span>}
      </div>
      <div className="text-[10px] text-ink-faint mt-1">{count} Badges</div>
    </div>
  );
}

function LeetCodeSolvedDonut({ command }) {
  const data = [
    { name: "Easy", value: command.easy, color: "#10b981" },
    { name: "Medium", value: command.medium, color: "#f59e0b" },
    { name: "Hard", value: command.hard, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Solved Problems</h3>
      <div className="flex-1 grid grid-cols-[1fr_auto] gap-4 items-center">
        <div className="relative h-32 w-32 mx-auto">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={45} outerRadius={60} paddingAngle={3} stroke="transparent">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-xl font-bold text-white">{command.total}</div>
            <div className="text-[10px] text-ink-muted">Solved</div>
          </div>
        </div>
        <div className="space-y-3">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 w-16">
                <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                <span className="text-ink-muted">{d.name}</span>
              </div>
              <span className="font-bold text-white tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeetCodeTrendChart({ command, accent, period }) {
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Submissions Trend</h3>
        <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-ink-muted">Weekly v</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer>
          <LineChart data={command.weekly} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="count" name="Submissions" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeetCodeConsistencyCard({ command }) {
  // Each dot = one of the last 30 days; green = had activity, grey = none
  const last30 = command.rows.slice(-30);
  const activeLast30 = last30.filter((r) => r.count > 0).length;
  // Pad from the front if fewer than 30 rows available
  const dots = [
    ...Array(Math.max(0, 30 - last30.length)).fill(false),
    ...last30.map((r) => r.count > 0),
  ];
  return (
    <div className="rounded-2xl flex-1 border border-white/5 bg-[#080b18] px-4 py-4 flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted mb-2">Consistency</div>
      <div className="flex items-end gap-2 mb-3">
        <div className="text-3xl font-display font-bold tabular-nums text-white">{activeLast30}</div>
        <div className="text-[10px] text-ink-faint pb-1">Active Days (30d)</div>
      </div>
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 mt-auto">
        {dots.map((active, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm"
            title={last30[i - Math.max(0, 30 - last30.length)]
              ? `${last30[i - Math.max(0, 30 - last30.length)].date}: ${last30[i - Math.max(0, 30 - last30.length)].count} solves`
              : "No data"}
            style={{ background: active ? "#22c55e" : "rgba(255,255,255,0.06)" }}
          />
        ))}
      </div>
    </div>
  );
}

const LC_CELL = { "7d": 26, "30d": 18, "90d": 13, "1y": 11 };
const LC_GAP  = { "7d":  6, "30d":  4, "90d":  3, "1y":  2 };

function LeetCodeHeatmapPanel({ command, accent, period }) {
  const LC_GREEN = "#22c55e";
  const days = periodToDays(period);
  const { weeks, p95 } = heatmapWeeks(command.rows, days);

  const cell = LC_CELL[period] ?? 13;
  const gap  = LC_GAP[period]  ?? 3;
  const step = cell + gap;
  const LEFT = 28;

  // Month labels — first week of each new month
  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, wi) => {
    const firstDate = week.find(Boolean)?.date;
    if (firstDate) {
      const m = firstDate.slice(5, 7);
      if (m !== lastMonth) {
        lastMonth = m;
        monthLabels.push({ wi, label: new Date(`${firstDate}T00:00:00Z`).toLocaleString("default", { month: "short" }) });
      }
    }
  });
  const topOffset = monthLabels.length > 1 ? 20 : 6;
  const svgW = Math.max(weeks.length * step + LEFT, 120);
  const svgH = topOffset + 7 * step + 4;

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-base">Problem Solving Activity</h3>
        <span className="text-[10px] text-ink-faint">{PERIOD_COPY[period] || "range"}</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} className="block">
          {/* Month labels */}
          {monthLabels.length > 1 && monthLabels.map(({ wi, label }) => (
            <text key={`m-${label}-${wi}`} x={LEFT + wi * step} y={12} fill="rgba(148,163,184,0.55)" fontSize="9">{label}</text>
          ))}
          {/* Day-of-week labels */}
          {["Mon", "Wed", "Fri"].map((day, i) => (
            <text key={day} x={0} y={topOffset + i * 2 * step + cell - 1} fill="rgba(148,163,184,0.65)" fontSize="9">{day}</text>
          ))}
          <g transform={`translate(${LEFT},${topOffset})`}>
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                if (!day) return null;
                const level = bucket(day.count, p95);
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={wi * step}
                    y={di * step}
                    width={cell}
                    height={cell}
                    rx={Math.max(2, Math.round(cell * 0.28))}
                    fill={level > 0 ? activityColor(LC_GREEN, level) : "rgba(255,255,255,0.05)"}
                    stroke={level > 0 ? "rgba(255,255,255,0.06)" : "transparent"}
                  >
                    <title>{`${day.date}: ${day.count} solve${day.count !== 1 ? "s" : ""}`}</title>
                  </rect>
                );
              })
            )}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-faint">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="h-2 w-2 rounded-sm" style={{ background: activityColor(LC_GREEN, level) }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

const LANG_COLORS = {
  Java:        "#f89820",
  Python:      "#3572A5",
  Python3:     "#3572A5",
  "C++":       "#f34b7d",
  C:           "#555555",
  JavaScript:  "#f1e05a",
  TypeScript:  "#3178c6",
  Go:          "#00ADD8",
  Rust:        "#dea584",
  Kotlin:      "#A97BFF",
  Swift:       "#F05138",
  Ruby:        "#701516",
  Scala:       "#c22d40",
  MySQL:       "#e38c00",
  "C#":        "#178600",
  PHP:         "#4F5D95",
  Dart:        "#00B4AB",
};

function LeetCodeLanguageStats({ command }) {
  const langs = command.languageStats || [];
  const maxSolved = langs[0]?.problemsSolved || 1;

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Languages</h3>
      {langs.length > 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-3.5">
          {langs.slice(0, 6).map((lang) => {
            const pct = (lang.problemsSolved / maxSolved) * 100;
            const color = LANG_COLORS[lang.languageName] || "#a78bfa";
            return (
              <div key={lang.languageName}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="font-medium text-ink-200">{lang.languageName}</span>
                  </div>
                  <span className="text-ink-faint tabular-nums">{lang.problemsSolved}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon="💻" title="No language data" description="Refresh to load language stats." />
        </div>
      )}
    </div>
  );
}

function LeetCodeRhythmPanel({ command, accent }) {
  if (!command.weekday || !command.weekday.length) return (
      <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Activity Rhythm</h3>
        <EmptyState icon=" radar " title="No data" description="No daily activity data found." />
      </div>
  );
  
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-2">Activity Rhythm</h3>
      <div className="h-40">
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={command.weekday}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar name="Activity" dataKey="count" stroke={accent} fill={accent} fillOpacity={0.3} />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeetCodeStreakJourney({ command, accent }) {
  const streakJourney = buildStreakJourney(command.rows);
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-2">Streak</h3>
      <div className="flex justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <div className="text-ink-muted text-[10px]">Longest Streak</div>
            <div className="font-bold text-white">{command.streakLongest} days</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-ink-muted text-[10px]">Current Streak</div>
          <div className="font-bold text-white">{command.streakCurrent} days</div>
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer>
          <AreaChart data={streakJourney} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="leetcode-streak-journey" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 9 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area dataKey="streak" name="Streak" stroke="#f59e0b" strokeWidth={2} fill="url(#leetcode-streak-journey)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function relativeTime(ts) {
  const now = new Date();
  const then = new Date(Number(ts) * 1000);
  // Use calendar-day boundaries in the browser's local timezone (matches LeetCode)
  const nowDay  = new Date(now.getFullYear(),  now.getMonth(),  now.getDate());
  const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const diffDays = Math.round((nowDay - thenDay) / 86400000);
  if (diffDays === 0) {
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  }
  if (diffDays < 7)  return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

function LeetCodeTopTags({ command }) {
  const tags = command.topTags || [];
  const maxSolved = tags[0]?.problemsSolved || 1;
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-3">Top Problem Tags</h3>
      {tags.length > 0 ? (
        <div className="flex-1 flex flex-col justify-center space-y-2">
          {tags.slice(0, 8).map((tag) => (
            <div key={tag.tagSlug} className="flex items-center gap-2 text-xs">
              <span className="w-20 truncate text-ink-muted shrink-0">{tag.tagName}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{ width: `${(tag.problemsSolved / maxSolved) * 100}%` }}
                />
              </div>
              <span className="w-7 text-right text-white tabular-nums shrink-0">{tag.problemsSolved}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="🏷️" title="No tag data" description="Refresh to sync LeetCode tags." />
      )}
    </div>
  );
}

function LeetCodeRecentSolves({ command }) {
  const solves = command.recentSolves || [];
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-3">Recent Solves</h3>
      {solves.length > 0 ? (
        <div className="flex-1 flex flex-col justify-start space-y-2.5">
          {solves.slice(0, 6).map((s, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <a
                href={`https://leetcode.com/problems/${s.titleSlug}/`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-ink-200 hover:text-white transition truncate"
              >
                {s.title}
              </a>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink-faint bg-white/5 px-1.5 py-0.5 rounded">
                  {s.lang}
                </span>
                <span className="text-[10px] text-ink-faint/70">{relativeTime(s.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="✅" title="No recent solves" description="Refresh to load your latest accepted submissions." />
      )}
    </div>
  );
}

function LeetCodeContestPerformance({ command }) {
  const history = command.contestHistory || [];
  const sorted = [...history].reverse();
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-3">Contest Performance</h3>
      {sorted.length > 0 ? (
        <div className="flex-1 flex flex-col justify-start space-y-3">
          {sorted.slice(0, 4).map((c, i) => (
            <div key={i} className="flex flex-col gap-0.5">
              <span className="text-xs text-ink-200 truncate" title={c.title}>{c.title}</span>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={c.trend === "UP" ? "text-emerald-400" : "text-red-400"}>
                  {c.trend === "UP" ? "↑" : "↓"} {Math.round(c.rating)}
                </span>
                <span className="text-ink-faint">Rank #{c.ranking?.toLocaleString?.() ?? c.ranking}</span>
                <span className="text-ink-faint/70">{c.solved}/{c.total} solved</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon="🏆" title="No contest data" description="Refresh to load your contest history." />
      )}
    </div>
  );
}

const DIFF_COLORS = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444" };

function LeetCodeDailyChallenge() {
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.leetcodeDaily()
      .then(setDaily)
      .catch(() => setDaily(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
        <span>📅</span> Daily Challenge
      </h3>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-ink-faint text-sm">Loading…</div>
      ) : !daily ? (
        <EmptyState icon="📅" title="Unavailable" description="Could not fetch today's daily challenge." />
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-ink-faint mb-1">{daily.date}</p>
              <p className="font-semibold text-sm leading-snug">{daily.title}</p>
              {daily.isPaidOnly && (
                <span className="mt-1 inline-block text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">Premium</span>
              )}
            </div>
            <a
              href={daily.link}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              Open ↗
            </a>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {daily.difficulty && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: DIFF_COLORS[daily.difficulty] || "#94a3b8", background: `${DIFF_COLORS[daily.difficulty] || "#94a3b8"}22` }}
              >
                {daily.difficulty}
              </span>
            )}
            {daily.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-ink-faint border border-white/5">{tag}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeetCodeUpcomingContests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.leetcodeUpcomingContests()
      .then((data) => setContests(data.contests || []))
      .catch(() => setContests([]))
      .finally(() => setLoading(false));
  }, []);

  function formatCountdown(startTime) {
    const diff = startTime * 1000 - Date.now();
    if (diff <= 0) return "Starting now";
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `in ${days}d ${hrs}h`;
    if (hrs > 0) return `in ${hrs}h ${mins}m`;
    return `in ${mins}m`;
  }

  function formatStart(startTime) {
    return new Date(startTime * 1000).toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-3 flex items-center gap-2">
        <span>🏆</span> Upcoming Contests
      </h3>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-ink-faint text-sm">Loading…</div>
      ) : contests.length === 0 ? (
        <EmptyState icon="🏆" title="No upcoming contests" description="Check leetcode.com for the schedule." />
      ) : (
        <div className="flex-1 flex flex-col gap-3">
          {contests.map((c) => (
            <div key={c.titleSlug} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{c.title}</p>
                <p className="text-[11px] text-ink-faint mt-0.5">{formatStart(c.startTime)}</p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[11px] font-bold text-emerald-400">{formatCountdown(c.startTime)}</span>
                <a
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Register ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CodeforcesBody({ stats, activity, period, accent }) {
  const history = (stats.ratingHistory || []).map((r) => ({
    name: r.contestName?.slice(0, 18),
    rating: r.newRating,
    date: r.date,
  }));
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Rating" value={stats.rating ?? 0} icon="🏆" accent="#fe646f" />
        <StatCard label="Max Rating" value={stats.maxRating ?? 0} icon="🚀" accent="#a855f7" />
        <StatCard label="Contests" value={stats.contestsAttended ?? 0} icon="🎯" accent="#22d3ee" />
        <StatCard label="Solved" value={stats.uniqueSolved ?? 0} icon="✅" accent="#10b981" />
      </div>
      <ActivityGrid activity={activity} period={period} accent={accent} />
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <RatingHistory title="Rating History" data={history} color="#fe646f" gradientId="cf-grad" />
        <TagCloud tags={stats.tagCounts || {}} />
      </div>
      <ProfilePanel
        title="Competitive Profile"
        rows={[
          ["Handle", `@${stats.profile?.handle || "—"}`],
          ["Rank", stats.profile?.rank || "—"],
          ["Max rank", stats.profile?.maxRank || "—"],
          ["Accepted submissions", stats.acceptedSubmissions ?? 0],
          ["Total submissions", stats.submissions ?? 0],
          ["Best contest place", stats.bestContestPlace === Infinity ? "—" : stats.bestContestPlace || "—"],
        ]}
      />
    </>
  );
}

function WakatimeBody({ stats, activity, period, accent }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Last 7 Days" value={`${Math.round(stats.hoursLast7Days ?? 0)}h`} format="raw" icon="📅" accent="#22d3ee" />
        <StatCard label="Last 30 Days" value={`${Math.round(stats.hoursLast30Days ?? 0)}h`} format="raw" icon="📊" accent="#8b5cf6" />
        <StatCard label="Daily Avg" value={`${(stats.dailyAverageHours ?? 0).toFixed(1)}h`} format="raw" icon="⏱️" accent="#10b981" />
        <StatCard label="Best Day" value={stats.bestDay ? `${Math.round(stats.bestDay.hours)}h` : "—"} format="raw" icon="🌟" accent="#f59e0b" hint={stats.bestDay?.date}/>
      </div>
      <ActivityGrid activity={activity} period={period} accent={accent} />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <CodingHoursChart wakatime={stats} />
        <div className="panel-pad">
          <h3 className="font-display font-bold text-lg mb-3">Top Projects</h3>
          {(stats.projects || []).slice(0, 8).map((p) => (
            <DataRow
              key={p.name}
              label={p.name}
              value={`${p.hours.toFixed(1)}h`}
              accent={p.percent}
            />
          ))}
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <RankedList title="Editors" items={stats.editors || []} valueSuffix="h" />
        <RankedList title="Languages" items={stats.languages || []} valueSuffix="h" />
      </div>
    </>
  );
}

function GFGBody({ stats, activity, period, accent }) {
  const command = buildGFGCommand(stats, activity, period);
  return (
    <div className="space-y-4">
      {/* ROW 1: Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <GFGMetricCard label="Coding Score" value={command.score} color="#10b981" spark={command.spark} trend={command.recent30 > 0 ? `${command.recent30} this month` : null} />
        <GFGMetricCard label="Problems Solved" value={command.totalSolved} color="#22c55e" icon="🎯" trend={command.recent30 > 0 ? `${command.recent30} this month` : null} />
        <GFGMetricCard label="Streak" value={`${command.streakCurrent} days`} color="#f59e0b" icon="🔥" sub="Keep it up!" />
        <GFGMetricCard label="Institute Rank" value={command.instituteRank !== "—" ? `#${command.instituteRank}` : "—"} color="#a855f7" icon="🏫" />
        <GFGMetricCard label="Articles Published" value={command.articlesPublished} color="#3b82f6" icon="📄" />
        <GFGMetricCard label="POTD Solved" value={command.potdSolved} color="#ef4444" icon="📅" />
      </div>

      {/* ROW 2: Difficulty Donut, Trend, Small Cards */}
      <div className="grid xl:grid-cols-[1.1fr_2fr_0.9fr] gap-3 items-stretch">
        <GFGDifficultyBreakdown command={command} />
        <GFGTrendChart command={command} accent={accent} />
        <div className="flex flex-col gap-3">
          <GFGMetricCard
            label="Monthly Score"
            value={command.monthlyScore > 0 ? command.monthlyScore : "—"}
            color="#10b981"
            sub={command.monthlyScore > 0 ? "GFG score this month" : "No score this month"}
          />
          <GFGConsistencyCard command={command} />
        </div>
      </div>

      {/* ROW 3: Heatmap, Recent Activity */}
      <div className="grid xl:grid-cols-[2fr_1fr] gap-3 items-stretch">
        <GFGHeatmapPanel command={command} accent={accent} period={period} />
        <GFGRecentActivity command={command} />
      </div>

      {/* ROW 4/5: 3-col grid — Rhythm+Streak top, POTD+XP bottom, Performance spans both rows on the right */}
      <div className="grid xl:grid-cols-3 gap-3 items-stretch">
        <GFGRhythmPanel command={command} accent={accent} />
        <GFGStreakJourney command={command} accent={accent} />
        <div className="xl:row-span-2">
          <GFGPerformanceSummary command={command} />
        </div>
        <GFGPotdHistory command={command} />
        <GFGLanguageStats command={command} />
      </div>
    </div>
  );
}

function buildGFGCommand(stats, activity, period = "90d") {
  const solved = stats.solvedDetails || {};
  const school = Number(solved.school || solved.School || 0);
  const basic = Number(solved.basic || solved.Basic || 0);
  const easy = Number(solved.easy || solved.Easy || 0);
  const medium = Number(solved.medium || solved.Medium || 0);
  const hard = Number(solved.hard || solved.Hard || 0);
  const totalSolved = stats.problemsSolved || 0;
  const allActivityRows = normalizeGfgActivityRows(stats.activityCalendar);

  // Filter activityCalendar to only dates within the selected period.
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodToDays(period));
  const cutoffStr = cutoffDate.toISOString().slice(0, 10);
  const activityRows = allActivityRows.filter((r) => (r.date || "") >= cutoffStr);

  // Guard against a scraped activityCalendar that is actually a cumulative
  // count misattributed to a single day (e.g. all 9 "ever-solved" problems
  // pinned to today because the scraper summed difficulty buckets under one date).
  // If there is only 1 row and its count matches the total lifetime solved count,
  // it cannot represent real per-day activity — fall back to the snapshot-delta rows.
  const isSuspectCalendar =
    activityRows.length === 1 && activityRows[0].count >= totalSolved && totalSolved > 0;

  const rows = (activityRows.length && !isSuspectCalendar) ? activityRows : activity.rows;
  const weekly = activityRows.length ? weeklyBuckets(rows).slice(-18) : activity.weekly;
  const total = rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const activeDays = rows.filter((row) => Number(row.count || 0) > 0).length;
  const bestDay = rows.reduce((best, row) => (!best || row.count > best.count ? row : best), null);
  const streaks = activityRows.length ? streakStats(rows) : { current: activity.streakCurrent, longest: activity.streakLongest };

  // recent30: sum of the last 30 days relative to today (independent of period window)
  const thirtyDaysCutoff = new Date();
  thirtyDaysCutoff.setDate(thirtyDaysCutoff.getDate() - 30);
  const thirtyDaysCutoffStr = thirtyDaysCutoff.toISOString().slice(0, 10);
  const recent30 = allActivityRows
    .filter((r) => (r.date || "") >= thirtyDaysCutoffStr)
    .reduce((sum, row) => sum + Number(row.count || 0), 0);
  const spark = weekly.map(w => w.count);
  const weekday = buildWeekdayTotals(rows);

  return {
    ...activity,
    rows,
    allRows: allActivityRows,
    heatmapRows: activity.rows,
    weekly,
    total,
    totalDisplay: formatActivity(total, activity.kind),
    activeDays,
    activityRate: rows.length ? Math.round((activeDays / rows.length) * 100) : 0,
    bestDay,
    bestDayDisplay: bestDay ? formatActivity(bestDay.count, activity.kind) : "—",
    score: stats.score || 0,
    totalSolved,
    school,
    basic,
    easy,
    medium,
    hard,
    weekday,
    streakLongest: stats.maxStreak || streaks.longest || 0,
    streakCurrent: stats.streak || streaks.current || 0,
    instituteRank: stats.profile?.instituteRank?.toLocaleString?.() || stats.profile?.instituteRank || "—",
    monthlyScore: stats.monthlyScore || 0,
    recent30,
    spark,
    articlesPublished: stats.articlesPublished || 0,
    potdSolved: stats.potdSolved || 0,
    recentActivity: stats.recentActivity || [],
    potdHistory: stats.potdHistory || [],
    publicPotd: stats.publicPotd || stats.potdHistory?.[0] || {
      title: "Open GeeksforGeeks Problem of the Day",
      dateLabel: "Today",
      status: "Open",
      url: "https://www.geeksforgeeks.org/problem-of-the-day",
    },
    topicStats: stats.topicStats || [],
    topicMastery: stats.topicMastery || [],
    languageStats: stats.languageStats || [],
    performance: buildGfgPerformance(activity.rows, stats.solvedDetails || {}),
  };
}

function normalizeGfgActivityRows(rows = []) {
  return (rows || [])
    .filter((row) => row?.date)
    .map((row) => ({ date: row.date, count: Number(row.count || 0) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function difficultyWeight(label) {
  const key = String(label || "").toLowerCase();
  if (key.includes("hard")) return 3;
  if (key.includes("medium")) return 2;
  if (key.includes("easy")) return 1;
  if (key.includes("basic")) return 0.5;
  return 0.25;
}

function buildGfgPerformance(rows, solvedDetails) {
  const thisWeek = rows.slice(-7).reduce((sum, row) => sum + Number(row.count || 0), 0);
  const lastWeek = rows.slice(-14, -7).reduce((sum, row) => sum + Number(row.count || 0), 0);
  const growth = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);
  const entries = Object.entries(solvedDetails || {})
    .map(([difficulty, count]) => ({ difficulty, count: Number(count || 0), weight: difficultyWeight(difficulty) }))
    .filter((item) => item.count > 0);
  const total = entries.reduce((sum, item) => sum + item.count, 0);
  const avgDifficulty = total
    ? entries.reduce((sum, item) => sum + item.count * item.weight, 0) / total
    : 0;
  const mediumPlus = entries
    .filter((item) => item.weight >= 2)
    .reduce((sum, item) => sum + item.count, 0);
  const hard = entries
    .filter((item) => item.weight >= 3)
    .reduce((sum, item) => sum + item.count, 0);
  const solvesPerWeek = rows.length
    ? Math.round((rows.reduce((sum, row) => sum + Number(row.count || 0), 0) / Math.max(1, rows.length)) * 7 * 10) / 10
    : 0;
  const projectedMonth = Math.round(solvesPerWeek * 4.3);
  const nextTarget = avgDifficulty < 1.8
    ? "Solve 2 Medium problems to improve quality mix"
    : rows.slice(-7).filter((row) => Number(row.count || 0) > 0).length < 4
      ? "Add 1 active day to reach 4/7 consistency"
      : "Try one Hard problem while momentum is warm";
  return {
    thisWeek,
    lastWeek,
    growth,
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
    activeDays: rows.slice(-7).filter((row) => Number(row.count || 0) > 0).length,
    mediumPlusShare: total ? Math.round((mediumPlus / total) * 100) : 0,
    hardShare: total ? Math.round((hard / total) * 100) : 0,
    solvesPerWeek,
    projectedMonth,
    nextTarget,
  };
}

function weekRangeLabel(date) {
  const start = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return date || "Week";
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  const fmt = (dt) => dt.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(start)}-${fmt(end)}`;
}

function GFGMetricCard({ label, value, sub, trend, color, spark, icon }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#080b18] px-4 py-4 relative flex flex-col justify-between min-h-[110px]">
      <div>
        <div className="flex items-start justify-between">
          <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted mb-2">{label}</div>
          {icon && (
            <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ background: `${color}1A`, color: color }}>
              {icon}
            </div>
          )}
        </div>
        <div className="text-3xl font-display font-bold tabular-nums text-white">{value}</div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="mb-0.5">
          {trend && <div className="text-[10px] text-emerald-400 font-medium">↑ {trend}</div>}
          {sub && !trend && <div className="text-[10px] text-ink-faint">{sub}</div>}
        </div>
        {spark?.length ? (
          <div className="ml-auto w-16 h-6">
            <Sparkline values={spark} color={color} width={64} height={24} showArea={false} strokeWidth={2} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GFGTrendChart({ command, accent }) {
  const data = command.weekly.map((week) => ({
    ...week,
    weekRange: weekRangeLabel(week.date),
  }));

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Problem Solving Trend</h3>
        <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-ink-muted">Weekly</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="weekRange" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={35} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="count" name="Activity" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GFGConsistencyCard({ command }) {
  const last30 = (command.heatmapRows?.length ? command.heatmapRows : command.rows).slice(-30);
  const activeLast30 = last30.filter((r) => r.count > 0).length;
  const dots = [
    ...Array(Math.max(0, 30 - last30.length)).fill(false),
    ...last30.map((r) => r.count > 0),
  ];
  return (
    <div className="rounded-2xl flex-1 border border-white/5 bg-[#080b18] px-4 py-4 flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted mb-2">Consistency</div>
      <div className="flex items-end gap-2 mb-3">
        <div className="text-3xl font-display font-bold tabular-nums text-white">{activeLast30}</div>
        <div className="text-[10px] text-ink-faint pb-1">Active Days (30d)</div>
      </div>
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 mt-auto">
        {dots.map((active, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm"
            style={{ background: active ? "#10b981" : "rgba(255,255,255,0.06)" }}
          />
        ))}
      </div>
    </div>
  );
}

function GFGRhythmPanel({ command, accent }) {
  if (!command.weekday || !command.weekday.length) return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-2">Activity Rhythm</h3>
      <EmptyState icon="📊" title="No data" description="No daily activity data found." />
    </div>
  );
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-2">Activity Rhythm</h3>
      <div className="h-40">
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={command.weekday}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, "auto"]} tick={false} axisLine={false} />
            <Radar name="Activity" dataKey="count" stroke={accent} fill={accent} fillOpacity={0.3} />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GFGStreakJourney({ command, accent }) {
  const streakJourney = buildStreakJourney(command.heatmapRows?.length ? command.heatmapRows : command.rows);
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-2">Streak Journey</h3>
      <div className="flex justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <div className="text-ink-muted text-[10px]">Longest Streak</div>
            <div className="font-bold text-white">{command.streakLongest} days</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-ink-muted text-[10px]">Current Streak</div>
          <div className="font-bold text-white">{command.streakCurrent} days</div>
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer>
          <AreaChart data={streakJourney} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gfg-streak-journey" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 9 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area dataKey="streak" name="Streak" stroke={accent} strokeWidth={2} fill="url(#gfg-streak-journey)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GFGDifficultyBreakdown({ command }) {
  const data = [
    { name: "School", value: command.school, color: "#64748b" },
    { name: "Basic",  value: command.basic,  color: "#22d3ee" },
    { name: "Easy",   value: command.easy,   color: "#10b981" },
    { name: "Medium", value: command.medium, color: "#f59e0b" },
    { name: "Hard",   value: command.hard,   color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Difficulty Breakdown</h3>
      <div className="flex-1 grid grid-cols-[1fr_auto] gap-4 items-center">
        <div className="relative h-32 w-32 mx-auto">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={45} outerRadius={60} paddingAngle={3} stroke="transparent">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-xl font-bold text-white">{command.totalSolved}</div>
            <div className="text-[10px] text-ink-muted">Solved</div>
          </div>
        </div>
        <div className="space-y-2.5">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 w-16">
                <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                <span className="text-ink-muted">{d.name}</span>
              </div>
              <span className="font-bold text-white tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GFGTopicsMastery({ command }) {
  const data = (command.topicMastery?.length ? command.topicMastery : command.topicStats || [])
    .slice(0, 5)
    .map((topic, index) => ({
      name: topic.name,
      value: Number(topic.solved || topic.value || 0),
      percent: Number(topic.percent || 0),
      color: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#94a3b8"][index] || "#22c55e",
    }))
    .filter((topic) => topic.value > 0);

  if (!data.length) {
    return (
      <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Topics Mastery</h3>
        <EmptyState icon="🧠" title="No topic data" description="GFG did not expose topic breakdown for this profile." />
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Topics Mastery</h3>
      <div className="flex-1 flex items-center justify-center gap-5">
        <div className="relative h-32 w-32">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={45} outerRadius={60} paddingAngle={3} stroke="transparent">
                {data.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-lg font-bold text-white">{total}</div>
            <div className="text-[10px] text-ink-muted">Topic Solves</div>
          </div>
        </div>
        <div className="space-y-2 min-w-0">
          {data.map((topic) => (
            <div key={topic.name} className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-sm" style={{ background: topic.color }} />
              <span className="text-ink-muted truncate max-w-28">{topic.name}</span>
              <span className="ml-auto text-white tabular-nums">{topic.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GFGMostSolvedTopics({ command }) {
  const topics = (command.topicStats || []).slice(0, 6);
  if (!topics.length) {
    return (
      <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Most Solved Topics</h3>
        <EmptyState icon="📊" title="No topic data" description="Topic details were not available in the GFG payload." />
      </div>
    );
  }

  const max = Math.max(...topics.map((topic) => Number(topic.solved || 0)), 1);
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-4">Most Solved Topics</h3>
      <div className="space-y-3">
        {topics.map((topic) => {
          const solved = Number(topic.solved || 0);
          return (
            <div key={topic.name}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-ink-muted truncate">{topic.name}</span>
                <span className="text-white tabular-nums">{solved}</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(solved / max) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GFGDifficultyProgress({ command }) {
  const difficulties = [
    { name: "School", value: command.school, color: "#64748b" },
    { name: "Basic",  value: command.basic,  color: "#22d3ee" },
    { name: "Easy",   value: command.easy,   color: "#10b981" },
    { name: "Medium", value: command.medium, color: "#f59e0b" },
    { name: "Hard",   value: command.hard,   color: "#ef4444" },
  ].filter(d => d.value > 0);

  const total = command.totalSolved || 1;

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Difficulty Progress</h3>
      {difficulties.length > 0 ? (
        <div className="flex-1 flex flex-col justify-center gap-3.5">
          {difficulties.map(({ name, value, color }) => (
            <div key={name}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                  <span className="font-medium text-ink-200">{name}</span>
                </div>
                <span className="text-ink-faint tabular-nums">{value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(value / total) * 100}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon="📊" title="No difficulty data" description="Refresh to load difficulty breakdown." />
        </div>
      )}
    </div>
  );
}

function GFGStreakCalendar({ command, accent, period }) {
  const recent = command.rows.slice(-14).map((row) => ({
    ...row,
    label: shortDateLabel(row.date),
  }));
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 overflow-hidden h-full flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Streak</h3>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-[10px] text-ink-faint">Longest Streak</div>
            <div className="font-bold text-white">{command.streakLongest} days</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-ink-faint">Current Streak</div>
          <div className="font-bold text-white">{command.streakCurrent} days</div>
        </div>
      </div>
      <div className="min-h-[190px] flex-1">
        <ResponsiveContainer>
          <AreaChart data={recent} margin={{ top: 6, right: 0, bottom: 0, left: -25 }}>
            <defs>
              <linearGradient id="gfg-streak-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={18} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area type="monotone" dataKey="count" name="Activity" stroke={accent} strokeWidth={2} fill="url(#gfg-streak-area)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GFGPerformanceSummary({ command }) {
  const perf = command.performance;
  const positive = perf.growth >= 0;
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex h-full flex-col">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-display font-bold text-base">Performance Summary</h3>
          <p className="text-[10px] text-ink-faint mt-1">This week vs last week</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] ${positive ? "bg-emerald-400/10 text-emerald-300" : "bg-red-400/10 text-red-300"}`}>
          {positive ? "+" : ""}{perf.growth}%
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniPanel label="Solved This Week" value={perf.thisWeek} accent="#22c55e" sub="Last 7 days" />
        <MiniPanel label="Solved Last Week" value={perf.lastWeek} accent="#64748b" sub="Days 8–14 ago" />
        <MiniPanel label="Avg Difficulty" value={`${perf.avgDifficulty}/3`} accent="#a855f7" />
        <MiniPanel label="Active Days (7d)" value={`${perf.activeDays}/7`} accent="#f59e0b" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Quality Mix</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-xl font-bold text-white">{perf.mediumPlusShare}%</span>
            <span className="pb-1 text-[10px] text-ink-muted">Medium+</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${perf.mediumPlusShare}%` }} />
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink-faint">Pace</div>
          <div className="mt-2 flex items-end gap-2">
            <span className="text-xl font-bold text-white">{perf.solvesPerWeek}</span>
            <span className="pb-1 text-[10px] text-ink-muted">solves/week</span>
          </div>
          <div className="mt-2 text-[10px] text-ink-faint">~{perf.projectedMonth} projected monthly</div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-ink-faint">
          <span>Hard Share</span>
          <span>{perf.hardShare}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${perf.hardShare}%` }} />
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-ink-muted">
        <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">Next Target</div>
        {perf.nextTarget}
      </div>
      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-3 text-[11px] text-ink-muted">
          <span className="font-semibold text-emerald-300">Story:</span>{" "}
          {perf.growth >= 50
            ? "Your solve velocity is accelerating. Convert that pace into harder solves next."
            : perf.activeDays >= 4
              ? "Consistency is solid. The next gain is improving difficulty quality."
              : "A few extra active days will make this week look much stronger."}
        </div>
      </div>
    </div>
  );
}

function gfgLangColor(name) {
  if (!name) return "#a78bfa";
  const exact = LANG_COLORS[name];
  if (exact) return exact;
  const titled = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return LANG_COLORS[titled] || LANG_COLORS[name.toUpperCase()] || "#a78bfa";
}

function gfgLangDisplay(name) {
  if (!name) return name;
  // Preserve known stylised names; otherwise title-case the first letter
  const exact = LANG_COLORS[name];
  if (exact) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function GFGLanguageStats({ command }) {
  const langs = command.languageStats || [];
  const maxCount = langs[0]?.count || 1;

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Languages</h3>
      {langs.length > 0 ? (
        <div className="space-y-3.5">
          {langs.slice(0, 6).map((lang) => {
            const pct = (lang.count / maxCount) * 100;
            const color = gfgLangColor(lang.name);
            const displayName = gfgLangDisplay(lang.name);
            return (
              <div key={lang.name}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="font-medium text-ink-200">{displayName}</span>
                  </div>
                  <span className="text-ink-faint tabular-nums">{lang.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon="💻" title="No language data" description="Language stats are extracted from your submission history. Trigger a refresh to load." />
        </div>
      )}
    </div>
  );
}

function GFGXPProgress({ command }) {
  const level = Math.max(1, Math.floor((command.score || 0) / 100) + 1);
  const currentXP = command.score || 0;
  const nextLevelXP = level * 100;
  const pct = Math.min(100, Math.max(0, (currentXP / nextLevelXP) * 100));

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">GFG XP Progress</h3>
      <div className="flex-1 flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="text-xl font-bold">Level {level}</div>
          {command.monthlyScore > 0 && (
            <div className="text-[10px] text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded-full w-fit">
              ↑ {command.monthlyScore} XP this month
            </div>
          )}
        </div>
        <div className="relative w-20 h-24 flex items-center justify-center">
          <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full text-emerald-500/20" fill="currentColor">
            <polygon points="50,2 95,25 95,85 50,110 5,85 5,25" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" fill="none" />
            <polygon points="50,12 85,32 85,78 50,98 15,78 15,32" fill="currentColor" />
          </svg>
          <span className="relative text-2xl font-bold text-white">{level}</span>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-[10px] text-ink-muted mt-2 text-right">
          {currentXP} / {nextLevelXP} XP
        </div>
      </div>
    </div>
  );
}

function GFGRecentActivity({ command }) {
  const items = (command.recentActivity || []).slice(0, 5);
  if (!items.length) {
    return (
      <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Recent Activity</h3>
        <EmptyState icon="📝" title="No recent activity" description="GFG did not expose recent activity for this profile." />
      </div>
    );
  }

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {items.map((item, index) => (
          <a
            key={`${item.title}-${item.date || index}`}
            href={item.url || "#"}
            target={item.url ? "_blank" : undefined}
            rel={item.url ? "noreferrer" : undefined}
            className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
          >
            <span className="mt-0.5 h-2 w-2 rounded-full bg-emerald-400" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold text-white">{item.title}</span>
              <span className="mt-1 flex items-center gap-2 text-[10px] text-ink-faint">
                <span className="capitalize">{item.type || "activity"}</span>
                {item.difficulty && <span>{item.difficulty}</span>}
                {item.date && <span>{item.date}</span>}
              </span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function GFGPotdHistory({ command }) {
  const items = (command.potdHistory || []).slice(0, 4);
  const current = command.publicPotd || items[0];
  const list = [current, ...items.filter((item) => item.title !== current?.title)].filter(Boolean).slice(0, 4);

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Problem of the Day</h3>
      </div>
      {list.length ? (
        <div className="space-y-2">
          {list.map((item, index) => (
            <GFGPotdChecklistItem key={`${item.title}-${item.date || item.dateLabel || index}`} item={item} isPrimary={index === 0} />
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-[10px] text-ink-faint">
          Public POTD titles will fill in after the next backend refresh. The main card still links to GFG now.
        </div>
      )}
    </div>
  );
}

function GFGPotdChecklistItem({ item, isPrimary }) {
  const storageKey = `gfg-potd-solved:${item.date || item.dateLabel}:${item.title}`;
  const [markedSolved, setMarkedSolved] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "1";
  });

  const toggleSolved = () => {
    const next = !markedSolved;
    setMarkedSolved(next);
    if (typeof window !== "undefined") {
      if (next) window.localStorage.setItem(storageKey, "1");
      else window.localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className={`rounded-2xl border p-4 transition ${
      markedSolved
        ? "border-emerald-400/30 bg-emerald-400/[0.06]"
        : isPrimary
          ? "border-white/15 bg-white/[0.025]"
          : "border-white/5 bg-white/[0.02]"
    }`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggleSolved}
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition ${
            markedSolved
              ? "border-emerald-400 bg-emerald-400 text-bg shadow-[0_0_18px_rgba(52,211,153,0.25)]"
              : "border-white/15 bg-white/[0.03] text-transparent hover:border-emerald-400/60"
          }`}
          aria-label={markedSolved ? "Mark POTD unsolved" : "Mark POTD solved"}
        >
          <span className="text-sm font-black">✓</span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-semibold text-emerald-300">{item.dateLabel || item.date || "Today"}</div>
            <a
              href={item.url || "https://www.geeksforgeeks.org/problem-of-the-day"}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-ink-faint hover:text-emerald-300"
            >
              Open ↗
            </a>
          </div>
          <a
            href={item.url || "https://www.geeksforgeeks.org/problem-of-the-day"}
            target="_blank"
            rel="noreferrer"
            className={`mt-1 block text-sm font-bold hover:text-emerald-300 ${markedSolved ? "text-white line-through decoration-emerald-400/70" : "text-white"}`}
          >
            {item.title}
          </a>
        </div>
      </div>
    </div>
  );
}

// Cell + gap sizes keyed by period so the grid fills space comfortably
const GFG_CELL = { "7d": 26, "30d": 18, "90d": 13, "1y": 11 };
const GFG_GAP  = { "7d":  6, "30d":  4, "90d":  3, "1y":  2 };

function GFGHeatmapPanel({ command, accent, period }) {
  const days = periodToDays(period);
  const { weeks, p95 } = heatmapWeeks(command.rows, days);
  const hasActivity = command.total > 0;

  const cell = GFG_CELL[period] ?? 13;
  const gap  = GFG_GAP[period]  ?? 3;
  const step = cell + gap;
  const LEFT = 30;

  // Month labels — show the abbreviated month name above the first week of each month
  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, wi) => {
    const firstReal = week.find(Boolean);
    if (!firstReal) return;
    const m = firstReal.date.slice(5, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      const label = new Date(`${firstReal.date}T00:00:00Z`).toLocaleString("default", { month: "short" });
      monthLabels.push({ wi, label });
    }
  });
  const topOffset = monthLabels.length > 1 ? 20 : 6;
  const svgW = Math.max(weeks.length * step + LEFT, 120);
  const svgH = topOffset + 7 * step + 4;

  const compactRange = period !== "1y";
  const recentWeeks = command.weekly.slice(-6).map((week) => ({
    ...week,
    weekRange: weekRangeLabel(week.date),
  }));
  const maxWeek = Math.max(...recentWeeks.map((week) => Number(week.count || 0)), 1);

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 overflow-hidden">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-base">Coding Activity Heatmap</h3>
          <p className="text-[10px] text-ink-faint mt-1">
            {hasActivity ? `${command.totalDisplay} across ` : ""}{PERIOD_COPY[period] || "selected range"}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-right">
          <div className="text-lg font-bold text-white">{command.activityRate}%</div>
          <div className="text-[9px] uppercase tracking-[0.14em] text-ink-faint">hit rate</div>
        </div>
      </div>

      <div className={`rounded-2xl border border-white/5 bg-black/10 p-4 ${compactRange ? "grid lg:grid-cols-[auto_1fr] gap-5 items-center" : "overflow-x-auto"}`}>
        <div className="overflow-x-auto">
          <svg width={svgW} height={svgH} className="block">
            {/* Month labels */}
            {monthLabels.length > 1 && monthLabels.map(({ wi, label }) => (
              <text key={`m-${label}-${wi}`} x={LEFT + wi * step} y={12} fill="rgba(148,163,184,0.6)" fontSize="9">{label}</text>
            ))}
            {/* Day-of-week labels */}
            {["Mon", "Wed", "Fri", "Sun"].map((day, i) => (
              <text key={day} x={0} y={topOffset + (i === 3 ? 6 * step : i * 2 * step) + cell - 1} fill="rgba(148,163,184,0.55)" fontSize="9">{day}</text>
            ))}
            <g transform={`translate(${LEFT},${topOffset})`}>
              {weeks.map((week, wi) =>
                week.map((day, di) => {
                  if (!day) return null;
                  const level = bucket(day.count, p95);
                  return (
                    <rect
                      key={`${wi}-${di}`}
                      x={wi * step}
                      y={di * step}
                      width={cell}
                      height={cell}
                      rx={Math.max(2, Math.round(cell * 0.28))}
                      fill={level > 0 ? activityColor(accent, level) : "rgba(255,255,255,0.05)"}
                      stroke={level > 0 ? "rgba(255,255,255,0.08)" : "transparent"}
                    >
                      <title>{`${day.date}: ${day.count} problem${day.count !== 1 ? "s" : ""}`}</title>
                    </rect>
                  );
                })
              )}
            </g>
          </svg>
        </div>

        {compactRange && (
          <div className="hidden lg:block min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Recent Pace</div>
                <div className="text-[10px] text-ink-faint">weekly ranges</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400">{command.recent30}</div>
                <div className="text-[9px] uppercase tracking-[0.14em] text-ink-faint">30d activity</div>
              </div>
            </div>
            <div className="space-y-2">
              {recentWeeks.map((week) => (
                <div key={week.date} className="grid grid-cols-[86px_1fr_28px] items-center gap-2 text-[10px]">
                  <span className="text-ink-faint">{week.weekRange}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-white/5">
                    <span
                      className="block h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(6, (Number(week.count || 0) / maxWeek) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right text-white tabular-nums">{week.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniPanel label="Best day" value={hasActivity ? command.bestDayDisplay : "—"} sub={command.bestDay?.date} accent={accent} />
        <MiniPanel label="Active days" value={command.activeDays} accent="#22c55e" />
        <div className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
          <div className="text-[10px] text-ink-faint mb-2">Intensity</div>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <span key={level} className="h-3 w-3 rounded" style={{ background: activityColor(accent, level) }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function CodeChefBody({ stats, activity, period, accent }) {
  const history = (stats.contests || stats.ratingHistory || []).slice(-20).map((c, i) => ({
    name: c.contestName || c.name || `Contest ${i + 1}`,
    rating: c.rating || c.newRating || 0,
  }));
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Rating" value={stats.rating ?? 0} icon="🏆" accent="#5b4638" />
        <StatCard label="Stars" value={stats.stars ? `${stats.stars}★` : "—"} format="raw" icon="⭐" accent="#f59e0b" />
        <StatCard label="Solved" value={stats.problemsSolved ?? 0} icon="✅" accent="#10b981" />
        <StatCard label="Contests" value={stats.contestsAttended ?? 0} icon="🎯" accent="#22d3ee" />
      </div>
      <ActivityGrid activity={activity} period={period} accent={accent} />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <RatingHistory title="Rating History" data={history} color="#8b5e3c" gradientId="cc-grad" />
        <div className="panel-pad">
          <h3 className="font-display font-bold text-lg mb-3">Profile</h3>
          <DataRow label="Username" value={`@${stats.profile?.username || "—"}`} />
          <DataRow label="Global Rank" value={stats.globalRank?.toLocaleString() || "—"} />
          <DataRow label="Country Rank" value={stats.countryRank?.toLocaleString() || "—"} />
          <DataRow label="Partial Solved" value={stats.partialProblems ?? 0} />
          <DataRow label="Color" value={stats.color || "—"} />
        </div>
      </div>
      <HighlightStrip
        items={[
          { label: "Full solves", value: stats.problemsSolved ?? 0, accent: "#10b981" },
          { label: "Partial solves", value: stats.partialProblems ?? 0, accent: "#f59e0b" },
          { label: "Global rank", value: stats.globalRank?.toLocaleString?.() || "—", accent },
          { label: "Momentum", value: activity.trendLabel, accent: "#22d3ee" },
        ]}
      />
    </>
  );
}

function AtCoderBody({ stats, activity, period, accent }) {
  const history = (stats.ratingHistory || []).map((r) => ({
    name: (r.contestName || "").slice(0, 18),
    rating: r.newRating,
  }));
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Rating" value={stats.rating ?? 0} icon="⚡" accent="#b0c4de" />
        <StatCard label="Max Rating" value={stats.maxRating ?? 0} icon="🚀" accent="#a855f7" />
        <StatCard label="Unique Solved" value={stats.uniqueSolved ?? stats.acCount ?? 0} icon="✅" accent="#10b981" />
        <StatCard label="Contests" value={stats.contestsAttended ?? 0} icon="🎯" accent="#22d3ee" />
      </div>
      <ActivityGrid activity={activity} period={period} accent={accent} />
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <RatingHistory title="Rating History" data={history} color="#b0c4de" gradientId="ac-grad" />
        <ProfilePanel
          title="Profile"
          rows={[
            ["Username", `@${stats.profile?.username || "—"}`],
            ["Country", stats.profile?.country || "—"],
            ["AC Rank", stats.acRank?.toLocaleString?.() || "—"],
            ["Total Submissions", stats.totalSubmissions?.toLocaleString?.() || "—"],
            ["Accepted", stats.acceptedSubmissions?.toLocaleString?.() || "—"],
            ["AC Count", stats.acCount?.toLocaleString?.() || stats.acCount || "—"],
          ]}
        />
      </div>
    </>
  );
}

function ActivityGrid({ activity, period, accent }) {
  return (
    <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4">
      <PlatformActivityHeatmap activity={activity} period={period} accent={accent} />
      <ActivityTrendChart activity={activity} period={period} accent={accent} />
    </div>
  );
}

function PlatformActivityHeatmap({ activity, period, accent }) {
  if (!activity.rows.length || activity.total <= 0) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Activity Heatmap</h3>
        <EmptyState
          icon="📅"
          title="No activity in this range"
          description="Refresh after your next solve, commit, contest, or coding session to light this up."
        />
      </div>
    );
  }

  const { weeks, p95 } = heatmapWeeks(activity.rows);
  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Activity Heatmap</h3>
          <span className="pill-accent">{activity.totalDisplay} · {PERIOD_COPY[period] || "selected range"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          Less
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: activityColor(accent, i) }}
            />
          ))}
          More
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <svg width={Math.max(weeks.length * 15, 280)} height={105} className="block">
          {weeks.map((week, wi) =>
            week.map((day, di) => {
              if (!day) return null;
              const fill = activityColor(accent, bucket(day.count, p95));
              return (
                <rect
                  key={`${day.date}-${wi}-${di}`}
                  x={wi * 15}
                  y={di * 15}
                  width={12}
                  height={12}
                  rx={3}
                  fill={fill}
                >
                  <title>{`${day.date}: ${formatActivity(day.count, activity.kind)} ${activity.unit}`}</title>
                </rect>
              );
            })
          )}
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <MiniPanel label="Best day" value={activity.bestDayDisplay} sub={activity.bestDay?.date} accent={accent} />
        <MiniPanel label="Current streak" value={`${activity.streakCurrent}d`} accent="#fb923c" />
        <MiniPanel label="Active days" value={activity.activeDays} sub={`${activity.activityRate}% hit rate`} accent="#22d3ee" />
      </div>
    </div>
  );
}

function ActivityTrendChart({ activity, period, accent }) {
  if (!activity.weekly.length || activity.total <= 0) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Momentum</h3>
        <EmptyState
          icon="📈"
          title="No trend yet"
          description="The chart appears once this platform has dated activity."
        />
      </div>
    );
  }

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-bold text-lg">Momentum</h3>
        <span className="pill-accent">{activity.trendLabel}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={activity.weekly} barCategoryGap="24%">
            <defs>
              <linearGradient id={`activity-${activity.platform}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="1" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip content={<ChartTooltip formatValue={(v) => formatActivity(v, activity.kind)} />} cursor={{ fill: "rgba(167,139,250,0.06)" }} />
            <Bar dataKey="count" name={activity.unit} radius={[6, 6, 0, 0]} fill={`url(#activity-${activity.platform})`} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-xs text-ink-muted">
        Weekly totals from {PERIOD_COPY[period] || "the selected range"}.
      </div>
    </div>
  );
}

function RatingHistory({ title, data, color, gradientId }) {
  if (!data.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
        <EmptyState icon="🏆" title="No contest history" description="Contest rating history will appear after sync." />
      </div>
    );
  }
  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.65" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: chartTheme.text, fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Area dataKey="rating" name="Rating" stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RepoList({ repos }) {
  if (!repos.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Repository Radar</h3>
        <EmptyState icon="📦" title="No repos found" description="Public repository data will appear after GitHub sync." />
      </div>
    );
  }
  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">Repository Radar</h3>
      <div className="space-y-2">
        {repos.slice(0, 6).map((repo) => (
          <a
            key={repo.name}
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06] transition"
          >
            <div className="flex items-center gap-2">
              <span className="font-bold gradient-text truncate">{repo.name}</span>
              <span className="ml-auto text-xs text-ink-faint">⭐ {repo.stars ?? 0}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-ink-muted">
              <span>{repo.language || "Unknown"}</span>
              <span>Forks {repo.forks ?? 0}</span>
              {repo.pushedAt && <span>Updated {new Date(repo.pushedAt).toLocaleDateString()}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

function TagCloud({ tags }) {
  const entries = Object.entries(tags)
    .filter(([, value]) => Number(value) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a))
    .slice(0, 12);
  if (!entries.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Problem Tags</h3>
        <EmptyState icon="🏷️" title="No tag data" description="Accepted Codeforces submissions will populate this." />
      </div>
    );
  }
  const max = Math.max(...entries.map(([, value]) => Number(value)));
  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">Problem Tags</h3>
      <div className="flex flex-wrap gap-2">
        {entries.map(([tag, value]) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs"
            style={{ boxShadow: `inset 0 0 20px rgba(254,100,111,${0.08 + (Number(value) / max) * 0.18})` }}
          >
            {tag} <span className="text-ink-faint tabular-nums">{value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function DifficultyBars({ title, details, accent }) {
  const entries = Object.entries(details || {})
    .map(([label, value]) => ({ label, value: normalizedCount(value) }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);
  if (!entries.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
        <EmptyState icon="📊" title="No solved breakdown" description="Difficulty/category details will appear when the platform exposes them." />
      </div>
    );
  }
  const max = Math.max(...entries.map((item) => item.value));
  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">{title}</h3>
      <div className="space-y-3">
        {entries.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center gap-2 text-sm">
              <span className="capitalize text-ink-muted">{item.label}</span>
              <span className="ml-auto font-bold tabular-nums">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: accent }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedList({ title, items, valueSuffix = "" }) {
  const rows = (items || []).slice(0, 8);
  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">{title}</h3>
      {rows.length ? rows.map((item) => (
        <DataRow
          key={item.name}
          label={item.name}
          value={`${Number(item.hours ?? item.value ?? 0).toFixed(1)}${valueSuffix}`}
          accent={item.percent}
        />
      )) : (
        <EmptyState icon="🧭" title={`No ${title.toLowerCase()} yet`} description="WakaTime will fill this after enough tracked coding time." />
      )}
    </div>
  );
}

function ProfilePanel({ title, rows }) {
  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">{title}</h3>
      {rows.map(([label, value]) => (
        <DataRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function HighlightStrip({ items }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <MiniPanel key={item.label} label={item.label} value={item.value} accent={item.accent} />
      ))}
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="hidden sm:block rounded-xl border border-white/5 bg-white/[0.035] px-3 py-2 text-right">
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}

function MiniPanel({ label, value, sub, accent = "#a78bfa" }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="text-xl font-bold tabular-nums" style={{ color: accent }}>{value}</div>
      {sub && <div className="text-[10px] text-ink-muted truncate">{sub}</div>}
    </div>
  );
}

function DataRow({ label, value, accent }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-ink-muted flex-1 min-w-0 truncate">{label}</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
      {accent != null && (
        <span className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
          <span
            className="block h-full bg-gradient-to-r from-accent-500 to-cyan-500"
            style={{ width: `${Math.min(100, accent)}%` }}
          />
        </span>
      )}
    </div>
  );
}

function buildGitHubCommand(stats, activity) {
  const rows = activity.rows || [];
  const dayCount = rows.length || 1;
  const periodContributions = Math.round(activity.total || 0);
  const totalContributions = Number(
    stats.contributions?.total ??
      stats.commits?.totalSearched ??
      periodContributions
  );
  const repoList = stats.repos?.list || [];
  const repoCount = Number(stats.profile?.publicRepos ?? stats.repos?.totalRepos ?? repoList.length ?? 0);
  const originalRepoCount = Number(stats.repos?.totalRepos ?? repoList.length ?? 0);
  const stars = Number(stats.repos?.stars || 0);
  const forks = Number(stats.repos?.forks || 0);
  const mergedPRs = Number(stats.contributions?.mergedPRs || 0);
  const pullRequestContributions = Number(stats.contributions?.pullRequestContributions || 0);
  const issueContributions = Number(stats.contributions?.issueContributions || 0);

  const recent7 = rows.slice(-7).reduce((sum, row) => sum + Number(row.count || 0), 0);
  const recent30Rows = rows.slice(-30);
  const recent30 = recent30Rows.reduce((sum, row) => sum + Number(row.count || 0), 0);
  const activeDays = activity.activeDays || rows.filter((row) => row.count > 0).length;
  const activityRate = Math.round((activeDays / dayCount) * 100);
  const bestDay = activity.bestDay || null;

  const weekly = (activity.weekly || weeklyBuckets(rows)).map((week) => ({
    ...week,
    count: Math.round(Number(week.count || 0)),
    prEstimate: Math.round(Number(week.count || 0) * prShare(mergedPRs, totalContributions)),
  }));
  const spark = weekly.map((week) => week.count);
  const yearSpark = weekSparkFromRows(rows, rows.length || 365);
  const repoSpark = repoList.slice(0, 12).map((repo) => Number(repo.stars || 0) + Number(repo.forks || 0));

  const languages = buildLanguageShare(stats.repos?.languages || {});
  const repos = repoList
    .map((repo) => ({
      ...repo,
      stars: Number(repo.stars || 0),
      forks: Number(repo.forks || 0),
      score: Number(repo.stars || 0) * 4 + Number(repo.forks || 0) * 2 + (repo.pushedAt ? 8 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const weekday = buildWeekdayTotals(rows);
  const peakWeekday = weekday.reduce(
    (best, day) => (day.count > best.count ? day : best),
    weekday[0] || { label: "—", count: 0 }
  );
  const streakJourney = buildStreakJourney(rows);
  const longestStreak = Number(activity.streakLongest || stats.contributions?.streakLongest || 0);
  const currentStreak = Number(activity.streakCurrent || stats.contributions?.streakCurrent || 0);
  const velocityScore = Math.min(
    100,
    Math.round(activityRate * 0.45 + Math.min(45, recent30 * 1.5) + Math.min(10, currentStreak))
  );
  const grade = gradeForVelocity(velocityScore);

  return {
    rows,
    weekly,
    languages,
    repos,
    weekday,
    peakWeekday,
    streakJourney,
    spark,
    yearSpark,
    repoSpark,
    periodContributions,
    totalContributions,
    activeDays,
    dayCount,
    activityRate,
    bestDay,
    bestDayDisplay: bestDay ? Math.round(bestDay.count).toLocaleString() : "—",
    bestDayLabel: bestDay ? `Contributions on ${shortDateLabel(bestDay.date)}` : "No active day yet",
    longestStreak,
    currentStreak,
    repoCount,
    originalRepoCount,
    stars,
    forks,
    mergedPRs,
    pullRequestContributions,
    issueContributions,
    followers: Number(stats.profile?.followers || 0),
    following: Number(stats.profile?.following || 0),
    gists: Number(stats.profile?.publicGists || stats.profile?.gists || 0),
    recent7,
    recent30,
    velocityScore,
    velocityLabel: velocityScore >= 80 ? "High" : velocityScore >= 45 ? "Steady" : "Warming up",
    velocityCopy: velocityScore >= 80
      ? "You are shipping at a strong GitHub pace."
      : velocityScore >= 45
      ? "Consistent movement with room to accelerate."
      : "More active days will raise this score.",
    grade,
    gradeCopy: grade === "A+" ? "Excellent work" : grade === "A" ? "Strong momentum" : grade === "B" ? "Steady builder" : "Keep shipping",
    achievements: [
      { icon: "🔥", value: `${currentStreak} days`, label: "Current streak" },
      { icon: "✦", value: `${periodContributions}+`, label: "Period contributions" },
      { icon: "⚡", value: `${mergedPRs}`, label: "Merged PRs" },
      { icon: "⭐", value: `${stars}`, label: "Stars earned" },
    ],
  };
}

function buildLanguageShare(languages) {
  const entries = Object.entries(languages || {})
    .filter(([, value]) => Number(value) > 0)
    .sort(([, a], [, b]) => Number(b) - Number(a));
  const total = entries.reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (!total) return [];

  const top = entries.slice(0, 5).map(([name, value]) => ({
    name,
    value: Number(value),
    pct: Math.round((Number(value) / total) * 100),
    color: colorForLang(name),
  }));
  const other = entries.slice(5).reduce((sum, [, value]) => sum + Number(value || 0), 0);
  if (other > 0) {
    top.push({
      name: "Other",
      value: other,
      pct: Math.max(1, Math.round((other / total) * 100)),
      color: "#64748b",
    });
  }
  return top;
}

function weekSparkFromRows(rows = [], days = 365) {
  if (!rows.length) return [];
  const sorted = [...rows]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-days);
  const weeks = [];
  for (let i = 0; i < sorted.length; i += 7) {
    weeks.push(
      sorted
        .slice(i, i + 7)
        .reduce((sum, row) => sum + Number(row.count || 0), 0)
    );
  }
  return weeks.map((value) => Math.round(value));
}

function buildWeekdayTotals(rows) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const totals = labels.map((label) => ({ label, count: 0 }));
  for (const row of rows) {
    const date = new Date(`${row.date}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    totals[date.getUTCDay()].count += Number(row.count || 0);
  }
  return totals.map((day) => ({ ...day, count: Math.round(day.count) }));
}

function buildStreakJourney(rows) {
  let run = 0;
  return rows.slice(-90).map((row) => {
    run = Number(row.count || 0) > 0 ? run + 1 : 0;
    return {
      date: row.date,
      label: shortDateLabel(row.date),
      streak: run,
    };
  });
}

function prShare(mergedPRs, totalContributions) {
  if (!totalContributions) return 0.18;
  return Math.max(0.08, Math.min(0.35, Number(mergedPRs || 0) / Number(totalContributions || 1)));
}

function gradeForVelocity(score) {
  if (score >= 88) return "A+";
  if (score >= 72) return "A";
  if (score >= 50) return "B";
  return "C";
}

function shortDateLabel(date) {
  if (!date) return "—";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function buildPlatformActivity(platform, stats, combinedHeatmap, dashboardSeries) {
  const unit = ACTIVITY_UNITS[platform] || "activity";
  const kind = platform === "wakatime" ? "hours" : "count";
  const combinedRows = (combinedHeatmap?.heatmap || []).map((cell) => ({
    date: cell.date,
    count: Number(cell.breakdown?.[platform] || 0),
  }));
  const fallbackRows = rawDailyRows(platform, stats);
  const rows = combinedRows.some((row) => row.count > 0) ? combinedRows : fallbackRows;
  const sortedRows = rows
    .filter((row) => row?.date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({ date: row.date, count: Number(row.count || 0) }));

  const total = sortedRows.reduce((sum, row) => sum + row.count, 0);
  const activeDays = sortedRows.filter((row) => row.count > 0).length;
  const bestDay = sortedRows.reduce(
    (best, row) => (!best || row.count > best.count ? row : best),
    null
  );
  const streaks = streakStats(sortedRows);
  const weekly = weeklyBuckets(sortedRows).slice(-18);
  const recent = sortedRows.slice(-7).reduce((sum, row) => sum + row.count, 0);
  const previous = sortedRows.slice(-14, -7).reduce((sum, row) => sum + row.count, 0);
  const trend = previous > 0 ? Math.round(((recent - previous) / previous) * 100) : (recent > 0 ? 100 : 0);
  const problemSeries = (dashboardSeries?.problems || []).map((row) => ({
    date: row.date,
    count: Number(row.breakdown?.[platform] || 0),
  }));

  return {
    platform,
    unit,
    kind,
    rows: sortedRows,
    weekly,
    problemSeries,
    total,
    totalDisplay: formatActivity(total, kind),
    activeDays,
    activityRate: sortedRows.length ? Math.round((activeDays / sortedRows.length) * 100) : 0,
    bestDay,
    bestDayDisplay: bestDay ? formatActivity(bestDay.count, kind) : "—",
    streakCurrent: streaks.current,
    streakLongest: streaks.longest,
    trendLabel: trend > 0 ? `+${trend}% vs prior week` : trend < 0 ? `${trend}% vs prior week` : "steady week",
  };
}

function rawDailyRows(platform, stats) {
  if (!stats) return [];
  if (platform === "github") return stats.contributions?.heatmap || [];
  if (platform === "wakatime") {
    return (stats.dailyHours || []).map((row) => ({ date: row.date, count: row.hours }));
  }
  if (platform === "leetcode" || platform === "codeforces" || platform === "atcoder") {
    return stats.dailySubmissions || [];
  }
  if (platform === "gfg") {
    return stats.activityCalendar || [];
  }
  return [];
}

function weeklyBuckets(rows) {
  const buckets = {};
  for (const row of rows) {
    const dt = new Date(`${row.date}T00:00:00Z`);
    if (Number.isNaN(dt.getTime())) continue;
    const monday = new Date(dt);
    monday.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    buckets[key] = (buckets[key] || 0) + Number(row.count || 0);
  }
  return Object.entries(buckets)
    .map(([date, count]) => ({
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count: Math.round(count * 100) / 100,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Build a week-grid for a heatmap.
 *
 * When `days` is supplied the grid covers exactly that many calendar days
 * ending today, with empty days (count 0) filled in between active entries.
 * When `days` is omitted the grid spans only the dates present in `rows`
 * (legacy behaviour used by GitHub, whose rows already contain every day).
 */
function heatmapWeeks(rows, days) {
  // Build lookup date → count from the provided rows
  const lookup = {};
  for (const row of rows) {
    if (row?.date) lookup[row.date] = (lookup[row.date] || 0) + Number(row.count || 0);
  }

  let allDates;
  if (days != null) {
    // Generate every date in [today - days + 1 … today]
    const today = new Date();
    allDates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      allDates.push(d.toISOString().slice(0, 10));
    }
  } else {
    // Legacy: only dates that appear in rows
    allDates = [...rows]
      .filter((r) => r?.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((r) => r.date);
  }

  if (!allDates.length) return { weeks: [], p95: 1 };

  const fullRows = allDates.map((date) => ({ date, count: lookup[date] || 0 }));
  const positives = fullRows.map((r) => r.count).filter((c) => c > 0).sort((a, b) => a - b);
  const p95 = positives.length ? (positives[Math.floor(positives.length * 0.95)] || positives.at(-1)) : 1;

  // Build 7-row week columns, padding the start to align with the correct weekday
  const weeks = [];
  let week = [];
  const firstDay = new Date(`${allDates[0]}T00:00:00Z`).getUTCDay();
  for (let i = 0; i < firstDay; i++) week.push(null);
  for (const row of fullRows) {
    week.push(row);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return { weeks, p95 };
}

function streakStats(rows) {
  let longest = 0;
  let run = 0;
  for (const row of rows) {
    if (row.count > 0) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  let current = 0;
  for (let i = rows.length - 1; i >= 0; i -= 1) {
    if (rows[i].count > 0) current += 1;
    else break;
  }
  return { current, longest };
}

function bucket(count, p95) {
  if (!count || count <= 0) return 0;
  const ratio = count / Math.max(1, p95);
  if (ratio < 0.2) return 1;
  if (ratio < 0.5) return 2;
  if (ratio < 0.8) return 3;
  return 4;
}

function activityColor(accent, level) {
  if (level === 0) return "rgba(255,255,255,0.04)";
  const opacity = [0, 0.24, 0.45, 0.68, 1][level] || 1;
  return hexToRgba(accent, opacity);
}

function hexToRgba(hex, alpha) {
  const clean = String(hex || "#a78bfa").replace("#", "");
  if (clean.length !== 6) return `rgba(167,139,250,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function platformAccent(platform) {
  const color = FALLBACK_ACCENT[platform] || PLATFORM_BY_ID[platform]?.color || "#a78bfa";
  return color === "#222222" ? "#b0c4de" : color;
}

function formatActivity(value, kind) {
  const n = Number(value || 0);
  if (kind === "hours") return `${n.toFixed(n >= 10 ? 0 : 1)}h`;
  return Math.round(n).toLocaleString();
}

function normalizedCount(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return Number(value || 0);
}
