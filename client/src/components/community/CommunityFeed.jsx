import { useEffect } from "react";
import { useCommunityStore } from "../../store/communityStore";
import ActivityFeed from "../dashboard/ActivityFeed";
import Spinner from "../ui/Spinner";

export default function CommunityFeed() {
  const { feed, fetchFeed } = useCommunityStore();

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (feed.loading && !feed.events.length)
    return <Spinner label="Loading feed…" />;

  return <ActivityFeed events={feed.events} title="Community Feed" />;
}
