import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Loader2, CheckCheck } from "lucide-react";
import NotificationItem from "./NotificationItem";
import { useNotificationStore } from "../../../store/notificationStore";
import { notificationApi } from "../../../api/notification.api";

export default function NotificationPanel({ onClose }) {
  const { notifications, loading, markAllRead, fetchNotifications } = useNotificationStore();
  const panelRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const close = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function handleItemClick(notif) {
    if (!notif.is_read) {
      await notificationApi.markOneRead(notif.id);
      useNotificationStore.setState((s) => ({
        notifications: s.notifications.map((n) => n.id === notif.id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(s.unreadCount - 1, 0),
      }));
    }
    onClose();
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-bg-card border border-white/10 rounded-2xl shadow-deep z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="font-display font-semibold text-sm">Notifications</h3>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1 text-xs text-ink-faint hover:text-accent-400 transition-colors"
        >
          <CheckCheck size={13} /> Mark all read
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-ink-faint" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-center text-ink-faint text-sm py-8">No notifications yet.</p>
        ) : (
          <div className="p-2 space-y-0.5">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notif={n} onClick={() => handleItemClick(n)} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.06] px-4 py-2.5">
        <Link
          to="/community/notifications"
          onClick={onClose}
          className="block text-center text-xs text-accent-400 hover:text-accent-300 transition-colors"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}
