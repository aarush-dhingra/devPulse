import { useState } from "react";
import EmptyState from "../ui/EmptyState";
import { relativeTime } from "../../utils/formatters";
import PlatformLogo, { PLATFORM_LOGO_PATHS } from "../ui/PlatformLogo";

const SOURCE_META = {
  internal: { label: "DevPulse", color: "rgba(124,58,237,0.18)" },
  leetcode: { label: "LeetCode", color: "rgba(255,161,22,0.18)", brand: "#ffa116" },
  github: { label: "GitHub", color: "rgba(255,255,255,0.10)", brand: "#e6edf3" },
  codeforces: { label: "Codeforces", color: "rgba(254,100,111,0.18)", brand: "#fe646f" },
  gfg: { label: "GFG", color: "rgba(47,141,70,0.18)", brand: "#2f8d46" },
};

function normalizeIcon(icon, source) {
  if (!icon) return null;
  if (icon.startsWith("http")) return icon;
  if (source === "leetcode" && icon.startsWith("/")) {
    return `https://leetcode.com${icon}`;
  }
  return null;
}

function buildAchievements(badges, stats) {
  const items = [];

  for (const b of badges || []) {
    items.push({
      id: `internal:${b.slug}`,
      source: "internal",
      icon: b.icon || "🏅",
      iconImg: null,
      name: b.name || b.slug,
      description: b.description || "",
      awardedAt: b.awardedAt,
    });
  }

  // LeetCode external badges
  for (const b of stats?.leetcode?.badges || []) {
    items.push({
      id: `leetcode:${b.id || b.displayName}`,
      source: "leetcode",
      icon: "🧩",
      iconImg: normalizeIcon(b.icon, "leetcode"),
      name: b.displayName || b.name || "LeetCode Badge",
      description: "Awarded by LeetCode",
      awardedAt: b.creationDate
        ? new Date(b.creationDate + "T12:00:00Z").toISOString()
        : null,
    });
  }

  // Derived GitHub milestones (REST API doesn't expose user achievements)
  const ghContribs = Number(stats?.github?.contributions?.total || 0);
  const ghPRs = Number(stats?.github?.contributions?.mergedPRs || 0);
  const ghStars = Number(stats?.github?.repos?.stars || 0);
  const ghStreak = Number(stats?.github?.contributions?.streakLongest || 0);
  const ghLogin = stats?.github?.profile?.username;

  const ghMilestones = [
    { id: "100", v: 100, n: "Centurion", d: "100+ GitHub contributions" },
    { id: "500", v: 500, n: "Half-K Coder", d: "500+ GitHub contributions" },
    { id: "1k", v: 1000, n: "Kilocommitter", d: "1,000+ GitHub contributions" },
    { id: "5k", v: 5000, n: "Mythic Maintainer", d: "5,000+ GitHub contributions" },
  ];
  for (const m of ghMilestones) {
    if (ghContribs >= m.v) {
      items.push({
        id: `github:contrib:${m.id}`,
        source: "github",
        icon: "🐙",
        iconImg: null,
        name: m.n,
        description: m.d,
        awardedAt: null,
      });
    }
  }
  if (ghPRs >= 10) {
    items.push({
      id: "github:pr:10",
      source: "github",
      icon: "🔀",
      iconImg: null,
      name: "PR Pro",
      description: `${ghPRs} pull requests merged`,
      awardedAt: null,
    });
  }
  if (ghStars >= 10) {
    items.push({
      id: "github:stars",
      source: "github",
      icon: "⭐",
      iconImg: null,
      name: "Starred",
      description: `${ghStars} stars across your repos`,
      awardedAt: null,
    });
  }
  if (ghStreak >= 30) {
    items.push({
      id: "github:streak",
      source: "github",
      icon: "🔥",
      iconImg: null,
      name: "GitHub Streak",
      description: `Longest streak: ${ghStreak} days`,
      awardedAt: null,
    });
  }

  // Codeforces & GFG simple milestones
  const cfRating = Number(stats?.codeforces?.rating || 0);
  if (cfRating >= 1200) {
    const tier =
      cfRating >= 2400 ? "International Grandmaster" :
      cfRating >= 2100 ? "Grandmaster" :
      cfRating >= 1900 ? "Master" :
      cfRating >= 1600 ? "Expert" :
      cfRating >= 1400 ? "Specialist" : "Pupil";
    items.push({
      id: "cf:tier",
      source: "codeforces",
      icon: "⚔️",
      iconImg: null,
      name: tier,
      description: `Codeforces rating ${cfRating}`,
      awardedAt: null,
    });
  }

  const gfgScore = Number(stats?.gfg?.score || 0);
  if (gfgScore >= 100) {
    items.push({
      id: "gfg:score",
      source: "gfg",
      icon: "🧠",
      iconImg: null,
      name: "GFG Coder",
      description: `Coding score ${gfgScore}`,
      awardedAt: null,
    });
  }

  // Sort: dated first (recent), then undated
  items.sort((a, b) => {
    if (a.awardedAt && b.awardedAt) {
      return new Date(b.awardedAt) - new Date(a.awardedAt);
    }
    if (a.awardedAt) return -1;
    if (b.awardedAt) return 1;
    return 0;
  });

  return { items, ghLogin };
}

export default function RecentAchievements({ badges = [], stats, limit = 8 }) {
  const [expanded, setExpanded] = useState(false);
  const { items } = buildAchievements(badges, stats);
  const list = expanded ? items : items.slice(0, limit);

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg">Recent Achievements</h3>
        <span className="text-[11px] text-ink-faint uppercase tracking-wider">
          {items.length} earned
        </span>
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="No badges yet"
          description="Keep coding daily — badges unlock as you hit streaks, solve problems, and push commits."
          action={
            <a href="/settings" className="text-[11px] text-accent-300 hover:underline">
              → Connect platforms to start earning badges
            </a>
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {list.map((b) => {
              const meta = SOURCE_META[b.source] || SOURCE_META.internal;
              return (
                <li
                  key={b.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-accent-500/30 transition group"
                >
                  <span
                    className="w-10 h-10 rounded-xl grid place-items-center text-xl ring-1 ring-white/10 shrink-0 overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, ${meta.color}, rgba(34,211,238,0.10))`,
                      boxShadow: "0 0 18px rgba(124,58,237,0.20)",
                    }}
                  >
                    {b.iconImg ? (
                      <img
                        src={b.iconImg}
                        alt=""
                        className="w-7 h-7 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : PLATFORM_LOGO_PATHS[b.source] ? (
                      <PlatformLogo
                        platform={b.source}
                        size={20}
                        color={meta.brand}
                      />
                    ) : (
                      <span>{b.icon || "🏅"}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm truncate">{b.name}</span>
                      <span className="text-[9px] uppercase tracking-wider text-ink-faint shrink-0">
                        {meta.label}
                      </span>
                    </div>
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
              );
            })}
          </ul>
          {items.length > limit && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 w-full text-[11px] uppercase tracking-wider text-accent-300 hover:text-accent-200 py-1.5 transition"
            >
              {expanded ? "Show less" : `View all ${items.length} →`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
