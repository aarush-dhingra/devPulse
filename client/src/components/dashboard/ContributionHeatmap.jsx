import { useMemo } from "react";
import EmptyState from "../ui/EmptyState";

const CELL = 12;
const GAP = 3;
const STRIDE = CELL + GAP;
const RADIUS = 3;

function bucket(count) {
  if (!count) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 12) return 3;
  return 4;
}

// GitHub-style green palette
const COLORS = [
  "rgba(255,255,255,0.05)",   // empty
  "rgba(34,197,94,0.22)",     // level 1
  "rgba(34,197,94,0.45)",     // level 2
  "rgba(34,197,94,0.70)",     // level 3
  "rgba(34,197,94,1)",        // level 4
];

export default function ContributionHeatmap({ heatmap = [] }) {
  const { weeks, monthLabels, total, bestDay, longestStreak } = useMemo(() => {
    if (!heatmap?.length) return { weeks: [], monthLabels: [], total: 0, bestDay: null, longestStreak: 0 };

    const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date));
    const out = [];
    let week = [];
    const firstDay = new Date(`${sorted[0].date}T00:00:00`).getDay();
    for (let i = 0; i < firstDay; i++) week.push(null);
    for (const d of sorted) {
      week.push(d);
      if (week.length === 7) { out.push(week); week = []; }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      out.push(week);
    }

    // Month labels above the first week of each month
    const labels = [];
    out.forEach((w, wi) => {
      const first = w.find(Boolean);
      if (!first) return;
      const d = new Date(`${first.date}T00:00:00`);
      if (d.getDate() <= 7) {
        labels.push({ x: wi * STRIDE, label: d.toLocaleString("default", { month: "short" }) });
      }
    });

    const total = sorted.reduce((s, d) => s + d.count, 0);
    const bestDay = sorted.reduce((best, d) => (!best || d.count > best.count ? d : best), null);
    let run = 0, longest = 0;
    for (const d of sorted) {
      if (d.count > 0) { run++; longest = Math.max(longest, run); }
      else run = 0;
    }

    return { weeks: out, monthLabels: labels, total, bestDay, longestStreak: longest };
  }, [heatmap]);

  if (!heatmap?.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Activity Heatmap</h3>
        <EmptyState icon="📅" title="No contribution data" description="We'll fetch your contribution graph as soon as a fresh GitHub sync completes." />
      </div>
    );
  }

  const LEFT = 30;
  const TOP = monthLabels.length ? 18 : 4;
  const svgW = weeks.length * STRIDE + LEFT;
  const svgH = TOP + 7 * STRIDE;

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Activity Heatmap</h3>
          <span className="pill-accent">{total} this year</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-faint">
          Less
          {COLORS.map((c, i) => (
            <span key={i} className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
          ))}
          More
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <svg width={svgW} height={svgH} className="block">
          {/* Month labels */}
          {monthLabels.map(({ x, label }) => (
            <text key={`m-${x}`} x={LEFT + x} y={12} fill="rgba(148,163,184,0.6)" fontSize="9">{label}</text>
          ))}
          {/* Day-of-week labels */}
          {["Mon", "Wed", "Fri"].map((day, i) => (
            <text key={day} x={0} y={TOP + 10 + i * 30} fill="rgba(148,163,184,0.55)" fontSize="9">{day}</text>
          ))}
          {/* Cells */}
          <g transform={`translate(${LEFT},${TOP})`}>
            {weeks.map((w, wi) =>
              w.map((d, di) => (
                <rect
                  key={`${wi}-${di}`}
                  x={wi * STRIDE}
                  y={di * STRIDE}
                  width={CELL}
                  height={CELL}
                  rx={RADIUS}
                  fill={d ? COLORS[bucket(d.count)] : COLORS[0]}
                >
                  {d && <title>{`${d.date}: ${d.count} contributions`}</title>}
                </rect>
              ))
            )}
          </g>
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Best day" value={bestDay ? `${bestDay.count}` : "—"} sub={bestDay ? new Date(`${bestDay.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""} />
        <Stat label="Longest streak" value={`${longestStreak}d`} />
        <Stat label="Total contribs" value={total.toLocaleString()} />
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
