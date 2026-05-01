import { useStats } from "../hooks/useStats";
import { tierFor } from "../utils/scoreUtils";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";

export default function DevWrapped() {
  const { data, loading } = useStats();

  if (loading || !data) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Spinner size={32} label="Cooking your wrapped…" />
      </div>
    );
  }

  const stats = data.stats || {};
  const platforms = data.platforms || [];
  const connectedNames = new Set(
    platforms
      .filter((p) => p.status === "connected" && stats[p.platform_name])
      .map((p) => p.platform_name)
  );

  const tier = data.devscore?.tier || tierFor(data.devscore?.score || 0);

  const candidates = [
    {
      key: "github",
      bg: "from-purple-600 via-fuchsia-500 to-pink-500",
      title: () => `You shipped ${stats.github?.contributions?.total ?? 0} contributions on GitHub`,
      sub: () =>
        `Across ${stats.github?.repos?.totalRepos ?? 0} repos · ${stats.github?.repos?.stars ?? 0} stars earned ⭐`,
    },
    {
      key: "leetcode",
      bg: "from-amber-500 via-orange-500 to-red-500",
      title: () => `You solved ${stats.leetcode?.solved?.total ?? 0} LeetCode problems`,
      sub: () =>
        `Easy ${stats.leetcode?.solved?.easy ?? 0} · Medium ${stats.leetcode?.solved?.medium ?? 0} · Hard ${stats.leetcode?.solved?.hard ?? 0}`,
    },
    {
      key: "wakatime",
      bg: "from-teal-400 via-cyan-500 to-sky-500",
      title: () => `You coded ${Math.round(stats.wakatime?.hoursLast30Days ?? 0)} hours last month`,
      sub: () => {
        const top = stats.wakatime?.languages?.[0];
        return `${(stats.wakatime?.dailyAverageHours ?? 0).toFixed?.(1)}h/day avg${top ? ` · favorite: ${top.name}` : ""}`;
      },
    },
    {
      key: "codeforces",
      bg: "from-rose-500 via-pink-500 to-fuchsia-500",
      title: () => `Codeforces rating: ${stats.codeforces?.rating ?? 0}`,
      sub: () =>
        `${stats.codeforces?.contestsAttended ?? 0} contests · ${stats.codeforces?.uniqueSolved ?? 0} unique problems solved`,
    },
    {
      key: "gfg",
      bg: "from-emerald-500 via-green-500 to-teal-500",
      title: () => `GFG Score: ${stats.gfg?.score ?? 0}`,
      sub: () => `${stats.gfg?.problemsSolved ?? 0} solved · ${stats.gfg?.maxStreak ?? 0}d streak`,
    },
  ];

  const slides = candidates.filter((c) => connectedNames.has(c.key));

  // Always include the DevScore finale slide
  slides.push({
    key: "devscore",
    bg: "from-violet-600 via-purple-500 to-indigo-500",
    title: () => `Your DevScore: ${data.devscore?.score ?? 0}`,
    sub: () => `Tier: ${tier.emoji} ${tier.name}`,
  });

  if (connectedNames.size === 0) {
    return (
      <EmptyState
        icon="🎁"
        title="Nothing to wrap up yet"
        description="Connect a platform first — your Wrapped only shows the platforms you've actually used."
        action={
          <Link to="/settings">
            <Button>Connect platforms</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-display font-extrabold tracking-tight gradient-text">
          DevVitals Wrapped
        </h1>
        <p className="text-ink-muted mt-1">
          Your year in code, distilled. Showing the platforms you actually used.
        </p>
      </header>

      <div className="space-y-4">
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={`relative overflow-hidden rounded-3xl p-8 bg-gradient-to-br ${s.bg} text-white shadow-glow holo-border`}
          >
            <div className="text-xs uppercase tracking-[0.3em] opacity-80 mb-3">
              #{String(i + 1).padStart(2, "0")} of {slides.length}
            </div>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold leading-tight text-shadow-soft">
              {s.title()}
            </h2>
            <p className="mt-2 opacity-90 text-lg">{s.sub()}</p>
            <div
              className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-white/20 blur-3xl"
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}
