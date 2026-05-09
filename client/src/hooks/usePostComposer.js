import { useState } from "react";
import { communityApi } from "../api/community.api";
import { mediaApi } from "../api/media.api";
import { useFeedStore } from "../store/feedStore";

const MAX_CHARS = 1000;

export function usePostComposer({ onSuccess } = {}) {
  const [content, setContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const prependPost = useFeedStore((s) => s.prependPost);

  const canSubmit = content.trim().length > 0 && content.length <= MAX_CHARS && !uploading;

  async function submit() {
    if (!canSubmit) return;
    setUploading(true);
    setError(null);
    try {
      // Upload media files first
      const mediaUrls = [];
      for (const file of mediaFiles) {
        const result = await mediaApi.upload(file);
        mediaUrls.push(result.url);
      }

      const data = await communityApi.createPost({ content, media_urls: mediaUrls });
      prependPost(data.post);
      setContent("");
      setMediaFiles([]);
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  }

  return {
    content,
    setContent,
    mediaFiles,
    setMediaFiles,
    uploading,
    error,
    canSubmit,
    submit,
    charsLeft: MAX_CHARS - content.length,
    MAX_CHARS,
  };
}
