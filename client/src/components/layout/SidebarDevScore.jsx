import PlatformLogo from "../ui/PlatformLogo";

const COMPONENTS = [
  { key: "github", label: "GitHub", color: "#e6edf3" },
  { key: "leetcode", label: "LeetCode", color: "#ffa116" },
  { key: "wakatime", label: "Wakatime", color: "#22d3ee" },
  { key: "codeforces", label: "Codeforces", color: "#fe646f" },
  { key: "gfg", label: "GeeksForGeeks", color: "#10b981" },
];

/**
 * Compact DevScore breakdown for the left sidebar.
 *
 * Renders each component (0–100) as a tiny bar with the platform's brand
 * color. Designed to live inside the sidebar's user card, below the tier
 * progress bar and above the streak section.
 */
export default function SidebarDevScore({ devscore }) {
  const components = devscore?.components || {};
  const hasAny = COMPONENTS.some(
    (c) => Number(components[c.key] || 0) > 0
  );

  return (
    <div className="mt-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-faint mb-2">
        Score Breakdown
      </div>
      {!hasAny ? (
        <p className="text-[11px] text-ink-faint italic">
          Connect platforms to fill your score.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {COMPONENTS.map((c) => {
            const v = Math.max(0, Math.min(100, Math.round(components[c.key] || 0)));
            return (
              <li key={c.key}>
                <div className="flex items-center gap-1.5 text-[10.5px] text-ink-muted mb-0.5">
                  <PlatformLogo platform={c.key} size={10} color={c.color} />
                  <span className="flex-1 truncate">{c.label}</span>
                  <span className="font-mono text-ink-dim tabular-nums">
                    {v}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-700 ease-out"
                    style={{
                      width: `${v}%`,
                      background: `linear-gradient(90deg, ${c.color}, ${c.color}aa)`,
                      boxShadow: v > 0 ? `0 0 6px ${c.color}80` : undefined,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
