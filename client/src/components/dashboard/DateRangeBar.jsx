/**
 * DateRangeBar — global time-window filter at the top of the Dashboard.
 *
 * Currently controls the Problems Solved + Coding Time series period. The
 * heatmap stays at full year; the bar still surfaces the visible window so
 * the user always knows what window the charts cover.
 */
const PERIODS = [
  { id: "7d", label: "This Week", days: 7 },
  { id: "30d", label: "This Month", days: 30 },
  { id: "90d", label: "Last 90d", days: 90 },
  { id: "1y", label: "This Year", days: 365 },
];

function fmt(d) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DateRangeBar({ period, onChange, refreshing, onRefresh, compact = false }) {
  const meta = PERIODS.find((p) => p.id === period) || PERIODS[2];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end.getTime() - (meta.days - 1) * 86400000);

  return (
    <div className={`flex items-center gap-2 flex-wrap ${compact ? "" : "panel rounded-xl px-3 py-2"}`}>
      {!compact && (
        <div className="flex items-center gap-2 text-[12px] text-ink-muted">
          <CalendarIcon />
          <span className="font-mono tabular-nums">
            {fmt(start)} <span className="text-ink-faint">—</span> {fmt(end)}
          </span>
        </div>
      )}

      <div className={`${compact ? "" : "ml-auto "}flex items-center gap-1 rounded-full bg-white/[0.04] p-0.5 border border-white/[0.06]`}>
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={`px-3 py-1 text-[11px] font-medium rounded-full transition ${
              period === p.id
                ? "bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/40"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="px-2.5 py-1 text-[11px] font-medium rounded-full
                     border border-white/10 text-ink-muted
                     hover:text-accent-200 hover:border-accent-500/40
                     disabled:opacity-50 transition flex items-center gap-1.5"
          title="Refetch stats"
        >
          {refreshing ? <SpinnerIcon /> : <RefreshIcon />}
          <span className="hidden sm:inline">Refresh</span>
        </button>
      )}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg
      className="animate-spin"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
