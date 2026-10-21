/**
 * Google Maps Location Verification and URL Parser Utility
 *
 * Strict validation enforcing Google Maps as the single source of truth
 * for all location-related contributions.
 */

// Supported Google Maps domains and link formats
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

// Disallowed map providers (Alternative providers other than Google and Apple)
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
 * Normalizes protocol to https://
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
 * Synchronous coordinate extractor supporting recognized Google Maps and Apple Maps URL patterns:
 * 1. Protobuf data coordinates (!3dlat!4dlng)
 * 2. Path coordinates (@lat,lng)
 * 3. Query parameters (?ll=lat,lng, ?sll=lat,lng, ?daddr=lat,lng, ?near=lat,lng, ?q=lat,lng, ?center=lat,lng, etc.)
 * 4. Coordinate paths (/maps/place/lat,lng, /maps/search/lat,lng, /maps/dir/.../lat,lng)
 *
 * Validates latitude [-90, 90] and longitude [-180, 180].
 * Does not mistakenly treat zoom levels (e.g. 15z), place IDs, or route coordinates as coordinates.
 *
 * @param {string} urlString
 * @returns {{ lat: number, lng: number } | null}
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

  // Helper coordinate validator
  const validateCoords = (latVal, lngVal) => {
    const lat = parseFloat(latVal);
    const lng = parseFloat(lngVal);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng, latitude: lat, longitude: lng };
    }
    return null;
  };

  // Pattern 1: Protobuf coordinates !3dLAT and !4dLNG (Place pin coordinates)
  const protoLat = decoded.match(/!3d(-?\d+(?:\.\d+)?)/);
  const protoLng = decoded.match(/!4d(-?\d+(?:\.\d+)?)/);
  if (protoLat && protoLng) {
    const valid = validateCoords(protoLat[1], protoLng[1]);
    if (valid) return valid;
  }

  // Pattern 2: Query parameters: ?ll=lat,lng, ?sll=lat,lng, ?coordinate=lat,lng, ?daddr=lat,lng, ?near=lat,lng, ?center=lat,lng, ?loc=lat,lng, ?q=lat,lng, ?query=lat,lng, ?destination=lat,lng
  // Supports comma, plus, or space separation, optional loc: prefix
  // Notice: daddr, near, and q only extract if they contain numeric coordinates; text place names are ignored.
  const queryMatch = decoded.match(
    /[?&](?:ll|sll|coordinate|daddr|saddr|near|address|center|loc|location|q|query|destination)=(?:loc:)?(-?\d+(?:\.\d+)?)(?:[,+]|\s+)\s*(-?\d+(?:\.\d+)?)(?![0-9.])/i
  );
  if (queryMatch) {
    const valid = validateCoords(queryMatch[1], queryMatch[2]);
    if (valid) return valid;
  }

  // Pattern 3: Specific path routes & places: /maps/place/lat,lng, /maps/search/lat,lng, /maps/dir/.../lat,lng
  const dirMatch = decoded.match(
    /(?:place|search|dir)\/(?:.*\/)?(-?\d+(?:\.\d+)?)(?:[,+]|\s+)\s*(-?\d+(?:\.\d+)?)(?![0-9.])/i
  );
  if (dirMatch) {
    const valid = validateCoords(dirMatch[1], dirMatch[2]);
    if (valid) return valid;
  }

  // Pattern 4: Camera viewport center: /@lat,lng,zoom (fallback when no specific pin/route coordinates exist)
  // Ensures zoom levels like 15z are not treated as coordinates
  const pathMatch = decoded.match(/@(-?\d+(?:\.\d+)?)(?:[,+]|\s+)\s*(-?\d+(?:\.\d+)?)(?![0-9.])/);
  if (pathMatch) {
    const valid = validateCoords(pathMatch[1], pathMatch[2]);
    if (valid) return valid;
  }

  return null;
}

/**
 * Resolves shortened Google Maps and Apple Maps links safely with SSRF protections.
 *
 * Security measures:
 * - Restricts destination to trusted Google Maps and Apple Maps domains only.
 * - Rejects private/local IP destinations (localhost, 127.0.0.1, 10.x, 192.168.x, 169.254.x, ::1).
 * - Enforces max 3 redirects.
 * - 3000ms timeout per request.
 * - Never fetches arbitrary user-supplied URLs.
 *
 * @param {string} shortUrl
 * @returns {Promise<string | null>} Expanded URL or null
 */
export async function resolveGoogleMapsShortUrl(shortUrl) {
  if (!shortUrl || typeof shortUrl !== "string") return null;
  const trimmed = shortUrl.trim();

  const isShortUrl =
    /^https?:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9_\-]+/i.test(trimmed) ||
    /^https?:\/\/goo\.gl\/maps\/[a-zA-Z0-9_\-]+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?maps\.apple\.com\/[a-zA-Z0-9_\-?=&.]+/i.test(trimmed) ||
    /^https?:\/\/(?:www\.)?apple\.co\/[a-zA-Z0-9_\-]+/i.test(trimmed) ||
    /^maps\.app\.goo\.gl\/[a-zA-Z0-9_\-]+/i.test(trimmed) ||
    /^goo\.gl\/maps\/[a-zA-Z0-9_\-]+/i.test(trimmed) ||
    /^maps\.apple\.com\/[a-zA-Z0-9_\-?=&.]+/i.test(trimmed) ||
    /^apple\.co\/[a-zA-Z0-9_\-]+/i.test(trimmed);

  if (!isShortUrl) return null;

  try {
    let currentUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let redirectCount = 0;
    const maxRedirects = 3;

    while (redirectCount < maxRedirects) {
      const parsed = new URL(currentUrl);

      // Enforce HTTP / HTTPS protocol
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }

      // Validate trusted Google or Apple hostname
      const hostname = parsed.hostname.toLowerCase();
      const isTrustedMapHost =
        hostname === "maps.app.goo.gl" ||
        hostname === "goo.gl" ||
        hostname === "maps.google.com" ||
        hostname.endsWith(".google.com") ||
        hostname.endsWith(".google.co.in") ||
        /^google\.[a-z.]+$/.test(hostname) ||
        /^[a-z0-9-]+\.google\.[a-z.]+$/.test(hostname) ||
        hostname === "maps.apple.com" ||
        hostname.endsWith(".apple.com") ||
        hostname === "apple.co" ||
        hostname.endsWith(".apple.co");

      if (!isTrustedMapHost) {
        return null;
      }

      // Reject loopback and private/local IPs (SSRF protection)
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.") ||
        hostname.startsWith("169.254.") ||
        hostname === "0.0.0.0" ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
      ) {
        return null;
      }

      // If currentUrl already has extractable coordinates, stop
      const quickCoords = extractCoordinatesFromMapsUrl(currentUrl);
      if (quickCoords) {
        return currentUrl;
      }

      if (typeof fetch !== "function") {
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      let response;
      try {
        response = await fetch(currentUrl, {
          method: "HEAD",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        // Some hosts return 405 on HEAD, retry once with GET
        if (response.status === 405) {
          response = await fetch(currentUrl, {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
          });
        }
      } catch {
        clearTimeout(timeoutId);
        return null;
      }
      clearTimeout(timeoutId);

      const status = response.status;
      if (status >= 300 && status < 400) {
        const nextLocation = response.headers.get("location");
        if (!nextLocation) break;

        currentUrl = new URL(nextLocation, currentUrl).toString();
        redirectCount++;
      } else {
        break;
      }
    }

    return currentUrl;
  } catch {
    return null;
  }
}

export const resolveMapShortUrl = resolveGoogleMapsShortUrl;

/**
 * Extracts coordinates, resolving shortened links if necessary
 * @param {string} urlString
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function extractCoordinatesAsync(urlString) {
  if (!urlString || typeof urlString !== "string") return null;
  const syncCoords = extractCoordinatesFromMapsUrl(urlString);
  if (syncCoords) return syncCoords;

  if (
    urlString.includes("maps.app.goo.gl") ||
    urlString.includes("goo.gl/maps") ||
    urlString.includes("apple.co") ||
    urlString.includes("goo.gl")
  ) {
    const resolvedUrl = await resolveGoogleMapsShortUrl(urlString);
    if (resolvedUrl) {
      return extractCoordinatesFromMapsUrl(resolvedUrl);
    }
  }

  return null;
}

/**
 * Validates a Google Maps or Apple Maps URL and extracts embedded coordinates if available
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
      error: "Location map link is required for location contributions.",
      safeUrl: null,
    };
  }

  const trimmed = urlString.trim();

  // Check if user accidentally pasted an alternative disallowed provider
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

  // Must match official Google Maps or Apple Maps URL pattern
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

/**
 * Calculates Haversine distance between two points in kilometers
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // Round to 2 decimals
}

export { calculateHaversineDistanceKm as calculateDistanceKm };

/**
 * Compare submitted numeric coordinates with Google Maps link
 * @param {number|string|null} submittedLat
 * @param {number|string|null} submittedLng
 * @param {string} googleMapsUrl
 * @param {{ lat: number, lng: number } | null} [resolvedCoords] - Optional pre-resolved coordinates from shortened URL
 */
export function compareLocationCoordinates(submittedLat, submittedLng, googleMapsUrl, resolvedCoords = null) {
  const urlValidation = validateGoogleMapsUrl(googleMapsUrl);

  const numLat = parseFloat(submittedLat);
  const numLng = parseFloat(submittedLng);
  const hasValidSubmittedCoords =
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180;

  if (!urlValidation.isValid) {
    return {
      submittedLat: hasValidSubmittedCoords ? numLat : null,
      submittedLng: hasValidSubmittedCoords ? numLng : null,
      urlLat: null,
      urlLng: null,
      distanceKm: null,
      status: "invalid_url",
      warningMessage: urlValidation.error || "Invalid location map link.",
    };
  }

  const effectiveCoords = resolvedCoords || urlValidation.coordinates;

  if (!hasValidSubmittedCoords && !effectiveCoords) {
    return {
      submittedLat: null,
      submittedLng: null,
      urlLat: null,
      urlLng: null,
      distanceKm: null,
      status: urlValidation.isShortened ? "shortened_requires_admin_pin_check" : "none",
      warningMessage: "Coordinates unavailable",
    };
  }

  if (!hasValidSubmittedCoords && effectiveCoords) {
    return {
      submittedLat: effectiveCoords.lat,
      submittedLng: effectiveCoords.lng,
      urlLat: effectiveCoords.lat,
      urlLng: effectiveCoords.lng,
      distanceKm: 0,
      status: "consistent",
      warningMessage: "",
    };
  }

  if (effectiveCoords) {
    const { lat: urlLat, lng: urlLng } = effectiveCoords;
    const distanceKm = calculateHaversineDistanceKm(numLat, numLng, urlLat, urlLng);

    // If difference > 0.5 km (500 meters), flag as conflict
    if (distanceKm > 0.5) {
      return {
        submittedLat: numLat,
        submittedLng: numLng,
        urlLat,
        urlLng,
        distanceKm,
        status: "mismatch",
        warningMessage: `Coordinate mismatch: Proposed coordinates are ${distanceKm} km away from the coordinates in the submitted map link. Manual admin pin review required.`,
      };
    }

    return {
      submittedLat: numLat,
      submittedLng: numLng,
      urlLat,
      urlLng,
      distanceKm,
      status: "consistent",
      warningMessage: "",
    };
  }

  // Valid submitted coordinates provided with link that has no embedded coordinates
  return {
    submittedLat: numLat,
    submittedLng: numLng,
    urlLat: null,
    urlLng: null,
    distanceKm: null,
    status: "consistent",
    warningMessage: urlValidation.isShortened
      ? "Coordinates verified from submitted input. Short link preserved."
      : "Coordinates verified from submitted input. Map link preserved.",
  };
}

/**
 * Standardized Google Maps Destination coordinate link
 * Format: https://www.google.com/maps/search/?api=1&query=LATITUDE%2CLONGITUDE
 */
export function buildGoogleMapsCoordinateUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}
