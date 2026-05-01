/**
 * ProblemsSolvedChart — daily/weekly stacked bars (Easy/Medium/Hard)
 * with an overlay "Total" line.
 *
 * The server provides exact per-difficulty counts via snapshot deltas,
 * so no client-side approximation is needed.
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
  Legend,
  ReferenceDot,
} from "recharts";
import { Link } from "react-router-dom";
import { chartTheme } from "../../utils/chartConfigs";

const DIFF_META = {
  easy:   { color: "#22c55e", label: "Easy" },
  medium: { color: "#f59e0b", label: "Medium" },
  hard:   { color: "#ef4444", label: "Hard" },
};
const TOTAL_COLOR    = "#a78bfa";
const BEST_COLOR     = "#fbbf24";
const ZERO_COLOR     = "rgba(148,163,184,0.45)";

const VIEW = [
  { id: "daily",  label: "Daily" },
  { id: "weekly", label: "Weekly" },
];

function shortDate(d, weekly = false) {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short", day: weekly ? undefined : "numeric",
  });
}

/* ─── tooltip ───────────────────────────────────────────────── */

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const easy   = payload.find((p) => p.dataKey === "easy")?.value   || 0;
  const medium = payload.find((p) => p.dataKey === "medium")?.value || 0;
  const hard   = payload.find((p) => p.dataKey === "hard")?.value   || 0;
  const total  = easy + medium + hard;
  if (!total) return null;

  return (
    <div
      className="rounded-xl border border-white/10 shadow-2xl text-[11px]"
      style={{ background: "#111", padding: "8px 12px", minWidth: 150 }}
    >
      <div className="font-semibold text-ink mb-1.5">{shortDate(label)}</div>
      {Object.entries({ easy, medium, hard }).map(([k, v]) => (
        v > 0 && (
          <div key={k} className="flex items-center gap-2 text-ink-muted mb-1">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: DIFF_META[k].color }} />
            <span className="flex-1 capitalize">{k}</span>
            <span className="text-ink font-medium tabular-nums">{v}</span>
          </div>
        )
      ))}
      <div className="mt-1 pt-1 border-t border-white/[0.08] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: TOTAL_COLOR }} />
        <span className="flex-1 text-ink-muted">Total</span>
        <span className="text-ink font-bold tabular-nums">{total}</span>
      </div>
    </div>
  );
}

/* ─── main ──────────────────────────────────────────────────── */

export default function ProblemsSolvedChart({ series = [], period = "90d" }) {
  const [viewMode, setViewMode] = useState("daily");

  const dailyData = useMemo(() => {
    return (series || []).map((d) => ({
      date:   d.date,
      easy:   Number(d.easy   || 0),
      medium: Number(d.medium || 0),
      hard:   Number(d.hard   || 0),
      total:  Number(d.total  || 0),
    }));
  }, [series]);

  const chartData = useMemo(() => {
    if (viewMode !== "weekly") return dailyData;
    const buckets = {};
    for (const d of dailyData) {
      const dt  = new Date(d.date + "T00:00:00Z");
      const mon = new Date(dt);
      mon.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
      const key = mon.toISOString().slice(0, 10);
      if (!buckets[key]) buckets[key] = { date: key, easy: 0, medium: 0, hard: 0, total: 0 };
      buckets[key].easy   += d.easy;
      buckets[key].medium += d.medium;
      buckets[key].hard   += d.hard;
      buckets[key].total  += d.total;
    }
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [dailyData, viewMode]);

  const grandTotal = chartData.reduce((s, d) => s + d.total, 0);
  const hasData    = grandTotal > 0;
  const periodLbl  = viewMode === "weekly" ? "weekly" : `last ${period}`;

  const diffTotals = chartData.reduce(
    (acc, d) => ({ easy: acc.easy + d.easy, medium: acc.medium + d.medium, hard: acc.hard + d.hard }),
    { easy: 0, medium: 0, hard: 0 }
  );

  const { bestDay, zeroDays } = useMemo(() => {
    if (!chartData.length) return { bestDay: null, zeroDays: [] };
    let best = chartData[0];
    const zeros = [];
    for (const d of chartData) {
      if (d.total > best.total) best = d;
      if (d.total === 0) zeros.push(d);
    }
    return { bestDay: best.total > 0 ? best : null, zeroDays: zeros };
  }, [chartData]);

  return (
    <div className="panel-pad flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-base">Problems Solved</h3>
          {hasData && (
            <span className="pill-accent !py-0.5 !text-[10px]">{grandTotal} · {periodLbl}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.04] p-0.5">
            {VIEW.map((v) => (
              <button
                key={v.id}
                onClick={() => setViewMode(v.id)}
                className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider rounded-full transition ${
                  viewMode === v.id
                    ? "bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/40"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Difficulty legend strip */}
      {hasData && (
        <div className="flex items-center gap-3 text-[10px] flex-wrap">
          {Object.entries(DIFF_META).map(([k, m]) => (
            <span key={k} className="flex items-center gap-1.5" style={{ color: m.color }}>
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: m.color }} />
              <span className="font-medium">{m.label}</span>
              <span className="text-ink-faint tabular-nums ml-0.5">{diffTotals[k]}</span>
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-ink-muted ml-2">
            <span className="inline-block w-3 h-[2px] rounded" style={{ background: TOTAL_COLOR, opacity: 0.65 }} />
            Total
          </span>
          {bestDay && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: BEST_COLOR }}>
              ★ Best: {bestDay.total}
            </span>
          )}
        </div>
      )}

      {/* Chart */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <div className="text-3xl opacity-40">📈</div>
          <p className="text-sm font-medium text-ink-muted">No problem-solving data yet</p>
          <p className="text-[11px] text-ink-faint max-w-[220px]">
            Solve problems on <strong>LeetCode</strong>, <strong>Codeforces</strong>, <strong>CodeChef</strong>, <strong>AtCoder</strong>, or <strong>GFG</strong> then hit Refresh to see your progress
          </p>
          <Link to="/settings" className="text-[11px] text-accent-300 hover:underline">
            → Connect platforms
          </Link>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer>
            <ComposedChart data={chartData} margin={{ top: 12, right: 14, bottom: 0, left: -8 }}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => shortDate(d, viewMode === "weekly")}
                tick={{ fill: chartTheme.text, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: chartTheme.text, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={32}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(167,139,250,0.06)" }} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="square"
                wrapperStyle={{ fontSize: 10, color: chartTheme.text, paddingBottom: 4 }}
              />
              <Bar dataKey="easy"   stackId="d" name="Easy"   fill={DIFF_META.easy.color}   maxBarSize={28} />
              <Bar dataKey="medium" stackId="d" name="Medium" fill={DIFF_META.medium.color} maxBarSize={28} />
              <Bar dataKey="hard"   stackId="d" name="Hard"   fill={DIFF_META.hard.color}   maxBarSize={28} radius={[4, 4, 0, 0]} />
              <Line
                type="monotone"
                dataKey="total"
                name="Total"
                stroke={TOTAL_COLOR}
                strokeWidth={1.25}
                strokeOpacity={0.65}
                strokeDasharray="3 4"
                dot={false}
                activeDot={{ r: 3.5, fill: TOTAL_COLOR, stroke: "#000", strokeWidth: 1 }}
                isAnimationActive
              />
              {bestDay && (
                <ReferenceDot
                  x={bestDay.date}
                  y={bestDay.total}
                  r={6}
                  fill={BEST_COLOR}
                  stroke="#000"
                  strokeWidth={1.5}
                  isFront
                  shape={(props) => (
                    <g transform={`translate(${props.cx},${props.cy})`}>
                      <circle r={7} fill={BEST_COLOR} stroke="#000" strokeWidth={1.5} />
                      <text
                        x={0} y={3}
                        textAnchor="middle"
                        fontSize={9}
                        fill="#000"
                        fontWeight="bold"
                      >★</text>
                    </g>
                  )}
                />
              )}
              {zeroDays.slice(0, 60).map((z) => (
                <ReferenceDot
                  key={`z-${z.date}`}
                  x={z.date}
                  y={0}
                  r={1.75}
                  fill={ZERO_COLOR}
                  stroke="none"
                  isFront
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
