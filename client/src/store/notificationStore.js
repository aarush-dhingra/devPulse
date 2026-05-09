import { create } from "zustand";
import { notificationApi } from "../api/notification.api";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  panelOpen: false,

  togglePanel() {
    set((s) => ({ panelOpen: !s.panelOpen }));
    if (!get().panelOpen) get().fetchNotifications();
  },

  closePanel() {
    set({ panelOpen: false });
  },

  async fetchUnreadCount() {
    try {
      const data = await notificationApi.unreadCount();
      set({ unreadCount: data.count ?? 0 });
    } catch {
      /* ignore */
    }
  },

  async fetchNotifications() {
    set({ loading: true });
    try {
      const data = await notificationApi.list({ limit: 15 });
      set({ notifications: data.notifications ?? [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  async markAllRead() {
    await notificationApi.markAllRead();
    set((s) => ({
      unreadCount: 0,
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
    }));
  },
}));
