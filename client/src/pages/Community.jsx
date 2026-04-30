import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { communityApi } from "../api/community.api";
import { useAuth } from "../hooks/useAuth";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import { relativeTime } from "../utils/formatters";
import { tierFor } from "../utils/scoreUtils";

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await communityApi.listPosts();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      await communityApi.createPost(content.trim());
      setContent("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setPosting(false);
    }
  };

  const onLikeToggle = async (id) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              liked_by_me: !p.liked_by_me,
              likes: p.likes + (p.liked_by_me ? -1 : 1),
            }
          : p
      )
    );
    try {
      await communityApi.toggleLike(id);
    } catch {
      load();
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Delete this post?")) return;
    await communityApi.deletePost(id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl">Community</h1>
          <p className="text-ink-muted text-sm mt-1">
            Drop wins, problems, and questions. Other devs can like and reply.
          </p>
        </div>
        <span className="pill-accent">{posts.length} posts</span>
      </header>

      {/* Composer */}
      <form onSubmit={submit} className="panel-pad space-y-3">
        <div className="flex items-start gap-3">
          <Avatar user={user} />
          <div className="flex-1">
            <textarea
              className="input min-h-[80px] resize-y"
              placeholder="What did you build today?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-ink-faint">
                {content.length}/1000 · supports plain text and emoji
              </span>
              <Button type="submit" loading={posting} disabled={!content.trim()}>
                Post
              </Button>
            </div>
          </div>
        </div>
        {error && (
          <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
            {error}
          </div>
        )}
      </form>

      {loading ? (
        <Spinner label="Loading posts…" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="💬"
          title="Be the first to post"
          description="No posts yet — kick things off above and watch the feed light up."
        />
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <Post
              key={p.id}
              post={p}
              currentUserId={user?.id}
              onLike={() => onLikeToggle(p.id)}
              onDelete={() => onDelete(p.id)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function Avatar({ user, size = 40 }) {
  if (!user) {
    return <div className="w-10 h-10 rounded-full bg-white/5" />;
  }
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="rounded-xl ring-1 ring-white/10 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 grid place-items-center text-white font-bold shrink-0"
      style={{ width: size, height: size }}
    >
      {(user.name || user.username || "?")[0]?.toUpperCase()}
    </div>
  );
}

function Post({ post, currentUserId, onLike, onDelete }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  const tier = tierFor(post.devscore || 0);

  const toggleReplies = async () => {
    if (!showReplies && replies.length === 0) {
      setLoadingReplies(true);
      try {
        const data = await communityApi.listReplies(post.id);
        setReplies(data.replies || []);
      } finally {
        setLoadingReplies(false);
      }
    }
    setShowReplies(!showReplies);
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await communityApi.createReply(post.id, reply.trim());
      setReplies((prev) => [...prev, { ...data.reply, username: "you" }]);
      setReply("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <li className="panel-pad">
      <div className="flex items-start gap-3">
        <Link to={`/u/${post.username}`}>
          <Avatar user={{ avatar_url: post.avatar_url, name: post.name, username: post.username }} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Link to={`/u/${post.username}`} className="font-bold hover:text-accent-300 truncate">
                {post.name || post.username}
              </Link>
              <span className="text-ink-faint text-xs">@{post.username}</span>
              <span
                className="pill text-[10px]"
                style={{ borderColor: `${tier.color}40`, color: tier.color, background: `${tier.color}1a` }}
              >
                {tier.emoji} {post.devscore}
              </span>
              <span className="text-ink-faint text-xs">· {relativeTime(post.created_at)}</span>
            </div>
            {currentUserId === post.user_id && (
              <button
                onClick={onDelete}
                className="text-ink-faint hover:text-rose-300 text-xs"
                title="Delete"
              >
                ✕
              </button>
            )}
          </div>
          <p className="mt-2 text-[15px] whitespace-pre-wrap break-words">{post.content}</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <button
              onClick={onLike}
              className={`flex items-center gap-1.5 transition ${
                post.liked_by_me ? "text-rose-400" : "text-ink-muted hover:text-rose-300"
              }`}
            >
              <span>{post.liked_by_me ? "❤" : "♡"}</span>
              <span className="tabular-nums">{post.likes}</span>
            </button>
            <button
              onClick={toggleReplies}
              className="flex items-center gap-1.5 text-ink-muted hover:text-accent-300 transition"
            >
              <span>💬</span>
              <span className="tabular-nums">{post.reply_count || 0}</span>
              <span className="hidden sm:inline">
                {showReplies ? "Hide" : "Reply"}
              </span>
            </button>
          </div>

          {showReplies && (
            <div className="mt-4 pl-4 border-l border-white/5 space-y-3 animate-fadeIn">
              {loadingReplies ? (
                <Spinner size={16} />
              ) : (
                replies.map((r) => (
                  <div key={r.id} className="flex items-start gap-2">
                    <Avatar user={r} size={28} />
                    <div className="flex-1">
                      <div className="text-xs">
                        <span className="font-semibold">{r.name || r.username}</span>
                        <span className="text-ink-faint"> · {relativeTime(r.created_at)}</span>
                      </div>
                      <p className="text-sm mt-0.5 whitespace-pre-wrap">{r.content}</p>
                    </div>
                  </div>
                ))
              )}
              <form onSubmit={submitReply} className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Write a reply…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={500}
                />
                <Button size="sm" type="submit" loading={submitting} disabled={!reply.trim()}>
                  Reply
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
