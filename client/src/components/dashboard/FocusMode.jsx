import { useEffect, useRef, useState } from "react";
import { pomodoroApi } from "../../api/pomodoro.api";

const DEFAULTS = {
  focus: 25,
  short_break: 5,
  long_break: 15,
};

const PHASE_META = {
  focus: { label: "Focus", color: "#A78BFA" },
  short_break: { label: "Short", color: "#22d3ee" },
  long_break: { label: "Long", color: "#f472b6" },
};

const STORAGE_KEY = "devvitals:pomodoro:v2";
const SETTINGS_KEY = "devvitals:pomodoro:settings:v1";

const MIN_MINUTES = 1;
const MAX_MINUTES = 120;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return fallback;
    return obj;
  } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function clampMinutes(n) {
  const v = Math.round(Number(n) || 0);
  return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, v));
}

function fmtTime(secs) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusMode() {
  const [settings, setSettings] = useState(() =>
    loadJSON(SETTINGS_KEY, DEFAULTS)
  );
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState("focus");
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState(null);
  const [remaining, setRemaining] = useState((settings.focus || DEFAULTS.focus) * 60);
  const [completedToday, setCompletedToday] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const tickRef = useRef(null);
  const hasFiredCompletionRef = useRef(false);

  const phaseSeconds = (p, s = settings) =>
    clampMinutes(s[p] ?? DEFAULTS[p]) * 60;

  useEffect(() => {
    const s = loadJSON(STORAGE_KEY, null);
    if (s?.phase && PHASE_META[s.phase]) setPhase(s.phase);
    if (s?.endsAt) {
      setEndsAt(s.endsAt);
      const left = Math.round((s.endsAt - Date.now()) / 1000);
      if (left > 0 && s.running) {
        setRunning(true);
        setRemaining(left);
      } else {
        setRemaining(phaseSeconds(s.phase || "focus"));
      }
    }
    refreshSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshSummary = async () => {
    try {
      const data = await pomodoroApi.today();
      setCompletedToday(data?.summary?.focusSessionsToday || 0);
      setFocusMinutes(data?.summary?.focusTodayMinutes || 0);
    } catch { /* offline ok */ }
  };

  useEffect(() => {
    if (!running || !endsAt) return undefined;
    hasFiredCompletionRef.current = false;
    const tick = () => {
      const left = Math.round((endsAt - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !hasFiredCompletionRef.current) {
        hasFiredCompletionRef.current = true;
        complete();
      }
    };
    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, endsAt]);

  /* Listen for the global "Start Focus Session" CTA — TodayFocus dispatches
     this event so the panel can be triggered from anywhere on the page. */
  useEffect(() => {
    const handler = () => {
      if (!running) start();
    };
    window.addEventListener("devvitals:focus:start", handler);
    return () => window.removeEventListener("devvitals:focus:start", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, phase, settings, remaining, endsAt]);

  useEffect(() => {
    saveJSON(STORAGE_KEY, { phase, running, endsAt });
  }, [phase, running, endsAt]);

  const start = () => {
    const dur = phaseSeconds(phase);
    const useRemaining = remaining > 0 && remaining <= dur;
    const newEnd = Date.now() + (useRemaining ? remaining : dur) * 1000;
    setEndsAt(newEnd);
    setRunning(true);
  };
  const pause = () => {
    setRunning(false);
    if (endsAt) {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
    }
  };
  const reset = () => {
    setRunning(false);
    setEndsAt(null);
    setRemaining(phaseSeconds(phase));
  };
  const switchPhase = (p) => {
    setRunning(false);
    setEndsAt(null);
    setPhase(p);
    setRemaining(phaseSeconds(p));
  };

  const complete = async () => {
    setRunning(false);
    setEndsAt(null);
    setRemaining(0);
    try {
      await pomodoroApi.log({
        kind: phase,
        durationSeconds: phaseSeconds(phase),
      });
      refreshSummary();
    } catch { /* ignore */ }
    setTimeout(() => {
      if (phase === "focus") switchPhase("short_break");
      else switchPhase("focus");
    }, 600);
  };

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: clampMinutes(value) };
    setSettings(next);
    saveJSON(SETTINGS_KEY, next);
    if (!running) setRemaining(clampMinutes(next[phase]) * 60);
  };

  const resetSettings = () => {
    setSettings(DEFAULTS);
    saveJSON(SETTINGS_KEY, DEFAULTS);
    if (!running) setRemaining(DEFAULTS[phase] * 60);
  };

  const dur = phaseSeconds(phase);
  const ratio = Math.max(0, Math.min(1, 1 - remaining / dur));
  const accent = PHASE_META[phase].color;

  const R = 64;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - ratio);

  /* pulse animation class injected via style tag */
  const glowStyle = running ? {
    boxShadow: "0 0 0 1px rgba(167,139,250,0.45), 0 0 32px rgba(167,139,250,0.2), 0 0 64px rgba(167,139,250,0.08)",
    transition: "box-shadow 0.4s ease",
  } : {
    boxShadow: "none",
    transition: "box-shadow 0.4s ease",
  };

  return (
    <div
      id="focus-mode"
      className="panel-pad rounded-xl relative overflow-hidden"
      style={glowStyle}
    >
      {/* Live indicator strip */}
      {running && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl overflow-hidden"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent} 40%, ${accent} 60%, transparent)`,
            animation: "focus-pulse 2s ease-in-out infinite",
          }}
        />
      )}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-display font-bold text-lg">Focus Mode</h3>
          {running && (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 text-[11px]">
            {Object.entries(PHASE_META).map(([k, p]) => (
              <button
                key={k}
                onClick={() => switchPhase(k)}
                className={`px-2.5 py-1 rounded-full uppercase tracking-wider transition ${
                  phase === k
                    ? "bg-accent-500/20 text-accent-200 ring-1 ring-accent-500/40"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowSettings((v) => !v)}
            className={`w-7 h-7 grid place-items-center rounded-full border transition text-[13px] ${
              showSettings
                ? "border-accent-500/40 bg-accent-500/10 text-accent-200"
                : "border-white/10 bg-white/[0.04] text-ink-muted hover:text-ink"
            }`}
            aria-label="Customize timers"
            title="Customize timers"
          >
            ⚙
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="mb-3 rounded-xl border border-accent-500/20 bg-accent-500/5 p-3 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-ink-faint">
            Customize durations (minutes)
          </div>
          {Object.keys(DEFAULTS).map((k) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-ink-muted w-24">{PHASE_META[k].label}</span>
              <input
                type="range"
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                value={settings[k]}
                onChange={(e) => updateSetting(k, e.target.value)}
                className="flex-1 accent-accent-500"
                disabled={running && phase === k}
              />
              <input
                type="number"
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                value={settings[k]}
                onChange={(e) => updateSetting(k, e.target.value)}
                disabled={running && phase === k}
                className="input !w-16 !py-1 !px-2 text-center"
              />
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            {running && (
              <span className="text-[11px] text-warn">
                Pause to edit the active phase.
              </span>
            )}
            <button
              onClick={resetSettings}
              className="ml-auto text-[11px] uppercase tracking-wider text-ink-faint hover:text-ink transition"
            >
              Reset to 25 / 5 / 15
            </button>
          </div>
        </div>
      )}

      <div className="grid place-items-center my-3">
        <div className="relative">
          <svg width="160" height="160">
            <circle
              cx="80" cy="80" r={R}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="80" cy="80" r={R}
              stroke={accent}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 80 80)"
              style={{
                transition: "stroke-dashoffset 0.9s linear",
                filter: `drop-shadow(0 0 10px ${accent}cc)`,
              }}
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center">
            <div className="text-center">
              <div
                className="font-display font-bold text-4xl tabular-nums"
                style={{ textShadow: `0 0 14px ${accent}55` }}
              >
                {fmtTime(remaining)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-ink-faint mt-1">
                {PHASE_META[phase].label} · {settings[phase]}m
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-2">
        {!running ? (
          <button onClick={start} className="btn-primary px-6 py-2">
            ▶ Start
          </button>
        ) : (
          <button onClick={pause} className="btn-ghost px-6 py-2">
            ⏸ Pause
          </button>
        )}
        <button onClick={reset} className="btn-ghost">
          ⟳ Reset
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[11px]">
        <div className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5">
          <div className="text-ink-faint uppercase tracking-wider text-[10px]">Today</div>
          <div className="stat-num text-base">{completedToday}</div>
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/5 px-2 py-1.5">
          <div className="text-ink-faint uppercase tracking-wider text-[10px]">Minutes</div>
          <div className="stat-num text-base">{focusMinutes}</div>
        </div>
      </div>
    </div>
  );
}
