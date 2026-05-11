import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import DashboardLayout from "./components/layout/DashboardLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import PublicProfile from "./pages/PublicProfile";
import Leaderboard from "./pages/Leaderboard";
import Community from "./pages/Community";
import Settings from "./pages/Settings";
import DevWrapped from "./pages/DevWrapped";
import NotFound from "./pages/NotFound";
import { useAuth } from "./hooks/useAuth";
import Spinner from "./components/ui/Spinner";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Spinner size={32} label="Loading session…" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}

function PublicShell({ children, withFooter = true }) {
  return (
    <>
      <Navbar />
      {children}
      {withFooter && <Footer />}
    </>
  );
}

/**
 * Renders authenticated users in DashboardLayout (sidebar/topbar) and
 * unauthenticated users in PublicShell. Use for pages reachable from both
 * sidebar and public navbar (Leaderboard).
 */
function AdaptiveShell({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <PublicShell>
        <div className="min-h-[60vh] grid place-items-center">
          <Spinner size={32} />
        </div>
      </PublicShell>
    );
  }
  return isAuthenticated ? (
    <DashboardLayout>{children}</DashboardLayout>
  ) : (
    <PublicShell>{children}</PublicShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicShell><Landing /></PublicShell>} />
        <Route path="/login" element={<PublicShell withFooter={false}><Login /></PublicShell>} />
        <Route path="/signup" element={<PublicShell withFooter={false}><Signup /></PublicShell>} />
        <Route path="/leaderboard" element={<AdaptiveShell><Leaderboard /></AdaptiveShell>} />
        <Route path="/u/:username" element={<AdaptiveShell><PublicProfile /></AdaptiveShell>} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/:platform"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/community/*"
          element={
            <ProtectedRoute>
              <Community />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wrapped"
          element={
            <ProtectedRoute>
              <DevWrapped />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<PublicShell><NotFound /></PublicShell>} />
      </Routes>
    </BrowserRouter>
  );
}
