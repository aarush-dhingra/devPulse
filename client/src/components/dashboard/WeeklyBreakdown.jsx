/**
 * WeeklyBreakdown — pie / donut chart showing the current platform totals
 * used by the dashboard headline cards and platform detail pages.
 *
 * Each slice = one platform. These are not per-day deltas; for problem
 * platforms they are lifetime solved totals, which keeps this card
 * consistent with platform tabs.
 */
import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import PlatformLogo from "../ui/PlatformLogo";

const PLATFORM_META = {
  github:     { label: "GitHub",        color: "#f0f6fc", unit: "contributions" },
  leetcode:   { label: "LeetCode",      color: "#ffa116", unit: "solved"        },
  codeforces: { label: "Codeforces",    color: "#fe646f", unit: "solved"        },
  gfg:        { label: "GeeksForGeeks", color: "#2f8d46", unit: "problems"      },
  codechef:   { label: "CodeChef",      color: "#5b4638", unit: "problems"      },
  atcoder:    { label: "AtCoder",       color: "#b0c4de", unit: "problems"      },
  wakatime:   { label: "WakaTime",      color: "#22d3ee", unit: "hours"         },
};

function fmtValue(key, val) {
  if (key === "wakatime") return `${Number(val).toFixed(1)}h`;
  return Math.round(Number(val)).toLocaleString();
}

export default function WeeklyBreakdown({ heatmap, period }) {
  const [activeIdx, setActiveIdx] = useState(null);

  const slices = useMemo(() => {
    const per = heatmap?.perPlatform || {};
    const keys = Object.keys(PLATFORM_META).filter((k) => Number(per[k] || 0) > 0);
    const total = keys.reduce((s, k) => s + Number(per[k] || 0), 0);
    if (total <= 0) return [];
    return keys
      .map((k) => {
        const value = Number(per[k] || 0);
        return {
          key: k,
          name: PLATFORM_META[k].label,
          color: PLATFORM_META[k].color,
          value,
          pct: (value / total) * 100,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [heatmap]);

  const totalUnits = slices.reduce((s, x) => s + x.value, 0);
  const periodLbl = labelForPeriod(period);

  if (!slices.length) {
    return (
      <div className="panel-pad flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">Activity Breakdown</h3>
          <span className="text-[10px] text-ink-faint uppercase tracking-wider">{periodLbl}</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-8 text-center">
          <div className="text-3xl opacity-40">🥧</div>
          <p className="text-sm font-medium text-ink-muted">No activity in range</p>
          <p className="text-[11px] text-ink-faint max-w-[220px]">
            Connect platforms or pick a longer date range to see how your activity is distributed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-pad flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Activity Breakdown</h3>
        <span className="text-[10px] text-ink-faint uppercase tracking-wider">{periodLbl}</span>
      </div>

      <div className="relative h-[180px] w-full">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={75}
              paddingAngle={2}
              stroke="rgba(0,0,0,0.4)"
              strokeWidth={1}
              onMouseEnter={(_, i) => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(null)}
              isAnimationActive
            >
              {slices.map((s, i) => (
                <Cell
                  key={s.key}
                  fill={s.color}
                  opacity={activeIdx == null || activeIdx === i ? 1 : 0.45}
                  style={{
                    transition: "opacity 0.2s",
                    filter: activeIdx === i ? `drop-shadow(0 0 6px ${s.color}88)` : "none",
                  }}
                />
              ))}
            </Pie>
            <Tooltip content={<PieTip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-widest text-ink-faint">Total</div>
          <div className="font-display font-bold text-xl tabular-nums">
            {Math.round(totalUnits).toLocaleString()}
          </div>
          <div className="text-[10px] text-ink-faint">mixed units</div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 space-y-1.5">
        {slices.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
            className="w-full flex items-center gap-2 text-[11px] rounded-md px-1.5 py-1 hover:bg-white/[0.03] transition-colors text-left"
          >
            <PlatformLogo platform={s.key} size={11} color={s.color} />
            <span className="text-ink-muted truncate flex-1">{s.name}</span>
            <span className="tabular-nums text-ink font-medium">
              {fmtValue(s.key, s.value)}
            </span>
            <span
              className="tabular-nums shrink-0 w-9 text-right font-bold"
              style={{ color: s.color }}
            >
              {s.pct.toFixed(s.pct >= 10 ? 0 : 1)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── tooltip ─────────────────────────────────────────────── */

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div
      className="rounded-xl border border-white/10 shadow-2xl text-[11px]"
      style={{ background: "#111", padding: "8px 10px", minWidth: 140 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: p.color }} />
        <span className="font-semibold text-ink">{p.name}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-ink-muted">
        <span>Total</span>
        <span className="text-ink font-medium tabular-nums">{fmtValue(p.key, p.value)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 text-ink-muted">
        <span>Share</span>
        <span className="font-bold tabular-nums" style={{ color: p.color }}>
          {p.pct.toFixed(p.pct >= 10 ? 0 : 1)}%
        </span>
      </div>
    </div>
  );
}

function labelForPeriod(period) {
  switch (period) {
    case "7d":  return "this week";
    case "30d": return "this month";
    case "90d": return "last 90 days";
    case "1y":  return "this year";
    default:    return "selected range";
  }
}

