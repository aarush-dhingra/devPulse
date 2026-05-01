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
} from "recharts";
import StatCard from "../components/dashboard/StatCard";
import ContributionHeatmap from "../components/dashboard/ContributionHeatmap";
import LanguageRadar from "../components/dashboard/LanguageRadar";
import CodingHoursChart from "../components/dashboard/CodingHoursChart";
import SolveBreakdown from "../components/dashboard/SolveBreakdown";
import DateRangeBar from "../components/dashboard/DateRangeBar";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { PLATFORM_BY_ID } from "../utils/constants";
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
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-5"
        style={{ boxShadow: `0 24px 80px -52px ${accent}` }}
      >
        <div
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-25"
          style={{ background: accent }}
        />
        <Link to="/dashboard" className="text-sm text-ink-muted hover:text-accent-300">
          ← Overview
        </Link>
        <div className="relative mt-4 flex items-center gap-4 flex-wrap">
          <div
            className="w-14 h-14 rounded-2xl grid place-items-center ring-1 ring-white/10"
            style={{ background: meta.bg, boxShadow: `0 0 24px ${accent}33` }}
          >
            {PLATFORM_LOGO_PATHS[meta.id] ? (
              <PlatformLogo platform={meta.id} size={26} color={accent} />
            ) : (
              <span style={{ color: accent }} className="text-2xl">
                {meta.icon}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-bold text-3xl">{meta.name}</h1>
              <span className="pill-accent !py-0.5 !text-[10px]">
                {activity.totalDisplay} {activity.unit}
              </span>
            </div>
            <p className="text-sm text-ink-muted">
              {conn?.platform_username ? `@${conn.platform_username}` : "Not connected"}
              {conn?.last_synced && (
                <> · synced {new Date(conn.last_synced).toLocaleString()}</>
              )}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <MiniMetric label="Active days" value={activity.activeDays} />
            <MiniMetric label="Best day" value={activity.bestDay ? activity.bestDayDisplay : "—"} />
            {!conn ? (
              <Link to="/settings"><Button>Connect {meta.name}</Button></Link>
            ) : (
              <Link to="/settings"><Button variant="ghost">Manage</Button></Link>
            )}
          </div>
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
  const repos = stats.repos?.list || [];
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Commits" value={stats.commits?.totalSearched ?? stats.contributions?.total ?? 0} icon="✏️" accent="#94a3b8" />
        <StatCard label="Public Repos" value={stats.repos?.totalRepos ?? 0} icon="📦" accent="#22d3ee" />
        <StatCard label="Stars Earned" value={stats.repos?.stars ?? 0} icon="⭐" accent="#f59e0b" />
        <StatCard label="PRs Merged" value={stats.contributions?.mergedPRs ?? 0} icon="🚀" accent="#10b981" />
      </div>
      <ActivityGrid activity={activity} period={period} accent={accent} />
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <ContributionHeatmap heatmap={stats.contributions?.heatmap || []} />
        <LanguageRadar languages={stats.repos?.languages || {}} />
      </div>
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
        <RepoList repos={repos} />
        <ProfilePanel
          title="GitHub Profile"
          rows={[
            ["Username", `@${stats.profile?.username || "—"}`],
            ["Followers", stats.profile?.followers?.toLocaleString?.() || stats.profile?.followers || 0],
            ["Following", stats.profile?.following?.toLocaleString?.() || stats.profile?.following || 0],
            ["Original repos", stats.repos?.totalRepos ?? 0],
            ["Forks earned", stats.repos?.forks ?? 0],
            ["Longest streak", `${stats.contributions?.streakLongest ?? 0}d`],
          ]}
        />
      </div>
      {stats.repos?.topRepo && (
        <div className="panel-pad">
          <h3 className="font-display font-bold text-lg mb-3">Top Repo</h3>
          <a
            href={stats.repos.topRepo.url}
            target="_blank"
            rel="noreferrer"
            className="block p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition"
          >
            <div className="font-bold gradient-text">{stats.repos.topRepo.name}</div>
            <p className="text-sm text-ink-muted mt-1">{stats.repos.topRepo.description || "No description"}</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-faint">
              <span>⭐ {stats.repos.topRepo.stars}</span>
              {stats.repos.topRepo.language && <span>· {stats.repos.topRepo.language}</span>}
            </div>
          </a>
        </div>
      )}
    </>
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
