import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import clsx from "clsx";

export default function PostActionBar({ post, onLike, onComment, onBookmark, onShare, compact = false }) {
  const iconSize = compact ? 15 : 17;
  const btnClass = "flex items-center gap-1.5 text-ink-faint hover:text-ink-200 transition-colors text-xs font-medium";

  return (
    <div className="flex items-center gap-4 pt-2 border-t border-white/5">
      <button
        onClick={onLike}
        className={clsx(btnClass, post.liked_by_me && "!text-rose-400")}
        aria-label="Like"
      >
        <Heart
          size={iconSize}
          className={clsx("transition-all", post.liked_by_me && "fill-rose-400 text-rose-400")}
        />
        <span>{post.likes ?? 0}</span>
      </button>

      <button onClick={onComment} className={btnClass} aria-label="Comment">
        <MessageCircle size={iconSize} />
        <span>{post.reply_count ?? 0}</span>
      </button>

      <button
        onClick={onBookmark}
        className={clsx(btnClass, post.bookmarked_by_me && "!text-amber-400")}
        aria-label="Bookmark"
      >
        <Bookmark
          size={iconSize}
          className={clsx("transition-all", post.bookmarked_by_me && "fill-amber-400 text-amber-400")}
        />
      </button>

      <button onClick={onShare} className={clsx(btnClass, "ml-auto")} aria-label="Share">
        <Share2 size={iconSize} />
      </button>
    </div>
  );
}
