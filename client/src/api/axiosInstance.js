import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // let auth store decide what to do
      window.dispatchEvent(new CustomEvent("devvitals:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export default api;
