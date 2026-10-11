/**
 * Smart Direction Utility: Launches Google Maps turn-by-turn directions
 * starting from the user's real-time live GPS device location to the destination.
 *
 * Uses synchronous navigation to prevent browser popup blockers from blocking
 * the new tab, with cached coordinates fallback to Google Maps' native 'Current+Location'.
 */

let cachedUserCoords = null;

// Pre-fetch device coordinates in background if user already has permissions enabled
if (typeof window !== "undefined" && "geolocation" in navigator) {
  try {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (pos?.coords) {
          cachedUserCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        }
      },
      () => {
        // Silently ignore if not yet permitted or dismissed
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  } catch (e) {
    // Ignore environments where geolocation is restricted
  }
}

export function openGoogleMapsDirections(place) {
  if (!place) return;

  const rawLat = place.latitude ?? place.lat;
  const rawLng = place.longitude ?? place.lng;
  const latNum = parseFloat(rawLat);
  const lngNum = parseFloat(rawLng);
  const placeName = place.name || "Fazilnagar";

  const hasValidCoords = !isNaN(latNum) && !isNaN(lngNum) && latNum > 0 && lngNum > 0;

  // Use exact pinpoint GPS coordinates when available; fallback to landmark string with postal PIN
  const destination = hasValidCoords
    ? `${latNum},${lngNum}`
    : encodeURIComponent(`${placeName}, Fazilnagar, Kushinagar, Uttar Pradesh 274401`);

  // If exact coordinates are cached from background geolocation, pass them directly.
  // Otherwise, 'Current+Location' instructs Google Maps to immediately grab the device's live GPS.
  const origin = cachedUserCoords
    ? `${cachedUserCoords.lat},${cachedUserCoords.lng}`
    : "Current+Location";

  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

  // Always invoke window.open synchronously to prevent modern browsers (Chrome/Safari)
  // from blocking the new window as an unsolicited async popup.
  window.open(url, "_blank", "noopener,noreferrer");
}
