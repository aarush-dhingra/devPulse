import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import EmptyState from "../ui/EmptyState";
import ChartTooltip from "../ui/ChartTooltip";
import { chartTheme } from "../../utils/chartConfigs";

const TABS = [
  { id: "daily", label: "Daily (30d)" },
  { id: "weekly", label: "Weekly (12w)" },
];

function shortDate(d) {
  return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function CodingTimeBars({ daily = [], weekly = [] }) {
  const [tab, setTab] = useState("daily");

  const data = useMemo(() => {
    if (tab === "weekly") {
      return weekly.slice(-12).map((w) => ({
        label: w.weekStart,
        hours: Number(w.hours.toFixed(2)),
      }));
    }
    return daily.slice(-30).map((d) => ({
      label: d.date,
      hours: Number(d.hours.toFixed(2)),
    }));
  }, [tab, daily, weekly]);

  const total = data.reduce((s, d) => s + d.hours, 0);
  const max = data.reduce((m, d) => Math.max(m, d.hours), 0);
  const hasData = total > 0;

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Coding Time</h3>
          {hasData && (
            <span className="pill-accent">
              {total.toFixed(1)}h {tab === "weekly" ? "· last 12w" : "· last 30d"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1 text-[11px] uppercase tracking-wider rounded-full transition ${
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

      {!hasData ? (
        <EmptyState
          icon="⏱️"
          title="Connect Wakatime"
          description="Add your Wakatime API key in Settings to track coding time over time."
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
              <defs>
                <linearGradient id="bar-violet-cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#A78BFA" stopOpacity="1" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tickFormatter={shortDate}
                tick={{ fill: chartTheme.text, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={28}
              />
              <YAxis
                tick={{ fill: chartTheme.text, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip
                content={
                  <ChartTooltip formatValue={(v) => `${Number(v).toFixed(2)} hrs`} />
                }
                labelFormatter={(l) => shortDate(l)}
                cursor={{ fill: "rgba(124,58,237,0.06)" }}
              />
              <Bar dataKey="hours" name="Hours" radius={[6, 6, 0, 0]}>
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill="url(#bar-violet-cyan)"
                    opacity={max > 0 ? 0.6 + 0.4 * (d.hours / max) : 1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
