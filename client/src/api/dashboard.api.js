import api from "./axiosInstance";

export const dashboardApi = {
  heatmap: (period = "1y") =>
    api.get("/dashboard/heatmap", { params: { period, _t: Date.now() } }).then((r) => r.data),
  series: (period = "90d") =>
    api.get("/dashboard/series", { params: { period, _t: Date.now() } }).then((r) => r.data),
};
