import { useState } from "react";
import { useParams } from "react-router-dom";
import { useStats } from "../hooks/useStats";
import { useAuth } from "../hooks/useAuth";
import { useProfile } from "../hooks/useProfile";
import DevScoreCard from "../components/dashboard/DevScoreCard";
import StatCard from "../components/dashboard/StatCard";
import PlatformLogo from "../components/ui/PlatformLogo";
import ContributionHeatmap from "../components/dashboard/ContributionHeatmap";
import LanguageRadar from "../components/dashboard/LanguageRadar";
import CodingHoursChart from "../components/dashboard/CodingHoursChart";
import SolveBreakdown from "../components/dashboard/SolveBreakdown";
import PlatformBadges from "../components/dashboard/PlatformBadges";
import StreakTracker from "../components/dashboard/StreakTracker";
import ProfileHeader from "../components/community/profile/ProfileHeader";
import PostCard from "../components/community/feed/PostCard";
import ShareCard from "../components/profile/ShareCard";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import { communityApi } from "../api/community.api";
import { useEffect } from "react";
import { useFeedStore } from "../store/feedStore";
import clsx from "clsx";

const TABS = ["Dashboard", "Posts"];

export default function PublicProfile() {
  const { username } = useParams();
  const { data, loading: statsLoading } = useStats({ username });
  const { profile, loading: profileLoading, toggleFollow } = useProfile(username);
  const [tab, setTab] = useState("Dashboard");
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const updatePost = useFeedStore((s) => s.updatePost);

  useEffect(() => {
    if (tab === "Posts") {
      setPostsLoading(true);
      communityApi.getUserPosts(username)
        .then((d) => setPosts(d.posts ?? []))
        .catch(() => {})
        .finally(() => setPostsLoading(false));
    }
  }, [tab, username]);

  const loading = statsLoading || profileLoading;

  if (loading && !data && !profile) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Spinner size={32} label="Loading profile…" />
      </div>
    );
  }

  const u = data?.user;
  const stats = data?.stats || {};
  const gh = stats.github || {};
  const lc = stats.leetcode || {};
  const wt = stats.wakatime || {};
  const cf = stats.codeforces || {};

  return (
    <main className="max-w-6xl mx-auto px-4 lg:px-6 py-8 space-y-5">
      {/* Profile Header (new component with follow counts) */}
      {profile && (
        <ProfileHeader profile={profile} onFollowToggle={toggleFollow} />
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-2 border-b border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "pb-2 px-1 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-accent-500 text-accent-300"
                : "border-transparent text-ink-faint hover:text-ink"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Dashboard" && data && (
        <>
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

          {u && <ShareCard username={u.username} />}
        </>
      )}

      {tab === "Posts" && (
        <div className="space-y-3">
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size={24} />
            </div>
          ) : posts.length === 0 ? (
            <EmptyState
              icon="📝"
              title="No posts yet"
              description="This user hasn't posted anything."
            />
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      )}
    </main>
  );
}
