import axios from "axios";
import { getAuthToken } from "./utils/authStorage";

const RENDER_PROD_API = "https://fazilnagar-portal.onrender.com/api";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

let rawUrl = isLocalhost
  ? (import.meta.env.VITE_API_URL || RENDER_PROD_API).trim().replace(/\/+$/, "")
  : RENDER_PROD_API;

const baseURL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

const API = axios.create({
  baseURL,
  timeout: 45000, // 45 seconds to accommodate Render wake-up and file uploads
});

// Attach Authorization token if available (reads per-tab session first)
API.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
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