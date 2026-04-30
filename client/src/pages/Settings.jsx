import { useState } from "react";
import EditProfile from "../components/profile/EditProfile";
import ConnectPlatform from "../components/profile/ConnectPlatform";
import Button from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { usePlatforms } from "../hooks/usePlatforms";
import { PLATFORMS } from "../utils/constants";
import { relativeTime } from "../utils/formatters";

const PLATFORM_HELP = {
  github: { url: "https://github.com", text: "Sign in with GitHub above to auto-connect." },
  leetcode: { url: "https://leetcode.com", text: "Use your public LeetCode handle." },
  gfg: { url: "https://www.geeksforgeeks.org", text: "Find your handle on geeksforgeeks.org." },
  codeforces: { url: "https://codeforces.com", text: "Use your Codeforces handle." },
  wakatime: {
    url: "https://wakatime.com/api-key",
    text: "Grab your API key from wakatime.com/api-key.",
  },
  devto: { url: "https://dev.to", text: "Use your Dev.to username." },
};

const STATUS_PILL = {
  connected: { label: "Connected", className: "bg-good/15 text-good ring-1 ring-good/30" },
  pending: { label: "Syncing…", className: "bg-warn/15 text-warn ring-1 ring-warn/30" },
  error: { label: "Error", className: "bg-bad/15 text-bad ring-1 ring-bad/30" },
};

export default function Settings() {
  const { user } = useAuth();
  const { platforms, connect, disconnect, refresh, loading } = usePlatforms();
  const [openId, setOpenId] = useState(null);
  const [retrying, setRetrying] = useState(null);

  const byId = Object.fromEntries(platforms.map((p) => [p.platform_name, p]));

  const handleRetry = async (p) => {
    if (!p) return;
    setRetrying(p.platform_name);
    try {
      await connect({
        platform: p.platform_name,
        username: p.platform_username,
      });
    } catch {
      /* surfaced via platform.last_error after refresh */
    } finally {
      setRetrying(null);
      refresh();
    }
  };

  return (
    <>
      <header>
        <h1 className="font-display font-bold text-2xl gradient-text">Settings</h1>
        <p className="text-ink-muted text-sm mt-1">
          Manage your profile and connected platforms.
        </p>
      </header>

      <EditProfile user={user} />

      <section className="panel-pad">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-display font-bold text-lg">Connect Platforms</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Link the services you actively use. We refresh stats hourly.
            </p>
          </div>
          {loading && <span className="text-xs text-ink-muted">Loading…</span>}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {PLATFORMS.map((p) => {
            const c = byId[p.id];
            const status = c?.status || "disconnected";
            const pill = STATUS_PILL[status];
            const help = PLATFORM_HELP[p.id];
            const isError = status === "error";
            return (
              <div
                key={p.id}
                className="relative panel-pad !p-4 hover:border-accent-500/30 transition group"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
                }}
              >
                <div
                  className="absolute -top-px left-4 right-4 h-px opacity-60"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${p.color}, transparent)`,
                  }}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl grid place-items-center text-xl ring-1 ring-white/10 shrink-0"
                    style={{
                      background: p.bg,
                      color: p.color,
                      boxShadow: `0 0 22px ${p.color}33`,
                    }}
                  >
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.name}</span>
                      {pill && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${pill.className}`}
                        >
                          {pill.label}
                        </span>
                      )}
                    </div>
                    {c ? (
                      <div className="text-xs text-ink-muted mt-0.5 truncate">
                        @{c.platform_username}
                        {c.last_synced && ` · synced ${relativeTime(c.last_synced)}`}
                      </div>
                    ) : (
                      <div className="text-xs text-ink-muted mt-0.5">
                        Not connected — click below to link.
                      </div>
                    )}
                  </div>
                </div>

                {isError && c?.last_error && (
                  <div className="mt-3 text-xs rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-bad">
                    <span className="font-semibold">Sync failed:</span>{" "}
                    {c.last_error.length > 200
                      ? c.last_error.slice(0, 200) + "…"
                      : c.last_error}
                  </div>
                )}

                {help && (
                  <div className="mt-3 text-[11px] text-ink-faint">
                    {help.text}{" "}
                    <a
                      href={help.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent-300 hover:underline"
                    >
                      Learn more →
                    </a>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {!c && (
                    <Button size="sm" onClick={() => setOpenId(p.id)}>
                      Connect
                    </Button>
                  )}
                  {c && isError && (
                    <Button
                      size="sm"
                      onClick={() => handleRetry(c)}
                      loading={retrying === p.id}
                    >
                      Retry
                    </Button>
                  )}
                  {c && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setOpenId(p.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => disconnect(p.id)}
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ConnectPlatform
        open={!!openId}
        platformId={openId}
        onClose={() => setOpenId(null)}
        onSubmit={connect}
      />
    </>
  );
}
