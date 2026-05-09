import { useRef } from "react";
import { Send, Loader2, ImagePlus } from "lucide-react";
import clsx from "clsx";
import Avatar from "../shared/Avatar";
import MediaUpload from "../shared/MediaUpload";
import { usePostComposer } from "../../../hooks/usePostComposer";
import { useAuthStore } from "../../../store/authStore";

export default function PostComposer({ onSuccess }) {
  const user = useAuthStore((s) => s.user);
  const attachRef = useRef(null);
  const {
    content, setContent,
    mediaFiles, setMediaFiles,
    uploading, error,
    canSubmit, submit,
    charsLeft, MAX_CHARS,
  } = usePostComposer({ onSuccess });

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  }

  if (!user) return null;

  return (
    <div className="panel panel-pad mb-4">
      <div className="flex gap-3">
        <Avatar src={user.avatar_url} name={user.name || user.username} size={38} className="shrink-0 mt-0.5" />
        <div className="flex-1 flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share something with the community…"
            rows={3}
            maxLength={MAX_CHARS}
            className="w-full bg-transparent resize-none text-sm text-ink-200 placeholder:text-ink-faint outline-none"
          />

          {mediaFiles.length > 0 && (
            <MediaUpload files={mediaFiles} onChange={setMediaFiles} />
          )}

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => attachRef.current?.click()}
              className="flex items-center gap-1.5 text-ink-faint hover:text-brand-400 transition-colors text-xs"
              title="Attach image or video"
            >
              <ImagePlus size={15} />
              <span>Media</span>
            </button>

            {/* Hidden file input managed by this icon */}
            <input
              ref={attachRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                setMediaFiles((prev) => {
                  const next = [...prev, ...Array.from(e.target.files)].slice(0, 4);
                  return next;
                });
                e.target.value = "";
              }}
            />

            <div className="flex items-center gap-3">
              <span className={clsx("text-xs tabular-nums", charsLeft < 50 ? "text-rose-400" : "text-ink-faint")}>
                {charsLeft}
              </span>
              <button
                onClick={submit}
                disabled={!canSubmit}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  canSubmit
                    ? "bg-brand-500 hover:bg-brand-400 text-white"
                    : "bg-white/5 text-ink-faint cursor-not-allowed"
                )}
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
