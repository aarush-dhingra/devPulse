import api from "./axiosInstance";

export const statsApi = {
  me: () => api.get("/stats/me").then((r) => r.data),
  byUsername: (username) =>
    api.get(`/stats/u/${encodeURIComponent(username)}`).then((r) => r.data),
  refresh: () => api.post("/stats/refresh").then((r) => r.data),
};
