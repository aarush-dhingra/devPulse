import React from "react";

/**
 * Glassy futuristic Recharts tooltip.
 * Pass to <Tooltip content={<ChartTooltip />} /> or with a custom formatter:
 *   <Tooltip content={<ChartTooltip formatValue={(v) => `${v}h`} />} />
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  formatValue,
  hideLabel = false,
  title,
}) {
  if (!active || !payload || !payload.length) return null;

  const fmt = (v, entry) => {
    if (formatValue) return formatValue(v, entry);
    if (typeof v === "number") {
      if (Math.abs(v) >= 1000) return v.toLocaleString();
      if (Number.isInteger(v)) return String(v);
      return v.toFixed(2);
    }
    return String(v);
  };

  return (
    <div
      className="rounded-lg border border-line/80 bg-bg/95 backdrop-blur-md px-3 py-2 shadow-deep min-w-[160px]"
      style={{ boxShadow: "0 8px 28px -10px rgba(124,58,237,0.45)" }}
    >
      {(title || (label != null && !hideLabel)) && (
        <div className="text-[11px] uppercase tracking-wider text-ink-dim mb-1.5">
          {title ?? label}
        </div>
      )}
      <ul className="space-y-1">
        {payload.map((entry, idx) => {
          const color = entry.color || entry.payload?.fill || entry.fill || "#A78BFA";
          const name = entry.name ?? entry.dataKey ?? "value";
          const value = entry.value;
          return (
            <li key={`${name}-${idx}`} className="flex items-center gap-2 text-sm text-ink">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span className="text-ink-dim flex-1">{name}</span>
              <span className="font-semibold tabular-nums text-ink">
                {fmt(value, entry)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
