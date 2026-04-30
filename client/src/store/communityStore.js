import { create } from "zustand";
import { leaderboardApi } from "../api/leaderboard.api";
import { communityApi } from "../api/community.api";

export const useCommunityStore = create((set) => ({
  leaderboard: { metric: "devscore", results: [], loading: false, total: 0 },
  feed: { events: [], loading: false },

  fetchLeaderboard: async ({ metric = "devscore", limit = 50, offset = 0 } = {}) => {
    set((s) => ({ leaderboard: { ...s.leaderboard, loading: true } }));
    try {
      const data = await leaderboardApi.list({ metric, limit, offset });
      set({ leaderboard: { ...data, loading: false } });
    } catch {
      set((s) => ({ leaderboard: { ...s.leaderboard, loading: false } }));
    }
  },

  fetchFeed: async () => {
    set((s) => ({ feed: { ...s.feed, loading: true } }));
    try {
      const data = await communityApi.feed();
      set({ feed: { events: data.events, loading: false } });
    } catch {
      set((s) => ({ feed: { ...s.feed, loading: false } }));
    }
  },
}));
