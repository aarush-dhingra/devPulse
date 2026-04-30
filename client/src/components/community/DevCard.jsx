import { Link } from "react-router-dom";
import { ROUTES } from "../../utils/constants";
import { tierFor } from "../../utils/scoreUtils";

export default function DevCard({ user }) {
  const tier = tierFor(user.devscore || 0);
  return (
    <Link
      to={ROUTES.profile(user.username)}
      className="card card-hover flex items-center gap-3"
    >
      {user.avatar_url && (
        <img
          src={user.avatar_url}
          alt=""
          className="w-12 h-12 rounded-full ring-1 ring-white/10"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{user.name || user.username}</div>
        <div className="text-xs text-ink-muted truncate">@{user.username}</div>
      </div>
      <div className="text-right">
        <div className="text-lg font-extrabold" style={{ color: tier.color }}>
          {user.devscore}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-ink-muted">
          {tier.name}
        </div>
      </div>
    </Link>
  );
}
