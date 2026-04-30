import { Link } from "react-router-dom";
import Sparkline from "./Sparkline";
import useCountUp from "../../hooks/useCountUp";

/**
 * Rich top-row stat card. Replaces StatCard for the new dashboard layout.
 *
 * Props:
 *  - label: short uppercase label
 *  - value: numeric metric (or string for non-counted values)
 *  - to: optional route — makes the tile a clickable link
 *  - icon: emoji/string
 *  - accent: hex color used for the corner glow + spark + delta
 *  - delta: e.g. +12 or -3 vs prior period (number); auto-coloured
 *  - deltaLabel: e.g. "vs last week"
 *  - suffix: rendered after the number (e.g. "h")
 *  - prefix: rendered before the number
 *  - spark: array of numbers for the inline sparkline
 *  - progress: { value, max } renders a thin bar instead of/with the spark
 *  - integer: format as integer (default true)
 */
export default function StatTile({
  label,
  value,
  to,
  icon,
  accent = "#A78BFA",
  delta,
  deltaLabel,
  suffix,
  prefix,
  spark,
  progress,
  integer = true,
  hint,
}) {
  const numeric = typeof value === "number" || /^\d+(\.\d+)?$/.test(String(value || ""));
  const animated = useCountUp(numeric ? Number(value) : 0, { integer });
  const display = numeric ? animated : value;

  const deltaUp = typeof delta === "number" ? delta > 0 : null;
  const deltaColor = deltaUp == null
    ? "text-ink-muted"
    : deltaUp ? "text-good" : "text-bad";

  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="group relative panel-pad !p-4 overflow-hidden card-hover block"
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            {icon &&
              (typeof icon === "string" ? (
                <span className="text-sm leading-none">{icon}</span>
              ) : (
                <span className="inline-flex items-center" style={{ color: accent }}>
                  {icon}
                </span>
              ))}
            <span>{label}</span>
          </div>
          <div className="mt-1.5 flex items-baseline gap-1">
            {prefix && <span className="text-lg text-ink-muted">{prefix}</span>}
            <span
              className="font-display font-bold text-3xl tabular-nums"
              style={{ textShadow: `0 0 18px ${accent}33` }}
            >
              {display ?? "—"}
            </span>
            {suffix && <span className="text-sm text-ink-muted">{suffix}</span>}
          </div>
        </div>

        {spark && spark.length > 0 && (
          <div className="opacity-90 group-hover:opacity-100 transition">
            <Sparkline values={spark} color={accent} width={88} height={32} />
          </div>
        )}
      </div>

      {progress && progress.max > 0 && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, (progress.value / progress.max) * 100)}%`,
                background: `linear-gradient(90deg, ${accent}, #22d3ee)`,
                boxShadow: `0 0 10px ${accent}66`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-faint tabular-nums">
            <span>
              {progress.value}/{progress.max}
            </span>
            {hint && <span>{hint}</span>}
          </div>
        </div>
      )}

      {(typeof delta === "number" || deltaLabel) && !progress && (
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          {typeof delta === "number" && (
            <span className={`${deltaColor} font-semibold tabular-nums`}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "·"} {Math.abs(delta)}
            </span>
          )}
          {deltaLabel && <span className="text-ink-faint">{deltaLabel}</span>}
        </div>
      )}
    </Wrapper>
  );
}
