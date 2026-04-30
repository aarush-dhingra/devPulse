import EmptyState from "../ui/EmptyState";
import { relativeTime } from "../../utils/formatters";

export default function RecentAchievements({ badges = [], limit = 6 }) {
  const list = [...(badges || [])]
    .sort(
      (a, b) =>
        new Date(b.awardedAt || 0).getTime() - new Date(a.awardedAt || 0).getTime()
    )
    .slice(0, limit);

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg">Recent Achievements</h3>
        <span className="text-[11px] text-ink-faint uppercase tracking-wider">
          {badges?.length || 0} earned
        </span>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No badges yet"
          description="Keep coding — badges unlock automatically as you hit milestones."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((b) => (
            <li
              key={b.slug}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-accent-500/30 transition group"
            >
              <span
                className="w-10 h-10 rounded-xl grid place-items-center text-xl ring-1 ring-white/10 shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(34,211,238,0.10))",
                  boxShadow: "0 0 18px rgba(124,58,237,0.25)",
                }}
              >
                {b.icon || "🏅"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{b.name || b.slug}</div>
                <div className="text-[11px] text-ink-muted truncate">
                  {b.description || "—"}
                </div>
              </div>
              {b.awardedAt && (
                <span className="text-[10px] uppercase tracking-wider text-ink-faint shrink-0">
                  {relativeTime(b.awardedAt)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
