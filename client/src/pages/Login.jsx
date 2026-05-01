import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((s) => s.setUser);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setUser(data.user);
      navigate(location.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] grid place-items-center p-4">
      <AuroraBackdrop />
      <div className="relative w-full max-w-md">
        <div className="panel-pad holo-border space-y-5">
          <header className="text-center">
            <div className="inline-grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 mx-auto mb-3 glow-violet">
              <span className="text-white text-xl font-black">⚡</span>
            </div>
            <h1 className="text-2xl font-display font-bold">Welcome back</h1>
            <p className="text-sm text-ink-muted mt-1">
              Sign in to your DevVitals
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Email">
              <input
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@dev.pulse"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {error && <ErrorBox message={error} />}

            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          <Divider>or</Divider>

          <a href={authApi.loginWithGithubUrl()} className="btn-ghost w-full">
            <GhIcon /> Continue with GitHub
          </a>

          <p className="text-center text-sm text-ink-muted">
            New here?{" "}
            <Link to="/signup" className="text-accent-300 hover:text-accent-200">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-muted uppercase tracking-wider">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="text-[11px] text-ink-faint mt-1 block">{hint}</span>}
    </label>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2 flex items-start gap-2">
      <span aria-hidden>⚠</span>
      <span>{message}</span>
    </div>
  );
}

export function Divider({ children }) {
  return (
    <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-ink-faint">
      <span className="flex-1 hr-soft" />
      <span>{children}</span>
      <span className="flex-1 hr-soft" />
    </div>
  );
}

export function AuroraBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-20 w-[600px] h-[600px] rounded-full blur-3xl opacity-40"
           style={{ background: "radial-gradient(closest-side, #8b5cf6, transparent)" }} />
      <div className="absolute -bottom-40 -right-20 w-[600px] h-[600px] rounded-full blur-3xl opacity-30"
           style={{ background: "radial-gradient(closest-side, #22d3ee, transparent)" }} />
    </div>
  );
}

export function GhIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.67 1.24 3.32.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.71 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.44-2.69 5.42-5.25 5.7.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
    </svg>
  );
}
