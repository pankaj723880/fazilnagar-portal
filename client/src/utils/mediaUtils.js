import API from "../api";

/**
 * Resolves a media or avatar URL to a fully-qualified reachable URL.
 * Handles:
 * - relative backend uploads (/uploads/avatars/..., /uploads/messages/...)
 * - blob / data URLs from local previews
 * - absolute URLs (Cloudinary, Google Drive, or production Render backend)
 * - legacy localhost URLs redirecting to production backend
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Data URLs and local blob URLs don't need backend prefixing
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  // Determine backend base without trailing /api
  const rawBase = API?.defaults?.baseURL || "https://fazilnagar-portal.onrender.com/api";
  const backendBase = rawBase.replace(/\/api\/?$/, "");

  // If already absolute HTTP(S) URL
  if (/^https?:\/\//i.test(trimmed)) {
    // If it's pointing to localhost or 127.0.0.1 in production, rewrite to backendBase
    if (trimmed.includes("localhost:") || trimmed.includes("127.0.0.1:")) {
      const uploadsIdx = trimmed.indexOf("/uploads/");
      if (uploadsIdx !== -1) {
        return `${backendBase}${trimmed.substring(uploadsIdx)}`;
      }
      const driveIdx = trimmed.indexOf("/api/google-drive/");
      if (driveIdx !== -1) {
        return `${backendBase}${trimmed.substring(driveIdx)}`;
      }
    }
    return trimmed;
  }

  // Relative path - prefix with backendBase
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${backendBase}${normalized}`;
}
