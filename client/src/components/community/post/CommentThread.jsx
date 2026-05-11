import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import CommentItem from "./CommentItem";
import { communityApi } from "../../../api/community.api";
import { useAuthStore } from "../../../store/authStore";
import Avatar from "../shared/Avatar";

export default function CommentThread({ postId }) {
  const user = useAuthStore((s) => s.user);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    communityApi.listReplies(postId).then((data) => {
      setReplies(data.replies ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [postId]);

  async function submitComment(e) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await communityApi.createReply(postId, { content: newComment.trim() });
      setReplies((prev) => [...prev, {
        ...data.reply,
        username: user?.username,
        name: user?.name,
        avatar_url: user?.avatar_url,
      }]);
      setNewComment("");
    } finally {
      setSubmitting(false);
    }
  }

  function onReplyAdded(reply) {
    setReplies((prev) => [...prev, reply]);
  }

  // Build threaded structure
  const topLevel = replies.filter((r) => !r.parent_id);
  const childMap = {};
  replies.filter((r) => r.parent_id).forEach((r) => {
    if (!childMap[r.parent_id]) childMap[r.parent_id] = [];
    childMap[r.parent_id].push(r);
  });

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 size={18} className="animate-spin text-ink-faint" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topLevel.length === 0 && (
        <p className="text-xs text-ink-faint text-center py-2">No comments yet. Be the first!</p>
      )}

      {topLevel.map((r) => (
        <div key={r.id} className="space-y-2">
          <CommentItem reply={r} postId={postId} onReplyAdded={onReplyAdded} />
          {(childMap[r.id] || []).map((child) => (
            <CommentItem key={child.id} reply={child} postId={postId} onReplyAdded={onReplyAdded} nested />
          ))}
        </div>
      ))}

      {user && (
        <form onSubmit={submitComment} className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
          <Avatar src={user.avatar_url} name={user.name || user.username} size={28} className="shrink-0" />
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent-500/40"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="text-sm px-3 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-400 disabled:opacity-40 text-white transition-colors shrink-0"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : "Post"}
          </button>
        </form>
      )}
    </div>
  );
}
