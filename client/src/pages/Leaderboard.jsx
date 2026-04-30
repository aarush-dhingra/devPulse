import { useState } from "react";
import LeaderboardTable from "../components/community/LeaderboardTable";
import Spinner from "../components/ui/Spinner";
import { useLeaderboard } from "../hooks/useLeaderboard";

const METRICS = [
  { id: "devscore", label: "DevScore" },
  { id: "github", label: "GitHub" },
  { id: "leetcode", label: "LeetCode" },
  { id: "codeforces", label: "Codeforces" },
  { id: "wakatime", label: "Wakatime" },
];

const PAGE_SIZE = 50;

export default function Leaderboard() {
  const [metric, setMetric] = useState("devscore");
  const [page, setPage] = useState(0);
  const offset = page * PAGE_SIZE;
  const { results = [], loading, total } = useLeaderboard({
    metric,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl gradient-text">
            Leaderboard
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Top devs ranked by{" "}
            <span className="text-ink font-semibold">
              {METRICS.find((m) => m.id === metric)?.label}
            </span>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {METRICS.map((m) => (
            <button
              key={m.id}
              className={`pill cursor-pointer transition ${
                m.id === metric ? "pill-accent" : ""
              }`}
              onClick={() => {
                setMetric(m.id);
                setPage(0);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </header>

      {loading && !results.length ? (
        <Spinner label="Loading rankings…" />
      ) : (
        <LeaderboardTable rows={results} />
      )}

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          Showing {offset + 1}–{offset + results.length}
          {total ? ` of ${total}` : ""}
        </span>
        <div className="flex gap-2">
          <button
            className="btn-ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Prev
          </button>
          <button
            className="btn-ghost"
            disabled={results.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}
