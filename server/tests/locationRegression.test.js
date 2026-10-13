import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPlacesPath = path.join(__dirname, "../data/places.json");
const clientPlacesPath = path.join(__dirname, "../../client/src/data/places.json");

const serverPlaces = JSON.parse(fs.readFileSync(serverPlacesPath, "utf8"));
const clientPlaces = JSON.parse(fs.readFileSync(clientPlacesPath, "utf8"));

test("1. No swapped coordinates (Lat/Lng sanity and bounding box)", () => {
  const publishedPlaces = serverPlaces.filter((p) => p.latitude !== null && p.longitude !== null);

  assert.equal(publishedPlaces.length, 22, "Exactly 22 clean establishments must have active coordinates");

  for (const place of publishedPlaces) {
    const lat = Number(place.latitude);
    const lng = Number(place.longitude);

    assert.ok(!isNaN(lat), `Place ${place.slug} has NaN latitude`);
    assert.ok(!isNaN(lng), `Place ${place.slug} has NaN longitude`);

    // Latitude must be ~26.65 to 26.72 N for Fazilnagar
    assert.ok(
      lat >= 26.65 && lat <= 26.72,
      `Place ${place.name} (${place.slug}) latitude ${lat} is outside Fazilnagar town bounds [26.65, 26.72]`
    );

    // Longitude must be ~84.02 to 84.08 E for Fazilnagar
    assert.ok(
      lng >= 84.02 && lng <= 84.08,
      `Place ${place.name} (${place.slug}) longitude ${lng} is outside Fazilnagar town bounds [84.02, 84.08]`
    );

    // Check that latitude and longitude are not swapped
    assert.ok(
      lat < lng,
      `Place ${place.name} has inverted/swapped coordinates: lat ${lat} > lng ${lng}`
    );
  }
});

test("2. No synthetic default cluster assigning identical coordinates to unrelated entities", () => {
  const publishedPlaces = serverPlaces.filter((p) => p.latitude !== null && p.longitude !== null);

  // Group coordinates
  const coordGroups = {};
  for (const place of publishedPlaces) {
    const key = `${place.latitude.toFixed(4)},${place.longitude.toFixed(4)}`;
    if (!coordGroups[key]) coordGroups[key] = [];
    coordGroups[key].push(place);
  }

  // Ensure no single coordinate has excessive unrelated entities (synthetic town center dump)
  for (const [coord, group] of Object.entries(coordGroups)) {
    assert.ok(
      group.length <= 4,
      `Excessive coordinate overlap at ${coord} (${group.length} places). Possible synthetic cluster: ${group.map((g) => g.name).join(", ")}`
    );
  }
});

test("3. Canonical ground truth coordinates for key anchor institutions and petrol pumps", () => {
  const keyAnchors = [
    {
      slug: "the-hermitage-school-fazilnagar",
      expectedLat: 26.6804068,
      expectedLng: 84.046655,
    },
    {
      slug: "pawanagar-mahavir-inter-college-fazilnagar",
      expectedLat: 26.6894086,
      expectedLng: 84.0519967,
    },
    {
      slug: "community-health-centre-chc-fazilnagar",
      expectedLat: 26.6808,
      expectedLng: 84.0472,
    },
    {
      slug: "indian-oil-petrol-pump-fazilnagar",
      expectedLat: 26.6812,
      expectedLng: 84.0435,
    },
    {
      slug: "hp-petrol-pump-fazilnagar",
      expectedLat: 26.6821,
      expectedLng: 84.0552,
    },
    {
      slug: "bharat-petroleum-bpcl-fuel-station-fazilnagar",
      expectedLat: 26.6838,
      expectedLng: 84.0462,
    },
  ];

  for (const anchor of keyAnchors) {
    const record = serverPlaces.find((p) => p.slug === anchor.slug);
    assert.ok(record, `Missing record for ${anchor.slug}`);
    assert.equal(
      record.latitude,
      anchor.expectedLat,
      `Latitude mismatch for ${anchor.slug}: got ${record.latitude}, expected ${anchor.expectedLat}`
    );
    assert.equal(
      record.longitude,
      anchor.expectedLng,
      `Longitude mismatch for ${anchor.slug}: got ${record.longitude}, expected ${anchor.expectedLng}`
    );
    assert.equal(record.verificationStatus, "verified");
  }
});

test("4. Server and Client datasets remain strictly synchronized", () => {
  assert.equal(serverPlaces.length, clientPlaces.length, "Place counts must match exactly");

  for (let i = 0; i < serverPlaces.length; i++) {
    const s = serverPlaces[i];
    const c = clientPlaces.find((p) => p.slug === s.slug);
    assert.ok(c, `Client places missing slug ${s.slug}`);
    assert.equal(s.latitude, c.latitude, `Latitude mismatch on ${s.slug}`);
    assert.equal(s.longitude, c.longitude, `Longitude mismatch on ${s.slug}`);
    assert.equal(s.verificationStatus, c.verificationStatus, `Status mismatch on ${s.slug}`);
    assert.equal(s.mapsUrl, c.mapsUrl, `MapsUrl mismatch on ${s.slug}`);
  }
});

test("5. Directions URL uses exact canonical coordinates of the target entity", () => {
  const chc = serverPlaces.find((p) => p.slug === "community-health-centre-chc-fazilnagar");
  assert.ok(chc);

  const destStr = `${chc.latitude},${chc.longitude}`;
  const originStr = "26.6822,84.0503"; // User device GPS sample
  const url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`;

  assert.ok(url.includes("destination=26.6808,84.0472"));
  assert.ok(url.includes("origin=26.6822,84.0503"));
  assert.ok(!url.includes("26.6827,84.0498"), "Directions must not silently fall back to town center datum");
});

test("6. No commercial shops or unauthorized categories remain in dataset", () => {
  const allowedCategories = ["Schools & Colleges", "Hospitals & Clinics", "Petrol Pumps"];

  for (const place of serverPlaces) {
    assert.ok(
      allowedCategories.includes(place.category),
      `Place ${place.name} has unauthorized category: ${place.category}`
    );
    assert.equal(place.verificationStatus, "verified");
    assert.equal(place.isPublished, true);
  }
});

test("7. MapsUrl correctly points to the updated coordinates", () => {
  const publishedPlaces = serverPlaces.filter((p) => p.latitude !== null && p.longitude !== null);

  for (const place of publishedPlaces) {
    const expected = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    assert.equal(place.mapsUrl, expected, `mapsUrl mismatch for ${place.slug}`);
  }
});
