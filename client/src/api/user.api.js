import api from "./axiosInstance";

export const userApi = {
  me: () => api.get("/user/me").then((r) => r.data),
  updateMe: (patch) => api.patch("/user/me", patch).then((r) => r.data),
  publicProfile: (username) =>
    api.get(`/user/u/${encodeURIComponent(username)}`).then((r) => r.data),
};
