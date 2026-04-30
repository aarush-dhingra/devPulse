import { useMemo, useRef, useState } from "react";
import EmptyState from "../ui/EmptyState";
import PlatformLogo from "../ui/PlatformLogo";

const CELL = 12;
const GAP = 3;
const RADIUS = 3;

const RAMP = [
  "rgba(255,255,255,0.04)",
  "rgba(139, 92, 246, 0.28)",
  "rgba(139, 92, 246, 0.5)",
  "rgba(139, 92, 246, 0.78)",
  "rgba(34, 211, 238, 0.95)",
];

function bucketFor(count, p95) {
  if (!count || count <= 0) return 0;
  const t = Math.min(1, count / Math.max(1, p95));
  if (t < 0.25) return 1;
  if (t < 0.55) return 2;
  if (t < 0.85) return 3;
  return 4;
}

const PLATFORM_META = {
  github: { id: "github", label: "GitHub", color: "#f0f6fc", unit: "contributions" },
  leetcode: { id: "leetcode", label: "LeetCode", color: "#ffa116", unit: "submissions" },
  codeforces: { id: "codeforces", label: "Codeforces", color: "#fe646f", unit: "submissions" },
  wakatime: { id: "wakatime", label: "Wakatime", color: "#22d3ee", unit: "hours" },
};

function fmtPlatformValue(key, val) {
  if (key === "wakatime") return `${Number(val).toFixed(1)} h`;
  return `${Math.round(Number(val))} ${val === 1 ? PLATFORM_META[key].unit.replace(/s$/, "") : PLATFORM_META[key].unit}`;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function CombinedHeatmap({ data }) {
  const [hover, setHover] = useState(null); // { cell, x, y } in container coords
  const containerRef = useRef(null);

  const view = useMemo(() => {
    if (!data?.heatmap?.length) {
      return { weeks: [], p95: 1, monthLabels: [] };
    }
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

    const monthLabels = [];
    let lastMonth = -1;
    out.forEach((w, wi) => {
      const firstReal = w.find(Boolean);
      if (!firstReal) return;
      const m = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        monthLabels.push({ x: wi * (CELL + GAP), label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return { weeks: out, p95, monthLabels };
  }, [data]);

  if (!data?.heatmap?.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Activity Heatmap</h3>
        <EmptyState
          icon="📅"
          title="No activity yet"
          description="Connect platforms in Settings — your daily activity will appear here."
        />
      </div>
    );
  }

  const handleEnter = (cell) => (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      cell,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Combined Activity</h3>
          <span className="pill-accent">
            {Math.round(data.total).toLocaleString()} units · last year
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-faint">
          Less
          {RAMP.map((c, i) => (
            <span key={i} className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
          ))}
          More
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-2" onMouseLeave={handleLeave}>
        <svg
          width={(CELL + GAP) * view.weeks.length + 28}
          height={(CELL + GAP) * 7 + 18}
          className="block select-none"
          onMouseMove={handleMove}
        >
          <g transform="translate(28,16)">
            {view.monthLabels.map((m, i) => (
              <text
                key={i} x={m.x} y={-6}
                fill="rgba(148,163,184,0.65)" fontSize="10"
                fontFamily="Space Grotesk, ui-sans-serif"
              >{m.label}</text>
            ))}
            {["Mon", "Wed", "Fri"].map((d, idx) => (
              <text
                key={d} x={-26} y={idx * 2 * (CELL + GAP) + 9}
                fill="rgba(148,163,184,0.55)" fontSize="10"
                fontFamily="Space Grotesk, ui-sans-serif"
              >{d}</text>
            ))}
            {view.weeks.map((w, wi) =>
              w.map((d, di) => {
                if (!d) return null;
                const fill = RAMP[bucketFor(d.count, view.p95)];
                const isHovered = hover?.cell?.date === d.date;
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={wi * (CELL + GAP)}
                    y={di * (CELL + GAP)}
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

      {hover?.cell && (
        <FloatingTip hover={hover} containerRef={containerRef} />
      )}

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
        />
        <Stat label="Longest streak" value={`${data.streakLongest}d`} />
        <Stat
          label="Active days"
          value={`${data.totalActiveDays}`}
          sub={`${Math.round((data.totalActiveDays / 365) * 100)}% of year`}
        />
      </div>

      {data.perPlatform && Object.values(data.perPlatform).some((v) => v > 0) && (
        <div className="mt-3 text-[11px] text-ink-faint flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(data.perPlatform)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <PlatformLogo
                  platform={k}
                  size={12}
                  color={PLATFORM_META[k]?.color}
                />
                <span className="text-ink-muted">
                  {PLATFORM_META[k]?.label || k}:
                </span>{" "}
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

  const tipW = 240;
  const tipH = Math.max(60, 36 + active.length * 22);
  const containerW = containerRef.current?.clientWidth ?? 9999;
  const containerH = containerRef.current?.clientHeight ?? 9999;
  const PAD = 12;

  // Prefer right-of-cursor; flip to the left if it would overflow.
  let left = x + 14;
  if (left + tipW + PAD > containerW) left = x - tipW - 14;
  left = Math.max(PAD, Math.min(left, containerW - tipW - PAD));

  // Prefer below-cursor; flip up if it would overflow.
  let top = y + 18;
  if (top + tipH + PAD > containerH) top = y - tipH - 12;
  top = Math.max(PAD, top);

  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{ left, top, width: tipW }}
    >
      <div
        className="rounded-lg border border-line/80 bg-bg/95 backdrop-blur-md px-3 py-2 shadow-deep"
        style={{ boxShadow: "0 8px 28px -10px rgba(124,58,237,0.45)" }}
      >
        <div className="text-[11px] uppercase tracking-wider text-ink-dim mb-1.5">
          {date}
        </div>
        {active.length === 0 ? (
          <div className="text-xs text-ink-muted">No activity</div>
        ) : (
          <ul className="space-y-1">
            {active.map(([k, v]) => {
              const meta = PLATFORM_META[k] || { id: k, label: k, color: "#A78BFA" };
              return (
                <li key={k} className="flex items-center gap-2 text-sm text-ink">
                  <PlatformLogo
                    platform={meta.id || k}
                    size={14}
                    color={meta.color}
                  />
                  <span className="text-ink-muted flex-1">{meta.label}</span>
                  <span className="font-semibold tabular-nums">
                    {fmtPlatformValue(k, v)}
                  </span>
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
    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="text-lg stat-num">{value}</div>
      {sub && <div className="text-[11px] text-ink-muted">{sub}</div>}
    </div>
  );
}
