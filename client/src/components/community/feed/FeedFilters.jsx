import clsx from "clsx";
import { useFeedStore } from "../../../store/feedStore";

const TABS = [
  { id: "all", label: "For You" },
  { id: "following", label: "Following" },
];

export default function FeedFilters() {
  const { tab, setTab } = useFeedStore();

  return (
    <div className="flex items-center gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06] mb-4">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={clsx(
            "flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors",
            tab === t.id
              ? "bg-accent-500/20 text-accent-300 border border-accent-500/30"
              : "text-ink-faint hover:text-ink"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
