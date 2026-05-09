import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import UserCard from "./UserCard";
import { communityApi } from "../../../api/community.api";

export default function FollowListModal({ username, mode, onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = mode === "followers" ? communityApi.followers : communityApi.following;
    fn(username)
      .then((data) => setUsers(data[mode] ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username, mode]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-bg-card border border-white/10 rounded-2xl w-full max-w-md shadow-deep max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <h2 className="font-display font-semibold text-base capitalize">{mode}</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={22} className="animate-spin text-ink-faint" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-ink-faint text-sm py-8">
              {mode === "followers" ? "No followers yet." : "Not following anyone yet."}
            </p>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {users.map((u) => (
                <UserCard key={u.id} user={u} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
