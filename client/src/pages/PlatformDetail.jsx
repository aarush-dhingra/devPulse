import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import StatCard from "../components/dashboard/StatCard";
import ContributionHeatmap from "../components/dashboard/ContributionHeatmap";
import LanguageRadar from "../components/dashboard/LanguageRadar";
import CodingHoursChart from "../components/dashboard/CodingHoursChart";
import SolveBreakdown from "../components/dashboard/SolveBreakdown";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { PLATFORM_BY_ID } from "../utils/constants";
import { chartTheme } from "../utils/chartConfigs";
import ChartTooltip from "../components/ui/ChartTooltip";

export default function PlatformDetail({ platform, data }) {
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

  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        <Link to="/dashboard" className="text-sm text-ink-muted hover:text-accent-300">
          ← Overview
        </Link>
        <div
          className="w-12 h-12 rounded-2xl grid place-items-center text-2xl ring-1 ring-white/10"
          style={{ background: meta.bg, color: meta.color, boxShadow: `0 0 20px ${meta.color}33` }}
        >
          {meta.icon}
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl">{meta.name}</h1>
          <p className="text-sm text-ink-muted">
            {conn?.platform_username ? `@${conn.platform_username}` : "Not connected"}
            {conn?.last_synced && (
              <> · synced {new Date(conn.last_synced).toLocaleString()}</>
            )}
          </p>
        </div>
        <div className="ml-auto">
          {!conn ? (
            <Link to="/settings"><Button>Connect {meta.name}</Button></Link>
          ) : (
            <Link to="/settings"><Button variant="ghost">Manage</Button></Link>
          )}
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
        <PlatformBody platform={platform} stats={stats} />
      )}
    </>
  );
}

function PlatformBody({ platform, stats }) {
  switch (platform) {
    case "github":     return <GitHubBody stats={stats} />;
    case "leetcode":   return <LeetCodeBody stats={stats} />;
    case "codeforces": return <CodeforcesBody stats={stats} />;
    case "wakatime":   return <WakatimeBody stats={stats} />;
    case "gfg":        return <GFGBody stats={stats} />;
    case "devto":      return <DevToBody stats={stats} />;
    default:           return null;
  }
}

function GitHubBody({ stats }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Commits" value={stats.commits?.totalSearched ?? stats.contributions?.total ?? 0} icon="✏️" accent="#94a3b8" />
        <StatCard label="Public Repos" value={stats.repos?.totalRepos ?? 0} icon="📦" accent="#22d3ee" />
        <StatCard label="Stars Earned" value={stats.repos?.stars ?? 0} icon="⭐" accent="#f59e0b" />
        <StatCard label="PRs Merged" value={stats.contributions?.mergedPRs ?? 0} icon="🚀" accent="#10b981" />
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <ContributionHeatmap heatmap={stats.contributions?.heatmap || []} />
        <LanguageRadar languages={stats.repos?.languages || {}} />
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

function LeetCodeBody({ stats }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Solved" value={stats.solved?.total ?? 0} icon="🧩" accent="#ffa116" />
        <StatCard label="Easy" value={stats.solved?.easy ?? 0} icon="🟢" accent="#10b981" />
        <StatCard label="Medium" value={stats.solved?.medium ?? 0} icon="🟡" accent="#f59e0b" />
        <StatCard label="Hard" value={stats.solved?.hard ?? 0} icon="🔴" accent="#ef4444" />
      </div>
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
    </>
  );
}

function CodeforcesBody({ stats }) {
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
      {history.length > 0 && (
        <div className="panel-pad">
          <h3 className="font-display font-bold text-lg mb-3">Rating History</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cf-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fe646f" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#fe646f" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: chartTheme.text, fontSize: 10 }} />
                <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area dataKey="rating" stroke="#fe646f" strokeWidth={2} fill="url(#cf-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}

function WakatimeBody({ stats }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Last 7 Days" value={`${Math.round(stats.hoursLast7Days ?? 0)}h`} format="raw" icon="📅" accent="#22d3ee" />
        <StatCard label="Last 30 Days" value={`${Math.round(stats.hoursLast30Days ?? 0)}h`} format="raw" icon="📊" accent="#8b5cf6" />
        <StatCard label="Daily Avg" value={`${(stats.dailyAverageHours ?? 0).toFixed(1)}h`} format="raw" icon="⏱️" accent="#10b981" />
        <StatCard label="Best Day" value={stats.bestDay ? `${Math.round(stats.bestDay.hours)}h` : "—"} format="raw" icon="🌟" accent="#f59e0b" hint={stats.bestDay?.date}/>
      </div>
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
    </>
  );
}

function GFGBody({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Coding Score" value={stats.score ?? 0} icon="🧠" accent="#10b981" />
      <StatCard label="Problems Solved" value={stats.problemsSolved ?? 0} icon="🎯" accent="#22d3ee" />
      <StatCard label="Current Streak" value={`${stats.streak ?? 0}d`} format="raw" icon="🔥" accent="#f59e0b" />
      <StatCard label="Max Streak" value={`${stats.maxStreak ?? 0}d`} format="raw" icon="🏔️" accent="#a855f7" />
    </div>
  );
}

function DevToBody({ stats }) {
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Articles" value={stats.articleCount ?? 0} icon="📝" accent="#94a3b8" />
        <StatCard label="Reactions" value={stats.totalReactions ?? 0} icon="❤️" accent="#ef4444" />
        <StatCard label="Comments" value={stats.totalComments ?? 0} icon="💬" accent="#22d3ee" />
        <StatCard label="Tags Used" value={Object.keys(stats.tags || {}).length} icon="🏷️" accent="#8b5cf6" />
      </div>
      {(stats.topArticles || []).length > 0 && (
        <div className="panel-pad">
          <h3 className="font-display font-bold text-lg mb-3">Top Articles</h3>
          <ul className="space-y-2">
            {stats.topArticles.map((a) => (
              <li key={a.url}>
                <a href={a.url} target="_blank" rel="noreferrer" className="block p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition">
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-ink-faint mt-1">
                    ❤ {a.reactions} · 💬 {a.comments} · {new Date(a.publishedAt).toLocaleDateString()}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
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
