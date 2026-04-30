import { tierFor, describePercentile } from "../../utils/scoreUtils";
import useCountUp from "../../hooks/useCountUp";
import { useEffect, useRef } from "react";
import PlatformLogo from "../ui/PlatformLogo";

const COMPONENT_META = [
  { key: "github", label: "GitHub", color: "#e6edf3" },
  { key: "leetcode", label: "LeetCode", color: "#ffa116" },
  { key: "wakatime", label: "Wakatime", color: "#22d3ee" },
  { key: "codeforces", label: "Codeforces", color: "#fe646f" },
  { key: "gfg", label: "GeeksForGeeks", color: "#10b981" },
];

export default function DevScoreCard({ devscore }) {
  const score = devscore?.score ?? 0;
  const tier = devscore?.tier ?? tierFor(score);
  const components = devscore?.components || {};
  const percentile = devscore?.percentile;
  const animatedScore = useCountUp(score, { duration: 1100 });

  // Tier-up confetti when score crosses tier threshold.
  const prevTierRef = useRef(tier?.name);
  useEffect(() => {
    if (prevTierRef.current && prevTierRef.current !== tier?.name) {
      fireConfetti(tier?.color || "#A78BFA");
    }
    prevTierRef.current = tier?.name;
  }, [tier?.name, tier?.color]);

  const radius = 86;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 1000) * circ;

  return (
    <div className="panel-pad relative overflow-hidden">
      <div
        className="absolute -top-32 -right-24 w-96 h-96 rounded-full blur-3xl opacity-25"
        style={{ background: tier.color }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${tier.color}, transparent)`,
        }}
      />

      <div className="relative grid md:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="relative w-[220px] h-[220px] mx-auto md:mx-0">
          <svg width="220" height="220" viewBox="0 0 220 220" className="absolute inset-0">
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={tier.color} />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <filter id="scoreBlur">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>
            <circle cx="110" cy="110" r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="none" />
            <circle
              cx="110" cy="110" r={radius - 14}
              stroke={tier.color}
              strokeWidth="1"
              strokeDasharray="2 6"
              fill="none"
              opacity="0.5"
              style={{ transformOrigin: "110px 110px", animation: "spin-slow 18s linear infinite reverse" }}
            />
            <circle
              cx="110" cy="110" r={radius}
              stroke="url(#scoreGrad)"
              strokeWidth="14"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 110 110)"
              filter="url(#scoreBlur)"
              opacity="0.6"
            />
            <circle
              cx="110" cy="110" r={radius}
              stroke="url(#scoreGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${dash} ${circ}`}
              transform="rotate(-90 110 110)"
              className="transition-[stroke-dasharray] duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className="text-[64px] stat-num leading-none text-shadow-soft tabular-nums"
              style={{ textShadow: `0 0 22px ${tier.color}55` }}
            >
              {animatedScore}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-muted mt-1">
              / 1000 DevScore
            </div>
            <div
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold"
              style={{ color: tier.color }}
            >
              <span>{tier.emoji}</span>
              {tier.name}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <h3 className="font-display font-bold text-lg">DevScore Breakdown</h3>
            {percentile != null && percentile > 0 && (
              <span className="pill-accent">{describePercentile(percentile)}</span>
            )}
          </div>
          <div className="space-y-2.5">
            {COMPONENT_META.map((c) => {
              const v = Math.round(components[c.key] || 0);
              return (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-muted flex items-center gap-1.5">
                      <PlatformLogo platform={c.key} size={12} color={c.color} />
                      {c.label}
                    </span>
                    <span className="font-mono text-ink-muted">{v}<span className="text-ink-faint">/100</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-[width] duration-1000 ease-out"
                      style={{
                        width: `${v}%`,
                        background: `linear-gradient(90deg, ${c.color}, ${c.color}aa)`,
                        boxShadow: v > 0 ? `0 0 8px ${c.color}80` : undefined,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny confetti effect — no extra deps; canvas painted into the body.
function fireConfetti(baseColor = "#A78BFA") {
  if (typeof document === "undefined") return;
  const colors = [baseColor, "#22d3ee", "#f472b6", "#fbbf24", "#ffffff"];
  const cnt = 36;
  const root = document.body;
  const c = document.createElement("canvas");
  c.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;width:100vw;height:100vh;";
  c.width = window.innerWidth;
  c.height = window.innerHeight;
  root.appendChild(c);
  const ctx = c.getContext("2d");
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 3;
  const parts = Array.from({ length: cnt }, () => ({
    x: cx,
    y: cy,
    vx: (Math.random() - 0.5) * 10,
    vy: -Math.random() * 8 - 4,
    g: 0.25 + Math.random() * 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
    size: 4 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    life: 0,
  }));
  let frame = 0;
  const animate = () => {
    frame += 1;
    ctx.clearRect(0, 0, c.width, c.height);
    parts.forEach((p) => {
      p.vy += p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life += 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.life / 90);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    if (frame < 110) requestAnimationFrame(animate);
    else c.remove();
  };
  requestAnimationFrame(animate);
}
