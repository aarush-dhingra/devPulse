import { Link } from "react-router-dom";
import { relativeTime } from "../../utils/formatters";
import { PLATFORM_BY_ID } from "../../utils/constants";
import EmptyState from "../ui/EmptyState";

const EVENT_LABELS = {
  stats_refreshed: "stats refreshed",
  badge_awarded: "earned a badge",
  platform_connected: "connected a platform",
};

export default function ActivityFeed({ events = [], title = "Recent Activity" }) {
  if (!events.length) {
    return (
      <div className="panel-pad">
        <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
        <EmptyState
          icon="📡"
          title="Quiet for now"
          description="As you ship code, solve problems, or earn badges, your activity will land here."
        />
      </div>
    );
  }

  return (
    <div className="panel-pad">
      <h3 className="font-display font-bold text-lg mb-3">{title}</h3>
      <ul className="space-y-2">
        {events.map((e) => {
          const platform = PLATFORM_BY_ID[e.platform];
          return (
            <li
              key={e.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition"
            >
              {e.avatar_url ? (
                <Link to={`/u/${e.username}`}>
                  <img
                    src={e.avatar_url}
                    alt=""
                    className="w-9 h-9 rounded-xl ring-1 ring-white/10"
                  />
                </Link>
              ) : (
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center text-base ring-1 ring-white/10"
                  style={{ background: platform?.bg, color: platform?.color }}
                >
                  {platform?.icon || "•"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">
                    {e.username ? (
                      <Link to={`/u/${e.username}`} className="hover:text-accent-300">
                        {e.name || e.username}
                      </Link>
                    ) : (
                      "You"
                    )}
                  </span>{" "}
                  <span className="text-ink-muted">
                    {EVENT_LABELS[e.event_type] || e.event_type}
                  </span>
                </p>
                <p className="text-[11px] text-ink-faint mt-0.5">
                  {platform?.name || e.platform} · {relativeTime(e.created_at)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
