import api from "./axiosInstance";

export const dashboardApi = {
  heatmap: () => api.get("/dashboard/heatmap").then((r) => r.data),
  series: (period = "90d") =>
    api.get("/dashboard/series", { params: { period } }).then((r) => r.data),
};
