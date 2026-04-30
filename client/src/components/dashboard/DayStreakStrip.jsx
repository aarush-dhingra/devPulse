export default function DayStreakStrip({ heatmap = [] }) {
  // Show last 7 days as a vertical strip with violet glow on active days
  const last7 = [...(heatmap || [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);

  // Pad if fewer than 7 days
  while (last7.length < 7) last7.unshift({ date: "", count: 0 });

  const labels = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <span className="text-amber-400">🔥</span> 7-Day Pulse
        </h3>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {last7.map((d, i) => {
          const isToday = i === 6;
          const dayLabel = labels[(today - 6 + i + 7) % 7];
          const active = d.count > 0;
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5"
              title={d.date ? `${d.date}: ${d.count} contributions` : ""}
            >
              <div className="text-[10px] uppercase tracking-wider text-ink-faint">
                {dayLabel}
              </div>
              <div
                className={`w-9 h-9 rounded-full grid place-items-center text-xs transition ${
                  active
                    ? "text-white font-bold"
                    : "text-ink-faint border border-white/5"
                }`}
                style={
                  active
                    ? {
                        background: `linear-gradient(135deg, #8b5cf6, #22d3ee)`,
                        boxShadow: `0 0 12px rgba(139, 92, 246, 0.5)`,
                      }
                    : { background: "rgba(255,255,255,0.02)" }
                }
              >
                {active ? d.count : "—"}
              </div>
              {isToday && (
                <div className="w-1 h-1 rounded-full bg-cyan-400 glow-cyan" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
