import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { authApi } from "../api/auth.api";
import { useAuthStore } from "../store/authStore";
import { Field, ErrorBox, Divider, AuroraBackdrop, GhIcon } from "./Login";

export default function Signup() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const data = await authApi.signup(form);
      setUser(data.user);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const fields = err.response?.data?.details?.fieldErrors;
      if (fields) {
        const first = Object.entries(fields).find(([, v]) => v?.length);
        setError(first ? `${first[0]}: ${first[1][0]}` : "Validation failed");
      } else {
        setError(err.response?.data?.message || "Signup failed");
      }
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
            <h1 className="text-2xl font-display font-bold">Join DevPulse</h1>
            <p className="text-sm text-ink-muted mt-1">
              Build your unified dev profile in seconds
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="Display name">
              <input
                className="input"
                value={form.name}
                onChange={update("name")}
                placeholder="Ada Lovelace"
                maxLength={100}
              />
            </Field>
            <Field
              label="Username"
              hint="3–40 characters · letters, numbers, _ and -"
            >
              <input
                required
                pattern="[A-Za-z0-9_\-]{3,40}"
                className="input lowercase"
                value={form.username}
                onChange={update("username")}
                placeholder="ada"
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                className="input"
                value={form.email}
                onChange={update("email")}
                placeholder="ada@dev.pulse"
              />
            </Field>
            <Field label="Password" hint="At least 8 characters">
              <input
                required
                type="password"
                minLength={8}
                className="input"
                value={form.password}
                onChange={update("password")}
                placeholder="••••••••"
              />
            </Field>

            {error && <ErrorBox message={error} />}

            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>

          <Divider>or</Divider>

          <a href={authApi.loginWithGithubUrl()} className="btn-ghost w-full">
            <GhIcon /> Continue with GitHub
          </a>

          <p className="text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link to="/login" className="text-accent-300 hover:text-accent-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
