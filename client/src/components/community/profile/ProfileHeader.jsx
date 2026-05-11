import { useState } from "react";
import { Link } from "react-router-dom";
import { Users, LayoutDashboard } from "lucide-react";
import Avatar from "../shared/Avatar";
import FollowListModal from "./FollowListModal";
import { tierFor } from "../../../utils/scoreUtils";
import { useAuthStore } from "../../../store/authStore";

export default function ProfileHeader({ profile, onFollowToggle }) {
  const me = useAuthStore((s) => s.user);
  const [modal, setModal] = useState(null); // "followers" | "following" | null
  const [followLoading, setFollowLoading] = useState(false);

  if (!profile) return null;

  const tier = tierFor(profile.devscore || 0);
  const isMe = me?.id === profile.id;

  async function handleFollow() {
    if (followLoading) return;
    setFollowLoading(true);
    try { await onFollowToggle(); }
    finally { setFollowLoading(false); }
  }

  return (
    <div className="panel panel-pad">
      {/* Avatar + basic info row */}
      <div className="flex items-start gap-4 flex-wrap">
        <Avatar src={profile.avatar_url} name={profile.name || profile.username} size={72} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="font-display font-bold text-xl text-ink">
                {profile.name || profile.username}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-ink-faint text-sm">@{profile.username}</span>
                <span
                  className="pill text-[10px] py-0.5 px-1.5"
                  style={{ borderColor: `${tier.color}40`, color: tier.color, background: `${tier.color}18` }}
                >
                  {tier.emoji} {tier.name} · {profile.devscore}
                </span>
              </div>
              {profile.bio && (
                <p className="text-sm text-ink-muted mt-2 leading-relaxed">{profile.bio}</p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={isMe ? "/dashboard" : `/u/${profile.username}`}
                className="flex items-center gap-1.5 text-xs text-ink-faint hover:text-accent-400 transition-colors border border-white/10 px-3 py-1.5 rounded-lg"
              >
                <LayoutDashboard size={13} />
                Dashboard
              </Link>
              {!isMe && me && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ${
                    profile.is_following
                      ? "bg-white/10 hover:bg-rose-500/10 hover:text-rose-400 text-ink"
                      : "bg-accent-500 hover:bg-accent-400 text-white"
                  }`}
                >
                  {followLoading ? "…" : profile.is_following ? "Following" : "Follow"}
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-5 mt-4 text-sm">
            <button
              onClick={() => setModal("followers")}
              className="flex items-center gap-1.5 hover:text-accent-300 transition-colors"
            >
              <Users size={14} className="text-ink-faint" />
              <span className="font-semibold">{profile.followers_count ?? 0}</span>
              <span className="text-ink-faint">Followers</span>
            </button>
            <button
              onClick={() => setModal("following")}
              className="flex items-center gap-1.5 hover:text-accent-300 transition-colors"
            >
              <span className="font-semibold">{profile.following_count ?? 0}</span>
              <span className="text-ink-faint">Following</span>
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <FollowListModal
          username={profile.username}
          mode={modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
