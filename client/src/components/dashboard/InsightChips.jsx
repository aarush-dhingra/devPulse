/**
 * InsightChips — derives smart insight tags from stats + heatmap data.
 * Pass `insights` array computed by `computeInsights()`.
 */
export function computeInsights({ stats = {}, heatmap = null, period = "90d" }) {
  const gh  = stats.github    || {};
  const lc  = stats.leetcode  || {};
  const wt  = stats.wakatime  || {};
  const gfg = stats.gfg       || {};
  const cf  = stats.codeforces || {};
  const chips = [];

  // Activity this week
  const todayMs = Date.now();
  let activeThisWeek = 0;
  for (const d of heatmap?.heatmap || []) {
    const ms = new Date(d.date + "T00:00:00Z").getTime();
    if (todayMs - ms < 7 * 86400000 && Number(d.count) > 0) activeThisWeek += 1;
  }
  if (activeThisWeek === 0) {
    chips.push({ id: "low-activity", label: "⚠️ Low activity this week", tone: "warn" });
  } else if (activeThisWeek >= 6) {
    chips.push({ id: "great-week", label: "🏆 Great week — 6+ active days", tone: "good" });
  }

  // Best day of week
  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  for (const d of heatmap?.heatmap || []) {
    if (Number(d.count) > 0) {
      const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
      dayCount[dow] += Number(d.count);
    }
  }
  const maxDay = dayCount.indexOf(Math.max(...dayCount));
  const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  if (dayCount[maxDay] > 0) {
    chips.push({ id: "best-day", label: `⚡ Best day: ${DAY_NAMES[maxDay]}`, tone: "neutral" });
  }

  // Streak
  const streak = Math.max(
    Number(gh.contributions?.streakCurrent ?? 0),
    Number(gfg.streak ?? 0)
  );
  if (streak >= 7) {
    chips.push({ id: "streak", label: `🔥 ${streak}-day streak`, tone: "good" });
  }

  // LeetCode rating
  const lcRating = Number(lc.rating ?? 0);
  if (lcRating >= 1500) {
    chips.push({ id: "lc-rating", label: `🧩 LeetCode ${lcRating}`, tone: "good" });
  }

  // Top language
  const langs = gh.repos?.languages || {};
  const topLang = Object.entries(langs).sort(([, a], [, b]) => b - a)[0]?.[0];
  if (topLang) {
    chips.push({ id: "top-lang", label: `🏷️ Top: ${topLang}`, tone: "neutral" });
  }

  // Wakatime vs average
  const dailyAvg = Number(wt.dailyAverageHours ?? 0);
  if (dailyAvg > 4) {
    chips.push({ id: "power-coder", label: `⚡ ${dailyAvg.toFixed(1)}h/day avg`, tone: "good" });
  }

  return chips.slice(0, 5);
}

const TONE_STYLES = {
  good:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warn:    "border-amber-500/30  bg-amber-500/10  text-amber-300",
  bad:     "border-rose-500/30   bg-rose-500/10   text-rose-300",
  neutral: "border-white/10      bg-white/[0.04]  text-ink-muted",
};

export default function InsightChips({ insights = [] }) {
  if (!insights.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {insights.map((c) => (
        <span
          key={c.id}
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5
                      text-[11px] font-medium leading-none whitespace-nowrap
                      ${TONE_STYLES[c.tone] || TONE_STYLES.neutral}`}
        >
          {c.label}
        </span>
      ))}
    </div>
  );
}
