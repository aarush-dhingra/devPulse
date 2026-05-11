import { useState, useEffect, useCallback } from "react";
import { communityApi } from "../api/community.api";

export function useProfile(username) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const data = await communityApi.getUserProfile(username);
      setProfile(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { refresh(); }, [refresh]);

  async function toggleFollow() {
    if (!profile) return;
    try {
      if (profile.is_following) {
        await communityApi.unfollow(username);
        setProfile((p) => ({
          ...p,
          is_following: false,
          followers_count: Math.max((p.followers_count ?? 1) - 1, 0),
        }));
      } else {
        await communityApi.follow(username);
        setProfile((p) => ({
          ...p,
          is_following: true,
          followers_count: (p.followers_count ?? 0) + 1,
        }));
      }
    } catch {
      /* ignore */
    }
  }

  return { profile, loading, error, refresh, toggleFollow };
}
