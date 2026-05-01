import { useMemo } from "react";
import {
  LineChart,
  Line,
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

const SERIES = [
  { key: "leetcode", color: "#ffa116", name: "LeetCode" },
  { key: "codeforces", color: "#a78bfa", name: "Codeforces" },
  { key: "gfg", color: "#10b981", name: "GFG" },
];

function shortDate(d, isWeekly = false) {
  const dt = new Date(d + "T00:00:00Z");
  return dt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(isWeekly ? { year: undefined } : {}),
  });
}

export default function ProblemsSolvedChart({ series = [], period = "90d" }) {
  const isWeekly = period === "1y";

  // Convert daily counts → running cumulative for the line view.
  const data = useMemo(() => {
    let lc = 0;
    let cf = 0;
    let gfg = 0;
    return (series || []).map((d) => {
      lc += Number(d.leetcode || 0);
      cf += Number(d.codeforces || 0);
      gfg += Number(d.gfg || 0);
      return { date: d.date, leetcode: lc, codeforces: cf, gfg };
    });
  }, [series]);

  const totals = useMemo(() => {
    const last = data[data.length - 1] || { leetcode: 0, codeforces: 0, gfg: 0 };
    return { leetcode: last.leetcode, codeforces: last.codeforces, gfg: last.gfg };
  }, [data]);
  const grandTotal = totals.leetcode + totals.codeforces + totals.gfg;
  const hasData = grandTotal > 0;

  const labelForLegend = isWeekly ? "this year" : `last ${period}`;

  // Decide whether to draw dots — gets noisy past ~30 points.
  const showDots = data.length > 0 && data.length <= 32;

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-base">Problems Solved</h3>
          {hasData && (
            <span className="pill-accent !py-0.5 !text-[10px]">
              {grandTotal} · {labelForLegend}
            </span>
          )}
        </div>
      </div>

      {!hasData ? (
        <EmptyState
          icon="📈"
          title="No problem-solving data yet"
          description="Connect LeetCode, Codeforces, or GFG and we'll plot your progress here."
        />
      ) : (
        <div className="h-60">
          <ResponsiveContainer>
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
            >
              <CartesianGrid
                stroke={chartTheme.grid}
                strokeDasharray="3 6"
                vertical={false}
              />
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
                tick={{ fill: chartTheme.text, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={36}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{
                  stroke: "rgba(167,139,250,0.35)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
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
                wrapperStyle={{
                  fontSize: 11,
                  color: chartTheme.text,
                  paddingBottom: 6,
                }}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name}
                  stroke={s.color}
                  strokeWidth={2.25}
                  dot={
                    showDots
                      ? {
                          r: 3,
                          fill: s.color,
                          stroke: "#000",
                          strokeWidth: 1.5,
                        }
                      : false
                  }
                  activeDot={{
                    r: 5,
                    fill: s.color,
                    stroke: "#000",
                    strokeWidth: 2,
                  }}
                  isAnimationActive
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
