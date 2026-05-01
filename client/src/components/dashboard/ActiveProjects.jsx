import { Link } from "react-router-dom";
import { colorForLang } from "../../utils/constants";

/**
 * ActiveProjects — GitHub repos as a prioritised project list.
 * Shows: status badge (active/stale), last push time, progress bar,
 * language dot, and star count.
 */

function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days < 30)   return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function isActive(pushedAt) {
  if (!pushedAt) return false;
  return Date.now() - new Date(pushedAt).getTime() < 14 * 86400000; // 2 weeks
}

export default function ActiveProjects({ github }) {
  const repos = (() => {
    if (Array.isArray(github?.repos?.list) && github.repos.list.length) {
      return github.repos.list;
    }
    if (github?.repos?.topRepo) return [github.repos.topRepo];
    return [];
  })();

  const maxStars = repos.reduce((m, r) => Math.max(m, Number(r.stars || 0)), 0);
  const sorted   = [...repos].sort((a, b) => {
    const da = new Date(a.pushedAt || 0).getTime();
    const db = new Date(b.pushedAt || 0).getTime();
    return db - da;
  });

  if (repos.length === 0) {
    return (
      <div className="panel-pad flex flex-col h-full">
        <h3 className="font-display font-bold text-lg mb-3">Active Projects</h3>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 text-center">
          <div className="text-3xl opacity-40">📦</div>
          <p className="text-sm font-medium text-ink-muted">No GitHub repos yet</p>
          <p className="text-[11px] text-ink-faint">Push code to GitHub — top projects appear here</p>
          <Link to="/settings" className="text-[11px] text-accent-300 hover:underline mt-1">
            → Connect GitHub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg">Active Projects</h3>
        {github?.profile?.username && (
          <a
            className="text-[11px] uppercase tracking-wider text-accent-300 hover:underline"
            href={`https://github.com/${github.profile.username}?tab=repositories`}
            target="_blank"
            rel="noreferrer"
          >
            View all →
          </a>
        )}
      </div>

      <ul className="space-y-2">
        {sorted.slice(0, 5).map((r) => {
          const stars   = Number(r.stars || 0);
          const pct     = maxStars > 0 ? (stars / maxStars) * 100 : 0;
          const color   = r.language ? colorForLang(r.language) : "#A78BFA";
          const active  = isActive(r.pushedAt);
          const lastPush = timeAgo(r.pushedAt);

          return (
            <li
              key={r.name}
              className="rounded-xl border border-white/5 bg-white/[0.02] hover:border-accent-500/25 transition-all duration-200 px-3 py-2.5"
            >
              {/* Row 1: name + status + stars */}
              <div className="flex items-center gap-2">
                <a
                  href={r.url || `https://github.com/${github?.profile?.username}/${r.name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-sm truncate hover:text-accent-200 transition-colors"
                >
                  {r.name}
                </a>
                {/* Active/Stale badge */}
                <span
                  className={`shrink-0 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border font-bold ${
                    active
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                      : "text-ink-faint bg-white/[0.03] border-white/[0.06]"
                  }`}
                >
                  {active ? "Active" : "Stale"}
                </span>
                <span className="ml-auto text-[11px] text-ink-faint tabular-nums shrink-0">
                  ★ {stars}
                </span>
              </div>

              {/* Row 2: last push + language */}
              <div className="flex items-center gap-3 mt-1">
                {lastPush && (
                  <span className={`text-[10px] ${active ? "text-emerald-400/70" : "text-ink-faint"}`}>
                    {active ? "🟢 " : "⚪ "}pushed {lastPush}
                  </span>
                )}
                {r.language && (
                  <span className="flex items-center gap-1 text-[10px] text-ink-muted ml-auto shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {r.language}
                  </span>
                )}
              </div>

              {/* Row 3: star-based progress bar */}
              <div className="mt-2 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(6, pct)}%`,
                    background: `linear-gradient(90deg, ${color}, #22d3ee)`,
                    boxShadow: `0 0 8px ${color}55`,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
