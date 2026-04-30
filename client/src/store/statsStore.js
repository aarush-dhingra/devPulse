import { create } from "zustand";
import { statsApi } from "../api/stats.api";

export const useStatsStore = create((set, get) => ({
  data: null,
  loading: false,
  error: null,
  lastFetched: null,
  byUsername: {},

  fetchMine: async (force = false) => {
    const { lastFetched, data, loading } = get();
    if (loading) return;
    const fresh =
      data && lastFetched && Date.now() - lastFetched < 60_000 && !force;
    if (fresh) return;
    try {
      set({ loading: true, error: null });
      const payload = await statsApi.me();
      set({ data: payload, loading: false, lastFetched: Date.now() });
    } catch (err) {
      set({
        error: err.response?.data?.message || err.message,
        loading: false,
      });
    }
  },

  fetchByUsername: async (username) => {
    try {
      set({ loading: true, error: null });
      const payload = await statsApi.byUsername(username);
      set((state) => ({
        byUsername: { ...state.byUsername, [username]: payload },
        loading: false,
      }));
    } catch (err) {
      set({
        error: err.response?.data?.message || err.message,
        loading: false,
      });
    }
  },

  refreshMine: async () => {
    try {
      await statsApi.refresh();
    } catch (err) {
      console.warn("refresh failed", err);
    }
  },

  reset: () =>
    set({ data: null, loading: false, error: null, lastFetched: null }),
}));
