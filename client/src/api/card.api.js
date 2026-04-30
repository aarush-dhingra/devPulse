import api from "./axiosInstance";

export const cardApi = {
  svgUrl: (username) =>
    `${api.defaults.baseURL}/card/${encodeURIComponent(username)}/svg`,
  pngUrl: (username) =>
    `${api.defaults.baseURL}/card/${encodeURIComponent(username)}`,
};
