import { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import UserCard from "../../components/community/profile/UserCard";
import { communityApi } from "../../api/community.api";
import { useDebounce } from "../../hooks/useDebounce";

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const debouncedQuery = useDebounce(query, 350);

  // Load suggestions on mount
  useEffect(() => {
    communityApi.suggestions()
      .then((d) => setSuggestions(d.suggestions ?? []))
      .catch(() => {});
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    communityApi.searchUsers(debouncedQuery)
      .then((d) => setResults(d.users ?? []))
      .catch(() => setResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

  const showResults = query.trim().length >= 2;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink">People</h1>
        <p className="text-ink-muted text-sm mt-1">Find and follow developers on DevPulse</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username…"
          className="w-full bg-bg-card border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent-500/40 transition-colors"
        />
        {searching && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-faint" />
        )}
      </div>

      {showResults ? (
        <div className="panel panel-pad">
          <h2 className="font-display font-semibold text-sm mb-3 text-ink-muted">Search results</h2>
          {results.length === 0 && !searching ? (
            <p className="text-ink-faint text-sm py-4 text-center">No users found for &ldquo;{query}&rdquo;</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {results.map((u) => <UserCard key={u.id} user={u} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="panel panel-pad">
          <h2 className="font-display font-semibold text-sm mb-3 text-ink-muted">Suggested for you</h2>
          {suggestions.length === 0 ? (
            <p className="text-ink-faint text-sm py-4 text-center">No suggestions yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {suggestions.map((u) => <UserCard key={u.id} user={u} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
