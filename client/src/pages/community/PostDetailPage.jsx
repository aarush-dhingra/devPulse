import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import Avatar from "../../components/community/shared/Avatar";
import PostActionBar from "../../components/community/shared/PostActionBar";
import MediaGrid from "../../components/community/post/MediaGrid";
import CommentThread from "../../components/community/post/CommentThread";
import { relativeTime } from "../../utils/formatters";
import { tierFor } from "../../utils/scoreUtils";
import { communityApi } from "../../api/community.api";
import { useAuthStore } from "../../store/authStore";

export default function PostDetailPage() {
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    communityApi.getPost(id)
      .then((data) => { setPost(data.post); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [id]);

  async function handleLike() {
    if (!user || !post) return;
    const optimistic = {
      liked_by_me: !post.liked_by_me,
      likes: post.likes + (post.liked_by_me ? -1 : 1),
    };
    setPost((p) => ({ ...p, ...optimistic }));
    try {
      await communityApi.toggleLike(id);
    } catch {
      setPost((p) => ({ ...p, liked_by_me: post.liked_by_me, likes: post.likes }));
    }
  }

  async function handleBookmark() {
    if (!user || !post) return;
    setPost((p) => ({ ...p, bookmarked_by_me: !p.bookmarked_by_me }));
    try {
      await communityApi.toggleBookmark(id);
    } catch {
      setPost((p) => ({ ...p, bookmarked_by_me: post.bookmarked_by_me }));
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-ink-faint" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="panel-pad text-center py-16">
        <p className="text-ink-muted">{error || "Post not found."}</p>
        <Link to="/community" className="mt-4 inline-block text-accent-400 text-sm hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  const tier = tierFor(post.devscore || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        to="/community"
        className="flex items-center gap-2 text-sm text-ink-faint hover:text-ink transition-colors"
      >
        <ArrowLeft size={16} /> Back to feed
      </Link>

      <article className="panel panel-pad">
        {/* Author */}
        <div className="flex items-center gap-2.5">
          <Link to={`/u/${post.username}`}>
            <Avatar src={post.avatar_url} name={post.name || post.username} size={44} />
          </Link>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/u/${post.username}`} className="font-semibold hover:text-accent-300 transition-colors">
                {post.name || post.username}
              </Link>
              <span className="text-ink-faint text-xs">@{post.username}</span>
              <span
                className="pill text-[10px] py-0.5 px-1.5"
                style={{ borderColor: `${tier.color}40`, color: tier.color, background: `${tier.color}18` }}
              >
                {tier.emoji} {post.devscore}
              </span>
            </div>
            <div className="text-xs text-ink-faint mt-0.5">
              {relativeTime(post.created_at)}
              {post.edited_at && " · edited"}
            </div>
          </div>
        </div>

        {/* Content */}
        <p className="mt-4 text-base leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>

        {/* Media */}
        {post.media_urls?.length > 0 && <MediaGrid urls={post.media_urls} />}

        {/* Actions */}
        <div className="mt-4">
          <PostActionBar
            post={post}
            onLike={handleLike}
            onComment={() => {}}
            onBookmark={handleBookmark}
            onShare={handleShare}
          />
        </div>
      </article>

      {/* Comment thread */}
      <div className="panel panel-pad">
        <h3 className="font-display font-semibold text-sm mb-4">
          {post.reply_count ?? 0} Comment{post.reply_count !== 1 ? "s" : ""}
        </h3>
        <CommentThread postId={id} />
      </div>
    </div>
  );
}
