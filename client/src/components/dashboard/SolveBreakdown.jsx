import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import EmptyState from "../ui/EmptyState";
import ChartTooltip from "../ui/ChartTooltip";

const COLORS = {
  Easy: "#10b981",
  Medium: "#f59e0b",
  Hard: "#ef4444",
};

export default function SolveBreakdown({ leetcode }) {
  const solved = leetcode?.solved;
  if (!solved || (!solved.easy && !solved.medium && !solved.hard)) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">LeetCode Difficulty</h3>
        <EmptyState
          icon="🧩"
          title="Connect LeetCode"
          description="Add your LeetCode username in Settings to see your difficulty breakdown."
        />
      </div>
    );
  }
  const data = [
    { name: "Easy", value: solved.easy },
    { name: "Medium", value: solved.medium },
    { name: "Hard", value: solved.hard },
  ];

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-display font-bold text-lg">LeetCode Difficulty</h3>
        <span className="pill-accent">{solved.total} solved</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center">
        <div className="h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={3} stroke="transparent" isAnimationActive>
                {data.map((d, i) => (
                  <Cell key={i} fill={COLORS[d.name]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(124,58,237,0.08)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-2 text-sm">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03]">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[d.name] }} />
              <span className="font-medium">{d.name}</span>
              <span className="ml-auto stat-num">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
