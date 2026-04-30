import { useEffect } from "react";
import { useCommunityStore } from "../store/communityStore";

export function useLeaderboard({ metric = "devscore", limit = 50, offset = 0 } = {}) {
  const { leaderboard, fetchLeaderboard } = useCommunityStore();

  useEffect(() => {
    fetchLeaderboard({ metric, limit, offset });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metric, limit, offset]);

  return leaderboard;
}
