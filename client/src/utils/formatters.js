export function formatNumber(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(v);
}

export function formatHours(h) {
  const v = Number(h) || 0;
  if (v < 1) return `${Math.round(v * 60)}m`;
  return `${v.toFixed(1)}h`;
}

export function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function relativeTime(d) {
  if (!d) return "";
  const ms = Date.now() - new Date(d).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  const yr = Math.round(mo / 12);
  return `${yr}y ago`;
}
