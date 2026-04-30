import { Link } from "react-router-dom";
import { PLATFORMS, ROUTES } from "../../utils/constants";

export default function PlatformBadges({ platforms = [] }) {
  const byId = Object.fromEntries(platforms.map((p) => [p.platform_name, p]));

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg">Connected Platforms</h3>
        <Link to={ROUTES.settings} className="text-xs text-accent-300 hover:text-accent-200">
          Manage →
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {PLATFORMS.map((p) => {
          const conn = byId[p.id];
          const status = conn?.status || "disconnected";
          const target = conn ? `/dashboard/${p.id}` : ROUTES.settings;
          return (
            <Link
              key={p.id}
              to={target}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/5 bg-white/[0.03] hover:border-accent-500/30 hover:bg-white/[0.05] transition group"
              title={conn?.platform_username || "Click to connect"}
            >
              <span
                className="w-9 h-9 grid place-items-center rounded-lg text-base ring-1 ring-white/10"
                style={{ background: p.bg, color: p.color }}
              >
                {p.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <StatusBadge status={status} />
              </div>
              <span className="text-ink-faint group-hover:text-accent-300 transition">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    connected: { label: "Connected", color: "#10b981" },
    pending: { label: "Pending", color: "#f59e0b" },
    error: { label: "Error", color: "#ef4444" },
    disconnected: { label: "Off", color: "#64748b" },
  };
  const s = map[status] || map.disconnected;
  return (
    <span
      style={{ color: s.color }}
      className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold"
    >
      <span
        className={`inline-block w-1.5 h-1.5 rounded-full ${
          status === "pending" ? "animate-pulseGlow" : ""
        }`}
        style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }}
      />
      {s.label}
    </span>
  );
}
