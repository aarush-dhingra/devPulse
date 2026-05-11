import api from "./axiosInstance";

export const notificationApi = {
  list: ({ limit = 20, offset = 0 } = {}) =>
    api.get("/notifications", { params: { limit, offset } }).then((r) => r.data),
  unreadCount: () =>
    api.get("/notifications/unread-count").then((r) => r.data),
  markAllRead: () =>
    api.post("/notifications/read-all").then((r) => r.data),
  markOneRead: (id) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),
};
