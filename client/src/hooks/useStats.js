import { useEffect } from "react";
import { useStatsStore } from "../store/statsStore";

export function useStats({ username } = {}) {
  const {
    data,
    loading,
    error,
    fetchMine,
    fetchByUsername,
    refreshMine,
    byUsername,
  } = useStatsStore();

  useEffect(() => {
    if (username) {
      fetchByUsername(username);
    } else {
      fetchMine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  return {
    data: username ? byUsername[username] : data,
    loading,
    error,
    refresh: async () => {
      await statsApi.refresh();
      await fetchMine(true);
    },
  };
}

