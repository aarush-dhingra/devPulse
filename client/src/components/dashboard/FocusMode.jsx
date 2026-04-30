import { useEffect, useRef, useState } from "react";
import { pomodoroApi } from "../../api/pomodoro.api";

const PHASES = {
  focus: { label: "Focus", durationSec: 25 * 60, color: "#A78BFA" },
  short_break: { label: "Short break", durationSec: 5 * 60, color: "#22d3ee" },
  long_break: { label: "Long break", durationSec: 15 * 60, color: "#f472b6" },
};

const STORAGE_KEY = "devpulse:pomodoro:v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function fmtTime(secs) {
  const m = Math.floor(Math.max(0, secs) / 60);
  const s = Math.max(0, secs) % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusMode() {
  const [phase, setPhase] = useState("focus");
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState(null);
  const [remaining, setRemaining] = useState(PHASES.focus.durationSec);
  const [completedToday, setCompletedToday] = useState(0);
  const [focusMinutes, setFocusMinutes] = useState(0);
  const tickRef = useRef(null);
  const hasFiredCompletionRef = useRef(false);

  useEffect(() => {
    const s = loadState();
    if (s?.phase && PHASES[s.phase]) setPhase(s.phase);
    if (s?.endsAt) {
      setEndsAt(s.endsAt);
      const left = Math.round((s.endsAt - Date.now()) / 1000);
      if (left > 0 && s.running) {
        setRunning(true);
        setRemaining(left);
      } else {
        setRemaining(PHASES[s.phase || "focus"].durationSec);
      }
    }
    refreshSummary();
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
  }, [running, endsAt]);

  useEffect(() => {
    saveState({ phase, running, endsAt });
  }, [phase, running, endsAt]);

  const start = () => {
    const dur = PHASES[phase].durationSec;
    const newEnd = Date.now() + (remaining > 0 && remaining <= dur ? remaining : dur) * 1000;
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
    setRemaining(PHASES[phase].durationSec);
  };
  const switchPhase = (p) => {
    setRunning(false);
    setEndsAt(null);
    setPhase(p);
    setRemaining(PHASES[p].durationSec);
  };

  const complete = async () => {
    setRunning(false);
    setEndsAt(null);
    setRemaining(0);
    try {
      await pomodoroApi.log({
        kind: phase,
        durationSeconds: PHASES[phase].durationSec,
      });
      refreshSummary();
    } catch { /* ignore */ }
    // Auto-cycle: focus -> short_break, short_break -> focus
    setTimeout(() => {
      if (phase === "focus") switchPhase("short_break");
      else switchPhase("focus");
    }, 600);
  };

  const dur = PHASES[phase].durationSec;
  const ratio = Math.max(0, Math.min(1, 1 - remaining / dur));
  const accent = PHASES[phase].color;

  // Circular progress ring
  const R = 64;
  const C = 2 * Math.PI * R;
  const dashOffset = C * (1 - ratio);

  return (
    <div className="panel-pad">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg">Focus Mode</h3>
        <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 text-[11px]">
          {Object.entries(PHASES).map(([k, p]) => (
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
      </div>

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
                {PHASES[phase].label}
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
