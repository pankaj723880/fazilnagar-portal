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
  assert.equal(FAZILNAGAR_CENTRE.lat, 26.6827, "Fazilnagar Centre latitude must be 26.6827");
  assert.equal(FAZILNAGAR_CENTRE.lng, 84.0498, "Fazilnagar Centre longitude must be 84.0498");
  assert.equal(FAZILNAGAR_CENTRE.distanceKm, 0);
  assert.equal(FAZILNAGAR_CENTRE.block, "Fazilnagar");
  assert.equal(FAZILNAGAR_CENTRE.district, "Kushinagar");
  assert.equal(FAZILNAGAR_CENTRE.verificationStatus, "verified");
});

test("2. Complete Dataset Coverage: 1 Hub, 7 Towns, 3 Cities, 126 Verified Villages", () => {
  assert.equal(REGIONAL_LOCATIONS.length, 137, "Dataset must contain exactly 137 verified locations");

  const hubs = REGIONAL_LOCATIONS.filter((l) => l.type === "hub");
  const towns = REGIONAL_LOCATIONS.filter((l) => l.type === "town");
  const cities = REGIONAL_LOCATIONS.filter((l) => l.type === "city");
  const villages = REGIONAL_LOCATIONS.filter((l) => l.type === "village");

  assert.equal(hubs.length, 1, "Must contain exactly 1 central hub");
  assert.equal(towns.length, 7, "Must contain exactly 7 surrounding towns");
  assert.equal(cities.length, 3, "Must contain exactly 3 connected cities");
  assert.equal(villages.length, 126, "Must contain all 126 verified villages of Fazilnagar Block");
});

test("3. Specific Surrounding Towns & Cities Verification", () => {
  const expectedTowns = [
    { name: "Kasya / Kushinagar", block: "Kasia" },
    { name: "Tamkuhi Raj", block: "Tamkuhi Raj" },
    { name: "Padrauna", block: "Padrauna" },
    { name: "Hata", block: "Hata" },
    { name: "Seorahi", block: "Seorahi" },
    { name: "Ramkola", block: "Ramkola" },
    { name: "Sukrauli", block: "Sukrauli" },
  ];

  for (const exp of expectedTowns) {
    const found = REGIONAL_LOCATIONS.find((l) => l.type === "town" && l.name === exp.name);
    assert.ok(found, `Missing required surrounding town: ${exp.name}`);
    assert.equal(found.block, exp.block);
    assert.equal(found.verificationStatus, "verified");
    assert.ok(found.distanceKm > 0, `${exp.name} distance must be greater than 0`);
  }

  const expectedCities = ["Deoria", "Gorakhpur", "Gopalganj"];
  for (const c of expectedCities) {
    const found = REGIONAL_LOCATIONS.find((l) => l.type === "city" && l.name === c);
    assert.ok(found, `Missing required connected city: ${c}`);
    assert.equal(found.verificationStatus, "verified");
    assert.ok(found.distanceKm > 20, `${c} distance should be > 20 km`);
  }
});

test("4. Geographic Coordinate Bounding Box & Inversion Checks", () => {
  for (const loc of REGIONAL_LOCATIONS) {
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);

    assert.ok(!isNaN(lat) && !isNaN(lng), `Invalid coordinate on ${loc.name}: [${loc.lat}, ${loc.lng}]`);
    assert.ok(lat < lng, `Coordinates swapped on ${loc.name}: lat ${lat} > lng ${lng}`);

    // Latitude must be in northern India (26° to 27.5° N)
    assert.ok(lat >= 26.0 && lat <= 27.5, `Latitude ${lat} out of range for ${loc.name}`);

    // Longitude must be in eastern UP / western Bihar (83° to 85° E)
    assert.ok(lng >= 83.0 && lng <= 85.0, `Longitude ${lng} out of range for ${loc.name}`);

    // Block villages must be strictly within local Fazilnagar Block territory (~15 km of centre)
    if (loc.type === "village") {
      assert.ok(
        loc.distanceKm <= 18,
        `Village ${loc.name} distance ${loc.distanceKm}km is outside Fazilnagar Block boundary limit (<= 18km)`
      );
      assert.equal(loc.block, "Fazilnagar");
      assert.equal(loc.district, "Kushinagar");
    }
  }
});

test("5. Haversine Distance Calculation Accuracy (Tolerance <= 0.2km)", () => {
  const hub = FAZILNAGAR_CENTRE;

  for (const loc of REGIONAL_LOCATIONS) {
    if (loc.id === hub.id) continue;
    const computed = calculateHaversineKm(hub.lat, hub.lng, loc.lat, loc.lng);
    const diff = Math.abs(computed - loc.distanceKm);

    assert.ok(
      diff <= 0.2,
      `Distance discrepancy for ${loc.name}: stored=${loc.distanceKm}km, calculated=${computed}km, diff=${diff}km`
    );
  }
});

test("6. Identifier Uniqueness and Duplicate Prevention", () => {
  const idCounts = {};
  const villageNames = {};

  for (const loc of REGIONAL_LOCATIONS) {
    // Unique ID check
    idCounts[loc.id] = (idCounts[loc.id] || 0) + 1;

    // Unique village name check
    if (loc.type === "village") {
      villageNames[loc.name] = (villageNames[loc.name] || 0) + 1;
    }
  }

  for (const [id, count] of Object.entries(idCounts)) {
    assert.equal(count, 1, `Duplicate location ID found: ${id}`);
  }

  for (const [vName, count] of Object.entries(villageNames)) {
    assert.equal(count, 1, `Duplicate village name found in Fazilnagar Block: ${vName}`);
  }
});

test("7. Complete Metadata and Source Verification", () => {
  const requiredFields = [
    "id",
    "name",
    "hindiName",
    "type",
    "lat",
    "lng",
    "block",
    "district",
    "distanceKm",
    "compassDirection",
    "source",
    "verificationStatus",
  ];

  for (const loc of REGIONAL_LOCATIONS) {
    for (const field of requiredFields) {
      assert.ok(
        loc[field] !== undefined && loc[field] !== null && String(loc[field]).trim() !== "",
        `Location ${loc.name} (${loc.id}) missing required field: ${field}`
      );
    }
    assert.equal(loc.verificationStatus, "verified");
  }
});
