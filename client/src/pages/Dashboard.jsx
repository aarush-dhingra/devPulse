import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStats } from "../hooks/useStats";
import { useAuth } from "../hooks/useAuth";

import StatTile from "../components/dashboard/StatTile";
import TodayFocus from "../components/dashboard/TodayFocus";
import CombinedHeatmap from "../components/dashboard/CombinedHeatmap";
import ProblemsSolvedChart from "../components/dashboard/ProblemsSolvedChart";
import PlatformOverviewRow from "../components/dashboard/PlatformOverviewRow";
import RecentAchievements from "../components/dashboard/RecentAchievements";
import ActiveProjects from "../components/dashboard/ActiveProjects";
import FocusMode from "../components/dashboard/FocusMode";
import QuoteOfTheDay from "../components/dashboard/QuoteOfTheDay";
import SessionTimeline from "../components/dashboard/SessionTimeline";
import InsightsPanel from "../components/dashboard/InsightsPanel";

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
  const [heatmap, setHeatmap]         = useState(null);
  const [series, setSeries]           = useState(null);
  const [seriesPeriod, setSeriesPeriod] = useState("90d");
  const [refreshing, setRefreshing]   = useState(false);

  useEffect(() => {
    if (!data) return;
    dashboardApi.heatmap().then(setHeatmap).catch(() => setHeatmap(null));
  }, [data]);

  useEffect(() => {
    if (!data) return;
    dashboardApi.series(seriesPeriod).then(setSeries).catch(() => setSeries(null));
  }, [data, seriesPeriod]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); }
    finally { setRefreshing(false); }
  };

  const stats = data?.stats || {};
  const gh  = stats.github     || {};
  const lc  = stats.leetcode   || {};
  const wt  = stats.wakatime   || {};
  const cf  = stats.codeforces || {};
  const gfg = stats.gfg        || {};

  /* Derived stat-tile values (must be before any conditional return) */
  const tileMetrics = useMemo(() => {
    const totalCommits  = gh.contributions?.total ?? gh.commits?.totalSearched ?? 0;
    const totalProblems = Number(lc.solved?.total ?? 0) + Number(cf.uniqueSolved ?? 0) + Number(gfg.problemsSolved ?? 0);
    const codingHours30 = Number(wt.hoursLast30Days ?? 0);
    const streak        = Math.max(Number(gh.contributions?.streakCurrent ?? 0), Number(gfg.streak ?? 0));

    /* Format coding hours as "Xh Ym" */
    const codH = Math.floor(codingHours30);
    const codM = Math.round((codingHours30 - codH) * 60);

    return {
      totalCommits,
      totalProblems,
      codingHours30,
      streak,
      codingHoursDisplay: { hours: codH, minutes: codM },
      streakLongest: Number(gh.contributions?.streakLongest ?? 0),
    };
  }, [gh, lc, wt, cf, gfg]);

  /* Sparklines */
  const sparks = useMemo(() => ({
    github:  weekSpark(gh.contributions?.heatmap),
    lc:      sliceLast(lc.dailySubmissions, 30),
    waka:    sliceLast(wt.dailyHours, 14, "hours"),
    streak:  Array.from({ length: 7 }).map((_, i) => {
      const iso = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10);
      return Number((gh.contributions?.heatmap || []).find((d) => d.date === iso)?.count || 0);
    }),
  }), [gh, lc, wt]);

  /* Compute simple % deltas for the tiles */
  const deltas = useMemo(() => ({
    problems: trendPct(sparks.lc),
    commits:  trendPct(sparks.github),
    coding:   trendPct(sparks.waka),
    streak:   tileMetrics.streak > 0 ? Math.round(((tileMetrics.streak / Math.max(1, tileMetrics.streakLongest)) - 0.5) * 200) : null,
  }), [sparks, tileMetrics]);

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

  return (
    <div className="space-y-5 stagger-fade">
      {/* ── 1. Hero (Today's Score + Tasks) ── */}
      <TodayFocus
        user={user}
        stats={stats}
        period={seriesPeriod}
        onPeriodChange={setSeriesPeriod}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {/* ── 2. Stats Row — 4 compact tiles ── */}
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
          deltaLabel={deltas.problems != null ? "vs last 90 days" : undefined}
        />
        <StatTile
          label="Commits (Year)"
          value={tileMetrics.totalCommits}
          icon={<PlatformLogo platform="github" size={12} />}
          accent="#e6edf3"
          to="/dashboard/github"
          spark={sparks.github}
          platform="github"
          delta={deltas.commits}
          deltaLabel={deltas.commits != null ? "vs last year" : undefined}
        />
        <StatTile
          label="Coding Time (30D)"
          value={`${codH}h ${codM}m`}
          icon={<PlatformLogo platform="wakatime" size={12} />}
          accent="#22d3ee"
          to="/dashboard/wakatime"
          spark={sparks.waka}
          platform="wakatime"
          delta={deltas.coding}
          deltaLabel={deltas.coding != null ? "vs last 30 days" : undefined}
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

      {/* ── 3. Combined Activity Heatmap — full-width primary anchor ── */}
      <CombinedHeatmap data={heatmap} />

      {/* ── 4. Charts Row — Problems Chart · Activity Timeline ── */}
      <div className="grid lg:grid-cols-2 gap-3 items-stretch">
        <ProblemsSolvedChart
          series={series?.problems || []}
          stats={stats}
          period={seriesPeriod}
        />
        <SessionTimeline stats={stats} />
      </div>

      {/* ── 5. Platform Overview (horizontal row) ── */}
      <PlatformOverviewRow stats={stats} platforms={data.platforms || []} />

      {/* ── 6. Insights + Recent Achievements (split) ── */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3 items-stretch">
        <InsightsPanel stats={stats} heatmap={heatmap} />
        <RecentAchievements badges={data.badges || []} stats={stats} />
      </div>

      {/* ── 7. Lower section — Active Projects · Focus Mode · Quote ── */}
      <div className="grid lg:grid-cols-3 gap-3 items-stretch">
        <ActiveProjects github={gh} />
        <FocusMode />
        <QuoteOfTheDay />
      </div>
    </div>
  );
}

/* ─── tile helpers ──────────────────────────────────────────── */

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

function weekSpark(heatmap = []) {
  if (!heatmap?.length) return [];
  const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date)).slice(-84);
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
