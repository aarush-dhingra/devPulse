import api from "./axiosInstance";

export const pomodoroApi = {
  today: () => api.get("/pomodoro/today").then((r) => r.data),
  start: ({ kind, durationSeconds }) =>
    api
      .post("/pomodoro/start", { kind, durationSeconds })
      .then((r) => r.data.session),
  log: ({ kind, durationSeconds }) =>
    api
      .post("/pomodoro/log", { kind, durationSeconds })
      .then((r) => r.data.session),
  finish: (id, completed = true) =>
    api
      .post(`/pomodoro/${id}/finish`, { completed })
      .then((r) => r.data.session),
};
