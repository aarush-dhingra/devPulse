import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStats } from "../hooks/useStats";

import DevScoreCard from "../components/dashboard/DevScoreCard";
import StatTile from "../components/dashboard/StatTile";
import CombinedHeatmap from "../components/dashboard/CombinedHeatmap";
import LanguageRadar from "../components/dashboard/LanguageRadar";
import CodingTimeBars from "../components/dashboard/CodingTimeBars";
import SolveBreakdown from "../components/dashboard/SolveBreakdown";
import PlatformOverview from "../components/dashboard/PlatformOverview";
import ProblemsSolvedChart from "../components/dashboard/ProblemsSolvedChart";
import RecentAchievements from "../components/dashboard/RecentAchievements";
import ActiveProjects from "../components/dashboard/ActiveProjects";
import Goals from "../components/dashboard/Goals";
import FocusMode from "../components/dashboard/FocusMode";
import QuoteOfTheDay from "../components/dashboard/QuoteOfTheDay";

import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import { ROUTES } from "../utils/constants";
import PlatformDetail from "./PlatformDetail";

import { dashboardApi } from "../api/dashboard.api";
import PlatformLogo from "../components/ui/PlatformLogo";

export default function Dashboard() {
  const { platform } = useParams();
  const { data, loading, error, refresh } = useStats();
  const [heatmap, setHeatmap] = useState(null);
  const [series, setSeries] = useState(null);
  const [seriesPeriod, setSeriesPeriod] = useState("90d");

  useEffect(() => {
    if (!data) return;
    dashboardApi.heatmap().then(setHeatmap).catch(() => setHeatmap(null));
  }, [data]);

  useEffect(() => {
    if (!data) return;
    dashboardApi.series(seriesPeriod).then(setSeries).catch(() => setSeries(null));
  }, [data, seriesPeriod]);

  if (loading && !data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Spinner size={32} label="Loading your stats…" />
      </div>
    );
  }

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
            <Link to={ROUTES.settings}>
              <Button variant="outline">Connect platforms</Button>
            </Link>
          </div>
        }
      />
    );
  }

  if (platform) {
    return <PlatformDetail platform={platform} data={data} />;
  }

  const stats = data.stats || {};
  const gh = stats.github || {};
  const lc = stats.leetcode || {};
  const wt = stats.wakatime || {};
  const cf = stats.codeforces || {};
  const gfg = stats.gfg || {};

  const totalCommits = gh.contributions?.total ?? gh.commits?.totalSearched ?? 0;
  const totalProblems =
    Number(lc.solved?.total ?? 0) +
    Number(cf.uniqueSolved ?? 0) +
    Number(gfg.problemsSolved ?? 0);
  const codingHours30 = Math.round(wt.hoursLast30Days ?? 0);
  const codingDays7 = computeCodingDays(heatmap?.heatmap, 7);
  const mergedPRs = gh.contributions?.mergedPRs ?? 0;
  const repos = gh.repos?.totalRepos ?? 0;

  const githubSpark = weekSpark(gh.contributions?.heatmap);
  const lcSpark = sliceLast(lc.dailySubmissions, 30);
  const wakaSpark = sliceLast(wt.dailyHours, 14, "hours");
  const heatmapSpark = sliceLast(heatmap?.heatmap, 14);

  return (
    <div className="space-y-5 stagger-fade">
      {/* Row 1 — six top-row tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile
          label="Coding · 30d"
          value={codingHours30}
          suffix="h"
          icon={<PlatformLogo platform="wakatime" size={12} />}
          accent="#22d3ee"
          to="/dashboard/wakatime"
          spark={wakaSpark}
        />
        <StatTile
          label="Problems Solved"
          value={totalProblems}
          icon={<PlatformLogo platform="leetcode" size={12} />}
          accent="#ffa116"
          to="/dashboard/leetcode"
          spark={lcSpark}
        />
        <StatTile
          label="Coding Days"
          value={codingDays7}
          icon="📅"
          accent="#A78BFA"
          progress={{ value: codingDays7, max: 7 }}
          spark={heatmapSpark}
          hint="last 7 days"
        />
        <StatTile
          label="Commits"
          value={totalCommits}
          icon={<PlatformLogo platform="github" size={12} />}
          accent="#e6edf3"
          to="/dashboard/github"
          spark={githubSpark}
        />
        <StatTile
          label="PRs Merged"
          value={mergedPRs}
          icon="🔀"
          accent="#10b981"
          to="/dashboard/github"
        />
        <StatTile
          label="Repos"
          value={repos}
          icon="📦"
          accent="#f472b6"
          to="/dashboard/github"
        />
      </div>

      {/* Row 2 — DevScore + Combined Heatmap */}
      <div className="grid lg:grid-cols-[420px_1fr] gap-4">
        <DevScoreCard devscore={data.devscore} />
        <CombinedHeatmap data={heatmap} />
      </div>

      {/* Row 3 — Platform Overview + Problems chart + Language donut */}
      <div className="grid lg:grid-cols-[1.1fr_1.4fr_1fr] gap-4">
        <PlatformOverview stats={stats} platforms={data.platforms || []} />
        <ProblemsSolvedChart
          series={series?.problems || []}
          period={seriesPeriod}
          onPeriodChange={setSeriesPeriod}
        />
        <LanguageRadar
          subtitle="GitHub + Wakatime"
          sources={[
            gh.repos?.languages || null,
            (wt.languages || []).length
              ? Object.fromEntries(
                  (wt.languages || []).map((l) => [l.name, l.percent || l.hours || 0])
                )
              : null,
          ]}
        />
      </div>

      {/* Row 4 — Coding Time bars + Recent Achievements */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <CodingTimeBars
          daily={series?.codingTime?.daily || []}
          weekly={series?.codingTime?.weekly || []}
        />
          <RecentAchievements badges={data.badges || []} stats={stats} />
      </div>

      {/* Row 5 — Active Projects + Goals + Focus/QOTD */}
      <div className="grid lg:grid-cols-3 gap-4">
        <ActiveProjects github={gh} />
        <Goals />
        <div className="space-y-4">
          <FocusMode />
          <QuoteOfTheDay />
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SolveBreakdown leetcode={lc} />
        <div className="panel-pad">
          <h3 className="font-display font-bold text-lg mb-2">Connected Platforms</h3>
          <PlatformBadgesInline platforms={data.platforms || []} />
        </div>
      </div>
    </div>
  );
}

function computeCodingDays(heatmap, days = 7) {
  if (!heatmap?.length) return 0;
  return heatmap.slice(-days).filter((c) => Number(c.count || 0) > 0).length;
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

function PlatformBadgesInline({ platforms }) {
  if (!platforms?.length) {
    return (
      <p className="text-sm text-ink-muted">
        No platforms connected.{" "}
        <Link to={ROUTES.settings} className="text-accent-300 hover:underline">
          Connect one →
        </Link>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((p) => {
        const tone =
          p.status === "connected"
            ? "pill-good"
            : p.status === "error"
              ? "pill-bad"
              : "pill-warn";
        return (
          <Link
            key={p.platform_name}
            to={`/dashboard/${p.platform_name}`}
            className={`${tone}`}
          >
            {p.platform_name}
            <span className="opacity-60 normal-case font-normal">
              · @{p.platform_username}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
