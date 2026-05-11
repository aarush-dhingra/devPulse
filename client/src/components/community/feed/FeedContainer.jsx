import { Loader2 } from "lucide-react";
import PostCard from "./PostCard";
import { useFeed } from "../../../hooks/useFeed";
import EmptyState from "../../ui/EmptyState";

export default function FeedContainer() {
  const { posts, loading, hasMore, tab, sentinelRef } = useFeed();

  const isEmpty = !loading && posts.length === 0;

  return (
    <div className="space-y-3">
      {isEmpty ? (
        <EmptyState
          icon="💬"
          title={tab === "following" ? "No posts from people you follow" : "No posts yet"}
          description={
            tab === "following"
              ? "Follow people to see their posts here."
              : "Be the first to post something!"
          }
        />
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 size={22} className="animate-spin text-ink-faint" />
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-ink-faint py-4">
          You&apos;ve reached the end of the feed.
        </p>
      )}
    </div>
  );
}
