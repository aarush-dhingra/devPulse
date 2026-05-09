import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2, LayoutDashboard } from "lucide-react";
import clsx from "clsx";
import Avatar from "../shared/Avatar";
import PostActionBar from "../shared/PostActionBar";
import MediaGrid from "../post/MediaGrid";
import CommentThread from "../post/CommentThread";
import { relativeTime } from "../../../utils/formatters";
import { tierFor } from "../../../utils/scoreUtils";
import { communityApi } from "../../../api/community.api";
import { useFeedStore } from "../../../store/feedStore";
import { useAuthStore } from "../../../store/authStore";

function parseContent(text) {
  const tokens = text.split(/(\B#\w+|\B@\w+)/g);
  return tokens.map((t, i) => {
    if (t.startsWith("#")) return <span key={i} className="text-accent-400 cursor-pointer hover:underline">{t}</span>;
    if (t.startsWith("@")) return <Link key={i} to={`/u/${t.slice(1)}`} className="text-accent-400 hover:underline">{t}</Link>;
    return t;
  });
}

export default function PostCard({ post }) {
  const user = useAuthStore((s) => s.user);
  const { updatePost, removePost } = useFeedStore();
  const [showComments, setShowComments] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef(null);

  const tier = tierFor(post.devscore || 0);
  const isOwner = user?.id === post.user_id;

  useEffect(() => {
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleLike() {
    if (!user) return;
    const optimistic = {
      liked_by_me: !post.liked_by_me,
      likes: post.likes + (post.liked_by_me ? -1 : 1),
    };
    updatePost(post.id, optimistic);
    try {
      await communityApi.toggleLike(post.id);
    } catch {
      updatePost(post.id, { liked_by_me: post.liked_by_me, likes: post.likes });
    }
  }

  async function handleBookmark() {
    if (!user) return;
    const optimistic = { bookmarked_by_me: !post.bookmarked_by_me };
    updatePost(post.id, optimistic);
    try {
      await communityApi.toggleBookmark(post.id);
    } catch {
      updatePost(post.id, { bookmarked_by_me: post.bookmarked_by_me });
    }
  }

  function handleShare() {
    const url = `${window.location.origin}/community/posts/${post.id}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }

  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      await communityApi.deletePost(post.id);
      removePost(post.id);
    } catch {/* ignore */}
    setMenuOpen(false);
  }

  async function handleEdit() {
    if (!editContent.trim() || saving) return;
    setSaving(true);
    try {
      const data = await communityApi.editPost(post.id, { content: editContent });
      updatePost(post.id, { content: data.post.content, edited_at: data.post.edited_at });
      setEditing(false);
    } catch {/* ignore */}
    setSaving(false);
  }

  return (
    <article className="panel panel-pad animate-fadeIn">
      {/* Author row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link to={`/u/${post.username}`} className="shrink-0">
            <Avatar src={post.avatar_url} name={post.name || post.username} size={40} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link to={`/u/${post.username}`} className="font-semibold hover:text-accent-300 transition-colors text-sm truncate">
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
            <div className="flex items-center gap-2 text-[11px] text-ink-faint mt-0.5">
              <span>{relativeTime(post.created_at)}</span>
              {post.edited_at && <span>· edited</span>}
              <Link to={`/dashboard`} className="flex items-center gap-0.5 hover:text-accent-400 transition-colors">
                <LayoutDashboard size={11} />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 3-dot menu for owner */}
        {isOwner && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-ink-faint"
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-36 bg-bg-elev border border-white/10 rounded-xl shadow-deep z-10 overflow-hidden py-1">
                <button
                  onClick={() => { setEditing(true); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-white/5 transition-colors"
                >
                  <Pencil size={13} /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="mt-3">
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-ink resize-none outline-none focus:border-accent-500/40"
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={saving || !editContent.trim()}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditContent(post.content); }}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words text-ink">
            {parseContent(post.content)}
          </p>
        )}
      </div>

      {/* Media */}
      {post.media_urls?.length > 0 && <MediaGrid urls={post.media_urls} />}

      {/* Action bar */}
      <div className="mt-3">
        <PostActionBar
          post={post}
          onLike={handleLike}
          onComment={() => setShowComments((v) => !v)}
          onBookmark={handleBookmark}
          onShare={handleShare}
        />
      </div>

      {/* Comment thread */}
      {showComments && (
        <div className="mt-4 border-t border-white/5 pt-4 animate-fadeIn">
          <CommentThread postId={post.id} />
        </div>
      )}
    </article>
  );
}
