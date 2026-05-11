import { useEffect } from "react";
import { useNotificationStore } from "../store/notificationStore";
import { useAuthStore } from "../store/authStore";

const POLL_INTERVAL = 60_000; // 60 seconds

export function useNotifications() {
  const store = useNotificationStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    store.fetchUnreadCount();
    const id = setInterval(() => store.fetchUnreadCount(), POLL_INTERVAL);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return store;
}
