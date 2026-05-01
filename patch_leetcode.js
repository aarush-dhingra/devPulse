const fs = require("fs");
const file = "d:\\devPulse\\client\\src\\pages\\PlatformDetail.jsx";
let content = fs.readFileSync(file, "utf8");

const startStr = "function LeetCodeBody({ stats, activity, period, accent }) {";
const endStr = "function CodeforcesBody({ stats, activity, period, accent }) {";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end strings");
  process.exit(1);
}

const newCode = `function LeetCodeBody({ stats, activity, period, accent }) {
  const command = buildLeetCodeCommand(stats, activity);
  return (
    <div className="space-y-4">
      {/* ROW 1: Metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <LeetCodeMetricCard label="Contest Rating" value={command.contestRating} sub={command.contestTopPct !== "—" ? \`Top \${command.contestTopPct}%\` : ""} spark={command.spark} color="#8b5cf6" />
        <LeetCodeMetricCard label="Global Rank" value={command.globalRank !== "—" ? \`#\${command.globalRank.toLocaleString()}\` : "—"} color="#22c55e" trend={command.recent30 > 0 ? \`\${command.recent30} this month\` : null} />
        <LeetCodeMetricCard label="Problems Solved" value={command.total} color="#38bdf8" trend={command.recent30 > 0 ? \`\${command.recent30} this month\` : null} />
        <LeetCodeMetricCard label="Reputation" value={command.reputation} color="#f59e0b" sub="Community" />
        <LeetCodeBadgeCard count={command.badgesCount} />
      </div>

      {/* ROW 2: Donut, Trend, Small Cards */}
      <div className="grid xl:grid-cols-[1.1fr_2fr_0.9fr] gap-3 items-stretch">
        <LeetCodeSolvedDonut command={command} />
        <LeetCodeTrendChart command={command} accent={accent} period={period} />
        <div className="flex flex-col gap-3">
          <LeetCodeMetricCard label="Acceptance Rate" value={\`\${command.acceptanceRate}%\`} color="#10b981" spark={command.spark} />
          <LeetCodeConsistencyCard command={command} />
        </div>
      </div>

      {/* ROW 3: Heatmap, Difficulty Percentages, Problem Tags (Empty) */}
      <div className="grid xl:grid-cols-[2fr_1fr_1fr] gap-3 items-stretch">
        <LeetCodeHeatmapPanel command={command} accent={accent} period={period} />
        <LeetCodeDifficultyBreakdown command={command} />
        <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
          <h3 className="font-display font-bold text-base mb-2">Top Problem Tags</h3>
          <EmptyState icon="🏷️" title="No tag data" description="LeetCode tags are not currently synced." />
        </div>
      </div>

      {/* ROW 4: Recent Solves (Empty), Contests (Empty), Radar, Streak */}
      <div className="grid xl:grid-cols-[1fr_1fr_1fr_1fr] gap-3 items-stretch">
        <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
          <h3 className="font-display font-bold text-base mb-2">Recent Solves</h3>
          <EmptyState icon="✅" title="No recent solves" description="Detailed submission history not available." />
        </div>
        <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
          <h3 className="font-display font-bold text-base mb-2">Contest Performance</h3>
          <EmptyState icon="🏆" title="No contest data" description="Detailed contest history not available." />
        </div>
        <LeetCodeRhythmPanel command={command} accent={accent} />
        <LeetCodeStreakJourney command={command} accent={accent} />
      </div>
    </div>
  );
}

function buildLeetCodeCommand(stats, activity) {
  const solved = stats.solved || {};
  const easy = Number(solved.easy || 0);
  const medium = Number(solved.medium || 0);
  const hard = Number(solved.hard || 0);
  const total = Number(solved.total || 0);
  
  const recent30 = activity.rows.slice(-30).reduce((sum, row) => sum + Number(row.count || 0), 0);
  const weekday = buildWeekdayTotals(activity.rows);
  const spark = activity.weekly.map(w => w.count);

  return {
    ...activity,
    easy,
    medium,
    hard,
    total,
    recent30,
    globalRank: stats.profile?.ranking || "—",
    reputation: stats.profile?.reputation || 0,
    contestRating: stats.contest?.rating || "—",
    contestTopPct: stats.contest?.topPercentage || "—",
    acceptanceRate: stats.acceptanceRate || 0,
    badgesCount: stats.badges?.length || 0,
    weekday,
    spark,
    streakLongest: activity.streakLongest || 0,
    streakCurrent: activity.streakCurrent || 0,
  };
}

function LeetCodeMetricCard({ label, value, sub, trend, color, spark }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#080b18] px-4 py-4 relative flex flex-col justify-between min-h-[110px]">
      <div>
        <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted mb-2">{label}</div>
        <div className="text-3xl font-display font-bold tabular-nums text-white">{value}</div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div className="mb-0.5">
          {trend && <div className="text-[10px] text-emerald-400 font-medium">↑ {trend}</div>}
          {sub && !trend && <div className="text-[10px] text-ink-faint">{sub}</div>}
        </div>
        {spark?.length ? (
          <div className="ml-auto w-16 h-6">
            <Sparkline values={spark} color={color} width={64} height={24} showArea={false} strokeWidth={2} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LeetCodeBadgeCard({ count }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#080b18] px-4 py-4 flex flex-col items-center justify-center text-center min-h-[110px]">
      <div className="w-12 h-12 mb-2 relative flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="absolute inset-0 w-full h-full text-violet-500/20" fill="currentColor">
          <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" stroke="#8b5cf6" strokeWidth="1.5" />
        </svg>
        <span className="relative text-lg font-bold text-violet-300">{count}</span>
      </div>
      <div className="text-[10px] text-ink-muted">{count} Badges Earned</div>
    </div>
  );
}

function LeetCodeSolvedDonut({ command }) {
  const data = [
    { name: "Easy", value: command.easy, color: "#10b981" },
    { name: "Medium", value: command.medium, color: "#f59e0b" },
    { name: "Hard", value: command.hard, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Solved Problems</h3>
      <div className="flex-1 grid grid-cols-[1fr_auto] gap-4 items-center">
        <div className="relative h-32 w-32 mx-auto">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={45} outerRadius={60} paddingAngle={3} stroke="transparent">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-xl font-bold text-white">{command.total}</div>
            <div className="text-[10px] text-ink-muted">Solved</div>
          </div>
        </div>
        <div className="space-y-3">
          {data.map(d => (
            <div key={d.name} className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 w-16">
                <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                <span className="text-ink-muted">{d.name}</span>
              </div>
              <span className="font-bold text-white tabular-nums">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeetCodeTrendChart({ command, accent, period }) {
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display font-bold text-base">Submissions Trend</h3>
        <span className="rounded border border-white/10 px-2 py-0.5 text-[10px] text-ink-muted">Weekly v</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer>
          <LineChart data={command.weekly} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="count" name="Submissions" stroke={accent} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeetCodeConsistencyCard({ command }) {
  return (
    <div className="rounded-2xl flex-1 border border-white/5 bg-[#080b18] px-4 py-4 flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted mb-2">Consistency</div>
      <div className="flex items-end gap-2 mb-3">
        <div className="text-3xl font-display font-bold tabular-nums text-white">{command.activeDays}</div>
        <div className="text-[10px] text-ink-faint pb-1">Active Days</div>
      </div>
      <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1 mt-auto">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-full" style={{ background: i < Math.round((command.activityRate / 100) * 30) ? "#22c55e" : "rgba(255,255,255,0.06)" }} />
        ))}
      </div>
    </div>
  );
}

function LeetCodeHeatmapPanel({ command, accent, period }) {
  if (!command.rows.length || command.total <= 0) {
    return (
      <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Problem Solving Activity</h3>
        <EmptyState icon="📅" title="No activity" description="Refresh after your next solve." />
      </div>
    );
  }
  const { weeks, p95 } = heatmapWeeks(command.rows);
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="font-display font-bold text-base">Problem Solving Activity</h3>
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
                    rx={2}
                    fill={activityColor(accent, bucket(day.count, p95))}
                  >
                    <title>{\`\${day.date}: \${day.count} solves\`}</title>
                  </rect>
                );
              })
            )}
          </g>
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-faint">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="h-2 w-2 rounded-sm" style={{ background: activityColor(accent, level) }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

function LeetCodeDifficultyBreakdown({ command }) {
  const data = [
    { name: "Easy", value: command.easy, color: "#10b981" },
    { name: "Medium", value: command.medium, color: "#f59e0b" },
    { name: "Hard", value: command.hard, color: "#ef4444" },
  ].filter(d => d.value > 0);

  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5 flex flex-col">
      <h3 className="font-display font-bold text-base mb-4">Difficulty Breakdown</h3>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className="relative h-28 w-28 mx-auto">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={35} outerRadius={50} paddingAngle={0} stroke="transparent">
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="text-lg font-bold text-white">{command.total}</div>
            <div className="text-[9px] text-ink-muted">Solved</div>
          </div>
        </div>
        <div className="w-full space-y-2">
          {data.map(d => {
            const pct = command.total > 0 ? ((d.value / command.total) * 100).toFixed(1) : 0;
            return (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
                  <span className="text-ink-muted">{d.name}</span>
                </div>
                <div className="text-white">
                  <span className="text-ink-faint mr-2">{pct}% ({d.value})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LeetCodeRhythmPanel({ command, accent }) {
  if (!command.weekday || !command.weekday.length) return (
      <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
        <h3 className="font-display font-bold text-base mb-2">Activity Rhythm</h3>
        <EmptyState icon=" radar " title="No data" description="No daily activity data found." />
      </div>
  );
  
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-2">Activity Rhythm</h3>
      <div className="h-40">
        <ResponsiveContainer>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={command.weekday}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
            <Radar name="Activity" dataKey="count" stroke={accent} fill={accent} fillOpacity={0.3} />
            <Tooltip content={<ChartTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LeetCodeStreakJourney({ command, accent }) {
  const streakJourney = buildStreakJourney(command.rows);
  return (
    <div className="panel-pad !bg-[#070a16]/90 border border-white/5">
      <h3 className="font-display font-bold text-base mb-2">Streak</h3>
      <div className="flex justify-between text-xs mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <div className="text-ink-muted text-[10px]">Longest Streak</div>
            <div className="font-bold text-white">{command.streakLongest} days</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-ink-muted text-[10px]">Current Streak</div>
          <div className="font-bold text-white">{command.streakCurrent} days</div>
        </div>
      </div>
      <div className="h-32">
        <ResponsiveContainer>
          <AreaChart data={streakJourney} margin={{ top: 5, right: 0, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="leetcode-streak-journey" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: chartTheme.text, fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={20} />
            <YAxis tick={{ fill: chartTheme.text, fontSize: 9 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Area dataKey="streak" name="Streak" stroke="#f59e0b" strokeWidth={2} fill="url(#leetcode-streak-journey)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
`;

content = content.slice(0, startIndex) + newCode + content.slice(endIndex);
fs.writeFileSync(file, content, "utf8");
console.log("Successfully patched LeetCodeBody components!");