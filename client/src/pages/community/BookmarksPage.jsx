import { useEffect, useState } from "react";
import { Bookmark, Loader2 } from "lucide-react";
import PostCard from "../../components/community/feed/PostCard";
import { communityApi } from "../../api/community.api";
import { useFeedStore } from "../../store/feedStore";
import EmptyState from "../../components/ui/EmptyState";

export default function BookmarksPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const updatePost = useFeedStore((s) => s.updatePost);

  useEffect(() => {
    communityApi.listBookmarks()
      .then((d) => {
        // Seed the feed store with bookmarked posts so PostCard's optimistic updates work
        const feedStore = useFeedStore.getState();
        (d.posts ?? []).forEach((p) => {
          if (!feedStore.posts.find((fp) => fp.id === p.id)) {
            feedStore.prependPost(p);
          }
        });
        setPosts(d.posts ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Mirror removals when bookmark is toggled off
  const feedPosts = useFeedStore((s) => s.posts);
  const shownPosts = posts.filter((p) => {
    const inStore = feedPosts.find((fp) => fp.id === p.id);
    return inStore ? inStore.bookmarked_by_me !== false : true;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display font-bold text-xl text-ink flex items-center gap-2">
          <Bookmark size={20} className="text-amber-400" /> Bookmarks
        </h2>
        <p className="text-ink-muted text-sm mt-1">Posts you&apos;ve saved for later</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-ink-faint" />
        </div>
      ) : shownPosts.length === 0 ? (
        <EmptyState
          icon="🔖"
          title="No bookmarks yet"
          description="Bookmark posts to save them here for later."
        />
      ) : (
        <div className="space-y-3">
          {shownPosts.map((post) => {
            const live = feedPosts.find((fp) => fp.id === post.id) ?? post;
            return <PostCard key={post.id} post={live} />;
          })}
        </div>
      )}
    </div>
  );
}
