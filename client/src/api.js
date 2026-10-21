import axios from "axios";
import { getAuthToken, getAuthUser, clearAuthSession } from "./utils/authStorage";

export function getOrCreateClientId() {
  if (typeof window === "undefined") return "ssr";
  try {
    const user = getAuthUser();
    if (user?.id) return String(user.id);

    const CLIENT_ID_KEY = "fazilnagar_client_id";
    let cid = localStorage.getItem(CLIENT_ID_KEY);
    if (!cid || !cid.trim()) {
      cid = "c_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
      localStorage.setItem(CLIENT_ID_KEY, cid);
    }
    return cid;
  } catch (_) {
    return "client_fallback";
  }
}

const RENDER_PROD_API = "https://fazilnagar-portal-l95o.onrender.com/api";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.hostname.startsWith("10.") ||
    window.location.hostname.endsWith(".local"));

let envApiUrl = import.meta.env.VITE_API_URL?.trim();
if (envApiUrl && envApiUrl.includes("fazilnagar-portal.onrender.com")) {
  envApiUrl = envApiUrl
    .replace("https://fazilnagar-portal.onrender.com", "https://fazilnagar-portal-l95o.onrender.com")
    .replace("http://fazilnagar-portal.onrender.com", "https://fazilnagar-portal-l95o.onrender.com");
}

let rawUrl;
if (envApiUrl) {
  rawUrl = envApiUrl.replace(/\/+$/, "");
} else if (isLocalhost) {
  rawUrl = "http://localhost:5000/api";
} else {
  rawUrl = RENDER_PROD_API;
}

const baseURL = rawUrl.endsWith("/api") ? rawUrl : `${rawUrl}/api`;

const API = axios.create({
  baseURL,
  timeout: 45000, // 45 seconds to accommodate Render wake-up and file uploads
  validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
});

// Attach Authorization token & persistent client identifier
API.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const clientId = getOrCreateClientId();
  if (clientId && !config.headers["X-Client-Id"]) {
    config.headers["X-Client-Id"] = clientId;
  }
  return config;
});

// Automatic fallback interceptor & 401 auto-purge
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If local fails due to network error (local server down/unreachable), retry against production Render API
    if (
      originalRequest &&
      !originalRequest._retry &&
      (!error.response || error.code === "ERR_NETWORK" || error.code === "ECONNREFUSED") &&
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