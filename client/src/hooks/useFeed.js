import { useEffect, useRef, useCallback } from "react";
import { useFeedStore } from "../store/feedStore";

/**
 * useFeed — provides feed state and an IntersectionObserver sentinel for
 * infinite scroll. Attach `sentinelRef` to a bottom sentinel element.
 */
export function useFeed() {
  const store = useFeedStore();
  const sentinelRef = useRef(null);

  useEffect(() => {
    store.fetchPosts(store.tab, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.tab]);

  const loadMore = useCallback(() => {
    if (!store.loading && store.hasMore) {
      store.fetchPosts(store.tab, false);
    }
  }, [store]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  return { ...store, sentinelRef };
}
