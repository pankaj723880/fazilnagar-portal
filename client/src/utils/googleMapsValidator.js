/**
 * Client-side Google Maps URL Validation & Coordinate Parser Utility
 * Mirrors backend logic to provide instant coordinate extraction and safe URL rendering.
 */

export const GOOGLE_MAPS_PATTERNS = [
  /^https?:\/\/(?:www\.)?google\.[a-z.]+\/maps/i,
  /^https?:\/\/maps\.google\.[a-z.]+/i,
  /^https?:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9_\-]+/i,
  /^https?:\/\/goo\.gl\/maps\/[a-zA-Z0-9_\-]+/i,
  /^(?:www\.)?google\.[a-z.]+\/maps/i,
  /^maps\.google\.[a-z.]+/i,
  /^maps\.app\.goo\.gl\/[a-zA-Z0-9_\-]+/i,
  /^goo\.gl\/maps\/[a-zA-Z0-9_\-]+/i,
];

// Supported Apple Maps domains and link formats
export const APPLE_MAPS_PATTERNS = [
  /^https?:\/\/(?:www\.)?maps\.apple\.com(?:\/.*)?$/i,
  /^(?:www\.)?maps\.apple\.com(?:\/.*)?$/i,
  /^https?:\/\/(?:www\.)?apple\.co\/[a-zA-Z0-9_\-]+/i,
  /^(?:www\.)?apple\.co\/[a-zA-Z0-9_\-]+/i,
];

// All supported map patterns (Google Maps + Apple Maps)
export const SUPPORTED_MAP_PATTERNS = [
  ...GOOGLE_MAPS_PATTERNS,
  ...APPLE_MAPS_PATTERNS,
];

export const DISALLOWED_MAP_PROVIDERS = [
  /openstreetmap\.org/i,
  /osm\.org/i,
  /bing\.com\/maps/i,
  /here\.com/i,
  /mapbox\.com/i,
  /yandex\.[a-z.]+\/maps/i,
  /mapquest\.com/i,
];

/**
 * Validates whether a URL is a safe HTTPS URL (blocks javascript:, data:, etc.)
 * Ensures URLs without protocol are safe and upgrades to https://
 * @param {string} urlStr
 * @returns {string | null} Safe HTTPS URL or null if invalid
 */
export function getSafeHttpsUrl(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return null;
  const trimmed = urlStr.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return null;
  }

  let fullUrl = trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    if (
      /^(?:www\.)?google\.[a-z.]+\/maps/i.test(trimmed) ||
      /^maps\.google\.[a-z.]+/i.test(trimmed) ||
      /^maps\.app\.goo\.gl\//i.test(trimmed) ||
      /^goo\.gl\/maps\//i.test(trimmed) ||
      /^(?:www\.)?maps\.apple\.com/i.test(trimmed) ||
      /^(?:www\.)?apple\.co\//i.test(trimmed)
    ) {
      fullUrl = `https://${trimmed}`;
    } else {
      return null;
    }
  }

  try {
    const parsed = new URL(fullUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts coordinates from supported Google Maps & Apple Maps URL formats.
 * @param {string} urlString
 * @returns {{ lat: number, lng: number, latitude: number, longitude: number } | null}
 */
export function extractCoordinatesFromMapsUrl(urlString) {
  if (!urlString || typeof urlString !== "string") return null;
  const trimmed = urlString.trim();
  if (!trimmed) return null;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  const validateCoords = (latVal, lngVal) => {
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, latitude: lat, longitude: lng };
    }
    return null;
  };

  // 1. Protobuf !3dLAT and !4dLNG
  const protoLat = decoded.match(/!3d(-?\d+(?:\.\d+)?)/);
  const protoLng = decoded.match(/!4d(-?\d+(?:\.\d+)?)/);
  if (protoLat && protoLng) {
    const valid = validateCoords(protoLat[1], protoLng[1]);
    if (valid) return valid;
  }

  // 2. Query params ?ll=, ?sll=, ?coordinate=, ?daddr=, ?saddr=, ?near=, ?center=, ?loc=, ?q=, ?query=, ?destination=
  // Notice: daddr, near, and q only extract if they contain numeric coordinates; text place names are ignored.
  const queryMatch = decoded.match(
    /[?&](?:ll|sll|coordinate|daddr|saddr|near|address|center|loc|location|q|query|destination)=(?:loc:)?(-?\d+(?:\.\d+)?)(?:[,+]|\s+)\s*(-?\d+(?:\.\d+)?)(?![0-9.])/i
  );
  if (queryMatch) {
    const valid = validateCoords(queryMatch[1], queryMatch[2]);
    if (valid) return valid;
  }

  // 3. Path /place/, /search/, /dir/
  const dirMatch = decoded.match(
    /(?:place|search|dir)\/(?:.*\/)?(-?\d+(?:\.\d+)?)(?:[,+]|\s+)\s*(-?\d+(?:\.\d+)?)(?![0-9.])/i
  );
  if (dirMatch) {
    const valid = validateCoords(dirMatch[1], dirMatch[2]);
    if (valid) return valid;
  }

  // 4. Path @lat,lng,zoom (viewport camera center fallback)
  const pathMatch = decoded.match(/@(-?\d+(?:\.\d+)?)(?:[,+]|\s+)\s*(-?\d+(?:\.\d+)?)(?![0-9.])/);
  if (pathMatch) {
    const valid = validateCoords(pathMatch[1], pathMatch[2]);
    if (valid) return valid;
  }

  return null;
}

/**
 * Validates Google Maps or Apple Maps URL format
 * @param {string} urlString
 * @returns {{ isValid: boolean, provider: "google" | "apple" | null, isShortened: boolean, coordinates: { lat: number, lng: number } | null, error: string | null, safeUrl: string | null }}
 */
export function validateGoogleMapsUrl(urlString) {
  if (!urlString || typeof urlString !== "string") {
    return {
      isValid: false,
      provider: null,
      isShortened: false,
      coordinates: null,
      error: "Location map link is required.",
      safeUrl: null,
    };
  }

  const trimmed = urlString.trim();

  for (const pattern of DISALLOWED_MAP_PROVIDERS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        provider: null,
        isShortened: false,
        coordinates: null,
        error: "Alternative map providers (such as OpenStreetMap or Bing Maps) are not permitted. Only Google Maps and Apple Maps links are accepted.",
        safeUrl: null,
      };
    }
  }

  const isGoogleMaps = GOOGLE_MAPS_PATTERNS.some((pattern) => pattern.test(trimmed));
  const isAppleMaps = APPLE_MAPS_PATTERNS.some((pattern) => pattern.test(trimmed));

  if (!isGoogleMaps && !isAppleMaps) {
    return {
      isValid: false,
      provider: null,
      isShortened: false,
      coordinates: null,
      error: "Invalid URL. Please provide an authentic Google Maps or Apple Maps location link (e.g. https://www.google.com/maps/... or https://maps.apple.com/...).",
      safeUrl: null,
    };
  }

  const provider = isAppleMaps ? "apple" : "google";

  const isShortened =
    trimmed.includes("maps.app.goo.gl") ||
    trimmed.includes("goo.gl/maps") ||
    trimmed.includes("apple.co");

  const coordinates = extractCoordinatesFromMapsUrl(trimmed);
  const safeUrl = getSafeHttpsUrl(trimmed);

  return {
    isValid: true,
    provider,
    isShortened,
    coordinates,
    error: null,
    safeUrl,
  };
}

export const validateMapUrl = validateGoogleMapsUrl;

export function buildGoogleMapsCoordinateUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}
