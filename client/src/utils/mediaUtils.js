import API from "../api";

export const RENDER_PRODUCTION_BACKEND = "https://fazilnagar-portal.onrender.com";

/**
 * Gets the effective reachable backend URL (without trailing /api)
 */
export function getBackendBase() {
  const configured = API?.defaults?.baseURL;
  if (configured && typeof configured === "string") {
    const cleaned = configured.trim().replace(/\/api\/?$/, "");
    if (!cleaned.includes("localhost") && !cleaned.includes("127.0.0.1")) {
      return cleaned;
    }
  }
  return RENDER_PRODUCTION_BACKEND;
}

/**
 * Resolves a media or avatar URL to a fully-qualified reachable URL.
 * Handles:
 * - relative backend uploads (/uploads/avatars/..., /uploads/messages/...)
 * - blob / data URLs from local previews
 * - absolute URLs (Cloudinary, Google Drive, or production Render backend)
 * - legacy localhost URLs redirecting to production Render backend
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Data URLs and local blob URLs don't need backend prefixing
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  const backendBase = getBackendBase();

  // If already absolute HTTP(S) URL
  if (/^https?:\/\//i.test(trimmed)) {
    // If it's pointing to localhost or 127.0.0.1, rewrite to backendBase
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
