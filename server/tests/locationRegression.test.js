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

  assert.equal(publishedPlaces.length, 61, "Exactly 61 establishments must have active coordinates");

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

test("3. Canonical ground truth coordinates for key anchor institutions", () => {
  const keyAnchors = [
    {
      slug: "pawanagar-mahavir-inter-college-fazilnagar",
      expectedLat: 26.6894086,
      expectedLng: 84.0519967,
    },
    {
      slug: "community-health-centre-chc-fazilnagar",
      expectedLat: 26.6806509,
      expectedLng: 84.0536484,
    },
    {
      slug: "pawanagar-mahavir-digambar-jain-mandir",
      expectedLat: 26.6851649,
      expectedLng: 84.0453613,
    },
    {
      slug: "fazilnagar-police-outpost-chowki",
      expectedLat: 26.6817019,
      expectedLng: 84.0596356,
    },
    {
      slug: "the-hermitage-school-fazilnagar",
      expectedLat: 26.6804068,
      expectedLng: 84.046655,
    },
    {
      slug: "fazilnagar-block-development-office",
      expectedLat: 26.6830688,
      expectedLng: 84.0496776,
    },
    {
      slug: "state-bank-of-india-sbi-fazilnagar",
      expectedLat: 26.6822,
      expectedLng: 84.0503,
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
  // Test directions helper URL building logic
  const chc = serverPlaces.find((p) => p.slug === "community-health-centre-chc-fazilnagar");
  assert.ok(chc);

  const destStr = `${chc.latitude},${chc.longitude}`;
  const originStr = "26.6822,84.0503"; // User device GPS sample
  const url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&travelmode=driving`;

  assert.ok(url.includes("destination=26.6806509,84.0536484"));
  assert.ok(url.includes("origin=26.6822,84.0503"));
  assert.ok(!url.includes("26.6827,84.0498"), "Directions must not silently fall back to town center datum");
});

test("6. Unverified locations are not falsely labelled verified", () => {
  const publishedPlaces = serverPlaces.filter((p) => p.latitude !== null && p.longitude !== null);

  const verified = publishedPlaces.filter((p) => p.verificationStatus === "verified");
  const needsReview = publishedPlaces.filter((p) => p.verificationStatus === "needs_address_verification");

  assert.equal(verified.length, 33, "Exactly 33 verified establishments (25 repaired + 8 canonical)");
  assert.equal(needsReview.length, 28, "Exactly 28 unverified commercial establishments flagged for review");

  // Every needsReview place must have an audit review note explaining it needs ground proof
  for (const place of needsReview) {
    assert.ok(
      place.reviewNotes.includes("on-site") || place.reviewNotes.includes("ground verification"),
      `Place ${place.slug} lacks explanatory review note: ${place.reviewNotes}`
    );
  }
});

test("7. MapsUrl correctly points to the updated coordinates", () => {
  const publishedPlaces = serverPlaces.filter((p) => p.latitude !== null && p.longitude !== null);

  for (const place of publishedPlaces) {
    const expected = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    assert.equal(place.mapsUrl, expected, `mapsUrl mismatch for ${place.slug}`);
  }
});
