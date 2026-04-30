import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { colorForLang } from "../../utils/constants";
import EmptyState from "../ui/EmptyState";
import ChartTooltip from "../ui/ChartTooltip";

export default function LanguageRadar({ languages = {}, title = "Language Breakdown" }) {
  const entries = Object.entries(languages || {});
  if (!entries.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
        <EmptyState
          icon="🧪"
          title="No language data"
          description="Connect GitHub or Wakatime to populate this chart."
        />
      </div>
    );
  }

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const top = entries
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / total) * 100),
      color: colorForLang(name),
    }));

  const otherValue = entries.slice(6).reduce((s, [, v]) => s + v, 0);
  if (otherValue > 0) {
    top.push({
      name: "Other",
      value: otherValue,
      pct: Math.round((otherValue / total) * 100),
      color: "#475569",
    });
  }

  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4 items-center">
        <div className="relative h-[200px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={top}
                dataKey="value"
                innerRadius={62}
                outerRadius={88}
                paddingAngle={2}
                stroke="transparent"
                isAnimationActive
              >
                {top.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip formatValue={(v, e) => `${e?.payload?.pct ?? v}%`} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="text-center">
              <div className="text-2xl stat-num">{top.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                languages
              </div>
            </div>
          </div>
        </div>
        <ul className="space-y-1.5">
          {top.map((d) => (
            <li key={d.name} className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
              <span className="font-medium truncate">{d.name}</span>
              <span className="ml-auto text-ink-muted text-xs tabular-nums">
                {d.pct}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
