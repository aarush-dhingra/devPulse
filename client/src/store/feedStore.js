import { create } from "zustand";
import { communityApi } from "../api/community.api";

export const useFeedStore = create((set, get) => ({
  posts: [],
  hasMore: true,
  cursor: null,
  tab: "all",
  loading: false,
  error: null,

  setTab(tab) {
    set({ tab });
    get().fetchPosts(tab, true);
  },

  async fetchPosts(tab = get().tab, reset = false) {
    const { loading, cursor, posts } = get();
    if (loading) return;
    if (!reset && !get().hasMore) return;

    set({ loading: true, error: null });
    try {
      const data = await communityApi.listPosts({
        feed: tab,
        cursor: reset ? null : cursor,
        limit: 20,
      });
      const newPosts = data.posts ?? [];
      set({
        posts: reset ? newPosts : [...posts, ...newPosts],
        cursor: data.nextCursor ?? null,
        hasMore: !!data.nextCursor,
        loading: false,
        tab,
      });
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  prependPost(post) {
    set((s) => ({ posts: [post, ...s.posts] }));
  },

  updatePost(id, patch) {
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  },

  removePost(id) {
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
  },
}));
