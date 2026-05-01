import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Button from "../ui/Button";
import { ROUTES } from "../../utils/constants";

export default function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-white/[0.05]">
      <nav className="max-w-7xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid place-items-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 glow-violet">
            <svg viewBox="0 0 32 32" width="20" height="20" fill="none">
              <path d="M4 17 L10 17 L13 10 L16 24 L19 14 L21 17 L28 17"
                    stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="font-display font-bold text-lg tracking-tight gradient-text">
            DevVitals
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to={ROUTES.leaderboard} className="hidden sm:inline-flex btn-ghost text-xs">
            Leaderboard
          </Link>
          {isAuthenticated ? (
            <Link to={ROUTES.dashboard}>
              <Button size="sm">Open dashboard →</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
              <Link to="/signup">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
