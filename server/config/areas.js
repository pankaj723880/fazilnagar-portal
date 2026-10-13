// Shared Fazilnagar Town Areas & Localities Specification (27 exact options)
export const ALL_WARDS_FILTER = "All Wards / Areas";

export const FAZILNAGAR_AREAS = [
  "College Road",
  "Highway Corridor",
  "Main Market",
  "Kasya Road",
  "Purani Basti",
  "Bus Stand Area",
  "Main Chowk",
  "NH-27 Highway",
  "Hospital Road",
  "Main Chowk Link",
  "Block Campus",
  "NH-27 Junction",
  "Highway Chowk",
  "Block Road",
  "Pawanagar",
  "Babu Bazar",
  "Central Ward",
  "Block Outskirts",
  "Garahiya More",
  "Town Center",
  "Pawanagar Tirth Marg",
  "Pawanagar Marg",
  "Cinema Hall Road",
  "Unconfirmed",
  "NH-28 Service Road",
  "Outer Border Sector",
];

// Complete 27-option list for UI filtering
export const ALL_AREA_OPTIONS = [
  ALL_WARDS_FILTER,
  ...FAZILNAGAR_AREAS,
];

// Areas that require manual admin review verification
export const REVIEW_FLAG_AREAS = [
  "Unconfirmed",
  "Block Outskirts",
  "Outer Border Sector",
];

// Fazilnagar Town GPS Bounding Box
export const FAZILNAGAR_BOUNDS = {
  minLat: 26.6500,
  maxLat: 26.7200,
  minLng: 84.0200,
  maxLng: 84.0900,
};

export function isWithinTownBoundary(lat, lng) {
  const nLat = parseFloat(lat);
  const nLng = parseFloat(lng);
  if (isNaN(nLat) || isNaN(nLng)) return false;
  return (
    nLat >= FAZILNAGAR_BOUNDS.minLat &&
    nLat <= FAZILNAGAR_BOUNDS.maxLat &&
    nLng >= FAZILNAGAR_BOUNDS.minLng &&
    nLng <= FAZILNAGAR_BOUNDS.maxLng
  );
}
