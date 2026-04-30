import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../api/auth.api";

export function useAuth() {
  const { user, loading, error, fetchMe, logout } = useAuthStore();

  useEffect(() => {
    if (!user && loading) {
      fetchMe();
    }
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login: () => {
      window.location.href = authApi.loginWithGithubUrl();
    },
    logout,
  };
}
