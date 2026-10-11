/**
 * Smart Direction Utility: Launches Google Maps turn-by-turn directions
 * starting from the user's real-time live GPS device location to the establishment.
 */
export function openGoogleMapsDirections(place) {
  if (!place) return;

  const destLat = place.latitude || place.lat;
  const destLng = place.longitude || place.lng;
  const placeName = place.name || "Fazilnagar";
  const destination =
    destLat && destLng
      ? `${destLat},${destLng}`
      : encodeURIComponent(`${placeName}, Fazilnagar, Kushinagar, Uttar Pradesh`);

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destination}&travelmode=driving`;
        window.open(url, "_blank", "noopener,noreferrer");
      },
      (error) => {
        // Fallback: If user denies GPS permission or device times out, use Google Maps' built-in Current Location
        console.warn("Geolocation prompt dismissed or unavailable, falling back to Current Location:", error);
        const url = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${destination}&travelmode=driving`;
        window.open(url, "_blank", "noopener,noreferrer");
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000,
      }
    );
  } else {
    const url = `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${destination}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
