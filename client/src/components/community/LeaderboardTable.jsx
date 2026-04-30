import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import { tierFor } from "../../utils/scoreUtils";
import EmptyState from "../ui/EmptyState";

export default function LeaderboardTable({ rows = [] }) {
  if (!rows.length) {
    return (
      <EmptyState
        icon="🏆"
        title="Leaderboard is warming up"
        description="Connect your platforms to be among the first ranked devs."
      />
    );
  }
  return (
    <div className="panel overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.03] text-ink-muted text-[10px] uppercase tracking-[0.2em]">
          <tr>
            <th className="text-left px-4 py-3 w-16">Rank</th>
            <th className="text-left px-4 py-3">Dev</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">Tier</th>
            <th className="text-right px-4 py-3">DevScore</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((u, i) => {
            const tier = tierFor(u.devscore || 0);
            const rank = i + 1;
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            return (
              <tr key={u.id} className="hover:bg-white/[0.03] transition group">
                <td className="px-4 py-3 font-mono">
                  <span className={`flex items-center gap-1 ${rank <= 3 ? "" : "text-ink-muted"}`}>
                    {medal || `#${rank}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={ROUTES.profile(u.username)} className="flex items-center gap-3 group-hover:text-accent-300">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-xl ring-1 ring-white/10" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 grid place-items-center text-white text-sm font-bold">
                        {(u.name || u.username)[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{u.name || u.username}</div>
                      <div className="text-[11px] text-ink-faint">@{u.username}</div>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span
                    className="pill"
                    style={{
                      borderColor: `${tier.color}40`,
                      color: tier.color,
                      background: `${tier.color}1a`,
                    }}
                  >
                    {tier.emoji} {tier.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-shadow-soft">
                  {u.devscore}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
