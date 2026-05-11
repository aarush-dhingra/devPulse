import { NavLink, Outlet, Routes, Route, Navigate } from "react-router-dom";
import { Home, Users, Bell, Bookmark } from "lucide-react";
import clsx from "clsx";
import FeedPage from "./community/FeedPage";
import PeoplePage from "./community/PeoplePage";
import NotificationsPage from "./community/NotificationsPage";
import PostDetailPage from "./community/PostDetailPage";
import BookmarksPage from "./community/BookmarksPage";
import { useNotificationStore } from "../store/notificationStore";

const NAV = [
  { to: "/community",                    label: "Feed",          Icon: Home,     exact: true },
  { to: "/community/people",             label: "People",        Icon: Users },
  { to: "/community/notifications",      label: "Notifications", Icon: Bell,     badge: true },
  { to: "/community/bookmarks",          label: "Bookmarks",     Icon: Bookmark },
];

function SideNav() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return (
    <nav className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
      {NAV.map(({ to, label, Icon, exact, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              isActive
                ? "bg-accent-500/15 text-accent-300 border border-accent-500/25"
                : "text-ink-faint hover:text-ink hover:bg-white/[0.04]"
            )
          }
        >
          <Icon size={16} />
          <span className="flex-1">{label}</span>
          {badge && unreadCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function BottomNav() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-bg-card/95 border-t border-white/[0.06] flex">
      {NAV.map(({ to, label, Icon, exact, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            clsx(
              "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive ? "text-accent-400" : "text-ink-faint"
            )
          }
        >
          <div className="relative">
            <Icon size={20} />
            {badge && unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent-500" />
            )}
          </div>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Community() {
  return (
    <div className="relative">
      <header className="mb-6">
        <h1 className="font-display font-bold text-2xl text-ink">Community</h1>
        <p className="text-ink-muted text-sm mt-1">
          Connect, share, and grow with fellow developers.
        </p>
      </header>

      <div className="flex gap-6 items-start">
        <SideNav />

        <main className="flex-1 min-w-0 pb-16 lg:pb-0">
          <Routes>
            <Route index element={<FeedPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="bookmarks" element={<BookmarksPage />} />
            <Route path="posts/:id" element={<PostDetailPage />} />
          </Routes>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
