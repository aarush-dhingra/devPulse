export default function StreakTracker({ stats }) {
  const ghCurrent = stats?.github?.contributions?.streakCurrent ?? 0;
  const ghLongest = stats?.github?.contributions?.streakLongest ?? 0;
  const gfgCurrent = stats?.gfg?.streak ?? 0;
  const gfgMax = stats?.gfg?.maxStreak ?? 0;
  const combinedCurrent = Math.max(ghCurrent, gfgCurrent);
  const combinedLongest = Math.max(ghLongest, gfgMax);

  const items = [
    { label: "Current", value: combinedCurrent, color: "#f59e0b", icon: "🔥" },
    { label: "Longest", value: combinedLongest, color: "#a855f7", icon: "🏔️" },
    { label: "GitHub", value: ghCurrent, color: "#94a3b8", icon: "🐙" },
    { label: "GFG", value: gfgCurrent, color: "#10b981", icon: "🧠" },
  ];

  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">Streaks</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl p-3 border border-white/5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${it.color}1a, transparent)`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-ink-muted">
                {it.label}
              </div>
              <span className="text-lg" aria-hidden>{it.icon}</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl stat-num" style={{ color: it.color }}>
                {it.value}
              </span>
              <span className="text-xs text-ink-faint">days</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
