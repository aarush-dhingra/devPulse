import { Link, NavLink } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import { useAuth } from "../../hooks/useAuth";
import { tierFor } from "../../utils/scoreUtils";
import { useStatsStore } from "../../store/statsStore";
import PlatformLogo from "../ui/PlatformLogo";
import SidebarDevScore from "./SidebarDevScore";

const items = [
  { to: ROUTES.dashboard, label: "Overview", icon: GridIcon },
  { to: "/dashboard/github",     label: "GitHub",        icon: PlatformIcon("github")     },
  { to: "/dashboard/leetcode",   label: "LeetCode",      icon: PlatformIcon("leetcode")   },
  { to: "/dashboard/gfg",        label: "GeeksForGeeks", icon: PlatformIcon("gfg")        },
  { to: "/dashboard/codeforces", label: "Codeforces",    icon: PlatformIcon("codeforces") },
  { to: "/dashboard/wakatime",   label: "Wakatime",      icon: PlatformIcon("wakatime")   },
  { to: "/dashboard/devto",      label: "Dev.to",        icon: PlatformIcon("devto")      },
  { to: ROUTES.leaderboard, label: "Leaderboard", icon: TrophyIcon, divider: true },
  { to: ROUTES.community,   label: "Community",   icon: GlobeIcon  },
  { to: ROUTES.wrapped,     label: "Wrapped",     icon: GiftIcon   },
  { to: ROUTES.settings,    label: "Settings",    icon: GearIcon, divider: true },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const data = useStatsStore((s) => s.data);
  const score = data?.devscore?.score ?? user?.devscore ?? 0;
  const tier  = data?.devscore?.tier  || tierFor(score);

  return (
    <aside
      className={`hidden md:flex shrink-0 flex-col border-r border-white/[0.05]
                  bg-black/80 backdrop-blur-xl sticky top-0 h-screen z-20
                  transition-[width] duration-250 ease-out overflow-hidden
                  ${collapsed ? "w-12" : "w-56"}`}
    >
      {/* Logo row + collapse toggle */}
      <div className={`flex items-center ${collapsed ? "justify-center px-0 py-3" : "gap-2.5 px-3 py-3"}`}>
        <Link
          to="/"
          className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 glow-violet shrink-0"
          title="DevPulse"
        >
          <span className="text-white font-black text-sm">⚡</span>
        </Link>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold text-base leading-none gradient-text">DevPulse</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-ink-faint mt-0.5">v0.1 · beta</div>
          </div>
        )}
        {/* Toggle button */}
        <button
          onClick={onToggle}
          className={`grid place-items-center w-6 h-6 rounded-md border border-white/10
                      text-ink-faint hover:text-ink hover:border-white/20 transition shrink-0
                      ${collapsed ? "mx-auto" : "ml-auto"}`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-1.5 py-1 overflow-y-auto overflow-x-hidden">
        {items.map((it, i) => (
          <div key={it.to}>
            {it.divider && i > 0 && (
              <div className={`my-1.5 border-t border-white/[0.05] ${collapsed ? "mx-1" : "mx-2"}`} />
            )}
            <NavLink
              to={it.to}
              end={it.to === ROUTES.dashboard}
              title={collapsed ? it.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg transition relative
                 ${collapsed ? "justify-center px-0 py-2" : "px-2.5 py-1.5 text-[13px]"}
                 ${isActive
                   ? "text-accent-200 bg-accent-500/10"
                   : "text-ink-muted hover:text-ink hover:bg-white/[0.03]"}`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-gradient-to-b from-accent-400 to-cyan-400" />
                  )}
                  {isActive && collapsed && (
                    <span
                      className="absolute inset-0 rounded-lg"
                      style={{ boxShadow: "inset 0 0 0 1px rgba(139,92,246,0.35), 0 0 14px rgba(139,92,246,0.25)" }}
                    />
                  )}
                  <span className={`grid place-items-center shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}>
                    {typeof it.icon === "function" ? <it.icon active={isActive} /> : it.icon}
                  </span>
                  {!collapsed && <span className="font-medium truncate">{it.label}</span>}
                </>
              )}
            </NavLink>
          </div>
        ))}
      </nav>

      {/* User card — visible in both modes */}
      {user && (
        <div
          className={`group/profile relative ${collapsed ? "m-1.5" : "m-2"}`}
          tabIndex={0}
        >
          <div
            className="rounded-xl border border-white/[0.06] bg-bg-card/95 backdrop-blur-xl
                       shadow-deep overflow-hidden
                       transition-all duration-300 ease-out
                       group-hover/profile:shadow-glow group-focus-within/profile:shadow-glow"
          >
            {/* HEAD */}
            <Link
              to={`/u/${user.username}`}
              className={`flex items-center gap-2.5 group/head
                          ${collapsed ? "justify-center p-2" : "p-2.5"}`}
              title={collapsed ? (user.name || user.username) : undefined}
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-lg ring-1 ring-white/10 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-cyan-500 grid place-items-center text-white font-bold shrink-0 text-xs">
                  {(user.name || user.username || "?")[0]?.toUpperCase()}
                </div>
              )}
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold truncate leading-tight group-hover/head:text-accent-200">
                      {user.name || user.username}
                    </div>
                    <div className="text-[10px] text-ink-muted truncate">@{user.username}</div>
                  </div>
                  <ChevronDown
                    className="text-ink-faint shrink-0 transition-transform duration-300
                               group-hover/profile:rotate-180 group-focus-within/profile:rotate-180"
                  />
                </>
              )}
            </Link>

            {/* EXPANDABLE DETAILS — only in expanded sidebar */}
            {!collapsed && (
              <div
                className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 ease-out
                           group-hover/profile:grid-rows-[1fr] group-hover/profile:opacity-100
                           group-focus-within/profile:grid-rows-[1fr] group-focus-within/profile:opacity-100"
              >
                <div className="overflow-hidden">
                  <div className="px-3 pt-1 pb-3 border-t border-white/[0.05]">
                    {/* Tier bar */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[9.5px] uppercase tracking-wider mb-1">
                        <span style={{ color: tier.color }}>{tier.emoji} {tier.name}</span>
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
                    <SidebarDevScore devscore={data?.devscore} />
                    <SidebarStreak data={data} />
                    <button
                      onClick={logout}
                      className="mt-3 w-full text-[11px] uppercase tracking-wider text-ink-faint hover:text-rose-300 transition py-1"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Collapsed: show sign-out on long-hover via title */}
          {collapsed && (
            <button
              onClick={logout}
              title="Sign out"
              className="mt-1 w-full grid place-items-center py-1 text-ink-faint hover:text-rose-300 transition"
            >
              <SignOutIcon />
            </button>
          )}
        </div>
      )}
    </aside>
  );
}

function PlatformIcon(platformId) {
  return function Icon({ active }) {
    return (
      <PlatformLogo
        platform={platformId}
        size={15}
        className={active ? "text-accent-200" : "text-ink-muted"}
      />
    );
  };
}

function SidebarStreak({ data }) {
  const stats = data?.stats || {};
  const gh  = stats.github    || {};
  const lc  = stats.leetcode  || {};
  const cf  = stats.codeforces || {};
  const wt  = stats.wakatime  || {};
  const gfg = stats.gfg       || {};

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayDow    = today.getUTCDay();
  const sinceMonday = (todayDow + 6) % 7;
  const monday      = new Date(today.getTime() - sinceMonday * 86400000);

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(monday.getTime() + i * 86400000);
    days.push({ iso: d.toISOString().slice(0, 10), future: d.getTime() > today.getTime() });
  }
  const totals = Object.fromEntries(days.map((d) => [d.iso, 0]));
  const add = (date, n) => { if (date in totals) totals[date] += Number(n) || 0; };
  for (const d of gh.contributions?.heatmap || []) add(d.date, d.count);
  for (const d of lc.dailySubmissions || []) add(d.date, d.count);
  for (const d of cf.dailySubmissions || []) add(d.date, d.count);
  for (const d of wt.dailyHours || []) add(d.date, d.hours);

  const streak = Math.max(Number(gh.contributions?.streakCurrent || 0), Number(gfg.streak || 0));
  const todayIso = today.toISOString().slice(0, 10);

  return (
    <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/40 p-3">
      <div className="flex items-center gap-1.5">
        <span className="text-xl drop-shadow-[0_0_8px_rgba(251,146,60,0.55)]">🔥</span>
        <span className="font-display font-extrabold text-2xl tabular-nums tracking-tight">{streak}</span>
        <span className="text-[10px] text-ink-muted ml-auto">Day Streak</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {["M","T","W","T","F","S","S"].map((l, i) => (
          <div key={i} className="text-center text-[9px] font-semibold text-ink-faint">{l}</div>
        ))}
        {days.map((d) => {
          const active  = totals[d.iso] > 0;
          const isToday = d.iso === todayIso;
          return (
            <div key={d.iso} className="flex justify-center">
              <span
                className="block rounded-full"
                style={{
                  width: 16, height: 16,
                  background: d.future ? "rgba(255,255,255,0.04)"
                    : active ? "radial-gradient(circle at 30% 30%, #34d399, #10b981 70%)"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: active ? "0 0 8px rgba(16,185,129,0.5)" : "inset 0 0 0 1px rgba(255,255,255,0.07)",
                  outline: isToday ? "1.5px solid rgba(255,255,255,0.4)" : "none",
                  outlineOffset: 2,
                }}
                title={d.iso}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───── tiny icon helpers ───── */
function ChevronLeft({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
function ChevronRight({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function ChevronDown({ className = "" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function SignOutIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function TrophyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3" />
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v9h14v-9M12 8v13" />
      <path d="M12 8c-3 0-4-3-2-4 1-.5 3 .5 2 4zM12 8c3 0 4-3 2-4-1-.5-3 .5-2 4z" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8L4.2 7a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
