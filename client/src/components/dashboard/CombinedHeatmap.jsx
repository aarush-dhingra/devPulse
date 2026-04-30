import { useMemo, useState } from "react";
import EmptyState from "../ui/EmptyState";

const CELL = 12;
const GAP = 3;
const RADIUS = 3;

// Violet → cyan ramp.
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

const PLATFORM_LABEL = {
  github: "GitHub",
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  wakatime: "Wakatime",
};

function fmtBreakdown(b = {}) {
  const parts = [];
  if (b.github) parts.push(`${b.github} GitHub`);
  if (b.leetcode) parts.push(`${b.leetcode} LeetCode`);
  if (b.codeforces) parts.push(`${b.codeforces} CF`);
  if (b.wakatime)
    parts.push(`${Number(b.wakatime).toFixed(1)}h Wakatime`);
  return parts.join(" · ") || "no activity";
}

export default function CombinedHeatmap({ data }) {
  const [hovered, setHovered] = useState(null);

  const { weeks, p95, total, totalActiveDays, bestDay, streakLongest, perPlatform } = useMemo(() => {
    if (!data?.heatmap?.length) {
      return { weeks: [], p95: 1, total: 0, totalActiveDays: 0, bestDay: null, streakLongest: 0, perPlatform: {} };
    }
    const cells = data.heatmap;
    const out = [];
    let week = [];
    const firstDay = new Date(cells[0].date + "T00:00:00Z").getUTCDay();
    for (let i = 0; i < firstDay; i += 1) week.push(null);
    for (const d of cells) {
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

    const positives = cells.map((c) => c.count).filter((c) => c > 0).sort((a, b) => a - b);
    const p95 = positives.length
      ? positives[Math.floor(positives.length * 0.95)] || positives[positives.length - 1]
      : 1;

    return {
      weeks: out,
      p95,
      total: data.total,
      totalActiveDays: data.totalActiveDays,
      bestDay: data.bestDay,
      streakLongest: data.streakLongest,
      perPlatform: data.perPlatform || {},
    };
  }, [data]);

  const monthLabels = useMemo(() => {
    const out = [];
    let lastMonth = -1;
    weeks.forEach((w, wi) => {
      const firstReal = w.find(Boolean);
      if (!firstReal) return;
      const m = new Date(firstReal.date + "T00:00:00Z").getUTCMonth();
      if (m !== lastMonth) {
        out.push({ x: wi * (CELL + GAP), label: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m] });
        lastMonth = m;
      }
    });
    return out;
  }, [weeks]);

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

  return (
    <div className="panel-pad relative">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Combined Activity</h3>
          <span className="pill-accent">{Math.round(total).toLocaleString()} units · last year</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-ink-faint">
          Less
          {RAMP.map((c, i) => (
            <span key={i} className="inline-block w-3 h-3 rounded-sm" style={{ background: c }} />
          ))}
          More
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-2">
        <svg
          width={(CELL + GAP) * weeks.length + 28}
          height={(CELL + GAP) * 7 + 18}
          className="block"
        >
          <g transform="translate(28,16)">
            {monthLabels.map((m, i) => (
              <text
                key={i}
                x={m.x}
                y={-6}
                fill="rgba(148,163,184,0.65)"
                fontSize="10"
                fontFamily="Space Grotesk, ui-sans-serif"
              >
                {m.label}
              </text>
            ))}
            {["Mon", "Wed", "Fri"].map((d, idx) => (
              <text
                key={d}
                x={-26}
                y={idx * 2 * (CELL + GAP) + 9}
                fill="rgba(148,163,184,0.55)"
                fontSize="10"
                fontFamily="Space Grotesk, ui-sans-serif"
              >
                {d}
              </text>
            ))}
            {weeks.map((w, wi) =>
              w.map((d, di) => {
                if (!d) return null;
                const fill = RAMP[bucketFor(d.count, p95)];
                return (
                  <rect
                    key={`${wi}-${di}`}
                    x={wi * (CELL + GAP)}
                    y={di * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={RADIUS}
                    fill={fill}
                    onMouseEnter={() => setHovered(d)}
                    onMouseLeave={() => setHovered((h) => (h === d ? null : h))}
                    style={{ cursor: "pointer", transition: "filter 120ms" }}
                  >
                    <title>{`${d.date}\n${fmtBreakdown(d.breakdown)}`}</title>
                  </rect>
                );
              })
            )}
          </g>
        </svg>
      </div>

      {hovered && (
        <div className="mt-2 text-xs text-ink-muted">
          <span className="font-semibold text-ink">
            {new Date(hovered.date + "T00:00:00Z").toLocaleDateString(undefined, {
              weekday: "short", month: "short", day: "numeric",
            })}
          </span>
          {" — "}
          {fmtBreakdown(hovered.breakdown)}
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat
          label="Best day"
          value={bestDay ? Math.round(bestDay.count).toString() : "—"}
          sub={bestDay ? new Date(bestDay.date + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
        />
        <Stat label="Longest streak" value={`${streakLongest}d`} />
        <Stat
          label="Active days"
          value={`${totalActiveDays}`}
          sub={`${Math.round((totalActiveDays / 365) * 100)}% of year`}
        />
      </div>

      {Object.values(perPlatform).some((v) => v > 0) && (
        <div className="mt-3 text-[11px] text-ink-faint flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(perPlatform)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => (
              <span key={k}>
                <span className="text-ink-muted">{PLATFORM_LABEL[k] || k}:</span>{" "}
                <span className="text-ink tabular-nums">{Math.round(Number(v))}</span>
              </span>
            ))}
        </div>
      )}
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
