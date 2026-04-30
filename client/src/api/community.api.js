import api from "./axiosInstance";

export const communityApi = {
  follow: (username) =>
    api
      .post(`/community/follow/${encodeURIComponent(username)}`)
      .then((r) => r.data),
  unfollow: (username) =>
    api
      .delete(`/community/follow/${encodeURIComponent(username)}`)
      .then((r) => r.data),
  feed: ({ limit = 30, offset = 0 } = {}) =>
    api
      .get("/community/feed", { params: { limit, offset } })
      .then((r) => r.data),
  followers: (username) =>
    api
      .get(`/community/u/${encodeURIComponent(username)}/followers`)
      .then((r) => r.data),
  following: (username) =>
    api
      .get(`/community/u/${encodeURIComponent(username)}/following`)
      .then((r) => r.data),

  // Posts
  listPosts: ({ limit = 30, offset = 0 } = {}) =>
    api.get("/community/posts", { params: { limit, offset } }).then((r) => r.data),
  createPost: (content) =>
    api.post("/community/posts", { content }).then((r) => r.data),
  deletePost: (id) =>
    api.delete(`/community/posts/${id}`).then((r) => r.data),
  toggleLike: (id) =>
    api.post(`/community/posts/${id}/like`).then((r) => r.data),
  listReplies: (id) =>
    api.get(`/community/posts/${id}/replies`).then((r) => r.data),
  createReply: (id, content) =>
    api.post(`/community/posts/${id}/replies`, { content }).then((r) => r.data),
};
