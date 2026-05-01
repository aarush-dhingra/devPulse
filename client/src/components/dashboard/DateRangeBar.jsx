/**
 * DateRangeBar — global time-window filter for the Dashboard.
 *
 * Selecting a window updates the centralized `period` state in Dashboard,
 * which flows down to the heatmap, pie chart, problems chart, activity
 * timeline, and stats cards. Refresh lives in the global TopBar — this
 * bar is purely for date filtering.
 */
export const PERIODS = [
  { id: "7d",  label: "This Week",   short: "7D",  days: 7   },
  { id: "30d", label: "This Month",  short: "30D", days: 30  },
  { id: "90d", label: "Last 90 Days", short: "90D", days: 90  },
  { id: "1y",  label: "This Year",   short: "1Y",  days: 365 },
];

export const PERIOD_BY_ID = Object.fromEntries(PERIODS.map((p) => [p.id, p]));

export function periodToDays(id) {
  return PERIOD_BY_ID[id]?.days ?? 90;
}

function fmt(d) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DateRangeBar({ period, onChange, compact = false }) {
  const meta = PERIOD_BY_ID[period] || PERIODS[2];
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
            title={p.label}
          >
            {p.label}
          </button>
        ))}
      </div>
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
