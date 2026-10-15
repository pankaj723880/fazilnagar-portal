import axios from "axios";
import { getAuthToken, clearAuthSession } from "./utils/authStorage";

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

// Automatic fallback interceptor & 401 auto-purge
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If local fails, retry against production Render API
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

    // On 401 Unauthorized (invalid/expired/revoked session), clear stale credentials
    // except for explicit login/register requests
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/register")
    ) {
      clearAuthSession();
    }

    return Promise.reject(error);
  }
);

// Graceful logout helper that alerts backend and purges local storage
export const performLogout = async () => {
  const token = getAuthToken();
  // 1. Immediately and synchronously clear all local and session credentials
  clearAuthSession();

  // 2. Notify backend to revoke the token session in RevokedToken registry
  if (token) {
    try {
      await API.post("/auth/logout", {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 4000,
      });
    } catch {
      // Best effort logout notification
    }
  }
};

// Named export used by NewsDetail
export const fetchNewsById = async (id) => {
  const response = await API.get(`/news/${id}`);
  return response.data;
};

export default API;