/**
 * EffortOutputChart — Merged "Problems Solved" + "Coding Time" chart.
 *
 * Effort  = coding hours (bars, gradient fill, left Y axis)
 * Output  = problems solved per day (line + dots, right Y axis)
 *
 * Bars where coding hours > 1.5 but problems = 0 are flagged as "low
 * output" (orange) so the user can spot inefficiencies at a glance.
 */
import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";
import { chartTheme } from "../../utils/chartConfigs";

const TABS = [
  { id: "daily",  label: "Daily" },
  { id: "weekly", label: "Weekly" },
];

function shortDate(d) {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const hours    = payload.find((p) => p.dataKey === "hours");
  const problems = payload.find((p) => p.dataKey === "problems");
  const efficiency = hours?.value > 0 && problems?.value > 0
    ? `${(problems.value / hours.value).toFixed(1)} solved/hr`
    : hours?.value > 1.5 && !problems?.value
      ? "⚠ No output"
      : null;
  return (
    <div
      className="rounded-lg border border-white/10 text-[11px] shadow-xl"
      style={{ background: "#111", padding: "8px 12px", minWidth: 140 }}
    >
      <div className="font-semibold text-ink mb-1.5">{shortDate(label)}</div>
      {hours && (
        <div className="flex items-center gap-2 text-ink-muted">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#A78BFA" }} />
          Coding: <span className="text-ink ml-auto">{Number(hours.value).toFixed(1)}h</span>
        </div>
      )}
      {problems && (
        <div className="flex items-center gap-2 text-ink-muted mt-1">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#ffa116" }} />
          Problems: <span className="text-ink ml-auto">{problems.value}</span>
        </div>
      )}
      {efficiency && (
        <div className={`mt-1.5 pt-1.5 border-t border-white/[0.06] ${efficiency.startsWith("⚠") ? "text-amber-400" : "text-emerald-400"} font-medium`}>
          {efficiency}
        </div>
      )}
    </div>
  );
}

export default function EffortOutputChart({ series = [], codingDaily = [], codingWeekly = [], period = "90d" }) {
  const [tab, setTab] = useState("daily");

  const data = useMemo(() => {
    if (tab === "weekly") {
      const probMap = {};
      (series || []).forEach((d) => {
        const dt  = new Date(d.date + "T00:00:00Z");
        const mon = new Date(dt);
        mon.setUTCDate(dt.getUTCDate() - dt.getUTCDay() + 1);
        const key = mon.toISOString().slice(0, 10);
        probMap[key] = (probMap[key] || 0)
          + Number(d.leetcode || 0) + Number(d.codeforces || 0) + Number(d.gfg || 0);
      });
      return (codingWeekly || []).slice(-12).map((w) => ({
        date:     w.weekStart,
        hours:    Number((w.hours || 0).toFixed(2)),
        problems: probMap[w.weekStart] || 0,
      }));
    }

    const codingMap = Object.fromEntries((codingDaily || []).map((d) => [d.date, Number(d.hours || 0)]));
    return (series || []).slice(-30).map((d) => ({
      date:     d.date,
      hours:    Number((codingMap[d.date] || 0).toFixed(2)),
      problems: Number(d.leetcode || 0) + Number(d.codeforces || 0) + Number(d.gfg || 0),
    })).filter((d) => d.hours > 0 || d.problems > 0);
  }, [tab, series, codingDaily, codingWeekly]);

  const totalHours    = data.reduce((s, d) => s + d.hours, 0);
  const totalProblems = data.reduce((s, d) => s + d.problems, 0);
  const maxHours      = data.reduce((m, d) => Math.max(m, d.hours), 0);
  const hasData       = totalHours > 0 || totalProblems > 0;
  const efficiency    = totalHours > 0 ? (totalProblems / totalHours).toFixed(1) : "—";

  /* empty state */
  if (!hasData) {
    return (
      <div className="panel-pad flex flex-col h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base">Effort vs Output</h3>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6 text-center">
          <div className="text-3xl opacity-40">📊</div>
          <p className="text-sm font-medium text-ink-muted">No coding data yet</p>
          <p className="text-[11px] text-ink-faint max-w-[200px]">
            Connect <strong>WakaTime</strong> to track coding time or <strong>LeetCode</strong> / <strong>Codeforces</strong> to log problems solved
          </p>
          <Link to="/settings" className="text-[11px] text-accent-300 hover:underline mt-1">
            → Connect platforms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-pad">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-base">Effort vs Output</h3>
          <span className="pill-accent !py-0.5 !text-[10px]">
            {totalHours.toFixed(0)}h · {totalProblems} solved
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totalHours > 0 && (
            <span className="text-[10px] text-ink-faint">
              efficiency: <span className="text-emerald-400 font-medium">{efficiency}/hr</span>
            </span>
          )}
          <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full transition ${
                  tab === t.id
                    ? "bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/40"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Insight bar */}
      {data.some((d) => d.hours > 1.5 && d.problems === 0) && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[11px] text-amber-400">
          <span>⚠</span>
          <span>Some days show high coding time but no problems solved — focus sessions may be untracked</span>
        </div>
      )}

      <div className="h-56">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 24, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="effort-bar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#A78BFA" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="effort-bar-warn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 6" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fill: chartTheme.text, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={28}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: chartTheme.text, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
              label={{ value: "hrs", angle: -90, position: "insideLeft", fill: chartTheme.text, fontSize: 9, dy: 20 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: chartTheme.text, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={28}
              allowDecimals={false}
              label={{ value: "probs", angle: 90, position: "insideRight", fill: chartTheme.text, fontSize: 9, dy: -20 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(124,58,237,0.05)" }} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="square"
              wrapperStyle={{ fontSize: 10, color: chartTheme.text, paddingBottom: 4 }}
            />
            <Bar yAxisId="left" dataKey="hours" name="Coding (hrs)" radius={[4, 4, 0, 0]} maxBarSize={18}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.hours > 1.5 && d.problems === 0 ? "url(#effort-bar-warn)" : "url(#effort-bar)"}
                  opacity={maxHours > 0 ? 0.55 + 0.45 * (d.hours / maxHours) : 0.7}
                />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="problems"
              name="Problems"
              stroke="#ffa116"
              strokeWidth={2}
              dot={{ r: 2.5, fill: "#ffa116", stroke: "#000", strokeWidth: 1 }}
              activeDot={{ r: 4, fill: "#ffa116", stroke: "#000", strokeWidth: 1.5 }}
              isAnimationActive
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
