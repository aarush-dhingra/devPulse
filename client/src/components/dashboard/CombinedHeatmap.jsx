import { useMemo, useRef, useState } from "react";
import EmptyState from "../ui/EmptyState";
import PlatformLogo from "../ui/PlatformLogo";

const CELL = 11;
const GAP = 3;
const STEP = (CELL + GAP);
const RADIUS = 2;
const VISIBLE_WEEKS = 26; // how many columns are shown at once
const SCROLL_BY = 4;      // weeks per arrow click

const RAMP = [
  "rgba(255,255,255,0.04)",
  "rgba(139, 92, 246, 0.28)",
  "rgba(139, 92, 246, 0.52)",
  "rgba(139, 92, 246, 0.80)",
  "rgba(34, 211, 238, 0.95)",
];

const PLATFORM_META = {
  github:     { id: "github",     label: "GitHub",     color: "#f0f6fc", unit: "contributions" },
  leetcode:   { id: "leetcode",   label: "LeetCode",   color: "#ffa116", unit: "submissions"   },
  codeforces: { id: "codeforces", label: "Codeforces", color: "#fe646f", unit: "submissions"   },
  wakatime:   { id: "wakatime",   label: "Wakatime",   color: "#22d3ee", unit: "hours"         },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function bucketFor(count, p95) {
  if (!count || count <= 0) return 0;
  const t = Math.min(1, count / Math.max(1, p95));
  if (t < 0.25) return 1;
  if (t < 0.55) return 2;
  if (t < 0.85) return 3;
  return 4;
}

function fmtPlatformValue(key, val) {
  if (key === "wakatime") return `${Number(val).toFixed(1)} h`;
  const m = PLATFORM_META[key];
  const u = m?.unit || "units";
  return `${Math.round(Number(val))} ${Number(val) === 1 ? u.replace(/s$/, "") : u}`;
}

export default function CombinedHeatmap({ data }) {
  const containerRef = useRef(null);
  const [hover, setHover] = useState(null);

  const view = useMemo(() => {
    if (!data?.heatmap?.length) return { weeks: [], p95: 1, monthLabels: [] };

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

  // Start showing the most recent VISIBLE_WEEKS by default
  const maxOffset = Math.max(0, view.weeks.length - VISIBLE_WEEKS);
  const [offset, setOffset] = useState(0);
  // Keep offset pinned to the latest end unless the user has scrolled left
  const clampedOffset = Math.min(offset === 0 ? maxOffset : offset, maxOffset);
  const visibleWeeks = view.weeks.slice(clampedOffset, clampedOffset + VISIBLE_WEEKS);

  // Build month labels only for visible window
  const monthLabels = useMemo(() => {
    const labels = [];
    let lastMonth = -1;
    visibleWeeks.forEach((w, wi) => {
      const firstReal = w?.find(Boolean);
      if (!firstReal) return;
      const m = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        labels.push({ x: wi * STEP, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [visibleWeeks]);

  if (!data?.heatmap?.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-base mb-2">Combined Activity</h3>
        <EmptyState
          icon="📅"
          title="No activity yet"
          description="Connect platforms in Settings — your daily activity will appear here."
        />
      </div>
    );
  }

  const canLeft  = clampedOffset > 0;
  const canRight = clampedOffset < maxOffset;

  const svgW = STEP * VISIBLE_WEEKS + 28;
  const svgH = STEP * 7 + 16;

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
    <div className="panel-pad relative" ref={containerRef}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-base">Combined Activity</h3>
          <span className="pill-accent !py-0.5 !text-[10px]">
            {Math.round(data.total).toLocaleString()} units · last year
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-faint">
            Less
            {RAMP.map((c, i) => (
              <span key={i} className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            ))}
            More
          </div>
          {/* Arrow nav */}
          <div className="flex items-center gap-1 ml-1">
            <button
              onClick={() => setOffset((o) => Math.max(0, Math.min(o === 0 ? maxOffset : o, maxOffset) - SCROLL_BY))}
              disabled={!canLeft}
              className="w-6 h-6 grid place-items-center rounded-md border border-white/10
                         text-ink-muted hover:text-ink hover:border-white/25
                         disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Earlier"
            >
              <ChevronLeft />
            </button>
            <button
              onClick={() => setOffset((o) => Math.min(maxOffset, Math.min(o === 0 ? maxOffset : o, maxOffset) + SCROLL_BY))}
              disabled={!canRight}
              className="w-6 h-6 grid place-items-center rounded-md border border-white/10
                         text-ink-muted hover:text-ink hover:border-white/25
                         disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Later"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* Heatmap SVG — fixed width, no scroll */}
      <div className="overflow-hidden" onMouseLeave={handleLeave}>
        <svg
          width={svgW}
          height={svgH}
          style={{ maxWidth: "100%", display: "block" }}
          onMouseMove={handleMove}
        >
          <g transform="translate(28,14)">
            {/* Month labels */}
            {monthLabels.map((m, i) => (
              <text
                key={i} x={m.x} y={-4}
                fill="rgba(148,163,184,0.65)" fontSize="9"
                fontFamily="Space Grotesk, ui-sans-serif"
              >{m.label}</text>
            ))}
            {/* Day labels */}
            {["Mon", "Wed", "Fri"].map((d, idx) => (
              <text
                key={d} x={-26} y={idx * 2 * STEP + CELL - 1}
                fill="rgba(148,163,184,0.55)" fontSize="9"
                fontFamily="Space Grotesk, ui-sans-serif"
              >{d}</text>
            ))}
            {/* Cells */}
            {visibleWeeks.map((w, wi) =>
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
      <div className="mt-3 grid grid-cols-3 gap-2">
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
        />
        <Stat label="Longest streak" value={`${data.streakLongest}d`} />
        <Stat
          label="Active days"
          value={`${data.totalActiveDays}`}
          sub={`${Math.round((data.totalActiveDays / 365) * 100)}% of year`}
        />
      </div>

      {/* Per-platform footer */}
      {data.perPlatform && Object.values(data.perPlatform).some((v) => v > 0) && (
        <div className="mt-2 text-[11px] flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(data.perPlatform)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <PlatformLogo platform={k} size={11} color={PLATFORM_META[k]?.color} />
                <span className="text-ink-muted">{PLATFORM_META[k]?.label || k}:</span>
                <span className="text-ink tabular-nums">
                  {k === "wakatime" ? `${Number(v).toFixed(1)}h` : Math.round(Number(v))}
                </span>
              </span>
            ))}
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

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 px-2.5 py-2">
      <div className="text-[9px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="text-base font-bold font-display">{value}</div>
      {sub && <div className="text-[10px] text-ink-muted">{sub}</div>}
    </div>
  );
}

function ChevronLeft() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
