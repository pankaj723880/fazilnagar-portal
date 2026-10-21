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

import formsRoutes from "../routes/forms.js";
import contributionRoutes from "../routes/contributionSubmissions.js";
import User from "../models/User.js";
import Place from "../models/Place.js";
import ContributionForm from "../models/ContributionForm.js";
import ContributionSubmission from "../models/ContributionSubmission.js";
import AuditLog from "../models/AuditLog.js";
import regionalLocations from "../../client/src/data/regionalLocations.js";
import { validateGoogleMapsUrl, extractCoordinatesFromMapsUrl, calculateDistanceKm } from "../utils/googleMapsValidator.js";

const TEST_PORT = 5088;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Dynamic Form Builder & Public Contribution Approval System", () => {
  let server;
  let adminUser;
  let citizenUser;
  let adminToken;
  let citizenToken;
  let testTargetPlace;

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
            resolve({ status: res.statusCode, data: parsed });
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

    // Clean up test collections
    await User.deleteMany({ email: { $in: ["admin_form_test@fazilnagar.in", "citizen_form_test@fazilnagar.in"] } });
    await ContributionForm.deleteMany({ $or: [{ slug: { $in: ["test-map-correction", "test-dir-correction", "test-new-entity"] } }, { slug: /^test-category-/ }] });
    await ContributionSubmission.deleteMany({ evidenceNotes: /Test Suite/ });
    await Place.deleteMany({ slug: { $in: ["test-target-establishment", "test-new-village-proposal", "test-landmark-proposal"] } });

    // Seed test users
    adminUser = await User.create({
      name: "Form Test Admin",
      email: "admin_form_test@fazilnagar.in",
      password: "hashed_dummy_password",
      role: "admin",
      status: "active",
    });

    citizenUser = await User.create({
      name: "Form Test Citizen",
      email: "citizen_form_test@fazilnagar.in",
      password: "hashed_dummy_password",
      role: "user",
      status: "active",
    });

    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    citizenToken = jwt.sign(
      { id: citizenUser._id, email: citizenUser.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Seed test place
    testTargetPlace = await Place.create({
      id: "test-target-est-01",
      slug: "test-target-establishment",
      name: "Fazilnagar Community Hospital Original",
      category: "Hospitals & Clinics",
      entityType: "place",
      description: "Original description before proposal",
      latitude: 26.6810,
      longitude: 84.0470,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.6810,84.0470",
      phone: "05564-242000",
      verificationStatus: "verified",
      isPublished: true,
      isArchived: false,
    });

    // Setup express app
    const app = express();
    app.use(express.json());
    app.use("/api/forms", formsRoutes);
    app.use("/api/contributions", contributionRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, "127.0.0.1", () => resolve());
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up
    await User.deleteMany({ email: { $in: ["admin_form_test@fazilnagar.in", "citizen_form_test@fazilnagar.in"] } });
    await ContributionForm.deleteMany({ $or: [{ slug: { $in: ["test-map-correction", "test-dir-correction", "test-new-entity"] } }, { slug: /^test-category-/ }] });
    await ContributionSubmission.deleteMany({ evidenceNotes: /Test Suite/ });
    await Place.deleteMany({ slug: { $in: ["test-target-establishment", "test-new-village-proposal", "test-landmark-proposal"] } });
    await mongoose.disconnect();
  });

  // =========================================================================
  // Section 1: Lavkush Purab Patti Coordinate Integrity Audit
  // =========================================================================
  describe("1. Lavkush Purab Patti Coordinate Integrity Audit", () => {
    it("Lavkush Purab Patti has verified coordinates 26.7095, 84.0507 and does not match Karmaini", () => {
      const lavkush = regionalLocations.find(
        (l) => l.id === "loc-34-lavkush-purab" || l.name?.toLowerCase().includes("lavkush")
      );
      assert.ok(lavkush, "Lavkush Purab Patti must exist in regional locations dataset");
      assert.equal(lavkush.latitude, 26.7095, "Lavkush latitude must match Census 2011 coordinates 26.7095");
      assert.equal(lavkush.longitude, 84.0507, "Lavkush longitude must match Census 2011 coordinates 84.0507");

      // Verify Lavkush does not have Karmaini's coordinates (26.711, 84.079)
      assert.notEqual(lavkush.latitude, 26.7110, "Lavkush latitude must NOT equal Karmaini latitude 26.7110");
      assert.notEqual(lavkush.longitude, 84.0790, "Lavkush longitude must NOT equal Karmaini longitude 84.0790");
    });
  });

  // =========================================================================
  // Section 2: Google Maps Validation & Conflict Flagging
  // =========================================================================
  describe("2. Google Maps URL Validation & Coordinate Analysis", () => {
    it("Validates official Google Maps links and extracts coordinates", () => {
      const url = "https://www.google.com/maps?q=26.6850,84.0490";
      const validation = validateGoogleMapsUrl(url);
      assert.equal(validation.isValid, true, "Standard Google Maps URL must be valid");

      const extracted = extractCoordinatesFromMapsUrl(url);
      assert.ok(extracted, "Should extract coordinates from query param");
      assert.equal(extracted.lat, 26.685);
      assert.equal(extracted.lng, 84.049);
    });

    it("Rejects non-Google Maps URLs like OpenStreetMap and Bing Maps", () => {
      const osm = validateGoogleMapsUrl("https://www.openstreetmap.org/#map=16/26.68/84.04");
      assert.equal(osm.isValid, false, "OpenStreetMap links must be rejected");

      const bing = validateGoogleMapsUrl("https://www.bing.com/maps?cp=26.68~84.04");
      assert.equal(bing.isValid, false, "Bing Maps links must be rejected");
    });

    it("Flags coordinate discrepancies between submitted numbers and Google Maps link pin", () => {
      // 26.6850 vs 26.7500 is ~7.2 km apart (> 0.5 km threshold)
      const dist = calculateDistanceKm(26.6850, 84.0490, 26.7500, 84.0490);
      assert.ok(dist > 0.5, "Distance should exceed 0.5km discrepancy threshold");
    });
  });

  // =========================================================================
  // Section 3: Admin Dynamic Form Builder API
  // =========================================================================
  describe("3. Admin Dynamic Form Builder Operations", () => {
    it("Rejects unauthorized users from creating or modifying forms", async () => {
      const resUnauth = await makeRequest({
        path: "/api/forms",
        method: "POST",
        body: { title: "Unauth Form" },
      });
      assert.equal(resUnauth.status, 401, "Unauthenticated request must return 401");

      const resCitizen = await makeRequest({
        path: "/api/forms",
        method: "POST",
        token: citizenToken,
        body: { title: "Citizen Form" },
      });
      assert.equal(resCitizen.status, 403, "Citizen request must return 403 Forbidden");
    });

    it("Allows authorized admin to create a Map correction form with custom fields", async () => {
      const formPayload = {
        title: "Test Map Village Correction Form",
        slug: "test-map-correction",
        description: "Official form for correcting village coordinates in Fazilnagar block.",
        instructions: "Please enter accurate village coordinates verified via Google Maps.",
        targetModule: "map",
        entityType: "village",
        purpose: "correction",
        targetEntityId: "test-target-est-01",
        fields: [
          {
            name: "name",
            label: "Village Name",
            type: "text",
            required: true,
            isEditableInCorrection: true,
            order: 1,
          },
          {
            name: "latitude",
            label: "Latitude",
            type: "latitude",
            required: true,
            isEditableInCorrection: true,
            order: 2,
          },
          {
            name: "longitude",
            label: "Longitude",
            type: "longitude",
            required: true,
            isEditableInCorrection: true,
            order: 3,
          },
          {
            name: "googleMapsUrl",
            label: "Google Maps Pin Link",
            type: "googleMapsUrl",
            required: true,
            isEditableInCorrection: true,
            order: 4,
          },
        ],
        status: "published",
      };

      const res = await makeRequest({
        path: "/api/forms",
        method: "POST",
        token: adminToken,
        body: formPayload,
      });

      assert.equal(res.status, 201, "Admin form creation should return 201 Created");
      assert.equal(res.data.form.slug, "test-map-correction");
      assert.equal(res.data.form.fields.length, 4);
      assert.equal(res.data.form.fields[1].type, "latitude");
      assert.equal(res.data.form.fields[2].type, "longitude");
      assert.equal(res.data.form.fields[3].type, "googleMapsUrl");
    });

    it("Allows authorized admin to create a Directory form with contact fields", async () => {
      const dirPayload = {
        title: "Test Directory Business Form",
        slug: "test-dir-correction",
        description: "Form for updating shop contact details and opening hours.",
        targetModule: "directory",
        entityType: "business",
        purpose: "both",
        fields: [
          {
            name: "name",
            label: "Business Name",
            type: "text",
            required: true,
            isEditableInCorrection: true,
            order: 1,
          },
          {
            name: "phone",
            label: "Contact Phone",
            type: "phone",
            required: true,
            isEditableInCorrection: true,
            order: 2,
          },
          {
            name: "openingHours",
            label: "Opening Hours",
            type: "text",
            required: false,
            isEditableInCorrection: true,
            order: 3,
          },
        ],
        status: "published",
      };

      const res = await makeRequest({
        path: "/api/forms",
        method: "POST",
        token: adminToken,
        body: dirPayload,
      });

      assert.equal(res.status, 201);
      assert.equal(res.data.form.slug, "test-dir-correction");
    });
  });

  // =========================================================================
  // Section 4: Public Shareable Form & Submissions
  // =========================================================================
  describe("4. Public Form Access & Submission Workflow", () => {
    it("Public visitor can fetch published form by slug without credentials", async () => {
      const res = await makeRequest({
        path: "/api/forms/public/test-map-correction",
        method: "GET",
      });

      assert.equal(res.status, 200, "Public form endpoint should return 200");
      assert.equal(res.data.title, "Test Map Village Correction Form");
      assert.equal(res.data.fields.length, 4);
      // Ensure private admin data is never exposed
      assert.equal(res.data.createdBy, undefined, "CreatedBy must not be exposed to public");
    });

    it("Public visitor submits a proposal: saves as pending, live record remains untouched", async () => {
      const submissionPayload = {
        proposedValues: {
          name: "Fazilnagar Community Hospital Updated Name",
          latitude: 26.6835,
          longitude: 84.0485,
          googleMapsUrl: "https://www.google.com/maps?q=26.6835,84.0485",
        },
        submitterName: "Ramesh Sharma",
        evidenceNotes: "Test Suite: Updated GPS coordinates taken at the main gate.",
      };

      const res = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: submissionPayload,
      });

      assert.equal(res.status, 201, "Submission should be created with 201");
      assert.ok(res.data.referenceId, "Should return reference ID like FZ-CONTRIB-XXXXXX");
      assert.equal(res.data.status, "pending");

      // Verify that live Place database record was NOT modified
      const currentPlace = await Place.findOne({ slug: "test-target-establishment" });
      assert.equal(
        currentPlace.name,
        "Fazilnagar Community Hospital Original",
        "Live database name must remain untouched before approval"
      );
      assert.equal(currentPlace.latitude, 26.6810, "Live database latitude must remain untouched before approval");
      assert.equal(currentPlace.longitude, 84.0470, "Live database longitude must remain untouched before approval");
    });

    it("Rejects public submission with malformed Google Maps URL or invalid coordinates", async () => {
      const badPayload = {
        proposedValues: {
          name: "Bad Location",
          latitude: 999.0, // Invalid latitude
          longitude: 84.0485,
          googleMapsUrl: "https://notgoogle.com/maps", // Invalid domain
        },
        evidenceNotes: "Test Suite: Bad data test",
      };

      const res = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: badPayload,
      });

      assert.equal(res.status, 400, "Invalid coordinates and URLs must be rejected with 400");
    });

    it("Strictly validates Latitude bounds: rejects latitude > 90 and latitude < -90", async () => {
      // Test latitude > 90
      const resHigh = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: {
          proposedValues: {
            name: "Out of Bounds High",
            latitude: 91.5,
            longitude: 84.0485,
            googleMapsUrl: "https://www.google.com/maps?q=26.6835,84.0485",
          },
          evidenceNotes: "Test Suite: Bounds test",
        },
      });
      assert.equal(resHigh.status, 400);
      assert.ok(resHigh.data.errors?.latitude?.includes("between -90 and 90"));

      // Test latitude < -90
      const resLow = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: {
          proposedValues: {
            name: "Out of Bounds Low",
            latitude: -95.0,
            longitude: 84.0485,
            googleMapsUrl: "https://www.google.com/maps?q=26.6835,84.0485",
          },
          evidenceNotes: "Test Suite: Bounds test",
        },
      });
      assert.equal(resLow.status, 400);
      assert.ok(resLow.data.errors?.latitude?.includes("between -90 and 90"));
    });

    it("Strictly validates Longitude bounds: rejects longitude > 180 and longitude < -180", async () => {
      // Test longitude > 180
      const resHigh = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: {
          proposedValues: {
            name: "Out of Bounds Longitude High",
            latitude: 26.6835,
            longitude: 185.2,
            googleMapsUrl: "https://www.google.com/maps?q=26.6835,84.0485",
          },
          evidenceNotes: "Test Suite: Bounds test",
        },
      });
      assert.equal(resHigh.status, 400);
      assert.ok(resHigh.data.errors?.longitude?.includes("between -180 and 180"));

      // Test longitude < -180
      const resLow = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: {
          proposedValues: {
            name: "Out of Bounds Longitude Low",
            latitude: 26.6835,
            longitude: -182.0,
            googleMapsUrl: "https://www.google.com/maps?q=26.6835,84.0485",
          },
          evidenceNotes: "Test Suite: Bounds test",
        },
      });
      assert.equal(resLow.status, 400);
      assert.ok(resLow.data.errors?.longitude?.includes("between -180 and 180"));
    });

    it("Rejects non-Google Maps location sources (e.g. OpenStreetMap, Bing, Apple Maps)", async () => {
      const resOsm = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: {
          proposedValues: {
            name: "OSM Location Link",
            latitude: 26.6835,
            longitude: 84.0485,
            googleMapsUrl: "https://www.openstreetmap.org/#map=16/26.68/84.04",
          },
          evidenceNotes: "Test Suite: Non-Google Maps",
        },
      });
      assert.equal(resOsm.status, 400);
      assert.ok(resOsm.data.errors?.googleMapsUrl?.includes("Only Google Maps"));

      const resBing = await makeRequest({
        path: "/api/forms/public/test-map-correction/submit",
        method: "POST",
        body: {
          proposedValues: {
            name: "Bing Location Link",
            latitude: 26.6835,
            longitude: 84.0485,
            googleMapsUrl: "https://www.bing.com/maps?cp=26.68~84.04",
          },
          evidenceNotes: "Test Suite: Non-Google Maps",
        },
      });
      assert.equal(resBing.status, 400);
      assert.ok(resBing.data.errors?.googleMapsUrl?.includes("Only Google Maps"));
    });

    it("Allows admin to edit, reorder, and remove fields via PUT /api/forms/:id", async () => {
      const formDoc = await ContributionForm.findOne({ slug: "test-map-correction" });
      assert.ok(formDoc, "Form must exist");

      // Reorder fields: Put googleMapsUrl first, latitude second, longitude third, name fourth
      const reorderedFields = [
        { ...formDoc.fields[3].toObject(), order: 0 },
        { ...formDoc.fields[1].toObject(), order: 1 },
        { ...formDoc.fields[2].toObject(), order: 2 },
        { ...formDoc.fields[0].toObject(), order: 3 },
      ];

      const resUpdate = await makeRequest({
        path: `/api/forms/${formDoc._id}`,
        method: "PUT",
        token: adminToken,
        body: {
          ...formDoc.toObject(),
          title: "Reordered Map Village Correction Form",
          fields: reorderedFields,
        },
      });

      assert.equal(resUpdate.status, 200, "Updating form should return 200");
      assert.equal(resUpdate.data.form.fields[0].name, "googleMapsUrl");
      assert.equal(resUpdate.data.form.fields[1].name, "latitude");
      assert.equal(resUpdate.data.form.fields[2].name, "longitude");
    });
  });

  // =========================================================================
  // Section 5: Admin Review Desk & Partial Field Approval
  // =========================================================================
  describe("5. Admin Review & Partial Field-Level Approval", () => {
    let pendingSubmission;

    before(async () => {
      pendingSubmission = await ContributionSubmission.findOne({ evidenceNotes: /Test Suite: Updated GPS coordinates/, status: "pending" });
      if (!pendingSubmission) {
        pendingSubmission = await ContributionSubmission.findOne({ evidenceNotes: /Test Suite: Updated GPS coordinates/ });
        if (pendingSubmission) {
          pendingSubmission.status = "pending";
          pendingSubmission.approvedFields = [];
          pendingSubmission.rejectedFields = [];
          await pendingSubmission.save();
        }
      }
    });

    it("Admin can fetch pending submissions list and single submission detail with diff", async () => {
      const resList = await makeRequest({
        path: "/api/contributions?status=pending",
        method: "GET",
        token: adminToken,
      });

      assert.equal(resList.status, 200);
      assert.ok(Array.isArray(resList.data.submissions), "Should return array of submissions");
      assert.ok(resList.data.submissions.length >= 1);

      const resDetail = await makeRequest({
        path: `/api/contributions/${pendingSubmission._id}`,
        method: "GET",
        token: adminToken,
      });

      assert.equal(resDetail.status, 200);
      assert.ok(resDetail.data.diffs, "Detail must provide side-by-side diffs");
      assert.ok(resDetail.data.submission.locationComparison, "Must include location analysis");
    });

    it("Admin selectively approves ONLY coordinates while rejecting name change", async () => {
      const reviewPayload = {
        decision: "approve",
        approvedFields: ["latitude", "longitude", "googleMapsUrl"], // Name change is intentionally omitted!
        reviewerComments: "Approved valid GPS coordinates from field survey. Kept official institutional name.",
      };

      const res = await makeRequest({
        path: `/api/contributions/${pendingSubmission._id}/review`,
        method: "PATCH",
        token: adminToken,
        body: reviewPayload,
      });

      try {
        assert.equal(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(res.data)}`);
        assert.equal(res.data.submission.status, "approved");
        assert.deepEqual(res.data.submission.approvedFields, ["latitude", "longitude", "googleMapsUrl"]);
        assert.ok(res.data.submission.rejectedFields.includes("name"), "Unapproved field 'name' must be marked rejected");

        // Verify the live Place in the database
        const updatedPlace = await Place.findOne({ slug: "test-target-establishment" });
        assert.equal(
          updatedPlace.name,
          "Fazilnagar Community Hospital Original",
          "Unapproved name must NOT have changed in live record"
        );
        assert.equal(updatedPlace.latitude, 26.6835, "Approved latitude must update live record");
        assert.equal(updatedPlace.longitude, 84.0485, "Approved longitude must update live record");
        assert.ok(updatedPlace.mapsUrl.includes("26.6835"), "Approved coordinates must update live Google Maps search URL");
        assert.ok(updatedPlace.mapsUrl.includes("84.0485"), "Approved coordinates must update live Google Maps search URL");
        assert.ok(typeof updatedPlace.calculatedDistanceKm === "number", "Calculated distance from Fazilnagar centre must be computed");

        // Verify AuditLog entry was created
        const audit = await AuditLog.findOne({ changesSummary: new RegExp(pendingSubmission.referenceId) });
        assert.ok(audit, "Audit log record must be created on approval");
        assert.equal(audit.adminEmail, "admin_form_test@fazilnagar.in");
      } catch (e) {
        console.error("DIAGNOSTIC TEST 22 ERROR:", e.message, e.stack);
        throw e;
      }
    });

    it("Prevents duplicate or stale re-approval of an already approved submission", async () => {
      const duplicateRes = await makeRequest({
        path: `/api/contributions/${pendingSubmission._id}/review`,
        method: "PATCH",
        token: adminToken,
        body: {
          decision: "approve",
          approvedFields: ["latitude"],
        },
      });

      assert.equal(duplicateRes.status, 400, "Re-approving an already processed submission must return 400");
    });
  });

  // =========================================================================
  // Section 6: Dynamic Entity Type / Category Dropdown & Scope Verification
  // =========================================================================
  describe("6. Dynamic Entity Type / Category Dropdown & Scope Verification", () => {
    const supportedCategories = ["village", "locality", "town", "city", "landmark", "hub", "place"];

    it("Admin can create dynamic forms for all 7 supported map categories", async () => {
      for (const cat of supportedCategories) {
        const payload = {
          title: `Test Form for ${cat}`,
          slug: `test-category-${cat}`,
          description: `Form collecting information for ${cat}`,
          instructions: `Please enter accurate details for ${cat}.`,
          targetModule: "map",
          entityType: cat,
          purpose: "both",
          fields: [
            {
              name: "name",
              label: `${cat.toUpperCase()} Name`,
              type: "text",
              required: true,
              order: 0,
            },
            {
              name: "latitude",
              label: "Latitude",
              type: "latitude",
              required: true,
              order: 1,
            },
            {
              name: "longitude",
              label: "Longitude",
              type: "longitude",
              required: true,
              order: 2,
            },
          ],
          status: "published",
        };

        const res = await makeRequest({
          path: "/api/forms",
          method: "POST",
          token: adminToken,
          body: payload,
        });

        assert.equal(res.status, 201, `Failed to create form for category '${cat}': ${JSON.stringify(res.data)}`);
        assert.equal(res.data.form.entityType, cat, `Form entityType should be '${cat}'`);
        assert.equal(res.data.form.targetModule, "map");
        assert.equal(res.data.form.purpose, "both");
      }
    });

    it("Rejects form creation with unsupported entityType/category", async () => {
      const payload = {
        title: "Invalid Category Form",
        slug: "test-category-invalid",
        targetModule: "map",
        entityType: "unsupported_universe",
        fields: [{ name: "name", label: "Name", type: "text", required: true, order: 0 }],
      };

      const res = await makeRequest({
        path: "/api/forms",
        method: "POST",
        token: adminToken,
        body: payload,
      });

      assert.equal(res.status, 400, "Should return 400 for unsupported entityType");
      assert.ok(res.data.message.includes("Invalid entityType"), "Should mention invalid entityType");
    });

    it("Admin can update form category to another supported category", async () => {
      const form = await ContributionForm.findOne({ slug: "test-category-hub" });
      assert.ok(form, "test-category-hub form should exist");

      const updateRes = await makeRequest({
        path: `/api/forms/${form._id}`,
        method: "PUT",
        token: adminToken,
        body: {
          title: "Updated Form Title for Landmark",
          entityType: "landmark",
          purpose: "correction",
          fields: form.fields,
        },
      });

      assert.equal(updateRes.status, 200, `Update should succeed: ${JSON.stringify(updateRes.data)}`);
      assert.equal(updateRes.data.form.entityType, "landmark");
      assert.equal(updateRes.data.form.purpose, "correction");
      assert.equal(updateRes.data.form.targetModule, "map");
    });

    it("Rejects form update with unsupported entityType", async () => {
      const form = await ContributionForm.findOne({ slug: "test-category-town" });
      assert.ok(form, "test-category-town form should exist");

      const updateRes = await makeRequest({
        path: `/api/forms/${form._id}`,
        method: "PUT",
        token: adminToken,
        body: {
          entityType: "invalid_category_xyz",
        },
      });

      assert.equal(updateRes.status, 400, "Update with invalid entityType should return 400");
    });

    it("GET /api/forms/entities/map filters records strictly by entityType", async () => {
      // 1. Query for landmarks
      const landmarkRes = await makeRequest({
        path: "/api/forms/entities/map?entityType=landmark",
        method: "GET",
        token: adminToken,
      });

      assert.equal(landmarkRes.status, 200);
      assert.ok(Array.isArray(landmarkRes.data));
      for (const ent of landmarkRes.data) {
        const entType = (ent.entityType || ent.category || "").toLowerCase();
        assert.equal(entType, "landmark", `Entity ${ent.name} must be a landmark`);
      }

      // 2. Query for villages
      const villageRes = await makeRequest({
        path: "/api/forms/entities/map?entityType=village",
        method: "GET",
        token: adminToken,
      });

      assert.equal(villageRes.status, 200);
      assert.ok(Array.isArray(villageRes.data));
      for (const ent of villageRes.data) {
        const entType = (ent.entityType || ent.category || "").toLowerCase();
        assert.equal(entType, "village", `Entity ${ent.name} must be a village`);
      }
    });

    it("Submitting and approving a new entity preserves the form's category in the created Place", async () => {
      const form = await ContributionForm.findOne({ slug: "test-category-landmark" });
      assert.ok(form, "test-category-landmark form should exist");

      const submissionPayload = {
        submissionType: "new_entity",
        submittedData: {
          name: "Test Historic Pawa Stupa",
          latitude: 26.6850,
          longitude: 84.0490,
          googleMapsUrl: "https://www.google.com/maps?q=26.6850,84.0490",
        },
        evidenceNotes: "Test Suite landmark submission verification",
        submitterName: "Heritage Volunteer",
      };

      const submitRes = await makeRequest({
        path: `/api/forms/public/${form.slug}/submit`,
        method: "POST",
        body: submissionPayload,
      });

      assert.equal(submitRes.status, 201, `Submission failed: ${JSON.stringify(submitRes.data)}`);
      assert.ok(submitRes.data.submissionId);

      // Verify the pending submission has entityType: landmark
      const sub = await ContributionSubmission.findById(submitRes.data.submissionId);
      assert.ok(sub);
      assert.equal(sub.entityType, "landmark");

      // Approve the submission
      const reviewRes = await makeRequest({
        path: `/api/contributions/${sub._id}/review`,
        method: "PATCH",
        token: adminToken,
        body: {
          decision: "approve",
          approvedFields: ["name", "latitude", "longitude", "googleMapsUrl"],
          reviewerComments: "Approved as verified historic landmark",
        },
      });

      assert.equal(reviewRes.status, 200);

      // Verify the newly created Place record has entityType: landmark
      const createdPlace = await Place.findOne({ name: "Test Historic Pawa Stupa" });
      assert.ok(createdPlace, "Place record must be created for approved new entity");
      assert.equal(createdPlace.entityType, "landmark", "Created place must inherit form entityType: landmark");
      assert.equal(createdPlace.latitude, 26.6850);
      assert.equal(createdPlace.longitude, 84.0490);
    });
  });
});
