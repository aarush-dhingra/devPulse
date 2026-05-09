import { Link } from "react-router-dom";
import Avatar from "../shared/Avatar";
import { tierFor } from "../../../utils/scoreUtils";
import { communityApi } from "../../../api/community.api";
import { useAuthStore } from "../../../store/authStore";
import { useState } from "react";

export default function UserCard({ user, showFollow = true }) {
  const me = useAuthStore((s) => s.user);
  const [following, setFollowing] = useState(user.is_following ?? false);
  const [loading, setLoading] = useState(false);
  const tier = tierFor(user.devscore || 0);
  const isMe = me?.id === user.id;

  async function toggleFollow() {
    if (!me || isMe) return;
    setLoading(true);
    try {
      if (following) {
        await communityApi.unfollow(user.username);
        setFollowing(false);
      } else {
        await communityApi.follow(user.username);
        setFollowing(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <Link to={`/u/${user.username}`} className="shrink-0">
        <Avatar src={user.avatar_url} name={user.name || user.username} size={38} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link to={`/u/${user.username}`} className="font-semibold text-sm hover:text-accent-300 transition-colors truncate">
            {user.name || user.username}
          </Link>
          <span
            className="pill text-[10px] py-0.5 px-1.5"
            style={{ borderColor: `${tier.color}40`, color: tier.color, background: `${tier.color}18` }}
          >
            {tier.emoji} {user.devscore}
          </span>
        </div>
        <p className="text-xs text-ink-faint">@{user.username}</p>
        {user.followers_count != null && (
          <p className="text-[11px] text-ink-faint">{user.followers_count} followers</p>
        )}
      </div>
      {showFollow && !isMe && (
        <button
          onClick={toggleFollow}
          disabled={loading}
          className={`text-xs px-3 py-1 rounded-full border transition-colors shrink-0 ${
            following
              ? "border-white/20 text-ink-muted hover:border-rose-400/40 hover:text-rose-400"
              : "border-accent-500/40 text-accent-400 hover:bg-accent-500/10"
          }`}
        >
          {following ? "Unfollow" : "Follow"}
        </button>
      )}
    </div>
  );
}
