import { useMemo } from "react";
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
import DateRangeBar from "../components/dashboard/DateRangeBar";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { PLATFORM_BY_ID, colorForLang } from "../utils/constants";
import { chartTheme } from "../utils/chartConfigs";
import ChartTooltip from "../components/ui/ChartTooltip";
import PlatformLogo, { PLATFORM_LOGO_PATHS } from "../components/ui/PlatformLogo";

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
        <GitHubMetricCard label="Total Commits" value={command.totalContributions} trend={command.recent7} color="#22d3ee" spark={command.yearSpark} icon="✏️" />
        <GitHubMetricCard label="Period Commits" value={command.periodContributions} trend={command.recent30} color="#8b5cf6" spark={command.spark} icon="📊" />
        <GitHubMetricCard label="Merged PRs" value={command.mergedPRs} trend={command.pullRequestContributions} color="#fb923c" spark={command.spark} icon="🚀" />
        <GitHubMetricCard label="Public Repos" value={command.repoCount} trend={command.originalRepoCount} color="#38bdf8" spark={command.repoSpark} icon="📦" />
        <GitHubMetricCard label="Stars Earned" value={command.stars} trend={command.forks} color="#a855f7" spark={command.repoSpark} icon="⭐" />
        <GitHubMetricCard label="Contribution Score" value={command.grade} color="#fbbf24" format="raw" icon="🏆" sub={command.gradeCopy} />
      </div>

      <div className="grid xl:grid-cols-[1.5fr_2fr_1fr] gap-3 items-stretch">
        <GitHubHeatmapPanel command={command} accent={accent} period={period} />
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

function GitHubMetricCard({ label, value, sub, trend, color, spark, format = "number", icon }) {
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
          {trend != null && !sub && (
            <div className="text-[10px] text-emerald-400 font-medium">↑ {trend} <span className="text-ink-faint font-normal">vs prev</span></div>
          )}
          {sub && (
            <div className="text-[10px] text-ink-faint font-normal">{sub}</div>
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

function GitHubHeatmapPanel({ command, accent, period }) {
  if (!command.rows.length || command.periodContributions <= 0) {
    return (
      <div className="panel-pad !bg-transparent border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Contribution Heatmap</h3>
        <EmptyState icon="📅" title="No GitHub activity" description="Refresh after your next contribution to populate the grid." />
      </div>
    );
  }
  const { weeks, p95 } = heatmapWeeks(command.rows);
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-base">Contribution Heatmap</h3>
        <span className="text-[10px] text-ink-faint">{PERIOD_COPY[period] || "range"}</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={Math.max(weeks.length * 15 + 30, 320)} height={118} className="block">
          {["Mon", "Wed", "Fri"].map((day, i) => (
            <text key={day} x="0" y={32 + i * 30} fill="rgba(148,163,184,0.65)" fontSize="10">{day}</text>
          ))}
          <g transform="translate(30,8)">
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                if (!day) return null;
                return (
                  <rect
                    key={`${day.date}-${wi}-${di}`}
                    x={wi * 15}
                    y={di * 15}
                    width={12}
                    height={12}
                    rx={3}
                    fill={activityColor(accent, bucket(day.count, p95))}
                    stroke={day.count === command.bestDay?.count && day.date === command.bestDay?.date ? "#22d3ee" : "transparent"}
                    strokeWidth={1.2}
                  >
                    <title>{`${day.date}: ${day.count} contributions`}</title>
                  </rect>
                );
              })
            )}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-ink-faint">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="h-2.5 w-2.5 rounded-sm" style={{ background: activityColor(accent, level) }} />
          ))}
        </div>
        <span>More</span>
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
  const max = Math.max(1, ...command.repos.map((repo) => repo.score));
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Top Repositories</h3>
        <span className="text-[10px] text-ink-faint">Contributions</span>
      </div>
      <div className="space-y-4 mt-5">
        {command.repos.map((repo) => (
          <a key={repo.name} href={repo.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 hover:bg-white/[0.02] p-1 rounded transition">
            <div className="w-4 h-4 text-ink-muted">📦</div>
            <div className="w-1/3 truncate text-sm text-ink">{repo.name}</div>
            <div className="w-1/4 text-xs text-ink-muted">{repo.language || "Unknown"}</div>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(8, (repo.score / max) * 100)}%` }} />
              </div>
            </div>
            <div className="w-10 text-right text-xs tabular-nums text-ink">{repo.score}</div>
            <div className="w-10 text-right text-[10px] text-emerald-400 font-medium">↑ {Math.round(repo.score / 2)}%</div>
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
        {command.achievements.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-sm">{item.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="text-[11px] text-ink-muted">{item.value} achieved</div>
            </div>
            <div className="text-[10px] text-ink-faint">{i * 2 + 1}h ago</div>
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
          ["Followers", command.followers, "11"],
          ["Following", command.following, "12"],
          ["Public Repos", command.repoCount, "13"],
          ["Gists", command.gists, "—"],
          ["Stars Earned", command.stars, "111"],
        ].map(([label, value, trend], i) => (
          <div key={label} className="flex flex-col items-center">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-xs mb-2">
              {['👥', '👀', '📦', '📝', '⭐'][i]}
            </div>
            <div className="text-lg font-bold text-white mb-1 tabular-nums">{Number(value || 0).toLocaleString()}</div>
            <div className="text-[10px] text-ink-muted mb-2 max-w-[50px] leading-tight">{label}</div>
            {trend !== "—" ? <div className="text-[10px] text-emerald-400">↑ {trend}</div> : <div className="text-[10px] text-ink-faint">—</div>}
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
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Solved" value={stats.solved?.total ?? 0} icon="🧩" accent="#ffa116" />
        <StatCard label="Easy" value={stats.solved?.easy ?? 0} icon="🟢" accent="#10b981" />
        <StatCard label="Medium" value={stats.solved?.medium ?? 0} icon="🟡" accent="#f59e0b" />
        <StatCard label="Hard" value={stats.solved?.hard ?? 0} icon="🔴" accent="#ef4444" />
      </div>
      <ActivityGrid activity={activity} period={period} accent={accent} />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <SolveBreakdown leetcode={stats} />
        <div className="panel-pad">
          <h3 className="font-display font-bold text-lg mb-3">Profile</h3>
          <DataRow label="Username" value={`@${stats.profile?.username || "—"}`} />
          <DataRow label="Ranking" value={stats.profile?.ranking?.toLocaleString() || "—"} />
          <DataRow label="Reputation" value={stats.profile?.reputation || 0} />
          <DataRow label="Acceptance" value={stats.acceptanceRate ? `${stats.acceptanceRate}%` : "—"} />
          <DataRow label="Contest Rating" value={stats.contest?.rating || "—"} />
          <DataRow label="Top %" value={stats.contest?.topPercentage ? `Top ${stats.contest.topPercentage}%` : "—"} />
        </div>
      </div>
      <HighlightStrip
        items={[
          { label: "Acceptance", value: stats.acceptanceRate ? `${stats.acceptanceRate}%` : "—", accent: "#22c55e" },
          { label: "Contest rating", value: stats.contest?.rating || "—", accent: "#ffa116" },
          { label: "Badges", value: stats.badges?.length ?? 0, accent: "#a78bfa" },
          { label: "Recent momentum", value: activity.trendLabel, accent },
        ]}
      />
    </>
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
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Coding Score" value={stats.score ?? 0} icon="🧠" accent="#10b981" />
        <StatCard label="Problems Solved" value={stats.problemsSolved ?? 0} icon="🎯" accent="#22d3ee" />
        <StatCard label="Current Streak" value={`${stats.streak ?? 0}d`} format="raw" icon="🔥" accent="#f59e0b" />
        <StatCard label="Max Streak" value={`${stats.maxStreak ?? 0}d`} format="raw" icon="🏔️" accent="#a855f7" />
      </div>
      <ActivityGrid activity={activity} period={period} accent={accent} />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
        <DifficultyBars title="Solved Breakdown" details={stats.solvedDetails || {}} accent={accent} />
        <ProfilePanel
          title="GFG Profile"
          rows={[
            ["Username", `@${stats.profile?.username || "—"}`],
            ["Name", stats.profile?.name || "—"],
            ["Institute", stats.profile?.institute || "—"],
            ["Institute rank", stats.profile?.instituteRank?.toLocaleString?.() || stats.profile?.instituteRank || "—"],
            ["Monthly score", stats.monthlyScore ?? 0],
            ["Source", stats.source || "—"],
          ]}
        />
      </div>
    </>
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
      { icon: "✦", value: `${periodContributions}+`, label: "Range contributions" },
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

function heatmapWeeks(rows) {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const positives = sorted.map((row) => row.count).filter((count) => count > 0).sort((a, b) => a - b);
  const p95 = positives.length ? positives[Math.floor(positives.length * 0.95)] || positives.at(-1) : 1;
  const weeks = [];
  let week = [];
  const firstDay = new Date(`${sorted[0]?.date}T00:00:00Z`).getUTCDay();
  for (let i = 0; i < firstDay; i += 1) week.push(null);
  for (const row of sorted) {
    week.push(row);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
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
