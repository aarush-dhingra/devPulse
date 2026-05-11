import { useEffect } from "react";
import { CheckCheck } from "lucide-react";
import NotificationItem from "../../components/community/notifications/NotificationItem";
import { useNotificationStore } from "../../store/notificationStore";
import { notificationApi } from "../../api/notification.api";
import Spinner from "../../components/ui/Spinner";

export default function NotificationsPage() {
  const { notifications, loading, fetchNotifications, markAllRead } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function handleItemClick(notif) {
    if (!notif.is_read) {
      await notificationApi.markOneRead(notif.id);
      useNotificationStore.setState((s) => ({
        notifications: s.notifications.map((n) => n.id === notif.id ? { ...n, is_read: true } : n),
        unreadCount: Math.max(s.unreadCount - 1, 0),
      }));
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink">Notifications</h1>
          <p className="text-ink-muted text-sm mt-1">Stay up to date with your activity</p>
        </div>
        <button
          onClick={markAllRead}
          className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-accent-400 transition-colors"
        >
          <CheckCheck size={15} /> Mark all read
        </button>
      </div>

      <div className="panel panel-pad">
        {loading ? (
          <Spinner label="Loading notifications…" />
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔔</p>
            <p className="font-semibold text-ink">All caught up!</p>
            <p className="text-ink-muted text-sm mt-1">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notif={n} onClick={() => handleItemClick(n)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
