import API from "../api";

export const RENDER_PRODUCTION_BACKEND = "https://fazilnagar-portal-l95o.onrender.com";
export const OLD_SUSPENDED_BACKEND = "https://fazilnagar-portal.onrender.com";

/**
 * Gets the effective reachable backend URL (without trailing /api)
 */
export function getBackendBase() {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocalhost) {
      const configured = API?.defaults?.baseURL;
      if (configured && typeof configured === "string") {
        const cleaned = configured.trim().replace(/\/api\/?$/, "");
        if (cleaned.includes("fazilnagar-portal.onrender.com")) {
          return RENDER_PRODUCTION_BACKEND;
        }
        return cleaned;
      }
      return "http://localhost:5000";
    }
  }

  const configured = API?.defaults?.baseURL;
  if (configured && typeof configured === "string") {
    const cleaned = configured.trim().replace(/\/api\/?$/, "");
    if (!cleaned.includes("localhost") && !cleaned.includes("127.0.0.1")) {
      if (cleaned.includes("fazilnagar-portal.onrender.com")) {
        return RENDER_PRODUCTION_BACKEND;
      }
      return cleaned;
    }
  }
  return RENDER_PRODUCTION_BACKEND;
}

/**
 * Resolves a media or avatar URL to a fully-qualified reachable URL.
 * Handles:
 * - relative backend uploads (/uploads/avatars/..., /uploads/messages/...)
 * - relative Google Drive media (/api/google-drive/media/:id)
 * - blob / data URLs from local previews
 * - absolute URLs with old suspended backend (fazilnagar-portal.onrender.com) -> rewritten to active backend
 * - absolute URLs (Cloudinary, Google Drive, or production Render backend)
 * - legacy localhost URLs redirecting to production Render backend (only when running on production client)
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  let trimmed = url.trim();
  if (!trimmed) return "";

  // Data URLs and local blob URLs don't need backend prefixing
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  // Local frontend static assets (served by Vercel Edge CDN, never route through Render)
  if (
    trimmed.startsWith("/images/") ||
    trimmed.startsWith("/icons/") ||
    trimmed.startsWith("/assets/") ||
    trimmed.startsWith("/hero/") ||
    trimmed === "/favicon.ico" ||
    trimmed.startsWith("/logo") ||
    trimmed === "/fzn.webp" ||
    trimmed === "/fzn.png" ||
    trimmed === "/og-image.jpg" ||
    trimmed === "/icon-192.svg" ||
    trimmed === "/icon-512.svg" ||
    trimmed === "/manifest.json" ||
    trimmed === "/robots.txt" ||
    trimmed === "/sitemap.xml" ||
    trimmed.match(/^\/[^/]+\.(png|jpg|jpeg|webp|svg|ico|gif|mp4|webm)$/i)
  ) {
    return trimmed;
  }

  const isWebClient = typeof window !== "undefined";
  const isLocalClient =
    isWebClient &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // Force HTTPS on HTTPS pages (like Vercel production) to prevent Mixed Content blocking
  if (
    isWebClient &&
    window.location.protocol === "https:" &&
    trimmed.startsWith("http://") &&
    !trimmed.includes("localhost") &&
    !trimmed.includes("127.0.0.1")
  ) {
    trimmed = trimmed.replace(/^http:\/\//i, "https://");
  }

  const backendBase = getBackendBase();

  // On web client in production (e.g. Vercel deployment), route Google Drive media
  // through the same-origin /api/google-drive/media/ rewrite.
  // This enables Vercel Edge CDN caching (X-Vercel-Cache: HIT), supports HTTP 206
  // Range streaming for video/audio seeking, and avoids consuming Render outbound bandwidth.
  const driveIdx = trimmed.indexOf("/api/google-drive/media/");
  if (driveIdx !== -1) {
    const drivePath = trimmed.substring(driveIdx);
    if (isWebClient && !isLocalClient) {
      return drivePath;
    }
    return `${backendBase}${drivePath}`;
  }
  const shortDriveIdx = trimmed.indexOf("/google-drive/media/");
  if (shortDriveIdx !== -1) {
    const drivePath = `/api${trimmed.substring(shortDriveIdx)}`;
    if (isWebClient && !isLocalClient) {
      return drivePath;
    }
    return `${backendBase}${drivePath}`;
  }

  // On web client in production, route uploaded media (/uploads/...) through same-origin Vercel Edge rewrite.
  // This enables Vercel Edge CDN caching (30-day s-maxage) and prevents direct outbound traffic hits to Render.
  const uploadsIdx = trimmed.indexOf("/uploads/");
  if (uploadsIdx !== -1) {
    const uploadsPath = trimmed.substring(uploadsIdx);
    if (isWebClient && !isLocalClient) {
      return uploadsPath;
    }
    return `${backendBase}${uploadsPath}`;
  }

  // Rewrite any legacy or suspended backend URL to the active reachable backendBase
  if (trimmed.includes("fazilnagar-portal.onrender.com")) {
    return trimmed
      .replace("https://fazilnagar-portal.onrender.com", backendBase)
      .replace("http://fazilnagar-portal.onrender.com", backendBase);
  }

  // If already absolute HTTP(S) URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Relative path - prefix with backendBase
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${backendBase}${normalized}`;
}

/**
 * Tests whether a URL or story item represents a playable video
 */
export function isVideoMedia(url, item = null) {
  if (item?.mediaType === "video") return true;
  if (item?.mediaMeta?.mimeType?.startsWith("video/")) return true;
  if (typeof url === "string" && /\.(mp4|webm|mov|ogg|avi|m4v)($|\?)/i.test(url)) return true;
  if (item?.video && (item.video === url || !url)) return true;
  return false;
}

/**
 * Tests whether a URL or story item represents a photograph/image
 */
export function isImageMedia(url, item = null) {
  if (item?.mediaType === "image") return true;
  if (item?.mediaMeta?.mimeType?.startsWith("image/")) return true;
  if (typeof url === "string" && /\.(png|jpe?g|webp|gif|svg|bmp)($|\?)/i.test(url)) return true;
  if (item?.image && (item.image === url || !url) && !isVideoMedia(url, item)) return true;
  return false;
}

/**
 * Comprehensive parser for story/news media objects to determine exact video and image sources
 */
export function resolveStoryMedia(story) {
  if (!story) {
    return {
      hasVideo: false,
      videoUrl: "",
      hasImage: false,
      imageUrl: "",
      mimeType: "video/mp4",
      fileName: "",
      fileSize: 0,
    };
  }

  const rawVideo = story.video || "";
  const rawImage = story.image || "";
  const rawMedia = story.mediaUrl || "";

  const normVideo = resolveMediaUrl(rawVideo);
  const normImage = resolveMediaUrl(rawImage);
  const normMedia = resolveMediaUrl(rawMedia);

  let videoUrl = "";
  let imageUrl = "";

  const isVideoExt = (u) => /\.(mp4|webm|mov|ogg|avi|m4v)($|\?)/i.test(u);
  const isImageExt = (u) => /\.(png|jpe?g|webp|gif|svg|bmp)($|\?)/i.test(u);

  // 1. Check video candidate
  if (normVideo) {
    if (isImageExt(normVideo) && !story.mediaType?.includes("video")) {
      imageUrl = normVideo;
    } else {
      videoUrl = normVideo;
    }
  }

  // 2. Check image candidate
  if (normImage) {
    if (isVideoExt(normImage) || (story.mediaType === "video" && !videoUrl)) {
      if (!videoUrl) videoUrl = normImage;
    } else {
      if (!imageUrl && normImage !== videoUrl) {
        imageUrl = normImage;
      }
    }
  }

  // 3. Check generic mediaUrl candidate
  if (normMedia) {
    if (isVideoExt(normMedia) || story.mediaType === "video") {
      if (!videoUrl) videoUrl = normMedia;
    } else if (isImageExt(normMedia)) {
      if (!imageUrl) imageUrl = normMedia;
    } else if (!videoUrl && !imageUrl) {
      if (story.mediaType === "video") videoUrl = normMedia;
      else imageUrl = normMedia;
    }
  }

  // 4. Fallback if mediaMeta declares mimeType as video
  if (story.mediaMeta?.mimeType?.startsWith("video/")) {
    if (!videoUrl) {
      videoUrl = normMedia || normVideo || normImage;
    }
  }

  const mimeType = story.mediaMeta?.mimeType || "video/mp4";
  const fileName = story.mediaMeta?.originalName || "";
  const fileSize = story.mediaMeta?.size || 0;

  return {
    hasVideo: Boolean(videoUrl),
    videoUrl,
    hasImage: Boolean(imageUrl),
    imageUrl,
    mimeType,
    fileName,
    fileSize,
  };
}

/**
 * Transforms an image URL to request a lightweight thumbnail (e.g. ?w=400)
 * when backed by the Google Drive media proxy, avoiding full 5MB original downloads for small cards.
 */
export function getThumbnailUrl(url, width = 400) {
  if (!url || typeof url !== "string") return "";
  const resolved = resolveMediaUrl(url);
  if (resolved.includes("/api/google-drive/media/")) {
    if (/[?&]w=\d+/.test(resolved)) {
      return resolved.replace(/([?&])w=\d+/, `$1w=${width}`);
    }
    const separator = resolved.includes("?") ? "&" : "?";
    return `${resolved}${separator}w=${width}`;
  }
  return resolved;
}

/**
 * Returns an avatar URL optimized for size, requesting small thumbnails (?w=96)
 * to avoid downloading full 2MB-10MB original user photos for small avatar circles.
 */
export function getAvatarUrl(url, size = 96) {
  if (!url || typeof url !== "string") return "";
  return getThumbnailUrl(url, size);
}

