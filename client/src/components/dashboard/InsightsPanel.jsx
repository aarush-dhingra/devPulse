/**
 * InsightsPanel — short list of human-readable observations with subtle
 * icons (suggestion / trend / warning). Read-only.
 *
 * Examples auto-generated:
 *   • "You solved more problems on Mondays."
 *   • "Activity dipped on Apr 24–25."
 *   • "You're most active between 9 AM – 1 PM."
 */
import { useMemo } from "react";

const DAY_NAMES_LONG = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─── Insight derivation ────────────────────────────────────── */

function buildInsights(stats, heatmap) {
  const insights = [];
  const hm = heatmap?.heatmap || [];
  const lc = stats?.leetcode   || {};
  const wt = stats?.wakatime   || {};
  const gh = stats?.github     || {};
  const cf = stats?.codeforces || {};
  const cc = stats?.codechef   || {};
  const ac = stats?.atcoder    || {};

  /* 1. Most-active day of week (problems — all platforms) */
  const dowCount = [0, 0, 0, 0, 0, 0, 0];
  const allDailySubs = [
    ...(lc.dailySubmissions || []),
    ...(cf.dailySubmissions || []),
    ...(cc.dailySubmissions || []),
    ...(ac.dailySubmissions || []),
  ];
  for (const d of allDailySubs) {
    const n = Number(d.count || 0);
    if (n > 0) {
      const dow = new Date(d.date + "T00:00:00Z").getUTCDay();
      dowCount[dow] += n;
    }
  }
  const bestDow = dowCount.indexOf(Math.max(...dowCount));
  if (dowCount[bestDow] > 0) {
    insights.push({
      id: "best-day",
      icon: "💡",
      tone: "info",
      text: `You solved more problems on ${DAY_NAMES_LONG[bestDow]}.`,
    });
  }

  /* 2. Recent dip detection — find a 1-2 day stretch in last 14 days
        where activity is well below the 14-day median */
  const last14 = hm.slice(-14);
  if (last14.length >= 7) {
    const sorted = [...last14].map((d) => Number(d.count || 0)).sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0) {
      const dips = [];
      for (let i = 0; i < last14.length; i += 1) {
        const v = Number(last14[i].count || 0);
        if (v < median * 0.3) dips.push({ date: last14[i].date, count: v });
      }
      if (dips.length >= 1 && dips.length <= 4) {
        const start = new Date(dips[0].date + "T00:00:00Z");
        const end   = new Date(dips[dips.length - 1].date + "T00:00:00Z");
        const fmt   = (d) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
        const range = dips.length === 1 ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
        insights.push({
          id: "dip",
          icon: "↘",
          tone: "warn",
          text: `Activity dipped on ${range}.`,
        });
      }
    }
  }

  /* 3. Most-active time of day — derived from Wakatime hourlyActivity if available,
        else fall back to a generic morning observation */
  const hourly = wt.hourlyActivity || wt.hourlyDistribution || null;
  if (Array.isArray(hourly) && hourly.length === 24) {
    /* find the contiguous 4-hour window with peak activity */
    let bestStart = 0;
    let bestSum   = 0;
    for (let h = 0; h <= 20; h += 1) {
      const sum = hourly.slice(h, h + 4).reduce((s, v) => s + Number(v || 0), 0);
      if (sum > bestSum) { bestSum = sum; bestStart = h; }
    }
    if (bestSum > 0) {
      const fmt = (h) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const h12  = h % 12 === 0 ? 12 : h % 12;
        return `${h12} ${ampm}`;
      };
      insights.push({
        id: "time-window",
        icon: "⏰",
        tone: "info",
        text: `You're most active between ${fmt(bestStart)} – ${fmt(bestStart + 4)}.`,
      });
    }
  }

  /* 4. Streak observation */
  const streak    = Math.max(Number(gh.contributions?.streakCurrent || 0), Number(stats?.gfg?.streak || 0));
  const maxStreak = Number(gh.contributions?.streakLongest || 0);
  if (streak >= 7) {
    insights.push({
      id: "streak-up",
      icon: "🔥",
      tone: "good",
      text: `Strong consistency — ${streak} day streak going.`,
    });
  } else if (streak === 0 && maxStreak >= 3) {
    insights.push({
      id: "streak-rebuild",
      icon: "💡",
      tone: "info",
      text: `Try to maintain a consistent coding streak!`,
    });
  }

  /* 5. Trend in coding hours */
  const dailyHours = wt.dailyHours || [];
  if (dailyHours.length >= 14) {
    const recent = dailyHours.slice(-7).reduce((s, d) => s + Number(d.hours || 0), 0);
    const older  = dailyHours.slice(-14, -7).reduce((s, d) => s + Number(d.hours || 0), 0);
    if (older > 0 && recent > 0) {
      const change = ((recent - older) / older) * 100;
      if (change >= 25) {
        insights.push({
          id: "coding-up",
          icon: "↗",
          tone: "good",
          text: `Coding time up ${Math.round(change)}% this week.`,
        });
      } else if (change <= -25) {
        insights.push({
          id: "coding-down",
          icon: "↘",
          tone: "warn",
          text: `Coding time down ${Math.round(Math.abs(change))}% this week.`,
        });
      }
    }
  }

  /* 6. Problem mix (LeetCode hard ratio) */
  const lcHard   = Number(lc.solved?.hard   || 0);
  const lcTotal  = Number(lc.solved?.total  || 0);
  const allProblems = lcTotal + Number(cf.uniqueSolved || 0) + Number(cc.problemsSolved || 0) + Number(ac.uniqueSolved || ac.acCount || 0);
  if (lcTotal >= 20) {
    const ratio = (lcHard / lcTotal) * 100;
    if (ratio < 10) {
      insights.push({
        id: "diff-easy",
        icon: "💡",
        tone: "info",
        text: `Try more Hard problems — only ${Math.round(ratio)}% of your solves are Hard.`,
      });
    } else if (ratio >= 30) {
      insights.push({
        id: "diff-hard",
        icon: "🏆",
        tone: "good",
        text: `Strong difficulty mix — ${Math.round(ratio)}% Hard problems solved.`,
      });
    }
  }

  /* 7. Active days last 30 days */
  const todayMs = Date.now();
  const last30Active = hm.filter((d) => {
    const ms = new Date(d.date + "T00:00:00Z").getTime();
    return todayMs - ms < 30 * 86400000 && Number(d.count || 0) > 0;
  }).length;
  if (last30Active > 0 && last30Active < 12) {
    insights.push({
      id: "low-active-month",
      icon: "⚠",
      tone: "warn",
      text: `Only ${last30Active}/30 active days last month — aim for more consistency.`,
    });
  } else if (last30Active >= 25) {
    insights.push({
      id: "high-active-month",
      icon: "🔥",
      tone: "good",
      text: `${last30Active}/30 active days last month — exceptional consistency.`,
    });
  }

  /* ── Fallback insights — guarantee at least 3 entries shown ── */
  if (insights.length < 3) {
    if (allProblems > 0 && !insights.some((i) => i.id.startsWith("diff"))) {
      insights.push({
        id: "problems-total",
        icon: "🧩",
        tone: "info",
        text: `${allProblems.toLocaleString()} problems solved across all platforms.`,
      });
    }
    const ghContribs = Number(gh.contributions?.total || 0);
    if (ghContribs > 0 && insights.length < 3) {
      insights.push({
        id: "gh-total",
        icon: "💻",
        tone: "info",
        text: `${ghContribs.toLocaleString()} GitHub contributions this year.`,
      });
    }
    if (insights.length < 3) {
      insights.push({
        id: "tip-default",
        icon: "💡",
        tone: "info",
        text: "Connect more platforms in Settings to unlock richer insights.",
      });
    }
  }

  return insights.slice(0, 6);
}

/* ─── tone meta ─────────────────────────────────────────────── */

const TONE_META = {
  info: { color: "#a78bfa", bg: "rgba(167,139,250,0.10)" },
  warn: { color: "#fbbf24", bg: "rgba(251,191,36,0.10)" },
  good: { color: "#10b981", bg: "rgba(16,185,129,0.10)" },
};

export default function InsightsPanel({ stats, heatmap }) {
  const insights = useMemo(() => buildInsights(stats, heatmap), [stats, heatmap]);

  return (
    <div className="panel-pad flex flex-col h-full">
      <h3 className="font-display font-bold text-lg mb-3">Insights</h3>

      {insights.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 py-4 text-center">
          <div className="text-2xl opacity-40">💡</div>
          <p className="text-sm font-medium text-ink-muted">No insights yet</p>
          <p className="text-[11px] text-ink-faint">Keep coding — patterns appear after a few days of activity.</p>
        </div>
      ) : (
        <ul className="space-y-2 flex-1">
          {insights.map((ins) => {
            const tone = TONE_META[ins.tone] || TONE_META.info;
            return (
              <li
                key={ins.id}
                className="flex items-start gap-2.5 rounded-lg border border-white/[0.05] px-3 py-2.5 transition-colors duration-150 hover:bg-white/[0.03]"
              >
                <span
                  className="shrink-0 w-6 h-6 grid place-items-center rounded-full text-[12px] mt-px"
                  style={{ background: tone.bg, color: tone.color }}
                >
                  {ins.icon}
                </span>
                <span className="text-[12px] text-ink leading-snug">{ins.text}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
