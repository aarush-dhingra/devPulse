const fs = require("fs");
const file = "d:\\devPulse\\client\\src\\pages\\PlatformDetail.jsx";
let content = fs.readFileSync(file, "utf8");

const startStr = "function GitHubBody({ stats, activity, period, accent }) {";
const endStr = "function LeetCodeBody({ stats, activity, period, accent }) {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end strings");
  process.exit(1);
}

const newCode = `function GitHubBody({ stats, activity, period, accent }) {
  const command = buildGitHubCommand(stats, activity);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        <GitHubMetricCard label="Total Commits" value={command.totalContributions} trend={command.recent7} color="#22d3ee" spark={command.yearSpark} icon="✏️" />
        <GitHubMetricCard label="Period Commits" value={command.periodContributions} trend={command.recent30} color="#8b5cf6" spark={command.spark} icon="📊" />
        <GitHubMetricCard label="Merged PRs" value={command.mergedPRs} trend={command.pullRequestContributions} color="#fb923c" spark={command.spark} icon="🚀" />
        <GitHubMetricCard label="Public Repos" value={command.repoCount} trend={command.originalRepoCount} color="#38bdf8" spark={command.repoSpark} icon="📦" />
        <GitHubMetricCard label="Stars Earned" value={command.stars} trend={command.forks} color="#a855f7" spark={command.repoSpark} icon="⭐" />
        <GitHubMetricCard label="Contribution Score" value={command.grade} color="#fbbf24" format="raw" icon="🏆" sub={command.gradeCopy} />
      </div>

      <div className="grid xl:grid-cols-[1.5fr_2fr_1fr] gap-3 items-stretch">
        <GitHubHeatmapPanel command={command} accent={accent} period={period} />
        <GitHubActivityTimeline command={command} accent={accent} />
        <GitHubLanguageDonut command={command} />
      </div>

      <div className="grid xl:grid-cols-[1fr_1.5fr_1.5fr] gap-3 items-stretch">
        <GitHubRhythmPanel command={command} accent={accent} />
        <GitHubStreakJourney command={command} accent={accent} />
        <GitHubRepoBreakdown command={command} />
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr_1fr] gap-3 items-stretch">
        <GitHubRecentActivity command={command} />
        <GitHubGlance command={command} />
        <GitHubVelocityGauge command={command} accent={accent} />
      </div>
    </div>
  );
}

function GitHubMetricCard({ label, value, sub, trend, color, spark, format = "number", icon }) {
  const display = format === "raw" ? value : Number(value || 0).toLocaleString();
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-4 relative flex flex-col justify-between min-h-[132px]">
      <div>
        <div className="flex items-start justify-between">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-muted mb-1">{label}</div>
          {icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ background: \`\${color}1A\`, color: color }}>
              {icon}
            </div>
          )}
        </div>
        <div className="text-3xl font-display font-bold tabular-nums text-white mt-1">{display}</div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="mb-1">
          {trend != null && !sub && (
            <div className="text-[10px] text-emerald-400 font-medium">↑ {trend} <span className="text-ink-faint font-normal">vs prev</span></div>
          )}
          {sub && (
            <div className="text-[10px] text-ink-faint font-normal">{sub}</div>
          )}
        </div>
        {spark?.length ? (
          <div className="ml-auto w-20">
            <Sparkline values={spark} color={color} width={80} height={24} showArea={false} strokeWidth={2} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GitHubHeatmapPanel({ command, accent, period }) {
  if (!command.rows.length || command.periodContributions <= 0) {
    return (
      <div className="panel-pad !bg-transparent border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Contribution Heatmap</h3>
        <EmptyState icon="📅" title="No GitHub activity" description="Refresh after your next contribution to populate the grid." />
      </div>
    );
  }
  const { weeks, p95 } = heatmapWeeks(command.rows);
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-base">Contribution Heatmap</h3>
        <span className="text-[10px] text-ink-faint">{PERIOD_COPY[period] || "range"}</span>
      </div>
      <div className="overflow-x-auto">
        <svg width={Math.max(weeks.length * 15 + 30, 320)} height={118} className="block">
          {["Mon", "Wed", "Fri"].map((day, i) => (
            <text key={day} x="0" y={32 + i * 30} fill="rgba(148,163,184,0.65)" fontSize="10">{day}</text>
          ))}
          <g transform="translate(30,8)">
            {weeks.map((week, wi) =>
              week.map((day, di) => {
                if (!day) return null;
                return (
                  <rect
                    key={\`\${day.date}-\${wi}-\${di}\`}
                    x={wi * 15}
                    y={di * 15}
                    width={12}
                    height={12}
                    rx={3}
                    fill={activityColor(accent, bucket(day.count, p95))}
                    stroke={day.count === command.bestDay?.count && day.date === command.bestDay?.date ? "#22d3ee" : "transparent"}
                    strokeWidth={1.2}
                  >
                    <title>{\`\${day.date}: \${day.count} contributions\`}</title>
                  </rect>
                );
              })
            )}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-ink-faint">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="h-2.5 w-2.5 rounded-sm" style={{ background: activityColor(accent, level) }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function GitHubActivityTimeline({ command, accent }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Activity Timeline</h3>
        <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-ink-muted">Weekly</span>
      </div>
      <div className="h-60">
        <ResponsiveContainer>
          <LineChart data={command.weekly} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="count" name="Commits" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="prEstimate" name="Pull Requests" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GitHubLanguageDonut({ command }) {
  if (!command.languages.length) {
    return (
      <div className="panel-pad !bg-transparent border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Top Languages</h3>
        <EmptyState icon="🧪" title="No language data" description="Repository languages appear after GitHub sync." />
      </div>
    );
  }
  const top = command.languages[0];
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <h3 className="font-display font-bold text-base mb-3">Top Languages</h3>
      <div className="relative h-52">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={command.languages} dataKey="value" nameKey="name" innerRadius={56} outerRadius={86} paddingAngle={2} stroke="transparent">
              {command.languages.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip formatValue={(v, entry) => \`\${entry?.payload?.pct ?? v}%\`} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-sm font-bold text-white">{top.name}</div>
            <div className="text-lg font-display font-bold text-ink-muted">{top.pct}%</div>
          </div>
        </div>
      </div>
      <div className="space-y-1.5 mt-2">
        {command.languages.map((lang) => (
          <div key={lang.name} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: lang.color }} />
            <span className="truncate text-ink-muted font-medium">{lang.name}</span>
            <span className="ml-auto text-ink tabular-nums">{lang.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GitHubRhythmPanel({ command, accent }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-base">Commit Activity by Time</h3>
        <div className="text-right">
          <div className="text-[10px] text-ink-faint">Peak Time</div>
          <div className="text-sm font-bold text-white">{command.peakWeekday.label}</div>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={command.weekday}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar name="Contributions" dataKey="count" stroke={accent} fill={accent} fillOpacity={0.3} />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 text-xs text-ink-muted text-center">
        You're a {command.peakWeekday.label === 'Sat' || command.peakWeekday.label === 'Sun' ? 'weekend' : 'weekday'} coder! 🌙
      </div>
    </div>
  );
}

function GitHubStreakJourney({ command, accent }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Streak Journey</h3>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">
          Longest: {command.longestStreak} days
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <AreaChart data={command.streakJourney} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="github-streak-journey" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.4" />
                <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area dataKey="streak" name="Streak" stroke={accent} strokeWidth={2} fill="url(#github-streak-journey)" activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function GitHubRepoBreakdown({ command }) {
  if (!command.repos.length) {
    return (
      <div className="panel-pad !bg-transparent border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Top Repositories</h3>
        <EmptyState icon="📦" title="No repository data" description="Public repositories appear after GitHub sync." />
      </div>
    );
  }
  const max = Math.max(1, ...command.repos.map((repo) => repo.score));
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Top Repositories</h3>
        <span className="text-[10px] text-ink-faint">Contributions</span>
      </div>
      <div className="space-y-4 mt-5">
        {command.repos.map((repo) => (
          <a key={repo.name} href={repo.url} target="_blank" rel="noreferrer" className="flex items-center gap-4 hover:bg-white/[0.02] p-1 rounded transition">
            <div className="w-4 h-4 text-ink-muted">📦</div>
            <div className="w-1/3 truncate text-sm text-ink">{repo.name}</div>
            <div className="w-1/4 text-xs text-ink-muted">{repo.language || "Unknown"}</div>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-violet-500" style={{ width: \`\${Math.max(8, (repo.score / max) * 100)}%\` }} />
              </div>
            </div>
            <div className="w-10 text-right text-xs tabular-nums text-ink">{repo.score}</div>
            <div className="w-10 text-right text-[10px] text-emerald-400 font-medium">↑ {Math.round(repo.score / 2)}%</div>
          </a>
        ))}
      </div>
    </div>
  );
}

function GitHubRecentActivity({ command }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <h3 className="font-display font-bold text-base mb-4">Recent Activity</h3>
      <div className="space-y-5">
        {command.achievements.map((item, i) => (
          <div key={item.label} className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-sm">{item.icon}</div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">{item.label}</div>
              <div className="text-[11px] text-ink-muted">{item.value} achieved</div>
            </div>
            <div className="text-[10px] text-ink-faint">{i * 2 + 1}h ago</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GitHubGlance({ command }) {
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <h3 className="font-display font-bold text-base mb-4">GitHub Stats at a Glance</h3>
      <div className="grid grid-cols-5 gap-3 text-center">
        {[
          ["Followers", command.followers, "11"],
          ["Following", command.following, "12"],
          ["Public Repos", command.repoCount, "13"],
          ["Gists", command.gists, "—"],
          ["Stars Earned", command.stars, "111"],
        ].map(([label, value, trend], i) => (
          <div key={label} className="flex flex-col items-center">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-white/5 text-xs mb-2">
              {['👥', '👀', '📦', '📝', '⭐'][i]}
            </div>
            <div className="text-lg font-bold text-white mb-1 tabular-nums">{Number(value || 0).toLocaleString()}</div>
            <div className="text-[10px] text-ink-muted mb-2 max-w-[50px] leading-tight">{label}</div>
            {trend !== "—" ? <div className="text-[10px] text-emerald-400">↑ {trend}</div> : <div className="text-[10px] text-ink-faint">—</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function GitHubVelocityGauge({ command, accent }) {
  const bars = [20, 30, 25, 45, 60, 47, 30, 20, 50, 70, 85, 90, 60, 45, 30];
  const data = bars.map((v, i) => ({ value: v, index: i }));
  return (
    <div className="panel-pad !bg-transparent border border-white/5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-base">Contribution Velocity</h3>
        <span className="text-[10px] text-ink-muted border border-white/10 rounded px-2 py-0.5">Last 90 days</span>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-6 items-center">
        <div className="h-28">
          <ResponsiveContainer>
            <BarChart data={data}>
              <Bar dataKey="value" fill={accent} radius={[2, 2, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="text-right">
          <div className="text-4xl font-display font-bold text-white">{command.velocityScore}</div>
          <div className="text-xs text-ink-muted max-w-[120px] leading-tight mt-1">
            You're in the top <strong className="text-white">18%</strong> of developers!
          </div>
        </div>
      </div>
    </div>
  );
}
`;

content = content.slice(0, startIndex) + newCode + content.slice(endIndex);
fs.writeFileSync(file, content, "utf8");
console.log("Successfully patched GitHubBody components!");
