import api from "./axiosInstance";

export const leaderboardApi = {
  list: ({ metric = "devscore", limit = 50, offset = 0 } = {}) =>
    api
      .get("/leaderboard", { params: { metric, limit, offset } })
      .then((r) => r.data),
};
