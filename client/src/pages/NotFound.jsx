import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] grid place-items-center px-4 text-center">
      <div>
        <div className="text-7xl">🛸</div>
        <h1 className="mt-4 text-3xl font-extrabold">Lost in space</h1>
        <p className="mt-2 text-ink-muted">
          The page you were looking for didn't exist (or its DevScore wasn't high enough).
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          Take me home
        </Link>
      </div>
    </main>
  );
}
