import EmptyState from "../ui/EmptyState";
import { colorForLang } from "../../utils/constants";

/**
 * Top GitHub repos rendered as a list with a star-based progress bar.
 * Source: stats.github.repos.topRepo + stats.github.repos.languages
 *
 * Because the existing GitHub service surfaces only `topRepo` (not a list),
 * we accept a `repos` array prop to allow future expansion. We also fall
 * back to building a single-item list from `topRepo` if no array is provided.
 */
export default function ActiveProjects({ github }) {
  const repos = (() => {
    if (Array.isArray(github?.repos?.list) && github.repos.list.length) {
      return github.repos.list;
    }
    if (github?.repos?.topRepo) return [github.repos.topRepo];
    return [];
  })();

  const maxStars = repos.reduce((m, r) => Math.max(m, Number(r.stars || 0)), 0);

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

      {repos.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No GitHub repos yet"
          description="Push code to GitHub — we'll surface your top projects here."
        />
      ) : (
        <ul className="space-y-2.5">
          {repos.slice(0, 6).map((r) => {
            const stars = Number(r.stars || 0);
            const pct = maxStars > 0 ? (stars / maxStars) * 100 : 0;
            const color = r.language ? colorForLang(r.language) : "#A78BFA";
            return (
              <li
                key={r.name}
                className="rounded-xl border border-white/5 bg-white/[0.02] hover:border-accent-500/30 transition px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <a
                    href={r.url || `https://github.com/${github?.profile?.username}/${r.name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sm truncate hover:text-accent-200"
                  >
                    {r.name}
                  </a>
                  <span className="ml-auto text-[11px] text-ink-faint tabular-nums shrink-0">
                    ★ {stars}
                  </span>
                </div>
                {r.description && (
                  <div className="text-[11px] text-ink-muted truncate mt-0.5">
                    {r.description}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2">
                  {r.language && (
                    <span className="flex items-center gap-1 text-[10px] text-ink-muted shrink-0">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: color }}
                      />
                      {r.language}
                    </span>
                  )}
                  <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden flex-1">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.max(6, pct)}%`,
                        background: `linear-gradient(90deg, ${color}, #22d3ee)`,
                        boxShadow: `0 0 10px ${color}66`,
                      }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
