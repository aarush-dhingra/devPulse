export function tierFor(score) {
  if (score >= 900) return { name: "Legend", color: "#f59e0b", emoji: "🌟" };
  if (score >= 750) return { name: "Elite", color: "#a855f7", emoji: "💎" };
  if (score >= 600) return { name: "Pro", color: "#3b82f6", emoji: "🚀" };
  if (score >= 400) return { name: "Skilled", color: "#10b981", emoji: "⚡" };
  if (score >= 200) return { name: "Rising", color: "#06b6d4", emoji: "🌱" };
  return { name: "Rookie", color: "#64748b", emoji: "🐣" };
}

export function progressFraction(score, max = 1000) {
  if (!score) return 0;
  return Math.min(1, Math.max(0, score / max));
}

export function describePercentile(p) {
  if (p == null) return "";
  if (p >= 99) return "Top 1%";
  if (p >= 95) return "Top 5%";
  if (p >= 90) return "Top 10%";
  if (p >= 75) return "Top 25%";
  return `Top ${100 - p}%`;
}
