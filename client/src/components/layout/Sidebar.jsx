import { Link, NavLink } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";
import { tierFor } from "../../utils/scoreUtils";
import { useStatsStore } from "../../store/statsStore";

const items = [
  { to: ROUTES.dashboard, label: "Overview", icon: GridIcon },
  { to: "/dashboard/github", label: "GitHub", icon: PlatformIcon("🐙") },
  { to: "/dashboard/leetcode", label: "LeetCode", icon: PlatformIcon("🧩") },
  { to: "/dashboard/gfg", label: "GeeksForGeeks", icon: PlatformIcon("🧠") },
  { to: "/dashboard/codeforces", label: "Codeforces", icon: PlatformIcon("⚔️") },
  { to: "/dashboard/wakatime", label: "Wakatime", icon: PlatformIcon("⏱️") },
  { to: "/dashboard/devto", label: "Dev.to", icon: PlatformIcon("✍️") },
  { to: ROUTES.leaderboard, label: "Leaderboard", icon: TrophyIcon, divider: true },
  { to: ROUTES.community, label: "Community", icon: GlobeIcon },
  { to: ROUTES.wrapped, label: "Wrapped", icon: GiftIcon },
  { to: ROUTES.settings, label: "Settings", icon: GearIcon, divider: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const data = useStatsStore((s) => s.data);
  const score = data?.devscore?.score ?? user?.devscore ?? 0;
  const tier = data?.devscore?.tier || tierFor(score);

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/[0.05] bg-bg-panel/60 backdrop-blur-xl sticky top-0 h-screen z-20">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-4">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 glow-violet">
          <span className="text-white font-black">⚡</span>
        </span>
        <div>
          <div className="font-display font-bold text-lg leading-none gradient-text">DevPulse</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-ink-faint mt-0.5">
            v0.1 · beta
          </div>
        </div>
      </Link>

      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {items.map((it, i) => (
          <div key={it.to}>
            {it.divider && i > 0 && <div className="hr-soft my-2 mx-2" />}
            <NavLink
              to={it.to}
              end={it.to === ROUTES.dashboard}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition relative
                 ${isActive
                    ? "text-accent-200 bg-accent-500/10"
                    : "text-ink-muted hover:text-ink hover:bg-white/[0.03]"
                  }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-accent-400 to-cyan-400 glow-violet" />
                  )}
                  <span className="w-5 h-5 grid place-items-center">
                    {typeof it.icon === "function" ? <it.icon active={isActive} /> : it.icon}
                  </span>
                  <span className="font-medium">{it.label}</span>
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {user && (
        <div className="m-3 panel-pad !p-3 holo-border">
          <Link
            to={`/u/${user.username}`}
            className="flex items-center gap-3 group"
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                className="w-10 h-10 rounded-xl ring-1 ring-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 grid place-items-center text-white font-bold">
                {(user.name || user.username || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate group-hover:text-accent-200">
                {user.name || user.username}
              </div>
              <div className="text-[11px] text-ink-muted truncate">
                @{user.username}
              </div>
            </div>
          </Link>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider mb-1">
              <span style={{ color: tier.color }}>
                {tier.emoji} {tier.name}
              </span>
              <span className="font-mono text-ink-muted">{score}/1000</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, (score / 1000) * 100)}%`,
                  background: `linear-gradient(90deg, ${tier.color}, #22d3ee)`,
                  boxShadow: `0 0 12px ${tier.color}80`,
                }}
              />
            </div>
          </div>

          <SidebarStreak data={data} />

          <button
            onClick={logout}
            className="mt-3 w-full text-[11px] uppercase tracking-wider text-ink-faint hover:text-rose-300 transition py-1"
          >
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}

function PlatformIcon(emoji) {
  return function Icon() {
    return <span className="text-base leading-none">{emoji}</span>;
  };
}

function SidebarStreak({ data }) {
  const stats = data?.stats || {};
  const gh = stats.github || {};
  const lc = stats.leetcode || {};
  const cf = stats.codeforces || {};
  const wt = stats.wakatime || {};
  const gfg = stats.gfg || {};

  // Build a 7-day map keyed by ISO date (UTC).
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push(d.toISOString().slice(0, 10));
  }
  const totals = Object.fromEntries(days.map((d) => [d, 0]));
  const add = (date, n) => {
    if (date in totals) totals[date] += Number(n) || 0;
  };
  for (const d of gh.contributions?.heatmap || []) add(d.date, d.count);
  for (const d of lc.dailySubmissions || []) add(d.date, d.count);
  for (const d of cf.dailySubmissions || []) add(d.date, d.count);
  for (const d of wt.dailyHours || []) add(d.date, d.hours);

  const dayLetters = ["S", "M", "T", "W", "T", "F", "S"];
  const todayDow = today.getUTCDay();

  // Streak (combined): use the same formula as combined heatmap but cheaper.
  const streak = Math.max(
    Number(gh.contributions?.streakCurrent || 0),
    Number(gfg.streak || 0)
  );

  return (
    <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">🔥</span>
        <span className="font-display font-bold text-2xl tabular-nums">
          {streak}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-faint">
          Day Streak
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-7 gap-1.5">
        {days.map((date, idx) => {
          const dow = (todayDow - 6 + idx + 7) % 7;
          const active = totals[date] > 0;
          return (
            <div key={date} className="flex flex-col items-center gap-1">
              <div
                className={`w-6 h-6 rounded-md grid place-items-center text-[10px] transition ${
                  active
                    ? "bg-gradient-to-br from-accent-500/40 to-cyan-500/30 text-ink ring-1 ring-accent-500/40"
                    : "bg-white/[0.04] text-ink-faint ring-1 ring-white/5"
                }`}
                style={
                  active
                    ? { boxShadow: "0 0 10px rgba(167,139,250,0.4)" }
                    : undefined
                }
                title={`${date}${active ? "" : " — no activity"}`}
              >
                {active ? "✓" : ""}
              </div>
              <span
                className={`text-[9px] uppercase ${
                  idx === 6 ? "text-accent-300 font-bold" : "text-ink-faint"
                }`}
              >
                {dayLetters[dow]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v9h14v-9M12 8v13" />
      <path d="M12 8c-3 0-4-3-2-4 1-.5 3 .5 2 4zM12 8c3 0 4-3 2-4-1-.5-3 .5-2 4z" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
