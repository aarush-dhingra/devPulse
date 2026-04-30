import api from "./axiosInstance";

export const goalsApi = {
  list: () => api.get("/goals").then((r) => r.data.goals),
  create: (payload) => api.post("/goals", payload).then((r) => r.data.goal),
  update: (id, payload) =>
    api.patch(`/goals/${id}`, payload).then((r) => r.data.goal),
  remove: (id) => api.delete(`/goals/${id}`).then((r) => r.data),
};
