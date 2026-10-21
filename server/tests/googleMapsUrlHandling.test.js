import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import {
  validateGoogleMapsUrl,
  extractCoordinatesFromMapsUrl,
  resolveGoogleMapsShortUrl,
  extractCoordinatesAsync,
  getSafeHttpsUrl,
} from "../utils/googleMapsValidator.js";

import formsRoutes from "../routes/forms.js";
import contributionRoutes from "../routes/contributionSubmissions.js";
import User from "../models/User.js";
import Place from "../models/Place.js";
import ContributionForm from "../models/ContributionForm.js";
import ContributionSubmission from "../models/ContributionSubmission.js";

const TEST_PORT = 5092;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Google Maps URL Handling, Extraction & Form Submission Verification", () => {
  let server;
  let adminToken;
  let testPlace;
  let testForm;

  const makeRequest = ({ path, method = "GET", token, body = null }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path,
          method,
          headers,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            let parsed;
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = data;
            }
            resolve({ status: res.statusCode, headers: res.headers, data: parsed });
          });
        }
      );

      req.on("error", reject);
      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/forms", formsRoutes);
    app.use("/api/contributions", contributionRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, "127.0.0.1", resolve);
    });

    const admin = await User.findOneAndUpdate(
      { email: "admin_maps_test@fazilnagar.in" },
      {
        name: "Maps Admin Tester",
        email: "admin_maps_test@fazilnagar.in",
        role: "admin",
      },
      { upsert: true, new: true }
    );

    adminToken = jwt.sign(
      { id: admin._id, email: admin.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    testPlace = await Place.findOneAndUpdate(
      { slug: "test-maps-establishment" },
      {
        name: "Test Establishment for Maps",
        category: "healthcare",
        latitude: 26.6800,
        longitude: 84.0400,
        slug: "test-maps-establishment",
        status: "active",
      },
      { upsert: true, new: true }
    );

    testForm = await ContributionForm.findOneAndUpdate(
      { slug: "test-maps-contribution-form" },
      {
        title: "Test Maps Contribution Form",
        slug: "test-maps-contribution-form",
        targetEntity: {
          type: "Place",
          id: testPlace._id,
          name: testPlace.name,
        },
        purpose: "correction",
        targetModule: "map",
        entityType: "places",
        status: "published",
        fields: [
          {
            name: "googleMapsUrl",
            label: "Google Maps Location Link",
            type: "googleMapsUrl",
            required: true,
            order: 0,
          },
          {
            name: "latitude",
            label: "Latitude",
            type: "latitude",
            required: false,
            order: 1,
          },
          {
            name: "longitude",
            label: "Longitude",
            type: "longitude",
            required: false,
            order: 2,
          },
        ],
      },
      { upsert: true, new: true }
    );
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // Unit Tests: URL Format Parsing and Coordinate Extraction
  // -------------------------------------------------------------
  describe("Unit Tests: Google Maps URL Parsing and Coordinate Extraction", () => {
    it("1. Extracts coordinates from @lat,lng format (place with zoom)", () => {
      const url = "https://www.google.com/maps/place/Fazilnagar+Market/@26.6854,84.0492,15z";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates");
      assert.equal(coords.latitude, 26.6854);
      assert.equal(coords.longitude, 84.0492);
    });

    it("2. Extracts coordinates from maps.google.com/?q=lat,lng", () => {
      const url = "https://maps.google.com/?q=26.6000,84.0000";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates");
      assert.equal(coords.latitude, 26.6);
      assert.equal(coords.longitude, 84.0);
    });

    it("3. Extracts coordinates from www.google.com/maps?q=lat,lng", () => {
      const url = "https://www.google.com/maps?q=26.6,84.0";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates");
      assert.equal(coords.latitude, 26.6);
      assert.equal(coords.longitude, 84.0);
    });

    it("4. Extracts coordinates from URL-encoded comma ?q=26.6%2C84.0", () => {
      const url = "https://www.google.com/maps?q=26.6%2C84.0";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates with encoded comma");
      assert.equal(coords.latitude, 26.6);
      assert.equal(coords.longitude, 84.0);
    });

    it("5. Extracts coordinates from protobuf !3dLAT!4dLNG format", () => {
      const url = "https://www.google.com/maps/place/Fazilnagar/@26.6854,84.0492,17z/data=!3m1!4b1!4m6!3m5!1s0x3993c123456789!8m2!3d26.69123!4d84.05678!16s%2Fg%2F11b6_12345";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates from protobuf");
      assert.equal(coords.latitude, 26.69123);
      assert.equal(coords.longitude, 84.05678);
    });

    it("6. Extracts coordinates from reverse protobuf !4dLNG!3dLAT format", () => {
      const url = "https://www.google.com/maps/place/Custom+Pin/data=!4m5!4d84.05555!3d26.69999";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract reverse order protobuf coordinates");
      assert.equal(coords.latitude, 26.69999);
      assert.equal(coords.longitude, 84.05555);
    });

    it("7. Extracts coordinates from directions /dir/... format", () => {
      const url = "https://www.google.com/maps/dir/Gorakhpur/26.6854,84.0492/@26.7,84.1,12z";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates from directions path");
      assert.equal(coords.latitude, 26.6854);
      assert.equal(coords.longitude, 84.0492);
    });

    it("8. Validates latitude between -90 and 90, longitude between -180 and 180", () => {
      // Out of range latitude (95.0)
      const invalidLat = "https://maps.google.com/?q=95.0,84.0";
      assert.equal(extractCoordinatesFromMapsUrl(invalidLat), null);

      // Out of range longitude (195.0)
      const invalidLng = "https://maps.google.com/?q=26.6,195.0";
      assert.equal(extractCoordinatesFromMapsUrl(invalidLng), null);
    });

    it("9. Does not mistakenly treat zoom levels, place IDs or route codes as coordinates", () => {
      const urlWithPlaceId = "https://www.google.com/maps/place/Fazilnagar/data=!4m2!3m1!1s0x3993fd49b3d0473d:0x857790eb7707e8ec";
      const coords = extractCoordinatesFromMapsUrl(urlWithPlaceId);
      assert.equal(coords, null, "Should not parse hex place IDs as coordinates");
    });

    it("10. Rejects alternative unsupported map providers (OpenStreetMap, Bing, Mapbox) while accepting Apple Maps", () => {
      const osm = "https://www.openstreetmap.org/#map=16/26.6854/84.0492";
      const bing = "https://www.bing.com/maps?cp=26.6854~84.0492";
      const mapbox = "https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/26.6854,84.0492";
      const apple = "https://maps.apple.com/?ll=26.6854,84.0492";

      assert.equal(validateGoogleMapsUrl(osm).isValid, false);
      assert.ok(validateGoogleMapsUrl(osm).error.includes("Alternative map providers"));

      assert.equal(validateGoogleMapsUrl(bing).isValid, false);
      assert.ok(validateGoogleMapsUrl(bing).error.includes("Alternative map providers"));

      assert.equal(validateGoogleMapsUrl(mapbox).isValid, false);

      // Apple Maps is now supported!
      assert.equal(validateGoogleMapsUrl(apple).isValid, true);
      assert.equal(validateGoogleMapsUrl(apple).provider, "apple");
    });

    it("11. Validates authentic Google Maps URL format without coordinates", () => {
      const generalSearch = "https://www.google.com/maps/search/Fazilnagar+Hospital";
      const check = validateGoogleMapsUrl(generalSearch);
      assert.equal(check.isValid, true);
      assert.equal(check.coordinates, null);
    });
  });

  // -------------------------------------------------------------
  // Safe URL Rendering & SSRF Protection
  // -------------------------------------------------------------
  describe("Safe URL Rendering & SSRF Protection", () => {
    it("12. getSafeHttpsUrl validates HTTPS URLs and rejects dangerous schemes", () => {
      assert.equal(
        getSafeHttpsUrl("https://www.google.com/maps?q=26.6,84.0"),
        "https://www.google.com/maps?q=26.6,84.0"
      );
      assert.equal(
        getSafeHttpsUrl("http://www.google.com/maps?q=26.6,84.0"),
        "https://www.google.com/maps?q=26.6,84.0"
      );
      assert.equal(
        getSafeHttpsUrl("maps.app.goo.gl/abcdef"),
        "https://maps.app.goo.gl/abcdef"
      );
      assert.equal(getSafeHttpsUrl("javascript:alert(1)"), null);
      assert.equal(getSafeHttpsUrl("data:text/html,<script>alert(1)</script>"), null);
      assert.equal(getSafeHttpsUrl("file:///etc/passwd"), null);
      assert.equal(getSafeHttpsUrl("not a url"), null);
    });

    it("13. resolveGoogleMapsShortUrl rejects SSRF targeting private IP ranges", async () => {
      // Localhost / loopback
      const resLocal = await resolveGoogleMapsShortUrl("http://127.0.0.1/admin");
      assert.equal(resLocal, null);

      // Private subnet
      const resPrivate = await resolveGoogleMapsShortUrl("http://192.168.1.1/secret");
      assert.equal(resPrivate, null);

      // AWS metadata service
      const resMeta = await resolveGoogleMapsShortUrl("http://169.254.169.254/latest/meta-data");
      assert.equal(resMeta, null);

      // Non-Google domain
      const resAttacker = await resolveGoogleMapsShortUrl("https://evil-attacker.com/exploit");
      assert.equal(resAttacker, null);
    });
  });

  // -------------------------------------------------------------
  // End-to-End Dynamic Form Submission & Approval
  // -------------------------------------------------------------
  describe("End-to-End Dynamic Form Submission & Verification", () => {
    let createdSubmissionId;

    it("14. POST /api/forms/extract-coords extracts coordinates from provided Google Maps link", async () => {
      const res = await makeRequest({
        path: "/api/forms/extract-coords",
        method: "POST",
        body: { url: "https://www.google.com/maps?q=26.6854,84.0492" },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.coordinates.latitude, 26.6854);
      assert.equal(res.data.coordinates.longitude, 84.0492);
      assert.equal(res.data.safeUrl, "https://www.google.com/maps?q=26.6854,84.0492");
    });

    it("15. POST /api/forms/extract-coords returns coordinates: null and message for link without coordinates", async () => {
      const res = await makeRequest({
        path: "/api/forms/extract-coords",
        method: "POST",
        body: { url: "https://www.google.com/maps/search/Fazilnagar" },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.coordinates, null);
      assert.ok(res.data.message.includes("Coordinates unavailable"));
    });

    it("16. Submitting dynamic form saves original URL, extracts and stores latitude/longitude in MongoDB", async () => {
      const rawMapsUrl = "https://www.google.com/maps/place/Fazilnagar+Test/@26.6854,84.0492,15z";
      const submitPayload = {
        submissionType: "correction",
        targetEntityId: testPlace._id,
        submittedData: {
          googleMapsUrl: rawMapsUrl,
        },
        evidenceNotes: "Field survey verified GPS link",
        submitterName: "Ramesh Sharma",
        submitterContact: "9876543210",
      };

      const res = await makeRequest({
        path: `/api/forms/public/${testForm.slug}/submit`,
        method: "POST",
        body: submitPayload,
      });

      assert.equal(res.status, 201, `Failed to submit form: ${JSON.stringify(res.data)}`);
      assert.ok(res.data.submissionId);
      createdSubmissionId = res.data.submissionId;

      // Verify MongoDB document directly
      const savedDoc = await ContributionSubmission.findById(createdSubmissionId);
      assert.ok(savedDoc, "Submission must exist in MongoDB");
      assert.equal(savedDoc.googleMapsUrl, rawMapsUrl, "Original submitted URL must be preserved intact");
      assert.equal(savedDoc.latitude, 26.6854, "Extracted latitude must be saved in schema");
      assert.equal(savedDoc.longitude, 84.0492, "Extracted longitude must be saved in schema");
      assert.equal(savedDoc.proposedValues.latitude, 26.6854, "Latitude must be populated in proposedValues");
      assert.equal(savedDoc.proposedValues.longitude, 84.0492, "Longitude must be populated in proposedValues");
    });

    it("17. Admin retrieval returns saved coordinates, original link, and consistent comparison", async () => {
      const res = await makeRequest({
        path: `/api/contributions/${createdSubmissionId}`,
        method: "GET",
        token: adminToken,
      });

      assert.equal(res.status, 200);
      const sub = res.data.submission;
      assert.equal(sub.latitude, 26.6854);
      assert.equal(sub.longitude, 84.0492);
      assert.equal(sub.googleMapsUrl, "https://www.google.com/maps/place/Fazilnagar+Test/@26.6854,84.0492,15z");

      // Verify diffs include latitude and longitude
      const latDiff = res.data.diffs.find((d) => d.field === "latitude");
      const lngDiff = res.data.diffs.find((d) => d.field === "longitude");
      assert.ok(latDiff, "Diff for latitude must be present");
      assert.equal(latDiff.proposedValue, 26.6854);
      assert.ok(lngDiff, "Diff for longitude must be present");
      assert.equal(lngDiff.proposedValue, 84.0492);
    });

    it("18. Approving submission updates Place with coordinates extracted from Google Maps URL", async () => {
      const reviewPayload = {
        decision: "approve",
        approvedFields: ["latitude", "longitude", "googleMapsUrl"],
        reviewerComments: "Approved location with extracted coordinates",
      };

      const res = await makeRequest({
        path: `/api/contributions/${createdSubmissionId}/review`,
        method: "PATCH",
        token: adminToken,
        body: reviewPayload,
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.submission.status, "approved");

      // Check Place in DB
      const updatedPlace = await Place.findById(testPlace._id);
      assert.equal(updatedPlace.latitude, 26.6854);
      assert.equal(updatedPlace.longitude, 84.0492);
      assert.ok(updatedPlace.mapsUrl.includes("26.6854"));
      assert.ok(updatedPlace.mapsUrl.includes("84.0492"));
    });

    it("19. Safe approval: Existing coordinates on Place are NOT overwritten with null if submission lacks coordinates", async () => {
      // Submit a proposal with only a general Google Maps link (no coordinates)
      const generalLinkSubmission = await ContributionSubmission.create({
        formId: testForm._id,
        formSlug: testForm.slug,
        targetModule: "map",
        entityType: "healthcare",
        targetEntityId: testPlace._id,
        submissionType: "correction",
        proposedValues: {
          googleMapsUrl: "https://www.google.com/maps/search/Fazilnagar+General",
          latitude: null,
          longitude: null,
        },
        googleMapsUrl: "https://www.google.com/maps/search/Fazilnagar+General",
        latitude: null,
        longitude: null,
        status: "pending",
        referenceId: `REF-${Date.now()}-NOCORDS`,
        submitterInfo: { name: "Test No Coords" },
      });

      const res = await makeRequest({
        path: `/api/contributions/${generalLinkSubmission._id}/review`,
        method: "PATCH",
        token: adminToken,
        body: {
          decision: "approve",
          approvedFields: ["googleMapsUrl"],
          reviewerComments: "Approved general link only",
        },
      });

      assert.equal(res.status, 200);

      // Verify Place still retains its valid 26.6854, 84.0492 coordinates
      const placeAfter = await Place.findById(testPlace._id);
      assert.equal(placeAfter.latitude, 26.6854, "Existing valid latitude must not be overwritten by null");
      assert.equal(placeAfter.longitude, 84.0492, "Existing valid longitude must not be overwritten by null");
    });
  });

  // -------------------------------------------------------------
  // Apple Maps Unit & Integration Tests
  // -------------------------------------------------------------
  describe("Apple Maps Support Tests", () => {
    it("20. Extracts coordinates from Apple Maps ll parameter", () => {
      const url = "https://maps.apple.com/?ll=26.6,84.0";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates from Apple Maps ll");
      assert.equal(coords.latitude, 26.6);
      assert.equal(coords.longitude, 84.0);
    });

    it("21. Extracts coordinates from Apple Maps sll parameter", () => {
      const url = "https://maps.apple.com/?sll=26.6854,84.0492";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract coordinates from sll");
      assert.equal(coords.latitude, 26.6854);
      assert.equal(coords.longitude, 84.0492);
    });

    it("22. Extracts coordinates from Apple Maps daddr with numeric coordinates", () => {
      const url = "https://maps.apple.com/?daddr=26.6,84.0";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should extract numeric daddr coordinates");
      assert.equal(coords.latitude, 26.6);
      assert.equal(coords.longitude, 84.0);
    });

    it("23. Does NOT interpret daddr as coordinates when it contains an address or place name", () => {
      const url = "https://maps.apple.com/?daddr=Fazilnagar+Hospital";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.equal(coords, null, "Should not interpret text place name in daddr as coordinates");
    });

    it("24. Does NOT interpret q as coordinates when it contains a place name", () => {
      const url = "https://maps.apple.com/?q=Fazilnagar";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.equal(coords, null, "Should leave coordinates unavailable for place-name search");
    });

    it("25. Extracts coordinates from Apple Maps near parameter only when numeric", () => {
      const urlCoords = "https://maps.apple.com/?near=26.6854,84.0492";
      const coords = extractCoordinatesFromMapsUrl(urlCoords);
      assert.ok(coords, "Should extract numeric near coordinates");
      assert.equal(coords.latitude, 26.6854);

      const urlText = "https://maps.apple.com/?near=Fazilnagar";
      assert.equal(extractCoordinatesFromMapsUrl(urlText), null);
    });

    it("26. Extracts coordinates from Apple Maps with URL-encoded parameters", () => {
      const url = "https://maps.apple.com/?ll=26.6%2C84.0";
      const coords = extractCoordinatesFromMapsUrl(url);
      assert.ok(coords, "Should handle URL-encoded commas in Apple Maps links");
      assert.equal(coords.latitude, 26.6);
      assert.equal(coords.longitude, 84.0);
    });

    it("27. Validates and rejects out-of-range coordinates in Apple Maps", () => {
      const invalidLat = "https://maps.apple.com/?ll=95.0,84.0";
      assert.equal(extractCoordinatesFromMapsUrl(invalidLat), null);

      const invalidLng = "https://maps.apple.com/?ll=26.6,195.0";
      assert.equal(extractCoordinatesFromMapsUrl(invalidLng), null);
    });

    it("28. Validates Apple Maps link and identifies provider as 'apple'", () => {
      const checkCoords = validateGoogleMapsUrl("https://maps.apple.com/?ll=26.6,84.0");
      assert.equal(checkCoords.isValid, true);
      assert.equal(checkCoords.provider, "apple");
      assert.equal(checkCoords.coordinates.latitude, 26.6);

      const checkSearch = validateGoogleMapsUrl("https://maps.apple.com/?q=Fazilnagar");
      assert.equal(checkSearch.isValid, true);
      assert.equal(checkSearch.provider, "apple");
      assert.equal(checkSearch.coordinates, null);
    });

    it("29. getSafeHttpsUrl upgrades Apple Maps URL without protocol to HTTPS", () => {
      const safe = getSafeHttpsUrl("maps.apple.com/?ll=26.6,84.0");
      assert.equal(safe, "https://maps.apple.com/?ll=26.6,84.0");
    });

    it("30. POST /api/forms/extract-coords extracts coordinates from Apple Maps URL", async () => {
      const res = await makeRequest({
        path: "/api/forms/extract-coords",
        method: "POST",
        body: { url: "https://maps.apple.com/?ll=26.6854,84.0492" },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.provider, "apple");
      assert.equal(res.data.coordinates.latitude, 26.6854);
      assert.equal(res.data.coordinates.longitude, 84.0492);
      assert.equal(res.data.safeUrl, "https://maps.apple.com/?ll=26.6854,84.0492");
    });

    it("31. Submitting dynamic form with Apple Maps link saves URL and extracts coordinates to MongoDB", async () => {
      const appleMapsUrl = "https://maps.apple.com/?ll=26.6854,84.0492";
      const submitPayload = {
        submissionType: "correction",
        targetEntityId: testPlace._id,
        submittedData: {
          googleMapsUrl: appleMapsUrl,
        },
        evidenceNotes: "Survey verified with Apple Maps pin",
        submitterName: "Anand Verma",
        submitterContact: "9123456789",
      };

      const res = await makeRequest({
        path: `/api/forms/public/${testForm.slug}/submit`,
        method: "POST",
        body: submitPayload,
      });

      assert.equal(res.status, 201);
      const submissionId = res.data.submissionId;
      assert.ok(submissionId);

      const savedDoc = await ContributionSubmission.findById(submissionId);
      assert.ok(savedDoc);
      assert.equal(savedDoc.googleMapsUrl, appleMapsUrl, "Original Apple Maps URL must be preserved intact");
      assert.equal(savedDoc.latitude, 26.6854);
      assert.equal(savedDoc.longitude, 84.0492);
      assert.equal(savedDoc.proposedValues.latitude, 26.6854);
      assert.equal(savedDoc.proposedValues.longitude, 84.0492);
    });

    it("32. Submitting Apple Maps place search preserves URL without fake coordinates", async () => {
      const appleSearchUrl = "https://maps.apple.com/?q=Fazilnagar";
      const submitPayload = {
        submissionType: "correction",
        targetEntityId: testPlace._id,
        submittedData: {
          googleMapsUrl: appleSearchUrl,
        },
        evidenceNotes: "Place name search link",
        submitterName: "Pooja Singh",
      };

      const res = await makeRequest({
        path: `/api/forms/public/${testForm.slug}/submit`,
        method: "POST",
        body: submitPayload,
      });

      assert.equal(res.status, 201);
      const submissionId = res.data.submissionId;

      const savedDoc = await ContributionSubmission.findById(submissionId);
      assert.ok(savedDoc);
      assert.equal(savedDoc.googleMapsUrl, appleSearchUrl);
      assert.equal(savedDoc.latitude, null, "Must not fabricate coordinates for text search link");
      assert.equal(savedDoc.longitude, null);
    });
  });
});
