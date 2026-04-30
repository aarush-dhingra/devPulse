import { useMemo } from "react";
import EmptyState from "../ui/EmptyState";

const CELL = 12;
const GAP = 3;
const RADIUS = 3;

function bucket(count) {
  if (!count) return 0;
  if (count < 3) return 1;
  if (count < 6) return 2;
  if (count < 12) return 3;
  return 4;
}

const COLORS = [
  "rgba(255,255,255,0.04)",
  "rgba(139, 92, 246, 0.30)",
  "rgba(139, 92, 246, 0.55)",
  "rgba(139, 92, 246, 0.85)",
  "rgba(34, 211, 238, 1)",
];

export default function ContributionHeatmap({ heatmap = [] }) {
  const { weeks, total, bestDay, longestStreak } = useMemo(() => {
    if (!heatmap?.length) return { weeks: [], total: 0, bestDay: null, longestStreak: 0 };
    const sorted = [...heatmap].sort((a, b) => a.date.localeCompare(b.date));
    const out = [];
    let week = [];
    const firstDay = new Date(sorted[0].date).getDay();
    for (let i = 0; i < firstDay; i += 1) week.push(null);
    for (const d of sorted) {
      week.push(d);
      if (week.length === 7) {
        out.push(week);
        week = [];
      }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      out.push(week);
    }

    const total = sorted.reduce((s, d) => s + d.count, 0);
    const bestDay = sorted.reduce(
      (best, d) => (!best || d.count > best.count ? d : best),
      null
    );
    let run = 0;
    let longest = 0;
    for (const d of sorted) {
      if (d.count > 0) {
        run += 1;
        longest = Math.max(longest, run);
      } else run = 0;
    }
    return { weeks: out, total, bestDay, longestStreak: longest };
  }, [heatmap]);

  if (!heatmap?.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Activity Heatmap</h3>
        <EmptyState
          icon="📅"
          title="No contribution data"
          description="We'll fetch your contribution graph as soon as a fresh GitHub sync completes."
        />
      </div>
    );
  }

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
            <span
              key={i}
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: c }}
            />
          ))}
          More
        </div>
      </div>
      <div className="overflow-x-auto -mx-1 px-1">
        <svg
          width={(CELL + GAP) * weeks.length}
          height={(CELL + GAP) * 7}
          className="block"
        >
          {weeks.map((w, wi) =>
            w.map((d, di) => {
              if (!d) return null;
              const fill = COLORS[bucket(d.count)];
              return (
                <rect
                  key={`${wi}-${di}`}
                  x={wi * (CELL + GAP)}
                  y={di * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx={RADIUS}
                  fill={fill}
                >
                  <title>{`${d.date}: ${d.count} contributions`}</title>
                </rect>
              );
            })
          )}
        </svg>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Best day" value={bestDay ? `${bestDay.count}` : "—"} sub={bestDay ? new Date(bestDay.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""} />
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
