import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
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
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
  { id: "1y", label: "1Y" },
];

const SERIES = [
  { key: "leetcode", color: "#ffa116", name: "LeetCode" },
  { key: "codeforces", color: "#fe646f", name: "Codeforces" },
  { key: "gfg", color: "#2f8d46", name: "GFG" },
];

function shortDate(d, isWeekly = false) {
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(isWeekly ? { year: undefined } : {}),
  });
}

export default function ProblemsSolvedChart({ series = [], onPeriodChange, period = "90d" }) {
  const [localPeriod, setLocalPeriod] = useState(period);

  const setPeriod = (p) => {
    setLocalPeriod(p);
    onPeriodChange?.(p);
  };

  const isWeekly = localPeriod === "1y";

  const data = useMemo(() => series || [], [series]);
  const totals = useMemo(() => {
    const t = { leetcode: 0, codeforces: 0, gfg: 0 };
    for (const d of data) {
      t.leetcode += Number(d.leetcode || 0);
      t.codeforces += Number(d.codeforces || 0);
      t.gfg += Number(d.gfg || 0);
    }
    return t;
  }, [data]);
  const grandTotal = totals.leetcode + totals.codeforces + totals.gfg;
  const hasData = grandTotal > 0;

  const labelForLegend = isWeekly ? "this year" : `last ${localPeriod}`;

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Problems Solved</h3>
          {hasData && (
            <span className="pill-accent">
              {grandTotal} · {labelForLegend}
            </span>
          )}
        </div>
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
          description="Connect LeetCode, Codeforces, or GFG and we'll plot your daily breakdown here."
        />
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={data}
                margin={{ top: 8, right: 12, bottom: 0, left: -8 }}
                barCategoryGap={isWeekly ? "18%" : "12%"}
              >
                <defs>
                  {SERIES.map((s) => (
                    <linearGradient key={s.key} id={`pbar-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity="1" />
                      <stop offset="100%" stopColor={s.color} stopOpacity="0.55" />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: chartTheme.text, fontSize: 10 }}
                  tickFormatter={(d) => shortDate(d, isWeekly)}
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
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: "rgba(124,58,237,0.06)" }}
                  content={
                    <ChartTooltip
                      formatValue={(v) => Math.round(Number(v) || 0).toLocaleString()}
                    />
                  }
                  labelFormatter={(l) =>
                    isWeekly
                      ? `Week of ${shortDate(l)}`
                      : new Date(l + "T00:00:00Z").toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })
                  }
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, color: chartTheme.text, paddingBottom: 8 }}
                />
                {SERIES.map((s) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.name}
                    stackId="problems"
                    fill={`url(#pbar-${s.key})`}
                    radius={[3, 3, 0, 0]}
                    isAnimationActive
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {SERIES.map((s) => (
              <div
                key={s.key}
                className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2"
              >
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-ink-faint">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
                  />
                  {s.name}
                </div>
                <div className="stat-num text-lg" style={{ color: s.color }}>
                  {totals[s.key]}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
