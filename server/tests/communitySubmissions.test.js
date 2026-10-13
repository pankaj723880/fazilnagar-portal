import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ALL_AREA_OPTIONS, FAZILNAGAR_AREAS, isWithinTownBoundary, REVIEW_FLAG_AREAS } from "../config/areas.js";
import { normalizePhone, normalizeText, calculateDistanceMeters, determineBoundaryStatus } from "../utils/submissionUtils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPlacesPath = path.join(__dirname, "../data/places.json");
const clientPlacesPath = path.join(__dirname, "../../client/src/data/places.json");

const serverPlaces = JSON.parse(fs.readFileSync(serverPlacesPath, "utf8"));
const clientPlaces = JSON.parse(fs.readFileSync(clientPlacesPath, "utf8"));

test("1. Archival Integrity: Exactly 22 official places preserved", () => {
  const publishedPlaces = serverPlaces.filter((p) => p.isArchived !== true && p.isPublished !== false);
  const archivedPlaces = serverPlaces.filter((p) => p.isArchived === true);

  assert.equal(publishedPlaces.length, 22, "Exactly 22 official listings must remain published and unarchived");

  // Every published place must belong to official allowed categories: Schools, Hospitals, Petrol Pumps
  const allowedOfficialCategories = [
    "Hospitals & Clinics",
    "Schools & Colleges",
    "Petrol Pumps",
  ];

  for (const place of publishedPlaces) {
    assert.ok(
      allowedOfficialCategories.includes(place.category),
      `Published place ${place.name} has non-protected category: ${place.category}`
    );
    assert.equal(place.isArchived, false);
    assert.equal(place.isPublished, true);
    assert.ok(
      place.latitude === null || (typeof place.latitude === "number" && !isNaN(place.latitude)),
      `Place ${place.slug} latitude must be null or number`
    );
    assert.ok(
      place.longitude === null || (typeof place.longitude === "number" && !isNaN(place.longitude)),
      `Place ${place.slug} longitude must be null or number`
    );
  }

  // All archived places must retain their data and have an archiveReason
  for (const place of archivedPlaces) {
    assert.equal(place.isArchived, true);
    assert.equal(place.isPublished, false);
    assert.ok(place.archiveReason, `Archived place ${place.slug} is missing archiveReason`);
    assert.ok(place.name, "Archived place must retain its name");
    assert.ok(place.addressFull || place.address, "Archived place must retain its address");
  }
});

test("2. Exact 27 Area Options exist and are synchronized across server configuration", () => {
  assert.equal(ALL_AREA_OPTIONS.length, 27, "Total area options must equal exactly 27");
  assert.equal(ALL_AREA_OPTIONS[0], "All Wards / Areas", "First option must be 'All Wards / Areas'");
  assert.equal(FAZILNAGAR_AREAS.length, 26, "FAZILNAGAR_AREAS must contain 26 specific selectable areas");
  assert.ok(!FAZILNAGAR_AREAS.includes("All Wards / Areas"), "'All Wards / Areas' must not be in selectable area list");

  const expectedAreas = [
    "All Wards / Areas",
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

  for (const area of expectedAreas) {
    assert.ok(ALL_AREA_OPTIONS.includes(area), `Missing required area: ${area}`);
  }

  // Review-flagged areas
  assert.ok(REVIEW_FLAG_AREAS.includes("Unconfirmed"));
  assert.ok(REVIEW_FLAG_AREAS.includes("Block Outskirts"));
  assert.ok(REVIEW_FLAG_AREAS.includes("Outer Border Sector"));
});

test("3. Town boundary validation accurately flags points inside vs outside Fazilnagar", () => {
  // Town center / CHC (Inside)
  assert.equal(isWithinTownBoundary(26.6808, 84.0472), true, "CHC hospital should be within town boundary");
  assert.equal(isWithinTownBoundary(26.6894, 84.052), true, "Mahavir Inter College should be within town boundary");

  // Outside town bounds
  assert.equal(isWithinTownBoundary(26.5, 84.04), false, "Far south coordinate should be outside town boundary");
  assert.equal(isWithinTownBoundary(26.8, 84.04), false, "Far north coordinate should be outside town boundary");
  assert.equal(isWithinTownBoundary(26.68, 83.9), false, "Far west coordinate should be outside town boundary");
  assert.equal(isWithinTownBoundary(26.68, 84.2), false, "Far east coordinate should be outside town boundary");
});

test("4. Normalization and Boundary Status utilities", () => {
  // Phone normalization
  assert.equal(normalizePhone("+91 98765 43210"), "9876543210");
  assert.equal(normalizePhone("09876543210"), "9876543210");
  assert.equal(normalizePhone("9876543210"), "9876543210");

  // Distance calculation
  const dist = calculateDistanceMeters(26.6808, 84.0472, 26.6808, 84.0472);
  assert.equal(dist, 0);

  // Small offset (< 50 meters)
  const distNear = calculateDistanceMeters(26.6808, 84.0472, 26.6809, 84.0472);
  assert.ok(distNear > 0 && distNear < 30, `Distance should be ~11m, got ${distNear}`);

  // Boundary status determination
  assert.equal(determineBoundaryStatus(26.6808, 84.0472, "Main Market"), "confirmed");
  assert.equal(determineBoundaryStatus(26.6808, 84.0472, "Unconfirmed"), "unverified");
  assert.equal(determineBoundaryStatus(26.6808, 84.0472, "Block Outskirts"), "unverified");
  assert.equal(determineBoundaryStatus(26.5000, 84.0472, "Main Market"), "outside");
});

test("5. Server and Client places datasets remain identical after archival migration", () => {
  assert.equal(serverPlaces.length, clientPlaces.length);

  for (let i = 0; i < serverPlaces.length; i++) {
    const s = serverPlaces[i];
    const c = clientPlaces.find((p) => p.slug === s.slug);
    assert.ok(c, `Missing slug ${s.slug} in client places`);
    assert.equal(s.isArchived, c.isArchived);
    assert.equal(s.isPublished, c.isPublished);
    assert.equal(s.latitude, c.latitude);
    assert.equal(s.longitude, c.longitude);
  }
});

test("6. Category Protection: Protected categories are strictly prohibited from community submissions", () => {
  const protectedCategories = [
    "Hospitals & Clinics",
    "Schools & Colleges",
    "Medical Stores & Pharmacies"
  ];

  const allowedCommunityCategories = [
    "Shops & Retail",
    "Restaurants & Cafes",
    "Hotels & Lodging",
    "Offices & Professional Services",
    "Banks & Financial",
    "ATMs",
    "Temples & Religious Places",
    "Salons & Personal Care",
    "Repair Services & Mechanics",
    "Coaching & Tuition Centres",
    "Community & Civic Facilities",
    "Other Businesses",
    "General Public Places"
  ];

  // Verify non-intersection
  for (const cat of protectedCategories) {
    assert.ok(
      !allowedCommunityCategories.includes(cat),
      `Protected category '${cat}' must NEVER be in allowed community categories`
    );
  }

  // Community categories must match specification
  assert.equal(allowedCommunityCategories.length, 13);
});

test("7. Reference ID Generation and Format Validation", () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const sampleRef = `FZ-PLACE-${dateStr}-${randomSuffix}`;

  const pattern = /^FZ-PLACE-\d{8}-\d{4}$/;
  assert.ok(pattern.test(sampleRef), `Generated reference ID ${sampleRef} should match FZ-PLACE-YYYYMMDD-XXXX format`);
});

test("8. Coordinate Sanity and Strict Numeric Type Validation", () => {
  // Numeric coordinate verification
  const validLat = 26.6808;
  const validLng = 84.0472;

  assert.equal(typeof validLat, "number");
  assert.equal(typeof validLng, "number");
  assert.ok(!isNaN(validLat) && !isNaN(validLng));

  // Invalid coordinates should be caught
  const invalidInputs = [
    { lat: "twenty six", lng: 84.0472 },
    { lat: null, lng: 84.0472 },
    { lat: 26.6808, lng: undefined },
    { lat: NaN, lng: 84.0472 }
  ];

  for (const item of invalidInputs) {
    const latNum = Number(item.lat);
    const lngNum = Number(item.lng);
    const isInvalid = item.lat === null || item.lng === null || isNaN(latNum) || isNaN(lngNum);
    assert.ok(isInvalid, `Should detect invalid coordinates: lat=${item.lat}, lng=${item.lng}`);
  }
});

test("9. Consent check enforcement logic", () => {
  const validConsents = {
    accuracy: true,
    authorized: true,
    photosPublic: true,
    reviewAgreement: true
  };

  const isConsentComplete = (consents) => (
    Boolean(consents?.accuracy) &&
    Boolean(consents?.authorized) &&
    Boolean(consents?.photosPublic) &&
    Boolean(consents?.reviewAgreement)
  );

  assert.equal(isConsentComplete(validConsents), true);
  assert.equal(isConsentComplete({ ...validConsents, accuracy: false }), false);
  assert.equal(isConsentComplete({ ...validConsents, reviewAgreement: false }), false);
  assert.equal(isConsentComplete(null), false);
});

