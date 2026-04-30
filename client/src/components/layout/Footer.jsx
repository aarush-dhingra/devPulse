import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/[0.05]">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-faint">
        <p className="flex items-center gap-2">
          <span className="grid place-items-center w-5 h-5 rounded-md bg-gradient-to-br from-accent-500 to-cyan-500">
            <span className="text-white font-black text-[10px]">⚡</span>
          </span>
          © {new Date().getFullYear()} DevPulse · Built with caffeine for builders
        </p>
        <div className="flex items-center gap-4">
          <Link className="hover:text-accent-300 transition" to="/leaderboard">Leaderboard</Link>
          <Link className="hover:text-accent-300 transition" to="/wrapped">Wrapped</Link>
          <a className="hover:text-accent-300 transition" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  );
}
