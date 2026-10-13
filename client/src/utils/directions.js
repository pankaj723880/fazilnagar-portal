/**
 * Fazilnagar Town Portal — Verified Direction Utility
 *
 * Coordinates turn-by-turn navigation starting from the user's authentic
 * live GPS device location to the selected verified Fazilnagar destination.
 *
 * Dispatches an event to the DirectionsModal to handle user consent,
 * high-accuracy Geolocation, permission states, and exact coordinate routing.
 */

/**
 * Open the comprehensive GPS directions flow for a given place
 * @param {Object} place - Establishment or landmark object
 */
export function openGoogleMapsDirections(place) {
  if (!place) return;

  if (typeof window !== "undefined") {
    // Normalize coordinates so both lat/latitude and lng/longitude are available
    const normalizedPlace = {
      ...place,
      lat: place.latitude ?? place.lat ?? null,
      lng: place.longitude ?? place.lng ?? null,
      latitude: place.latitude ?? place.lat ?? null,
      longitude: place.longitude ?? place.lng ?? null,
    };

    window.dispatchEvent(
      new CustomEvent("open-directions", {
        detail: normalizedPlace,
      })
    );
  }
}

export function openDirections(place) {
  openGoogleMapsDirections(place);
}

/**
 * Helper to construct an exact Google Maps turn-by-turn directions URL
 * @param {Object} options
 * @param {string|{lat: number, lng: number}} options.origin - Starting GPS coordinates or address string
 * @param {string|{lat: number, lng: number}} options.destination - Target GPS coordinates or address string
 * @param {string} [options.travelmode='driving'] - Driving, walking, transit, bicycling
 */
export function buildGoogleMapsUrl({ origin, destination, travelmode = "driving" }) {
  const originStr =
    typeof origin === "object" && origin !== null && !isNaN(origin.lat) && !isNaN(origin.lng)
      ? `${origin.lat},${origin.lng}`
      : origin || "";

  const destStr =
    typeof destination === "object" && destination !== null && !isNaN(destination.lat) && !isNaN(destination.lng)
      ? `${destination.lat},${destination.lng}`
      : destination || "";

  const params = new URLSearchParams({
    api: "1",
    travelmode,
  });

  if (originStr) {
    params.set("origin", originStr);
  }
  if (destStr) {
    params.set("destination", destStr);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
