import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import EmptyState from "../ui/EmptyState";
import ChartTooltip from "../ui/ChartTooltip";
import { chartTheme } from "../../utils/chartConfigs";

const PERIODS = [
  { id: "7d", label: "7d", days: 7 },
  { id: "30d", label: "30d", days: 30 },
  { id: "90d", label: "90d", days: 90 },
  { id: "1y", label: "1Y", days: 365 },
];

const SERIES = [
  { key: "leetcode", color: "#ffa116", name: "LeetCode" },
  { key: "codeforces", color: "#fe646f", name: "Codeforces" },
  { key: "gfg", color: "#2f8d46", name: "GFG" },
];

function shortDate(d) {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function ProblemsSolvedChart({ series = [], onPeriodChange, period = "90d" }) {
  const [localPeriod, setLocalPeriod] = useState(period);

  const setPeriod = (p) => {
    setLocalPeriod(p);
    onPeriodChange?.(p);
  };

  const data = useMemo(() => series || [], [series]);
  const hasData = data.some((d) => d.leetcode > 0 || d.codeforces > 0 || d.gfg > 0);

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-bold text-lg">Problems Solved</h3>
        <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 text-[11px] uppercase tracking-wider rounded-full transition ${
                localPeriod === p.id
                  ? "bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/40"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon="📈"
          title="No problem-solving data yet"
          description="Connect LeetCode, Codeforces, or GFG and we'll plot your cumulative progress here."
        />
      ) : (
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
              <defs>
                {SERIES.map((s) => (
                  <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: chartTheme.text, fontSize: 10 }}
                tickFormatter={shortDate}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={36}
              />
              <YAxis
                tick={{ fill: chartTheme.text, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={
                  <ChartTooltip
                    formatValue={(v) => Math.round(Number(v) || 0).toLocaleString()}
                  />
                }
                labelFormatter={(l) => shortDate(l)}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, color: chartTheme.text, paddingBottom: 8 }}
              />
              {SERIES.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2}
                  fill={`url(#grad-${s.key})`}
                  isAnimationActive
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
