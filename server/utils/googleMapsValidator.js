/**
 * Google Maps Location Verification and URL Parser Utility
 *
 * Strict validation enforcing Google Maps as the single source of truth
 * for all location-related contributions.
 */

// Supported Google Maps domains and link formats
const GOOGLE_MAPS_PATTERNS = [
  /^https?:\/\/(?:www\.)?google\.[a-z.]+\/maps/i,
  /^https?:\/\/maps\.google\.[a-z.]+/i,
  /^https?:\/\/maps\.app\.goo\.gl\/[a-zA-Z0-9_\-]+/i,
  /^https?:\/\/goo\.gl\/maps\/[a-zA-Z0-9_\-]+/i,
];

// Disallowed map providers
const DISALLOWED_MAP_PROVIDERS = [
  /openstreetmap\.org/i,
  /osm\.org/i,
  /bing\.com\/maps/i,
  /maps\.apple\.com/i,
  /here\.com/i,
  /mapbox\.com/i,
  /yandex\.[a-z.]+\/maps/i,
  /mapquest\.com/i,
];

/**
 * Validates a Google Maps URL and extracts embedded coordinates if available
 * @param {string} urlString
 * @returns {{ isValid: boolean, isShortened: boolean, coordinates: { lat: number, lng: number } | null, error: string | null }}
 */
export function validateGoogleMapsUrl(urlString) {
  if (!urlString || typeof urlString !== "string") {
    return {
      isValid: false,
      isShortened: false,
      coordinates: null,
      error: "Google Maps URL is required for location contributions.",
    };
  }

  const trimmed = urlString.trim();

  // Check if user accidentally pasted an alternative provider
  for (const pattern of DISALLOWED_MAP_PROVIDERS) {
    if (pattern.test(trimmed)) {
      return {
        isValid: false,
        isShortened: false,
        coordinates: null,
        error: "Alternative map providers (such as OpenStreetMap, Bing, or Apple Maps) are not permitted. Only Google Maps links are accepted.",
      };
    }
  }

  // Must match official Google Maps URL pattern
  const isGoogleMaps = GOOGLE_MAPS_PATTERNS.some((pattern) => pattern.test(trimmed));
  if (!isGoogleMaps) {
    return {
      isValid: false,
      isShortened: false,
      coordinates: null,
      error: "Invalid URL. Please provide an authentic Google Maps location link (e.g. https://www.google.com/maps/... or https://maps.app.goo.gl/...).",
    };
  }

  const isShortened =
    trimmed.includes("maps.app.goo.gl") ||
    trimmed.includes("goo.gl/maps");

  let coordinates = null;

  // Attempt to extract coordinates from URL if present
  // Pattern A: Path coordinates /@26.7095,84.0507,17z
  const pathMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (pathMatch) {
    const lat = parseFloat(pathMatch[1]);
    const lng = parseFloat(pathMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      coordinates = { lat, lng };
    }
  }

  // Pattern B: Query params q=lat,lng or query=lat,lng or ll=lat,lng or destination=lat,lng
  if (!coordinates) {
    const queryMatch = trimmed.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
    if (queryMatch) {
      const lat = parseFloat(queryMatch[1]);
      const lng = parseFloat(queryMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates = { lat, lng };
      }
    }
  }

  // Pattern C: Protobuf data coordinates !3dlat!4dlng
  if (!coordinates) {
    const protoMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?)[^!]*!4d(-?\d+(?:\.\d+)?)/);
    if (protoMatch) {
      const lat = parseFloat(protoMatch[1]);
      const lng = parseFloat(protoMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates = { lat, lng };
      }
    }
  }

  return {
    isValid: true,
    isShortened,
    coordinates,
    error: null,
  };
}

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
 * Convenience helper to extract coordinates from Google Maps URL
 */
export function extractCoordinatesFromMapsUrl(urlString) {
  const res = validateGoogleMapsUrl(urlString);
  return res.coordinates;
}

/**
 * Compare submitted numeric coordinates with Google Maps link
 */
export function compareLocationCoordinates(submittedLat, submittedLng, googleMapsUrl) {
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
      warningMessage: urlValidation.error || "Invalid Google Maps link.",
    };
  }

  if (!hasValidSubmittedCoords) {
    return {
      submittedLat: null,
      submittedLng: null,
      urlLat: urlValidation.coordinates?.lat || null,
      urlLng: urlValidation.coordinates?.lng || null,
      distanceKm: null,
      status: "invalid_coords",
      warningMessage: "Submitted latitude/longitude are invalid or out of range.",
    };
  }

  if (urlValidation.coordinates) {
    const { lat: urlLat, lng: urlLng } = urlValidation.coordinates;
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
        warningMessage: `Coordinate mismatch: Proposed coordinates are ${distanceKm} km away from the coordinates in the submitted Google Maps link. Manual admin pin review required.`,
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

  if (urlValidation.isShortened) {
    return {
      submittedLat: numLat,
      submittedLng: numLng,
      urlLat: null,
      urlLng: null,
      distanceKm: null,
      status: "shortened_requires_admin_pin_check",
      warningMessage: "Shortened Google Maps link (maps.app.goo.gl). Proposed coordinates require manual pin review by administrator.",
    };
  }

  return {
    submittedLat: numLat,
    submittedLng: numLng,
    urlLat: null,
    urlLng: null,
    distanceKm: null,
    status: "shortened_requires_admin_pin_check",
    warningMessage: "Direct coordinates could not be automatically extracted from the Google Maps link. Administrator must inspect pin manually.",
  };
}

/**
 * Standardized Google Maps Destination coordinate link
 * Format: https://www.google.com/maps/search/?api=1&query=LATITUDE%2CLONGITUDE
 */
export function buildGoogleMapsCoordinateUrl(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (isNaN(lat) || isNaN(lng)) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}
