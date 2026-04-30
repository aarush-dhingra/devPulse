import api from "./axiosInstance";

export const authApi = {
  me: () => api.get("/auth/me").then((r) => r.data),
  signup: ({ email, username, name, password }) =>
    api
      .post("/auth/signup", { email, username, name, password })
      .then((r) => r.data),
  login: ({ email, password }) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  logout: () => api.post("/auth/logout").then((r) => r.data),
  loginWithGithubUrl: () => `${api.defaults.baseURL}/auth/github`,
};
