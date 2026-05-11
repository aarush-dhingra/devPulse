import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, AtSign, CornerDownRight } from "lucide-react";
import clsx from "clsx";
import Avatar from "../shared/Avatar";
import { relativeTime } from "../../../utils/formatters";

const TYPE_META = {
  like:    { icon: Heart,         color: "text-rose-400",    label: "liked your post" },
  comment: { icon: MessageCircle, color: "text-accent-400",  label: "commented on your post" },
  follow:  { icon: UserPlus,      color: "text-good",        label: "started following you" },
  mention: { icon: AtSign,        color: "text-cyan-400",    label: "mentioned you" },
  reply:   { icon: CornerDownRight, color: "text-amber-400", label: "replied to your comment" },
};

export default function NotificationItem({ notif, onClick }) {
  const meta = TYPE_META[notif.type] ?? TYPE_META.like;
  const Icon = meta.icon;

  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.04]",
        !notif.is_read && "bg-accent-500/[0.06]"
      )}
    >
      <div className="relative shrink-0">
        <Avatar src={notif.actor?.avatar_url} name={notif.actor?.name || notif.actor?.username} size={36} />
        <span className={clsx("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-bg-card flex items-center justify-center", meta.color)}>
          <Icon size={10} />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug">
          <Link
            to={`/u/${notif.actor?.username}`}
            className="font-semibold hover:text-accent-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {notif.actor?.name || notif.actor?.username}
          </Link>
          <span className="text-ink-muted"> {meta.label}</span>
        </p>
        {notif.post?.content_preview && (
          <p className="text-xs text-ink-faint mt-0.5 truncate">{notif.post.content_preview}</p>
        )}
        <p className="text-[11px] text-ink-faint mt-0.5">{relativeTime(notif.created_at)}</p>
      </div>
      {!notif.is_read && (
        <span className="w-2 h-2 rounded-full bg-accent-500 shrink-0 mt-1.5" />
      )}
    </div>
  );
}
