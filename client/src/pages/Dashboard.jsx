import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStats } from "../hooks/useStats";
import { useAuth } from "../hooks/useAuth";

import StatTile from "../components/dashboard/StatTile";
import TodayFocus from "../components/dashboard/TodayFocus";
import CombinedHeatmap from "../components/dashboard/CombinedHeatmap";
import WeeklyBreakdown from "../components/dashboard/WeeklyBreakdown";
import ProblemsSolvedChart from "../components/dashboard/ProblemsSolvedChart";
import PlatformOverviewRow from "../components/dashboard/PlatformOverviewRow";
import RecentAchievements from "../components/dashboard/RecentAchievements";
import ActiveProjects from "../components/dashboard/ActiveProjects";
import FocusMode from "../components/dashboard/FocusMode";
import QuoteOfTheDay from "../components/dashboard/QuoteOfTheDay";
import SessionTimeline from "../components/dashboard/SessionTimeline";
import InsightsPanel from "../components/dashboard/InsightsPanel";
import DateRangeBar, { periodToDays } from "../components/dashboard/DateRangeBar";

import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { DashboardSkeleton } from "../components/ui/SkeletonCard";
import { ROUTES } from "../utils/constants";
import PlatformDetail from "./PlatformDetail";
import PlatformLogo from "../components/ui/PlatformLogo";

import { dashboardApi } from "../api/dashboard.api";

export default function Dashboard() {
  const { platform } = useParams();
  const { user } = useAuth();
  const { data, loading, error, refresh } = useStats();

  /* Centralized date range — every section consumes this */
  const [period, setPeriod] = useState("90d");

  const [heatmap, setHeatmap] = useState(null);
  const [series,  setSeries]  = useState(null);

  /* Refetch whenever stats are ready or the period changes */
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    dashboardApi.heatmap(period)
      .then((d) => { if (!cancelled) setHeatmap(d); })
      .catch(() => { if (!cancelled) setHeatmap(null); });
    return () => { cancelled = true; };
  }, [data, period]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    dashboardApi.series(period)
      .then((d) => { if (!cancelled) setSeries(d); })
      .catch(() => { if (!cancelled) setSeries(null); });
    return () => { cancelled = true; };
  }, [data, period]);

  const stats = data?.stats || {};
  const gh  = stats.github     || {};
  const lc  = stats.leetcode   || {};
  const wt  = stats.wakatime   || {};
  const cf  = stats.codeforces || {};
  const gfg = stats.gfg        || {};

  /* Period-aware tile metrics — totals are clamped to the visible window
     using the heatmap totals (whose range matches `period`). */
  const tileMetrics = useMemo(() => {
    const days = periodToDays(period);

    const totalCommits = sumWindow(gh.contributions?.heatmap, days);
    const totalProblems =
      sumWindow(lc.dailySubmissions, days) +
      sumWindow(cf.dailySubmissions, days);
    const codingHoursWindow = sumWindow(wt.dailyHours, days, "hours");
    const streak = Math.max(
      Number(gh.contributions?.streakCurrent ?? 0),
      Number(gfg.streak ?? 0),
    );
    const codH = Math.floor(codingHoursWindow);
    const codM = Math.round((codingHoursWindow - codH) * 60);

    return {
      totalCommits,
      totalProblems,
      codingHoursDisplay: { hours: codH, minutes: codM },
      streak,
      streakLongest: Number(gh.contributions?.streakLongest ?? 0),
    };
  }, [gh, lc, wt, cf, gfg, period]);

  /* Sparklines (always last N points so the trend is comparable) */
  const sparks = useMemo(() => {
    const days = Math.min(periodToDays(period), 90);
    return {
      github:  weekSpark(gh.contributions?.heatmap, days),
      lc:      sliceLast(lc.dailySubmissions, Math.min(days, 30)),
      waka:    sliceLast(wt.dailyHours,       Math.min(days, 30), "hours"),
      streak:  Array.from({ length: 7 }).map((_, i) => {
        const iso = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10);
        return Number((gh.contributions?.heatmap || []).find((d) => d.date === iso)?.count || 0);
      }),
    };
  }, [gh, lc, wt, period]);

  const deltas = useMemo(() => ({
    problems: trendPct(sparks.lc),
    commits:  trendPct(sparks.github),
    coding:   trendPct(sparks.waka),
  }), [sparks]);

  /* ── conditional renders ── */
  if (loading && !data) return <DashboardSkeleton />;

  if (!data) {
    return (
      <EmptyState
        icon={error ? "⚠️" : "📡"}
        title={error ? "Couldn't load stats" : "No stats yet"}
        description={
          error
            ? `Request failed: ${error}. Check the server console.`
            : "Connect a platform to start building your DevPulse."
        }
        action={
          <div className="flex gap-2">
            <Button onClick={refresh}>Try again</Button>
            <Link to={ROUTES.settings}><Button variant="outline">Connect platforms</Button></Link>
          </div>
        }
      />
    );
  }

  if (platform) {
    return <PlatformDetail platform={platform} data={data} />;
  }

  const codH = tileMetrics.codingHoursDisplay.hours;
  const codM = tileMetrics.codingHoursDisplay.minutes;
  const periodSubLabel = SUFFIX_BY_PERIOD[period] || "selected range";

  return (
    <div className="space-y-5 stagger-fade">
      {/* ── Hero (Today's Score + Tasks) ── */}
      <TodayFocus user={user} stats={stats} />

      {/* ── Centralized date filter — drives every section below ── */}
      <DateRangeBar period={period} onChange={setPeriod} />

      {/* ── Stats Row (period-aware) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Problems Solved"
          value={tileMetrics.totalProblems}
          icon={<PlatformLogo platform="leetcode" size={12} />}
          accent="#ffa116"
          to="/dashboard/leetcode"
          spark={sparks.lc}
          platform="leetcode"
          delta={deltas.problems}
          deltaLabel={periodSubLabel}
        />
        <StatTile
          label="Commits"
          value={tileMetrics.totalCommits}
          icon={<PlatformLogo platform="github" size={12} />}
          accent="#e6edf3"
          to="/dashboard/github"
          spark={sparks.github}
          platform="github"
          delta={deltas.commits}
          deltaLabel={periodSubLabel}
        />
        <StatTile
          label="Coding Time"
          value={`${codH}h ${codM}m`}
          icon={<PlatformLogo platform="wakatime" size={12} />}
          accent="#22d3ee"
          to="/dashboard/wakatime"
          spark={sparks.waka}
          platform="wakatime"
          delta={deltas.coding}
          deltaLabel={periodSubLabel}
        />
        <StatTile
          label="Current Streak"
          value={tileMetrics.streak}
          suffix="days"
          icon="🔥"
          accent="#fb923c"
          spark={sparks.streak}
          hint={tileMetrics.streakLongest ? `Best: ${tileMetrics.streakLongest} days` : undefined}
        />
      </div>

      {/* ── Heatmap (70%) + Activity Breakdown pie (30%) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-3 items-stretch">
        <div className="lg:col-span-7 min-w-0">
          <CombinedHeatmap data={heatmap} period={period} />
        </div>
        <div className="lg:col-span-3 min-w-0">
          <WeeklyBreakdown heatmap={heatmap} period={period} />
        </div>
      </div>

      {/* ── Charts Row — Problems Chart · Activity Timeline ── */}
      <div className="grid lg:grid-cols-2 gap-3 items-stretch">
        <ProblemsSolvedChart
          series={series?.problems || []}
          period={period}
        />
        <SessionTimeline
          stats={stats}
          heatmapData={heatmap}
          period={period}
        />
      </div>

      {/* ── Platform Overview ── */}
      <PlatformOverviewRow stats={stats} platforms={data.platforms || []} />

      {/* ── Insights + Recent Achievements ── */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3 items-stretch">
        <InsightsPanel stats={stats} heatmap={heatmap} />
        <RecentAchievements badges={data.badges || []} stats={stats} />
      </div>

      {/* ── Lower section — Active Projects · Focus Mode · Quote ── */}
      <div className="grid lg:grid-cols-3 gap-3 items-stretch">
        <ActiveProjects github={gh} />
        <FocusMode />
        <QuoteOfTheDay />
      </div>
    </div>
  );
}

/* ─── helpers ──────────────────────────────────────────────── */

const SUFFIX_BY_PERIOD = {
  "7d":  "this week",
  "30d": "this month",
  "90d": "last 90 days",
  "1y":  "this year",
};

function trendPct(spark) {
  if (!spark || spark.length < 2) return null;
  const half   = Math.max(1, Math.floor(spark.length / 2));
  const recent = spark.slice(-half);
  const older  = spark.slice(0, half);
  const sumR   = recent.reduce((s, v) => s + (Number(v) || 0), 0);
  const sumO   = older .reduce((s, v) => s + (Number(v) || 0), 0);
  if (!sumO) return sumR > 0 ? 100 : null;
  return Math.round(((sumR - sumO) / sumO) * 100);
}

function weekSpark(heatmap = [], days = 90) {
  if (!heatmap?.length) return [];
  const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date)).slice(-days);
  const weeks = [];
  for (let i = 0; i < sorted.length; i += 7) {
    weeks.push(sorted.slice(i, i + 7).reduce((s, d) => s + (d.count || 0), 0));
  }
  return weeks;
}

function sliceLast(arr, n, key = "count") {
  if (!Array.isArray(arr) || !arr.length) return [];
  return arr.slice(-n).map((d) => Number(d[key] ?? d.count ?? 0));
}

/**
 * Sum the last `days` daily entries from an array of {date, count|hours}
 * (filters by ISO date so order doesn't matter).
 */
function sumWindow(arr, days, key = "count") {
  if (!Array.isArray(arr) || !arr.length) return 0;
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  cutoff.setTime(cutoff.getTime() - (days - 1) * 86400000);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  let total = 0;
  for (const d of arr) {
    if (!d?.date) continue;
    if (d.date >= cutoffIso) total += Number(d[key] ?? d.count ?? 0);
  }
  return Math.round(total * 100) / 100;
}
