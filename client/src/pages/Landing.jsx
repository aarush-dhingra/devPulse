import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { ROUTES } from "../utils/constants";
import { AuroraBackdrop } from "./Login";

const features = [
  {
    icon: "📊",
    title: "Unified Dashboard",
    body: "GitHub, LeetCode, Codeforces, GFG, Wakatime, Dev.to — beautifully in one place.",
    color: "#8b5cf6",
  },
  {
    icon: "🏆",
    title: "DevScore Leaderboard",
    body: "A weighted 0-1000 score that captures your full developer footprint, not just one metric.",
    color: "#22d3ee",
  },
  {
    icon: "🌐",
    title: "Community Pulse",
    body: "Follow other devs, like and reply to posts, and rep your stack with a shareable card.",
    color: "#10b981",
  },
  {
    icon: "🎁",
    title: "Wrapped, but Devs",
    body: "Spotify-Wrapped style yearly recap of your code, languages, and night-coding habits.",
    color: "#f59e0b",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  return (
    <main className="max-w-7xl mx-auto px-4 lg:px-6 relative">
      <AuroraBackdrop />

      <section className="pt-20 sm:pt-28 pb-20 text-center relative">
        <span className="pill-accent mb-6 animate-fadeIn">
          ⚡ Beta · v0.1 · join the early devs
        </span>
        <h1 className="font-display text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05]">
          Your <span className="gradient-text">dev life</span>,
          <br />
          all in <span className="gradient-text">one pulse</span>.
        </h1>
        <p className="mt-6 text-lg text-ink-muted max-w-2xl mx-auto">
          DevPulse aggregates everywhere you ship code and turns it into a
          gorgeous, shareable analytics dashboard.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <Link to={ROUTES.dashboard}>
              <Button size="lg">Open dashboard →</Button>
            </Link>
          ) : (
            <>
              <Link to="/signup">
                <Button size="lg">Create account</Button>
              </Link>
              <Link to="/login" className="btn-outline" style={{ padding: "0.75rem 1.25rem" }}>
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
        {features.map((f, i) => (
          <div
            key={f.title}
            className="card card-hover relative overflow-hidden animate-fadeIn"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-30 blur-3xl"
              style={{ background: f.color }}
            />
            <div
              className="text-3xl w-12 h-12 grid place-items-center rounded-xl ring-1 ring-white/10"
              style={{
                background: `linear-gradient(135deg, ${f.color}33, ${f.color}10)`,
                boxShadow: `0 0 20px ${f.color}33`,
              }}
            >
              {f.icon}
            </div>
            <h3 className="mt-3 font-display font-bold text-lg">{f.title}</h3>
            <p className="mt-1 text-sm text-ink-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <section className="panel-pad text-center py-14 mb-20 holo-border relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-50"
          style={{
            background:
              "radial-gradient(800px 240px at 50% 0%, rgba(139,92,246,0.25), transparent 70%)",
          }}
        />
        <h2 className="text-3xl sm:text-4xl font-display font-bold">
          Ready to see your <span className="gradient-text">DevScore</span>?
        </h2>
        <p className="mt-3 text-ink-muted">
          Free forever. No credit card. Sign up with email or GitHub in seconds.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/signup">
            <Button size="lg">Get started →</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
