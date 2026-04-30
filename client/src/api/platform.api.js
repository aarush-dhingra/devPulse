import api from "./axiosInstance";

export const platformApi = {
  list: () => api.get("/platform").then((r) => r.data),
  connect: ({ platform, username, apiKey }) =>
    api
      .post("/platform/connect", { platform, username, apiKey })
      .then((r) => r.data),
  disconnect: (platform) =>
    api
      .delete(`/platform/${encodeURIComponent(platform)}`)
      .then((r) => r.data),
};
