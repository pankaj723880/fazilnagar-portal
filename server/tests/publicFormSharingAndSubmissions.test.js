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

const TEST_PORT = 5089;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Public Form Sharing and Login-Free Submissions Test Suite", () => {
  let server;
  let adminUser;
  let adminToken;
  let testPublishedForm;
  let testDraftForm;
  let testDisabledForm;

  const makeRequest = ({ path, method = "GET", token, body = null, headers: customHeaders = {} }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json", ...customHeaders };
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

    // Clean up test data
    await User.deleteMany({ email: "share_test_admin@fazilnagar.in" });
    await ContributionForm.deleteMany({ slug: { $in: ["share-test-pub", "share-test-draft", "share-test-disabled"] } });
    await ContributionSubmission.deleteMany({ formSlug: { $in: ["share-test-pub", "share-test-draft", "share-test-disabled"] } });

    // Seed admin
    adminUser = await User.create({
      name: "Share Suite Admin",
      email: "share_test_admin@fazilnagar.in",
      password: "hashed_dummy_password",
      role: "admin",
      status: "active",
    });

    adminToken = jwt.sign(
      { id: adminUser._id, email: adminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Seed test forms
    testPublishedForm = await ContributionForm.create({
      title: "Public Community Market Directory Update",
      slug: "share-test-pub",
      description: "Submit verified details for market shops and businesses.",
      targetModule: "directory",
      entityType: "business",
      purpose: "both",
      status: "published",
      fields: [
        { name: "name", label: "Business Name", type: "text", required: true, order: 0 },
        { name: "phone", label: "Contact Phone", type: "text", required: false, order: 1 },
        { name: "googleMapsUrl", label: "Google Maps Location", type: "url", required: false, order: 2 },
      ],
      createdBy: adminUser._id,
    });

    testDraftForm = await ContributionForm.create({
      title: "Draft Village Data Collection",
      slug: "share-test-draft",
      targetModule: "map",
      entityType: "village",
      purpose: "new_entity",
      status: "draft",
      fields: [{ name: "name", label: "Village Name", type: "text", required: true, order: 0 }],
      createdBy: adminUser._id,
    });

    testDisabledForm = await ContributionForm.create({
      title: "Disabled Survey Form",
      slug: "share-test-disabled",
      targetModule: "directory",
      entityType: "service",
      purpose: "correction",
      status: "disabled",
      fields: [{ name: "name", label: "Service Name", type: "text", required: true, order: 0 }],
      createdBy: adminUser._id,
    });

    // Start Express app
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
    await User.deleteMany({ email: "share_test_admin@fazilnagar.in" });
    await ContributionForm.deleteMany({ slug: { $in: ["share-test-pub", "share-test-draft", "share-test-disabled"] } });
    await ContributionSubmission.deleteMany({ formSlug: { $in: ["share-test-pub", "share-test-draft", "share-test-disabled"] } });
    await mongoose.disconnect();
  });

  // =========================================================================
  // Test 1: Public Form Sharing & URL Access without login
  // =========================================================================
  describe("1. Public Form Sharing & URL Access", () => {
    it("Allows public visitors to fetch a published form without any auth header", async () => {
      const res = await makeRequest({
        path: "/api/forms/public/share-test-pub",
        method: "GET",
      });

      assert.equal(res.status, 200, "Published form must return HTTP 200 to public visitors");
      assert.equal(res.data.slug, "share-test-pub");
      assert.equal(res.data.title, "Public Community Market Directory Update");
      assert.equal(res.data.status, "published");
      assert.equal(res.data.createdBy, undefined, "Private admin fields must never be exposed to public");
    });

    it("Rejects public access to draft forms with HTTP 403", async () => {
      const res = await makeRequest({
        path: "/api/forms/public/share-test-draft",
        method: "GET",
      });

      assert.equal(res.status, 403, "Draft forms must return 403 forbidden to public");
      assert.match(res.data.message, /draft mode/i);
    });

    it("Rejects public access to disabled or closed forms with HTTP 410 Gone", async () => {
      const res = await makeRequest({
        path: "/api/forms/public/share-test-disabled",
        method: "GET",
      });

      assert.equal(res.status, 410, "Disabled forms must return 410 Gone");
      assert.match(res.data.message, /closed or disabled/i);
    });

    it("Returns 404 for nonexistent form slugs", async () => {
      const res = await makeRequest({
        path: "/api/forms/public/nonexistent-slug-xyz",
        method: "GET",
      });

      assert.equal(res.status, 404);
    });
  });

  // =========================================================================
  // Test 2: Login-Free Public Submissions & Abuse Protections
  // =========================================================================
  describe("2. Login-Free Public Submissions & Abuse Protections", () => {
    it("Allows unauthenticated public user to submit valid proposal and returns unique reference ID", async () => {
      const submissionBody = {
        submissionType: "new_entity",
        proposedValues: {
          name: "Fazilnagar Sweet House",
          phone: "9876543210",
          googleMapsUrl: "https://maps.app.goo.gl/abcdef123456",
        },
        submitterName: "Santosh Verma",
        submitterContact: "santosh@example.com",
        evidenceNotes: "Local sweet shop open near main square.",
      };

      const res = await makeRequest({
        path: "/api/forms/public/share-test-pub/submit",
        method: "POST",
        body: submissionBody,
      });

      assert.equal(res.status, 201, "Submission should return 201 Created");
      assert.ok(res.data.referenceId, "Should return reference ID");
      assert.match(res.data.referenceId, /^FZ-CONTRIB-[A-Z0-9]+$/, "Reference ID format must match FZ-CONTRIB-XXXXXX");

      // Verify recorded in database with status pending
      const saved = await ContributionSubmission.findOne({ referenceId: res.data.referenceId });
      assert.ok(saved);
      assert.equal(saved.status, "pending");
      assert.equal(saved.submitterInfo.name, "Santosh Verma");
    });

    it("Rejects public submissions when form is disabled or draft", async () => {
      const res = await makeRequest({
        path: "/api/forms/public/share-test-disabled/submit",
        method: "POST",
        body: {
          proposedValues: { name: "Disabled submission test" },
        },
      });

      assert.equal(res.status, 403, "Submitting to disabled form must return 403");
      assert.match(res.data.message, /not currently open/i);
    });

    it("Rejects submission missing required fields configured on the form", async () => {
      const res = await makeRequest({
        path: "/api/forms/public/share-test-pub/submit",
        method: "POST",
        body: {
          proposedValues: { phone: "9876543210" }, // missing required 'name'
        },
      });

      assert.equal(res.status, 400);
      assert.ok(res.data.errors?.name, "Should return field-specific error for missing required name");
    });

    it("Detects rapid duplicate submissions within 10 minutes and flags duplicate warning", async () => {
      const duplicateBody = {
        submissionType: "new_entity",
        proposedValues: {
          name: "Fazilnagar Sweet House", // Identical name submitted again
          phone: "9876543210",
        },
        submitterName: "Santosh Verma",
        submitterContact: "santosh@example.com",
      };

      const res = await makeRequest({
        path: "/api/forms/public/share-test-pub/submit",
        method: "POST",
        body: duplicateBody,
      });

      assert.equal(res.status, 201);
      const duplicateRecord = await ContributionSubmission.findOne({ referenceId: res.data.referenceId });
      assert.ok(duplicateRecord);
      assert.ok(duplicateRecord.duplicateWarnings.length > 0, "Rapid identical submission must have duplicateWarnings populated");
      const hasRecentWarning = duplicateRecord.duplicateWarnings.some((w) =>
        /duplicate submission detected/i.test(w.similarity)
      );
      assert.ok(hasRecentWarning, "Must contain duplicate submission detected warning in duplicateWarnings");
    });
  });

  // =========================================================================
  // Test 3: Admin-Only Permissions & Live Entity Protection
  // =========================================================================
  describe("3. Admin-Only Form Management & Live Entity Protection", () => {
    it("Rejects unauthorized users attempting to create or edit forms", async () => {
      const res = await makeRequest({
        path: "/api/forms",
        method: "POST",
        body: {
          title: "Hacked Form",
          targetModule: "map",
          entityType: "village",
          fields: [],
        },
      });

      assert.equal(res.status, 401, "Unauthenticated user cannot create forms");
    });

    it("Rejects unauthenticated access to the admin contribution review desk", async () => {
      const res = await makeRequest({
        path: "/api/contributions",
        method: "GET",
      });

      assert.equal(res.status, 401, "Unauthenticated user cannot view review desk submissions");
    });

    it("Authorized admin can toggle form status between published and disabled", async () => {
      const res = await makeRequest({
        path: `/api/forms/${testDraftForm._id}`,
        method: "PUT",
        token: adminToken,
        body: {
          status: "published",
        },
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.form.status, "published");

      // Verify public can now fetch it
      const publicRes = await makeRequest({
        path: `/api/forms/public/${testDraftForm.slug}`,
        method: "GET",
      });
      assert.equal(publicRes.status, 200);
    });
  });
});
