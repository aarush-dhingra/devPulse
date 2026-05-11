import api from "./axiosInstance";

export const communityApi = {
  // ── Follow ────────────────────────────────────────────────────────────────
  follow: (username) =>
    api.post(`/community/follow/${encodeURIComponent(username)}`).then((r) => r.data),
  unfollow: (username) =>
    api.delete(`/community/follow/${encodeURIComponent(username)}`).then((r) => r.data),

  // ── Activity feed (legacy) ────────────────────────────────────────────────
  feed: ({ limit = 30, offset = 0 } = {}) =>
    api.get("/community/feed", { params: { limit, offset } }).then((r) => r.data),

  // ── User profiles ─────────────────────────────────────────────────────────
  getUserProfile: (username) =>
    api.get(`/community/u/${encodeURIComponent(username)}`).then((r) => r.data),
  followers: (username) =>
    api.get(`/community/u/${encodeURIComponent(username)}/followers`).then((r) => r.data),
  following: (username) =>
    api.get(`/community/u/${encodeURIComponent(username)}/following`).then((r) => r.data),

  // ── Posts ─────────────────────────────────────────────────────────────────
  listPosts: ({ feed = "all", cursor = null, limit = 20 } = {}) =>
    api.get("/community/posts", { params: { feed, cursor, limit } }).then((r) => r.data),
  getPost: (id) =>
    api.get(`/community/posts/${id}`).then((r) => r.data),
  createPost: ({ content, media_urls = [] }) =>
    api.post("/community/posts", { content, media_urls }).then((r) => r.data),
  editPost: (id, { content, media_urls }) =>
    api.patch(`/community/posts/${id}`, { content, media_urls }).then((r) => r.data),
  deletePost: (id) =>
    api.delete(`/community/posts/${id}`).then((r) => r.data),

  // ── Likes / bookmarks ─────────────────────────────────────────────────────
  toggleLike: (id) =>
    api.post(`/community/posts/${id}/like`).then((r) => r.data),
  toggleBookmark: (id) =>
    api.post(`/community/posts/${id}/bookmark`).then((r) => r.data),
  listBookmarks: ({ limit = 20, offset = 0 } = {}) =>
    api.get("/community/bookmarks", { params: { limit, offset } }).then((r) => r.data),

  // ── Replies ───────────────────────────────────────────────────────────────
  listReplies: (id, { cursor } = {}) =>
    api.get(`/community/posts/${id}/replies`, { params: { cursor } }).then((r) => r.data),
  createReply: (id, { content, parent_id = null }) =>
    api.post(`/community/posts/${id}/replies`, { content, parent_id }).then((r) => r.data),

  // ── User posts ────────────────────────────────────────────────────────────
  getUserPosts: (username, { limit = 20, offset = 0 } = {}) =>
    api.get(`/community/u/${encodeURIComponent(username)}/posts`, { params: { limit, offset } }).then((r) => r.data),

  // ── People discovery ──────────────────────────────────────────────────────
  searchUsers: (q) =>
    api.get("/community/search", { params: { q } }).then((r) => r.data),
  suggestions: () =>
    api.get("/community/suggestions").then((r) => r.data),
};
