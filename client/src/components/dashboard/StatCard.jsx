import { Link } from "react-router-dom";
import clsx from "clsx";
import Sparkline from "./Sparkline";
import { formatNumber } from "../../utils/formatters";

export default function StatCard({
  label,
  value,
  icon,
  hint,
  accent = "#8b5cf6",
  trend,
  spark,
  format = "number",
  to,
}) {
  const display =
    typeof value === "number" && format === "number"
      ? formatNumber(value)
      : value ?? "—";

  const Wrapper = to ? Link : "div";
  const wrapperProps = to ? { to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={clsx(
        "card card-hover group relative block",
        to && "cursor-pointer"
      )}
    >
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-25 blur-3xl group-hover:opacity-40 transition-opacity"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {label}
          </p>
          <p className="mt-2 text-3xl stat-num text-shadow-soft">{display}</p>
          <div className="mt-1 flex items-center gap-2 text-xs">
            {trend != null && (
              <span
                className={clsx(
                  "font-mono font-semibold",
                  trend > 0
                    ? "text-emerald-400"
                    : trend < 0
                    ? "text-rose-400"
                    : "text-ink-muted"
                )}
              >
                {trend > 0 ? "▲" : trend < 0 ? "▼" : "•"}
                {" "}{Math.abs(trend)}%
              </span>
            )}
            {hint && <span className="text-ink-faint truncate">{hint}</span>}
          </div>
        </div>
        {icon && (
          <div
            className="grid place-items-center w-10 h-10 rounded-xl text-lg ring-1 ring-white/10 shrink-0"
            style={{
              background: `linear-gradient(135deg, ${accent}33, ${accent}10)`,
              color: accent,
              boxShadow: `0 0 16px ${accent}33`,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      {spark && spark.length > 0 && (
        <div className="mt-3 -mx-1">
          <Sparkline values={spark} color={accent} height={32} width={240} />
        </div>
      )}
      {to && (
        <div className="absolute bottom-3 right-3 text-ink-faint group-hover:text-accent-300 transition opacity-0 group-hover:opacity-100">
          →
        </div>
      )}
    </Wrapper>
  );
}
