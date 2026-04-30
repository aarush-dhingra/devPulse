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
import { chartTheme } from "../../utils/chartConfigs";
import { colorForLang } from "../../utils/constants";
import EmptyState from "../ui/EmptyState";
import ChartTooltip from "../ui/ChartTooltip";

export default function CodingHoursChart({ wakatime, languages }) {
  const data = (languages || wakatime?.languages || [])
    .slice(0, 8)
    .map((l) => ({
      name: l.name,
      hours: Number(l.hours?.toFixed?.(1) ?? l.hours ?? 0),
      color: colorForLang(l.name),
    }));

  if (!data.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">Coding Time</h3>
        <EmptyState
          icon="⏱️"
          title="Connect Wakatime"
          description="Add your Wakatime API key in Settings to track coding hours per language."
        />
      </div>
    );
  }
  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-bold text-lg">Coding Time</h3>
        {wakatime?.hoursLast30Days != null && (
          <span className="pill-accent">
            {Math.round(wakatime.hoursLast30Days)}h · last 30d
          </span>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} barCategoryGap="22%">
            <defs>
              {data.map((d, i) => (
                <linearGradient key={i} id={`bg-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={d.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={d.color} stopOpacity="0.4" />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ fill: chartTheme.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip formatValue={(v) => `${v} hrs`} />} cursor={{ fill: "rgba(124,58,237,0.06)" }} />
            <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={`url(#bg-${i})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
