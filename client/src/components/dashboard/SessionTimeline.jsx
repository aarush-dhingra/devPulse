/**
 * SessionTimeline — last 14 days as stacked vertical bars, growing UPWARD
 * from a baseline. Each bar segment is colored by platform. Rich hover
 * tooltip shows per-platform breakdown for that day.
 */
import { useMemo, useRef, useState } from "react";

const PLATFORM_META = {
  wakatime:   { color: "#22d3ee", label: "Coding time", format: (v) => `${Number(v).toFixed(1)}h` },
  github:     { color: "#f0f6fc", label: "Commits",     format: (v) => `${Math.round(v)} commits` },
  leetcode:   { color: "#ffa116", label: "LeetCode",    format: (v) => `${Math.round(v)} solved` },
  codeforces: { color: "#fe646f", label: "Codeforces",  format: (v) => `${Math.round(v)} solved` },
  gfg:        { color: "#2f8d46", label: "GFG",         format: (v) => `${Math.round(v)} solved` },
};

/* Platform stack order — bottom to top */
const STACK_ORDER = ["wakatime", "github", "leetcode", "codeforces", "gfg"];

/* Map dashboard period → number of days the timeline should show.
   Daily bars stay readable up to ~30 columns. */
const PERIOD_DAYS = { "7d": 7, "30d": 14, "90d": 30, "1y": 30 };

const DAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MAX_BAR_H = 110; /* px */

function buildDays(stats, heatmapData, n = 14) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const gh  = stats?.github     || {};
  const lc  = stats?.leetcode   || {};
  const wt  = stats?.wakatime   || {};
  const cf  = stats?.codeforces || {};

  const days = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push({ iso: d.toISOString().slice(0, 10), date: d, segments: {} });
  }

  const fill = (entries, key, valueKey = "count") => {
    for (const e of entries || []) {
      const day = days.find((d) => d.iso === e.date);
      if (day) day.segments[key] = (day.segments[key] || 0) + Number(e[valueKey] || 0);
    }
  };

  fill(gh.contributions?.heatmap,  "github");
  fill(lc.dailySubmissions,        "leetcode");
  fill(cf.dailySubmissions,        "codeforces");
  fill(wt.dailyHours,              "wakatime", "hours");

  if (heatmapData?.heatmap) {
    for (const cell of heatmapData.heatmap) {
      const day = days.find((d) => d.iso === cell.date);
      if (day && cell.breakdown?.gfg > 0) {
        day.segments.gfg = (day.segments.gfg || 0) + Number(cell.breakdown.gfg);
      }
    }
  }

  return days;
}

function totalFor(day) {
  return Object.values(day.segments).reduce((s, v) => s + v, 0);
}

/* ─── Floating tooltip ───────────────────────────────────────── */
function DayTooltip({ day, anchorX, containerW }) {
  const segs = STACK_ORDER
    .map((k) => ({ platform: k, value: day.segments[k] || 0 }))
    .filter((s) => s.value > 0);
  if (!segs.length) return null;

  const tipW = 170;
  const left = Math.max(4, Math.min(containerW - tipW - 4, anchorX - tipW / 2));

  return (
    <div
      className="absolute z-50 rounded-xl border border-white/10 shadow-2xl text-[11px] pointer-events-none"
      style={{
        left,
        bottom: "calc(100% + 10px)",
        width: tipW,
        background: "#111",
        padding: "9px 12px",
      }}
    >
      <div className="font-semibold text-ink mb-2">
        {new Date(day.iso + "T00:00:00Z").toLocaleDateString(undefined, {
          weekday: "short", month: "short", day: "numeric",
        })}
      </div>
      <div className="space-y-1.5">
        {segs.map(({ platform, value }) => {
          const meta = PLATFORM_META[platform];
          return (
            <div key={platform} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: meta.color }} />
              <span className="flex-1 text-ink-faint">{meta.label}</span>
              <span className="font-medium text-ink tabular-nums">{meta.format(value)}</span>
            </div>
          );
        })}
      </div>
      {/* Arrow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          bottom: -5,
          borderLeft: "5px solid transparent",
          borderRight: "5px solid transparent",
          borderTop: "5px solid rgba(255,255,255,0.1)",
        }}
      />
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────── */

export default function SessionTimeline({ stats, heatmapData, period = "30d" }) {
  const n        = PERIOD_DAYS[period] ?? 14;
  const days     = useMemo(() => buildDays(stats, heatmapData, n), [stats, heatmapData, n]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const maxTotal = Math.max(1, ...days.map(totalFor));

  const containerRef = useRef(null);
  const [hoveredIso, setHoveredIso] = useState(null);
  const [anchorX, setAnchorX]       = useState(0);

  const hasAnyActivity = stats && days.some((d) => totalFor(d) > 0);
  if (!hasAnyActivity) {
    return (
      <div className="panel-pad flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">Activity Timeline</h3>
          <span className="text-[10px] text-ink-faint uppercase tracking-wider">last {n} days</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="text-3xl opacity-40">📊</div>
          <p className="text-sm font-medium text-ink-muted">No recent activity</p>
          <p className="text-[11px] text-ink-faint max-w-[220px]">
            Connect GitHub, WakaTime, or LeetCode and your daily timeline will appear here
          </p>
          <a href="/settings" className="text-[11px] text-accent-300 hover:underline">
            → Connect platforms
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-pad">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-base">Activity Timeline</h3>
          <span className="text-[10px] text-ink-faint uppercase tracking-wider">last {n} days</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {STACK_ORDER.map((k) => {
            const present = days.some((d) => (d.segments[k] || 0) > 0);
            return (
              <span
                key={k}
                className="flex items-center gap-1 text-[10px]"
                style={{ color: present ? "#cbd5e1" : "rgba(148,163,184,0.4)" }}
                title={present ? "" : "No data in range"}
              >
                <span
                  className="w-2 h-2 rounded-sm inline-block"
                  style={{ background: PLATFORM_META[k].color, opacity: present ? 1 : 0.35 }}
                />
                {PLATFORM_META[k].label.split(" ")[0]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Bars area */}
      <div
        ref={containerRef}
        className="relative"
        style={{ paddingBottom: 22 /* room for day labels */ }}
      >
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 pointer-events-none" style={{ bottom: 22 }}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <div
              key={f}
              className="absolute left-0 right-0 border-t border-dashed border-white/[0.05]"
              style={{ bottom: `${f * MAX_BAR_H}px` }}
            />
          ))}
          {/* Solid baseline at bottom */}
          <div
            className="absolute left-0 right-0 border-t border-white/[0.15]"
            style={{ bottom: 0 }}
          />
        </div>

        {/* Day columns */}
        <div className="flex items-end gap-1.5" style={{ height: MAX_BAR_H + 20 }}>
          {days.map((day) => {
            const isToday   = day.iso === todayIso;
            const isHovered = day.iso === hoveredIso;
            const total     = totalFor(day);
            const intensity = total / maxTotal;
            const barH      = Math.max(3, Math.round(intensity * MAX_BAR_H));
            const dow       = day.date.getUTCDay();

            /* Build stacked segments in STACK_ORDER for bottom-to-top rendering */
            const segs = STACK_ORDER
              .map((k) => ({ key: k, value: day.segments[k] || 0 }))
              .filter((s) => s.value > 0);
            const totalSegs = segs.reduce((s, seg) => s + seg.value, 0);

            return (
              <div
                key={day.iso}
                className="relative flex-1 flex flex-col items-center"
                onMouseEnter={(e) => {
                  setHoveredIso(day.iso);
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) setAnchorX(e.clientX - rect.left);
                }}
                onMouseLeave={() => setHoveredIso(null)}
              >
                {/* Tooltip */}
                {isHovered && total > 0 && containerRef.current && (
                  <DayTooltip
                    day={day}
                    anchorX={anchorX}
                    containerW={containerRef.current.offsetWidth}
                  />
                )}

                {/* Stacked bar column — grows upward using flex-col + justify-end */}
                <div
                  className="w-full flex flex-col justify-end rounded-t-sm overflow-hidden cursor-default transition-all duration-150"
                  style={{
                    height: MAX_BAR_H,
                    filter: isHovered ? "brightness(1.25)" : "none",
                    outline: isToday ? "1px solid rgba(139,92,246,0.5)" : "none",
                    outlineOffset: 1,
                  }}
                >
                  {total === 0 ? (
                    /* Empty day — thin baseline mark */
                    <div
                      className="w-full self-end"
                      style={{ height: 2, background: "rgba(255,255,255,0.04)" }}
                    />
                  ) : (
                    /* Segments stack bottom-to-top — first in array = bottom */
                    segs.map(({ key, value }) => {
                      const h     = Math.max(3, Math.round((value / totalSegs) * barH));
                      const color = PLATFORM_META[key].color;
                      return (
                        <div
                          key={key}
                          style={{
                            height: h,
                            background: color,
                            opacity: 0.85 + intensity * 0.15,
                            boxShadow: isHovered
                              ? `0 0 10px ${color}aa`
                              : `0 0 0 1px rgba(0,0,0,0.15) inset`,
                            transition: "box-shadow 0.15s",
                          }}
                        />
                      );
                    })
                  )}
                </div>

                {/* Day label — sits below bar */}
                <span
                  className={`absolute bottom-0 text-[9px] font-medium transition-colors ${
                    isToday ? "text-accent-300" : isHovered ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {isToday ? "Today" : DAY_SHORT[dow]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
