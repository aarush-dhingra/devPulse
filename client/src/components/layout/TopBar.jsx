import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useStatsStore } from "../../store/statsStore";

const QUOTES = [
  "Code. Learn. Optimize. Repeat.",
  "First, solve the problem. Then, write the code.",
  "Discipline beats motivation.",
  "Today's commits become tomorrow's superpowers.",
  "Make it work, make it right, make it fast.",
];

export default function TopBar() {
  const { user } = useAuth();
  const refreshMine = useStatsStore((s) => s.refreshMine);
  const fetchMine = useStatsStore((s) => s.fetchMine);
  const lastFetched = useStatsStore((s) => s.lastFetched);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const quote = QUOTES[new Date().getDay() % QUOTES.length];
  const greeting = greetingFor();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMine();
      await fetchMine(true);
    } finally {
      setRefreshing(false);
    }
  };

  const onSearch = (e) => {
    e.preventDefault();
    const q = query.trim().replace(/^@/, "");
    if (q) navigate(`/u/${encodeURIComponent(q)}`);
  };

  return (
    <header className="sticky top-0 z-10 bg-bg/70 backdrop-blur-xl border-b border-white/[0.05]">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
        <div className="hidden md:block min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display font-bold text-xl tracking-tight">
              {greeting}, {user?.name?.split(" ")[0] || user?.username} 👋
            </h1>
          </div>
          <p className="text-xs text-ink-muted truncate italic">
            "{quote}"
          </p>
        </div>

        <form
          onSubmit={onSearch}
          className="hidden lg:flex items-center gap-2 bg-white/[0.03] border border-white/10 rounded-xl px-3 py-1.5 w-72"
        >
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a dev by username…"
            className="bg-transparent flex-1 text-sm placeholder:text-ink-faint focus:outline-none"
          />
          <kbd className="text-[10px] text-ink-faint border border-white/10 rounded px-1.5 py-0.5">
            ↵
          </kbd>
        </form>

        <button
          onClick={onRefresh}
          className="btn-ghost text-xs"
          disabled={refreshing}
          title={lastFetched ? `Last refresh ${new Date(lastFetched).toLocaleTimeString()}` : ""}
        >
          {refreshing ? <Spinner /> : <RefreshIcon />} Refresh
        </button>
      </div>
    </header>
  );
}

function greetingFor() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Late night vibes";
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  );
}
function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
