/**
 * PlatformOverviewRow — horizontal row of platform cards.
 *
 * Each card: brand logo + name, key stat, mini sparkline, % delta.
 * 4 cards side-by-side (LeetCode, GitHub, Codeforces, WakaTime).
 */
import { Link } from "react-router-dom";
import Sparkline from "./Sparkline";
import PlatformLogo from "../ui/PlatformLogo";
import { PLATFORM_BY_ID } from "../../utils/constants";
import { formatNumber } from "../../utils/formatters";

/* ─── per-platform builders ─────────────────────────────────── */

function buildCard(platform, data) {
  const meta = PLATFORM_BY_ID[platform];
  if (!meta) return null;

  const base = {
    id: platform,
    name: meta.name,
    color: meta.color,
    href: `/dashboard/${platform}`,
    connected: !!data,
  };

  if (!data) {
    return { ...base, primaryLabel: "", primaryValue: "—", secondary: null, spark: [], delta: null };
  }

  switch (platform) {
    case "leetcode": {
      const spark = solveSpark(data.solved, data.dailySubmissions);
      return {
        ...base,
        primaryLabel: "Solved",
        primaryValue: formatNumber(data.solved?.total ?? 0),
        secondary: data.rating ? `Rating ${formatNumber(data.rating)}` : null,
        spark,
        delta: deltaPct(spark),
      };
    }
    case "github": {
      const spark = weekSeries(data.contributions?.heatmap);
      return {
        ...base,
        primaryLabel: "Commits",
        primaryValue: formatNumber(data.commits?.totalSearched ?? data.contributions?.total ?? 0),
        secondary: `PRs ${formatNumber(data.contributions?.mergedPRs ?? 0)}`,
        spark,
        delta: deltaPct(spark),
      };
    }
    case "codeforces": {
      const spark = (data.ratingHistory || []).slice(-12).map((r) => r.newRating);
      return {
        ...base,
        primaryLabel: "Solved",
        primaryValue: formatNumber(data.uniqueSolved ?? 0),
        secondary: data.rating ? `Rating ${formatNumber(data.rating)}` : null,
        spark,
        delta: deltaPct(spark),
      };
    }
    case "wakatime": {
      const spark = (data.dailyHours || []).slice(-14).map((d) => d.hours || 0);
      const totalHours = Math.round(data.hoursLast30Days ?? 0);
      const h = Math.floor(totalHours);
      const m = Math.round(((data.hoursLast30Days ?? 0) - h) * 60);
      return {
        ...base,
        primaryLabel: "Time",
        primaryValue: `${h}h ${m}m`,
        secondary: "This 30 days",
        spark,
        delta: deltaPct(spark),
      };
    }
    default:
      return null;
  }
}

/* ─── helpers ───────────────────────────────────────────────── */

function deltaPct(spark) {
  if (!spark || spark.length < 2) return null;
  const half = Math.max(1, Math.floor(spark.length / 2));
  const recent = spark.slice(-half);
  const older  = spark.slice(0, half);
  const sumR = recent.reduce((s, v) => s + (v || 0), 0);
  const sumO = older .reduce((s, v) => s + (v || 0), 0);
  if (!sumO) return sumR > 0 ? 100 : null;
  return ((sumR - sumO) / sumO) * 100;
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

function solveSpark(solved = {}, daily = []) {
  if (Array.isArray(daily) && daily.length > 0) {
    return daily.slice(-30).map((d) => Number(d.count || 0));
  }
  return [solved.easy || 0, (solved.medium || 0) * 1.2, (solved.hard || 0) * 1.5, solved.total || 0];
}

/* ─── connected card ────────────────────────────────────────── */

function ConnectedCard({ card }) {
  return (
    <Link
      to={card.href}
      className="group flex items-center gap-3 panel rounded-xl p-3 transition-all duration-200 hover:scale-[1.02] hover:-translate-y-px"
      style={{
        boxShadow: `0 0 0 0 ${card.color}00`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${card.color}40, 0 0 24px ${card.color}25, 0 4px 16px rgba(0,0,0,0.4)`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ""; }}
    >
      {/* Brand logo */}
      <div
        className="w-10 h-10 rounded-xl grid place-items-center shrink-0 transition-all duration-200 group-hover:scale-110"
        style={{
          background: `${card.color}12`,
          boxShadow: `0 0 12px ${card.color}22, inset 0 0 0 1px ${card.color}30`,
        }}
      >
        <PlatformLogo platform={card.id} size={20} brand color={card.color} />
      </div>

      {/* Name + primary metric */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-ink truncate">{card.name}</span>
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ background: "#10b981", boxShadow: "0 0 4px #10b981" }}
            title="Connected"
          />
        </div>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-[10px] uppercase tracking-wider text-ink-faint">{card.primaryLabel}</span>
          <span className="text-[14px] font-bold tabular-nums text-ink">{card.primaryValue}</span>
        </div>
        {card.secondary && (
          <div className="text-[10px] text-ink-faint mt-0.5 truncate">{card.secondary}</div>
        )}
      </div>

      {/* Sparkline + delta */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        {card.spark?.length > 1 && (
          <Sparkline values={card.spark} color={card.color} width={64} height={22} />
        )}
        {card.delta != null && (
          <span
            className="text-[10px] font-bold tabular-nums"
            style={{ color: card.delta >= 0 ? "#10b981" : "#ef4444" }}
          >
            {card.delta >= 0 ? "▲" : "▼"} {Math.abs(card.delta).toFixed(0)}%
          </span>
        )}
      </div>
    </Link>
  );
}

/* ─── not-connected card ────────────────────────────────────── */

function NotConnectedCard({ card }) {
  return (
    <Link
      to="/settings"
      className="group flex items-center gap-3 rounded-xl p-3 transition-all duration-200 hover:scale-[1.02]
                 border border-dashed border-white/[0.08] bg-white/[0.015]
                 hover:border-white/15"
    >
      {/* Greyed logo */}
      <div
        className="w-10 h-10 rounded-xl grid place-items-center shrink-0 opacity-40 transition-opacity group-hover:opacity-70"
        style={{ background: "rgba(255,255,255,0.03)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}
      >
        <PlatformLogo platform={card.id} size={20} brand color="#94a3b8" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-semibold text-ink-muted truncate">{card.name}</div>
        <div className="text-[10px] text-ink-faint mt-0.5">Not connected</div>
      </div>

      {/* Connect CTA */}
      <span
        className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg
                   border transition-all duration-200"
        style={{
          color: card.color,
          borderColor: `${card.color}40`,
          background: `${card.color}10`,
        }}
      >
        Connect →
      </span>
    </Link>
  );
}

/* ─── main ──────────────────────────────────────────────────── */

const PRIORITY = ["leetcode", "github", "codeforces", "wakatime"];

export default function PlatformOverviewRow({ stats = {}, platforms = [] }) {
  const connected = new Set((platforms || []).map((p) => p.platform_name));
  const cards = PRIORITY
    .map((id) => buildCard(id, connected.has(id) ? stats[id] : null))
    .filter(Boolean);

  if (!cards.length) return null;

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Platform Overview</h3>
        <Link to="/settings" className="text-[11px] text-accent-300 hover:text-accent-200">
          Manage →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          c.connected
            ? <ConnectedCard key={c.id} card={c} />
            : <NotConnectedCard key={c.id} card={c} />
        ))}
      </div>
    </div>
  );
}
