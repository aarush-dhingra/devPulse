import { create } from "zustand";
import { authApi } from "../api/auth.api";

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,
  error: null,

  fetchMe: async () => {
    try {
      set({ loading: true, error: null });
      const data = await authApi.me();
      set({ user: data.user, loading: false });
    } catch (err) {
      if (err.response?.status === 401) {
        set({ user: null, loading: false });
      } else {
        set({ error: err.message || "Failed to load user", loading: false });
      }
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({ user: null });
    }
  },

  setUser: (user) => set({ user }),
}));

if (typeof window !== "undefined") {
  window.addEventListener("devpulse:unauthorized", () => {
    useAuthStore.setState({ user: null });
  });
}
