import axios from "axios";
import i18n from "../../app/i18n";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api"
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers = config.headers || {};
  config.headers["X-Lang"] = i18n.language || "ru";
  return config;
});

export default api;
