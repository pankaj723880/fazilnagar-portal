import Place from "../models/Place.js";
import Submission from "../models/Submission.js";
import { isWithinTownBoundary, REVIEW_FLAG_AREAS } from "../config/areas.js";

/**
 * Normalize phone number to 10 digits
 */
export function normalizePhone(rawPhone) {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normalize text for string matching
 */
export function normalizeText(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculates approximate distance in meters between two lat/lng coordinates
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check for duplicate submissions against existing Place records and pending Submissions
 */
export async function detectDuplicates({ name, phone, category, latitude, longitude, excludeId = null }) {
  const cleanPhone = normalizePhone(phone);
  const cleanName = normalizeText(name);
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  const warnings = [];

  // 1. Phone number match check
  if (cleanPhone && cleanPhone.length === 10) {
    const phoneRegex = new RegExp(cleanPhone);
    const existingPlaceByPhone = await Place.findOne({
      phone: phoneRegex,
      isArchived: { $ne: true },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });

    if (existingPlaceByPhone) {
      warnings.push(`Same contact number (${cleanPhone}) already registered with '${existingPlaceByPhone.name}' (${existingPlaceByPhone.category}).`);
    }

    const pendingSubByPhone = await Submission.findOne({
      phone: phoneRegex,
      status: "pending",
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });

    if (pendingSubByPhone) {
      warnings.push(`Pending submission with this phone number already exists: '${pendingSubByPhone.title}'.`);
    }
  }

  // 2. Name & Category match check
  if (cleanName.length > 2) {
    const nameRegex = new RegExp(`^${cleanName}$`, "i");
    const existingPlaceByName = await Place.findOne({
      name: nameRegex,
      category,
      isArchived: { $ne: true },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });

    if (existingPlaceByName) {
      warnings.push(`Exact place name '${existingPlaceByName.name}' in category '${category}' already exists.`);
    }
  }

  // 3. Proximity check (within 60 meters with similar category or exact name)
  if (!isNaN(lat) && !isNaN(lng)) {
    const nearbyPlaces = await Place.find({
      latitude: { $gte: lat - 0.001, $lte: lat + 0.001 },
      longitude: { $gte: lng - 0.001, $lte: lng + 0.001 },
      isArchived: { $ne: true },
    }).limit(10);

    for (const p of nearbyPlaces) {
      const dist = calculateDistanceMeters(lat, lng, p.latitude, p.longitude);
      if (dist < 60) {
        if (p.category === category || normalizeText(p.name).includes(cleanName) || cleanName.includes(normalizeText(p.name))) {
          warnings.push(`Proximity alert: Located within ${Math.round(dist)}m of existing entity '${p.name}'.`);
          break;
        }
      }
    }
  }

  return {
    isDuplicate: warnings.length > 0,
    warningMessage: warnings.join(" | "),
  };
}

/**
 * Determine town boundary status
 */
export function determineBoundaryStatus(latitude, longitude, locality) {
  if (REVIEW_FLAG_AREAS.includes(locality)) {
    return "unverified";
  }
  const isInside = isWithinTownBoundary(latitude, longitude);
  return isInside ? "confirmed" : "outside";
}
