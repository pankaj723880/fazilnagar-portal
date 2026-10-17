import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const regionalLocationsPath = path.join(__dirname, "../../client/src/data/regionalLocations.js");

// Load REGIONAL_LOCATIONS and FAZILNAGAR_CENTRE from ESM module
const { REGIONAL_LOCATIONS, FAZILNAGAR_CENTRE } = await import(
  `file://${regionalLocationsPath.replace(/\\/g, "/")}`
);

// Standard Haversine distance formula in kilometers
function calculateHaversineKm(lat1, lon1, lat2, lon2) {
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
  return Math.round(R * c * 10) / 10;
}

test("1. Central Hub Integrity (Fazilnagar Town Centre Origin)", () => {
  assert.ok(FAZILNAGAR_CENTRE, "Fazilnagar hub definition must exist");
  assert.equal(FAZILNAGAR_CENTRE.id, "fazilnagar-hub");
  assert.equal(FAZILNAGAR_CENTRE.type, "hub");
  assert.equal(FAZILNAGAR_CENTRE.latitude, 26.6827, "Fazilnagar Centre latitude must be 26.6827");
  assert.equal(FAZILNAGAR_CENTRE.longitude, 84.0498, "Fazilnagar Centre longitude must be 84.0498");
  assert.equal(FAZILNAGAR_CENTRE.sourceLatitude, 26.6827);
  assert.equal(FAZILNAGAR_CENTRE.sourceLongitude, 84.0498);
  assert.equal(FAZILNAGAR_CENTRE.suppliedDistanceKm, 0);
  assert.equal(FAZILNAGAR_CENTRE.calculatedDistanceKm, 0);
  assert.equal(FAZILNAGAR_CENTRE.distanceKm, 0);
  assert.equal(FAZILNAGAR_CENTRE.block, "Fazilnagar");
  assert.equal(FAZILNAGAR_CENTRE.district, "Kushinagar");
  assert.equal(FAZILNAGAR_CENTRE.verificationStatus, "verified");
});

test("2. Complete Dataset Coverage: Exactly 117 Supplied Records", () => {
  assert.equal(REGIONAL_LOCATIONS.length, 117, "Dataset must contain exactly 117 supplied locations");

  const hubs = REGIONAL_LOCATIONS.filter((l) => l.type === "hub");
  const towns = REGIONAL_LOCATIONS.filter((l) => l.type === "town");
  const cities = REGIONAL_LOCATIONS.filter((l) => l.type === "city");
  const villages = REGIONAL_LOCATIONS.filter((l) => l.type === "village");

  assert.equal(hubs.length, 1, "Must contain exactly 1 central hub");
  assert.ok(towns.length >= 15, `Must contain towns/tehsils (found ${towns.length})`);
  assert.ok(cities.length >= 40, `Must contain cities/capitals (found ${cities.length})`);
  assert.ok(villages.length >= 45, `Must contain villages/Gram Panchayats (found ${villages.length})`);
  assert.equal(hubs.length + towns.length + cities.length + villages.length, 117);
});

test("3. Specific Surrounding Towns, Cities & Regional Anchors Verification", () => {
  const expectedKeyLocations = [
    { sno: 1, name: "Fazilnagar Centre" },
    { sno: 2, name: "Pawanagar" },
    { sno: 9, name: "Patherwa" },
    { sno: 20, name: "Tamkuhi Raj" },
    { sno: 21, name: "Kasia" },
    { sno: 22, name: "Kushinagar (Stupa Area)" },
    { sno: 62, name: "Hata" },
    { sno: 63, name: "Padrauna" },
    { sno: 64, name: "Deoria" },
    { sno: 70, name: "Gopalganj" },
    { sno: 74, name: "Gorakhpur" },
    { sno: 79, name: "Patna" },
    { sno: 92, name: "New Delhi" },
    { sno: 116, name: "Lucknow" },
    { sno: 117, name: "Varanasi" },
  ];

  for (const exp of expectedKeyLocations) {
    const found = REGIONAL_LOCATIONS.find((l) => l.sno === exp.sno);
    assert.ok(found, `Missing required supplied location: SNO ${exp.sno} (${exp.name})`);
    assert.equal(found.verificationStatus, "verified");
  }
});

test("4. Geographic Coordinate Bounding Box & Inversion Checks", () => {
  for (const loc of REGIONAL_LOCATIONS) {
    const lat = Number(loc.latitude ?? loc.lat);
    const lng = Number(loc.longitude ?? loc.lng);

    assert.ok(!isNaN(lat) && !isNaN(lng), `Invalid coordinate on ${loc.name}: [${loc.latitude}, ${loc.longitude}]`);
    assert.ok(lat < lng, `Coordinates swapped on ${loc.name}: lat ${lat} > lng ${lng}`);

    // Latitude must be in India/regional span (21° to 33° N)
    assert.ok(lat >= 21.0 && lat <= 33.0, `Latitude ${lat} out of range for ${loc.name}`);

    // Longitude must be in India span (75° to 88° E)
    assert.ok(lng >= 75.0 && lng <= 88.0, `Longitude ${lng} out of range for ${loc.name}`);

    // Local villages must be within <= 22 km of Fazilnagar Centre
    if (loc.type === "village") {
      assert.ok(
        loc.distanceKm <= 22,
        `Village ${loc.name} distance ${loc.distanceKm}km exceeds local radius limit (<= 22km)`
      );
    }
  }
});

test("5. Haversine Distance Calculation Accuracy (Tolerance <= 0.2km)", () => {
  const hub = FAZILNAGAR_CENTRE;

  for (const loc of REGIONAL_LOCATIONS) {
    if (loc.id === hub.id) continue;
    const computed = calculateHaversineKm(hub.latitude, hub.longitude, loc.latitude, loc.longitude);
    const diff = Math.abs(computed - loc.calculatedDistanceKm);

    assert.ok(
      diff <= 0.2,
      `Distance discrepancy for ${loc.name}: stored=${loc.calculatedDistanceKm}km, calculated=${computed}km, diff=${diff}km`
    );
  }
});

test("6. Identifier Uniqueness and Duplicate Prevention", () => {
  const idCounts = {};
  const snoCounts = {};

  for (const loc of REGIONAL_LOCATIONS) {
    idCounts[loc.id] = (idCounts[loc.id] || 0) + 1;
    snoCounts[loc.sno] = (snoCounts[loc.sno] || 0) + 1;
  }

  for (const [id, count] of Object.entries(idCounts)) {
    assert.equal(count, 1, `Duplicate location ID found: ${id}`);
  }

  for (const [sno, count] of Object.entries(snoCounts)) {
    assert.equal(count, 1, `Duplicate SNO found: ${sno}`);
  }
});

test("7. Complete Metadata & Strict Separate Field Schema Validation", () => {
  const requiredFields = [
    "id",
    "sno",
    "name",
    "hindiName",
    "latitude",
    "longitude",
    "sourceLatitude",
    "sourceLongitude",
    "coordinateSource",
    "verificationStatus",
    "suppliedDistanceKm",
    "calculatedDistanceKm",
    "compassDirection",
    "distanceBand",
    "section",
    "source",
  ];

  for (const loc of REGIONAL_LOCATIONS) {
    for (const field of requiredFields) {
      assert.ok(
        loc[field] !== undefined && loc[field] !== null && String(loc[field]).trim() !== "",
        `Location ${loc.name} (${loc.id}) missing required field: ${field}`
      );
    }

    // Numbers check
    assert.ok(typeof loc.latitude === "number" && !isNaN(loc.latitude));
    assert.ok(typeof loc.longitude === "number" && !isNaN(loc.longitude));
    assert.ok(typeof loc.sourceLatitude === "number" && !isNaN(loc.sourceLatitude));
    assert.ok(typeof loc.sourceLongitude === "number" && !isNaN(loc.sourceLongitude));
    assert.ok(typeof loc.suppliedDistanceKm === "number" && !isNaN(loc.suppliedDistanceKm));
    assert.ok(typeof loc.calculatedDistanceKm === "number" && !isNaN(loc.calculatedDistanceKm));

    // Status check: SNO 27 to 61 (35 candidate villages) MUST be needs_verification
    if (loc.sno >= 27 && loc.sno <= 61) {
      assert.equal(
        loc.verificationStatus,
        "needs_verification",
        `Candidate village SNO ${loc.sno} (${loc.name}) must be flagged as 'needs_verification'`
      );
    } else {
      assert.equal(
        loc.verificationStatus,
        "verified",
        `Location SNO ${loc.sno} (${loc.name}) must be verified`
      );
    }
  }

  const verifiedTotal = REGIONAL_LOCATIONS.filter((l) => l.verificationStatus === "verified").length;
  const unverifiedTotal = REGIONAL_LOCATIONS.filter((l) => l.verificationStatus === "needs_verification").length;

  assert.equal(verifiedTotal, 82, "Exactly 82 locations must be verified");
  assert.equal(unverifiedTotal, 35, "Exactly 35 candidate local villages must be flagged as needs_verification");
});

test("8. Distance Bands Distribution Coverage", () => {
  const bands = new Set(REGIONAL_LOCATIONS.map((l) => l.distanceBand));
  const expectedBands = [
    "0-5 km",
    "5-12 km",
    "12-20 km",
    "15-35 km",
    "35-60 km",
    "60-100 km",
    "100+ km",
  ];

  for (const eb of expectedBands) {
    assert.ok(bands.has(eb), `Distance band ${eb} missing from dataset`);
  }
});

test("9. Representative Cardinal Locations & Directional Consistency", () => {
  const hub = FAZILNAGAR_CENTRE;

  // North representative: Dehwa Patti (SNO 31) lat > hub.lat
  const northLoc = REGIONAL_LOCATIONS.find((l) => l.sno === 31);
  assert.ok(northLoc, "Dehwa Patti must exist");
  assert.ok(northLoc.latitude > hub.latitude, `North loc ${northLoc.name} lat ${northLoc.latitude} should be > hub lat ${hub.latitude}`);
  assert.equal(northLoc.compassDirection, "N");

  // South representative: Dhanauji Khurd (SNO 30) lat < hub.lat
  const southLoc = REGIONAL_LOCATIONS.find((l) => l.sno === 30);
  assert.ok(southLoc, "Dhanauji Khurd must exist");
  assert.ok(southLoc.latitude < hub.latitude, `South loc ${southLoc.name} lat ${southLoc.latitude} should be < hub lat ${hub.latitude}`);
  assert.equal(southLoc.compassDirection, "S");

  // East representative: Tamkuhi Raj (SNO 20) lng > hub.lng
  const eastLoc = REGIONAL_LOCATIONS.find((l) => l.sno === 20);
  assert.ok(eastLoc, "Tamkuhi Raj must exist");
  assert.ok(eastLoc.longitude > hub.longitude, `East loc ${eastLoc.name} lng ${eastLoc.longitude} should be > hub lng ${hub.longitude}`);
  assert.equal(eastLoc.compassDirection, "E");

  // West representative: Kasia (SNO 21) lng < hub.lng
  const westLoc = REGIONAL_LOCATIONS.find((l) => l.sno === 21);
  assert.ok(westLoc, "Kasia must exist");
  assert.ok(westLoc.longitude < hub.longitude, `West loc ${westLoc.name} lng ${westLoc.longitude} should be < hub lng ${hub.longitude}`);
  assert.equal(westLoc.compassDirection, "W");
});

test("10. Prevention of Stale Marker Coordinates and Artificial Repeating Offsets", () => {
  // Ensure that candidate villages do NOT share a synthetic grid offset (e.g. artificial .xx15 pattern)
  const candidateVillages = REGIONAL_LOCATIONS.filter((l) => l.sno >= 27 && l.sno <= 61);
  assert.equal(candidateVillages.length, 35);

  const uniqueCoordinates = new Set(
    candidateVillages.map((v) => `${v.latitude.toFixed(4)},${v.longitude.toFixed(4)}`)
  );

  // All 35 candidate villages have distinct coordinate pairs
  assert.equal(uniqueCoordinates.size, 35, "All 35 candidate villages must have unique candidate coordinate points");

  // Ensure sourceLatitude and sourceLongitude are preserved unmodified
  for (const v of candidateVillages) {
    assert.equal(v.latitude, v.sourceLatitude, `Latitude mismatch on SNO ${v.sno}`);
    assert.equal(v.longitude, v.sourceLongitude, `Longitude mismatch on SNO ${v.sno}`);
  }
});
