import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import UserCard from "./UserCard";
import { communityApi } from "../../../api/community.api";
import { useAuthStore } from "../../../store/authStore";

export default function SuggestedPeople() {
  const user = useAuthStore((s) => s.user);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    communityApi.suggestions()
      .then((data) => setPeople(data.suggestions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || (!loading && people.length === 0)) return null;

  return (
    <div className="panel panel-pad">
      <h3 className="font-display font-semibold text-sm mb-3 text-ink">Who to follow</h3>
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 size={16} className="animate-spin text-ink-faint" />
        </div>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {people.map((p) => (
            <UserCard key={p.id} user={p} />
          ))}
        </div>
      )}
      <Link
        to="/community/people"
        className="block mt-3 text-xs text-accent-400 hover:text-accent-300 transition-colors"
      >
        See more →
      </Link>
    </div>
  );
}
