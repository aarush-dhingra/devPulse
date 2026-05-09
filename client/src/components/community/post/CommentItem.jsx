import { useState } from "react";
import { Link } from "react-router-dom";
import { CornerDownRight } from "lucide-react";
import Avatar from "../shared/Avatar";
import { relativeTime } from "../../../utils/formatters";
import { communityApi } from "../../../api/community.api";
import { useAuthStore } from "../../../store/authStore";

export default function CommentItem({ reply, postId, onReplyAdded, nested = false }) {
  const user = useAuthStore((s) => s.user);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitReply(e) {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await communityApi.createReply(postId, {
        content: replyText.trim(),
        parent_id: reply.id,
      });
      onReplyAdded?.({ ...data.reply, username: user?.username, name: user?.name, avatar_url: user?.avatar_url, parent_id: reply.id });
      setReplyText("");
      setReplyOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={nested ? "pl-6 border-l border-white/5" : ""}>
      <div className="flex items-start gap-2.5">
        <Link to={`/u/${reply.username}`} className="shrink-0 mt-0.5">
          <Avatar src={reply.avatar_url} name={reply.name || reply.username} size={28} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs">
            <Link to={`/u/${reply.username}`} className="font-semibold hover:text-accent-300 transition-colors">
              {reply.name || reply.username}
            </Link>
            <span className="text-ink-faint">{relativeTime(reply.created_at)}</span>
          </div>
          <p className="text-sm mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{reply.content}</p>
          {user && !nested && (
            <button
              onClick={() => setReplyOpen((v) => !v)}
              className="flex items-center gap-1 text-xs text-ink-faint hover:text-accent-400 mt-1 transition-colors"
            >
              <CornerDownRight size={11} /> Reply
            </button>
          )}
          {replyOpen && (
            <form onSubmit={submitReply} className="mt-2 flex gap-2">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Reply to @${reply.username}…`}
                maxLength={500}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint outline-none focus:border-accent-500/40"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || submitting}
                className="text-xs px-3 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-400 disabled:opacity-40 text-white transition-colors"
              >
                {submitting ? "…" : "Reply"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
