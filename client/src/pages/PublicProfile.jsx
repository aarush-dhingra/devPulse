import { useParams } from "react-router-dom";
import { useStats } from "../hooks/useStats";
import { useAuth } from "../hooks/useAuth";
import DevScoreCard from "../components/dashboard/DevScoreCard";
import StatCard from "../components/dashboard/StatCard";
import PlatformLogo from "../components/ui/PlatformLogo";
import ContributionHeatmap from "../components/dashboard/ContributionHeatmap";
import LanguageRadar from "../components/dashboard/LanguageRadar";
import CodingHoursChart from "../components/dashboard/CodingHoursChart";
import SolveBreakdown from "../components/dashboard/SolveBreakdown";
import PlatformBadges from "../components/dashboard/PlatformBadges";
import StreakTracker from "../components/dashboard/StreakTracker";
import FollowButton from "../components/community/FollowButton";
import ShareCard from "../components/profile/ShareCard";
import Spinner from "../components/ui/Spinner";
import { tierFor } from "../utils/scoreUtils";

export default function PublicProfile() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const { data, loading } = useStats({ username });

  if (loading && !data) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Spinner size={32} label="Loading profile…" />
      </div>
    );
  }
  if (!data) return null;

  const u = data.user;
  const stats = data.stats || {};
  const gh = stats.github || {};
  const lc = stats.leetcode || {};
  const wt = stats.wakatime || {};
  const cf = stats.codeforces || {};
  const tier = data.devscore?.tier || tierFor(data.devscore?.score || 0);

  const isMe = me?.id === u?.id;

  return (
    <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-5">
      <header className="panel-pad relative overflow-hidden">
        <div
          className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl opacity-30"
          style={{ background: tier.color }}
          aria-hidden
        />
        <div className="relative flex flex-wrap items-start gap-4">
          {u.avatar_url ? (
            <img src={u.avatar_url} alt={u.username} className="w-20 h-20 rounded-2xl ring-1 ring-white/10" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 grid place-items-center text-white text-3xl font-bold">
              {(u.name || u.username || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-2xl">{u.name || u.username}</h1>
            <p className="text-ink-muted">@{u.username}</p>
            {u.bio && <p className="mt-2 text-sm">{u.bio}</p>}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              <span
                className="pill"
                style={{
                  borderColor: `${tier.color}40`,
                  color: tier.color,
                  background: `${tier.color}1a`,
                }}
              >
                {tier.emoji} {tier.name}
              </span>
              <span className="pill">DevScore {data.devscore?.score ?? 0}</span>
            </div>
          </div>
          {!isMe && me && <FollowButton username={u.username} />}
        </div>
      </header>

      <DevScoreCard devscore={data.devscore} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="GitHub Commits" value={gh.commits?.totalSearched ?? gh.contributions?.total ?? 0} icon={<PlatformLogo platform="github" size={18} />} accent="#e6edf3" />
        <StatCard label="LeetCode Solved" value={lc.solved?.total ?? 0} icon={<PlatformLogo platform="leetcode" size={18} />} accent="#ffa116" />
        <StatCard label="Wakatime 30d" value={`${Math.round(wt.hoursLast30Days ?? 0)}h`} format="raw" icon={<PlatformLogo platform="wakatime" size={18} />} accent="#22d3ee" />
        <StatCard label="Codeforces" value={cf.rating ?? 0} icon={<PlatformLogo platform="codeforces" size={18} />} accent="#fe646f" />
      </div>

      <PlatformBadges platforms={data.platforms || []} />

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <ContributionHeatmap heatmap={gh.contributions?.heatmap || []} />
        <LanguageRadar languages={gh.repos?.languages || {}} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <CodingHoursChart wakatime={wt} />
        <SolveBreakdown leetcode={lc} />
      </div>

      <StreakTracker stats={stats} />

      <ShareCard username={u.username} />
    </main>
  );
}
