import axios from "axios";

const RENDER_PROD_API = "https://fazilnagar-portal.onrender.com/api";

let rawUrl = (import.meta.env.VITE_API_URL || RENDER_PROD_API).trim().replace(/\/+$/, "");
const baseURL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

const API = axios.create({
  baseURL,
  timeout: 10000,
});

// Attach Authorization and Anonymous Client ID
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  let anonId = localStorage.getItem("fazil_anon_id");
  if (!anonId) {
    anonId = "anon_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    localStorage.setItem("fazil_anon_id", anonId);
  }
  if (!config.headers["x-anon-id"]) {
    config.headers["x-anon-id"] = anonId;
  }
  return config;
});

// Automatic fallback interceptor:
// If request to local fails (e.g. 404 from another app running on 5000, ECONNREFUSED, or timeout),
// retry against the production Render API automatically.
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      originalRequest &&
      !originalRequest._retry &&
      originalRequest.baseURL &&
      originalRequest.baseURL.includes("localhost")
    ) {
      originalRequest._retry = true;
      originalRequest.baseURL = RENDER_PROD_API;
      return axios(originalRequest);
    }
    return Promise.reject(error);
  }
);

// Named export used by NewsDetail
export const fetchNewsById = async (id) => {
  const response = await API.get(`/news/${id}`);
  return response.data;
};

export default API;