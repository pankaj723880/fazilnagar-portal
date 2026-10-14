export const FAZILNAGAR_BOUNDS = {
  minLatitude: 26.65,
  maxLatitude: 26.72,
  minLongitude: 84.02,
  maxLongitude: 84.08,
};

export function normalizeCoordinates(latitude, longitude, { allowNull = true, enforceTownBounds = false } = {}) {
  const hasLatitude = latitude !== null && latitude !== undefined && latitude !== "";
  const hasLongitude = longitude !== null && longitude !== undefined && longitude !== "";

  if (!hasLatitude && !hasLongitude) {
    if (allowNull) return { latitude: null, longitude: null };
    throw new Error("Both latitude and longitude are required.");
  }

  if (!hasLatitude || !hasLongitude) {
    throw new Error("Latitude and longitude must be provided together.");
  }

  const normalizedLatitude = Number(latitude);
  const normalizedLongitude = Number(longitude);

  if (!Number.isFinite(normalizedLatitude) || !Number.isFinite(normalizedLongitude)) {
    throw new Error("Latitude and longitude must be valid numbers.");
  }

  if (normalizedLatitude < -90 || normalizedLatitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  if (normalizedLongitude < -180 || normalizedLongitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }

  if (
    enforceTownBounds &&
    (normalizedLatitude < FAZILNAGAR_BOUNDS.minLatitude ||
      normalizedLatitude > FAZILNAGAR_BOUNDS.maxLatitude ||
      normalizedLongitude < FAZILNAGAR_BOUNDS.minLongitude ||
      normalizedLongitude > FAZILNAGAR_BOUNDS.maxLongitude)
  ) {
    throw new Error("Published coordinates must be inside the Fazilnagar town boundary.");
  }

  return {
    latitude: normalizedLatitude,
    longitude: normalizedLongitude,
  };
}

export function buildMapsUrl(latitude, longitude) {
  const coordinates = normalizeCoordinates(latitude, longitude);
  if (coordinates.latitude === null || coordinates.longitude === null) return "";
  return `https://www.google.com/maps/search/?api=1&query=${coordinates.latitude},${coordinates.longitude}`;
}
