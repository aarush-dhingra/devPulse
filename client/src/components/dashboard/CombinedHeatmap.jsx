/**
 * CombinedHeatmap — full-width yearly activity heatmap. Aggregates GitHub
 * contributions, accepted-submission calendars, verified snapshot deltas,
 * and WakaTime hours into a single intensity grid. Renders as a responsive SVG that scales to its
 * container width. Includes month + weekday labels, a Best Day / Longest
 * Streak / Active Days stats strip, a per-platform legend with totals,
 * and a floating tooltip with full breakdown on hover.
 */
import { useMemo, useRef, useState } from "react";
import EmptyState from "../ui/EmptyState";
import PlatformLogo from "../ui/PlatformLogo";

const CELL   = 13;
const GAP    = 3;
const STEP   = CELL + GAP;
const RADIUS = 2.5;

const RAMP = [
  "rgba(255,255,255,0.04)",
  "rgba(124, 58, 237, 0.30)",
  "rgba(139, 92, 246, 0.55)",
  "rgba(167, 139, 250, 0.85)",
  "rgba(34, 211, 238, 1)",
];

const PLATFORM_META = {
  github:     { id: "github",     label: "GitHub",        color: "#f0f6fc", unit: "contributions" },
  leetcode:   { id: "leetcode",   label: "LeetCode",      color: "#ffa116", unit: "accepted submissions" },
  codeforces: { id: "codeforces", label: "Codeforces",    color: "#fe646f", unit: "accepted submissions" },
  gfg:        { id: "gfg",        label: "GeeksForGeeks", color: "#2f8d46", unit: "verified activity"    },
  codechef:   { id: "codechef",   label: "CodeChef",      color: "#5b4638", unit: "verified activity"    },
  atcoder:    { id: "atcoder",    label: "AtCoder",       color: "#b0c4de", unit: "accepted submissions" },
  wakatime:   { id: "wakatime",   label: "Wakatime",      color: "#22d3ee", unit: "hours"         },
};

const PERIOD_LABEL = {
  "7d":  "this week",
  "30d": "this month",
  "90d": "last 90 days",
  "1y":  "last year",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function bucketFor(count, p95) {
  if (!count || count <= 0) return 0;
  const t = Math.min(1, count / Math.max(1, p95));
  if (t < 0.20) return 1;
  if (t < 0.50) return 2;
  if (t < 0.80) return 3;
  return 4;
}

function fmtPlatformValue(key, val) {
  if (key === "wakatime") return `${Number(val).toFixed(1)} h`;
  const m = PLATFORM_META[key];
  const u = m?.unit || "units";
  return `${Math.round(Number(val))} ${Number(val) === 1 ? u.replace(/s$/, "") : u}`;
}

export default function CombinedHeatmap({ data, period = "1y" }) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);

  const view = useMemo(() => {
    if (!data?.heatmap?.length) return { weeks: [], p95: 1 };

    const cells = data.heatmap;
    const out = [];
    let week = [];
    const firstDay = new Date(cells[0].date + "T00:00:00Z").getUTCDay();
    for (let i = 0; i < firstDay; i += 1) week.push(null);
    for (const d of cells) {
      week.push(d);
      if (week.length === 7) { out.push(week); week = []; }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      out.push(week);
    }

    const positives = cells.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
    const p95 = positives.length
      ? positives[Math.floor(positives.length * 0.95)] || positives[positives.length - 1]
      : 1;

    return { weeks: out, p95 };
  }, [data]);

  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    view.weeks.forEach((w, wi) => {
      const firstReal = w?.find(Boolean);
      if (!firstReal) return;
      const m = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        labels.push({ x: wi * STEP, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [view.weeks]);

  if (!data?.heatmap?.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-base mb-2">Combined Activity</h3>
        <EmptyState
          icon="📅"
          title="No activity yet"
          description="Connect GitHub, WakaTime, or a problem platform to see your coding heatmap."
          action={
            <a href="/settings" className="text-[11px] text-accent-300 hover:underline">
              → Connect platforms to unlock heatmap
            </a>
          }
        />
      </div>
    );
  }

  const totalWeeks = view.weeks.length;
  const svgW = STEP * totalWeeks + 30;
  const svgH = STEP * 7 + 18;

  const handleEnter = (cell) => (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({ cell, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMove = (e) => {
    setHover((h) => {
      if (!h) return h;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return h;
      return { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top };
    });
  };
  const handleLeave = () => setHover(null);

  return (
    <div
      className="panel-pad relative"
      ref={containerRef}
      style={{ overflow: "visible" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Combined Activity</h3>
          <span className="pill-accent !py-0.5 !text-[10px]">
            {Math.round(data.total).toLocaleString()} units · {PERIOD_LABEL[period] || "selected range"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-faint">
          Less
          {RAMP.map((c, i) => (
            <span key={i} className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
          More
        </div>
      </div>

      {/* Heatmap SVG — scales to full container width */}
      <div className="overflow-x-hidden overflow-y-visible" onMouseLeave={handleLeave}>
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          width="100%"
          height={svgH}
          preserveAspectRatio="xMinYMid meet"
          style={{ display: "block" }}
          onMouseMove={handleMove}
        >
          <g transform="translate(28,16)">
            {/* Month labels */}
            {monthLabels.map((m, i) => (
              <text
                key={i} x={m.x} y={-5}
                fill="rgba(148,163,184,0.7)" fontSize="10"
                fontFamily="Space Grotesk, ui-sans-serif"
                fontWeight="500"
              >{m.label}</text>
            ))}
            {/* Day labels */}
            {["Mon", "Wed", "Fri"].map((d, idx) => (
              <text
                key={d} x={-26} y={idx * 2 * STEP + CELL - 2}
                fill="rgba(148,163,184,0.55)" fontSize="9"
                fontFamily="Space Grotesk, ui-sans-serif"
              >{d}</text>
            ))}
            {/* Cells */}
            {view.weeks.map((w, wi) =>
              (w || []).map((d, di) => {
                if (!d) return null;
                const fill = RAMP[bucketFor(d.count, view.p95)];
                const isHovered = hover?.cell?.date === d.date;
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={wi * STEP}
                    y={di * STEP}
                    width={CELL}
                    height={CELL}
                    rx={RADIUS}
                    fill={fill}
                    stroke={isHovered ? "#22d3ee" : "transparent"}
                    strokeWidth={isHovered ? 1.5 : 0}
                    onMouseEnter={handleEnter(d)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })
            )}
          </g>
        </svg>
      </div>

      {/* Floating tooltip */}
      {hover?.cell && <FloatingTip hover={hover} containerRef={containerRef} />}

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat
          label="Best day"
          value={data.bestDay ? Math.round(data.bestDay.count).toString() : "—"}
          sub={
            data.bestDay
              ? new Date(data.bestDay.date + "T00:00:00Z").toLocaleDateString(undefined, {
                  month: "short", day: "numeric",
                })
              : ""
          }
          accent="#fbbf24"
        />
        <Stat
          label="Longest streak"
          value={`${data.streakLongest}d`}
          accent="#fb923c"
        />
        <Stat
          label="Active days"
          value={`${data.totalActiveDays}`}
          sub={`${Math.round((data.totalActiveDays / Math.max(1, data.heatmap.length)) * 100)}% of range`}
          accent="#22d3ee"
        />
      </div>

      {/* Per-platform legend */}
      {data.perPlatform && Object.values(data.perPlatform).some((v) => v > 0) && (
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex flex-wrap gap-x-4 gap-y-1.5">
          {Object.entries(data.perPlatform)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => {
              const meta = PLATFORM_META[k] || { label: k, color: "#A78BFA" };
              return (
                <span key={k} className="flex items-center gap-1.5 text-[11px]">
                  <PlatformLogo platform={k} size={12} color={meta.color} />
                  <span className="text-ink-muted">{meta.label}:</span>
                  <span className="text-ink tabular-nums font-medium">
                    {fmtPlatformValue(k, v)}
                  </span>
                </span>
              );
            })}
        </div>
      )}
    </div>
  );
}

function FloatingTip({ hover, containerRef }) {
  const { cell, x, y } = hover;
  const breakdown = cell.breakdown || {};
  const active = Object.entries(breakdown).filter(([, v]) => Number(v) > 0);
  const date = new Date(cell.date + "T00:00:00Z").toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });

  const tipW = 230;
  const tipH = Math.max(56, 32 + active.length * 22);
  const containerW = containerRef.current?.clientWidth ?? 9999;
  const containerH = containerRef.current?.clientHeight ?? 9999;
  const PAD = 10;

  let left = x + 14;
  if (left + tipW + PAD > containerW) left = x - tipW - 14;
  left = Math.max(PAD, Math.min(left, containerW - tipW - PAD));

  let top = y + 16;
  if (top + tipH + PAD > containerH) top = y - tipH - 10;
  top = Math.max(PAD, top);

  return (
    <div className="pointer-events-none absolute z-30" style={{ left, top, width: tipW }}>
      <div
        className="rounded-lg border border-white/10 bg-bg-card/98 backdrop-blur-md px-3 py-2 shadow-deep"
        style={{ boxShadow: "0 8px 28px -10px rgba(124,58,237,0.45)" }}
      >
        <div className="text-[10px] uppercase tracking-wider text-ink-faint mb-1.5">{date}</div>
        {active.length === 0 ? (
          <div className="text-xs text-ink-muted">No activity</div>
        ) : (
          <ul className="space-y-1">
            {active.map(([k, v]) => {
              const meta = PLATFORM_META[k] || { id: k, label: k, color: "#A78BFA" };
              return (
                <li key={k} className="flex items-center gap-2 text-[12px]">
                  <PlatformLogo platform={meta.id || k} size={13} color={meta.color} />
                  <span className="text-ink-muted flex-1">{meta.label}</span>
                  <span className="font-semibold tabular-nums text-ink">{fmtPlatformValue(k, v)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent = "#A78BFA" }) {
  return (
    <div
      className="rounded-xl bg-white/[0.025] border border-white/[0.05] px-4 py-2.5 transition-all hover:bg-white/[0.04]"
      style={{ borderLeftWidth: 2, borderLeftColor: `${accent}80` }}
    >
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="text-xl font-bold font-display tabular-nums leading-tight" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-ink-muted mt-0.5">{sub}</div>}
    </div>
  );
}
