import { useCallback, useEffect, useState } from "react";
import { platformApi } from "../api/platform.api";

export function usePlatforms() {
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await platformApi.list();
      setPlatforms(data.platforms || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connect = async (payload) => {
    await platformApi.connect(payload);
    await refresh();
  };

  const disconnect = async (platform) => {
    await platformApi.disconnect(platform);
    await refresh();
  };

  return { platforms, loading, error, refresh, connect, disconnect };
}
