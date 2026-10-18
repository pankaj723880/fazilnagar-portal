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

import placesRoutes from "../routes/places.js";
import contributionRoutes from "../routes/contributionSubmissions.js";
import submissionRoutes from "../routes/submissions.js";
import formsRoutes from "../routes/forms.js";

import User from "../models/User.js";
import Place from "../models/Place.js";
import Submission from "../models/Submission.js";
import ContributionForm from "../models/ContributionForm.js";
import ContributionSubmission from "../models/ContributionSubmission.js";

const TEST_PORT = 5092;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Admin Approval and Public Publishing Synchronization Test Suite", () => {
  let server;
  let adminUser;
  let citizenUser;
  let adminToken;
  let citizenToken;
  let testForm;

  const makeRequest = ({ path: reqPath, method = "GET", token, body = null }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path: encodeURI(reqPath),
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
    await User.deleteMany({ email: { $in: ["admin_sync_test@fazilnagar.in", "citizen_sync_test@fazilnagar.in"] } });
    await Place.deleteMany({
      $or: [
        { slug: /^sync-test-/ },
        { id: /^p-sync-test-/ },
        { name: /^Sync Test / }
      ]
    });
    await Submission.deleteMany({ title: /^Sync Test / });
    await ContributionSubmission.deleteMany({ evidenceNotes: /Sync Test/ });
    await ContributionForm.deleteMany({ slug: /^sync-test-/ });

    // Seed test users
    adminUser = await User.create({
      name: "Sync Test Admin",
      email: "admin_sync_test@fazilnagar.in",
      password: "hashed_dummy_password",
      role: "admin",
      status: "active",
    });

    citizenUser = await User.create({
      name: "Sync Test Citizen",
      email: "citizen_sync_test@fazilnagar.in",
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

    testForm = await ContributionForm.create({
      title: "Sync Test Directory Form",
      slug: "sync-test-directory-form",
      targetModule: "directory",
      entityType: "place",
      purpose: "both",
      status: "published",
      isActive: true,
      fields: [
        { name: "name", label: "Place Name", type: "text", required: true },
        { name: "category", label: "Category", type: "text", required: true },
        { name: "latitude", label: "Latitude", type: "latitude" },
        { name: "longitude", label: "Longitude", type: "longitude" },
        { name: "phone", label: "Phone", type: "phone" },
      ],
      createdBy: adminUser._id,
    });

    // Setup Express test app
    const app = express();
    app.use(express.json());
    app.use("/api/places", placesRoutes);
    app.use("/api/contributions", contributionRoutes);
    app.use("/api/submissions", submissionRoutes);
    app.use("/api/forms", formsRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, "127.0.0.1", () => resolve());
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: { $in: ["admin_sync_test@fazilnagar.in", "citizen_sync_test@fazilnagar.in"] } });
    await Place.deleteMany({
      $or: [
        { slug: /^sync-test-/ },
        { id: /^p-sync-test-/ },
        { name: /^Sync Test / }
      ]
    });
    await Submission.deleteMany({ title: /^Sync Test / });
    await ContributionSubmission.deleteMany({ evidenceNotes: /Sync Test/ });
    await ContributionForm.deleteMany({ slug: /^sync-test-/ });
    await mongoose.disconnect();
  });

  // =========================================================================
  // Case 1: Approve a new Map location -> appears on the public map
  // =========================================================================
  it("1. Approve a new Map location -> appears immediately on public map-entities", async () => {
    // Create a new place submission via Community Submissions
    const sub = await Submission.create({
      userId: citizenUser._id,
      type: "community_place",
      title: "Sync Test New Village",
      description: "A newly proposed village near Fazilnagar",
      category: "Villages",
      status: "pending",
      latitude: 26.6950,
      longitude: 84.0620,
      placeDetails: {
        name: "Sync Test New Village",
        type: "village",
        category: "Villages",
        latitude: 26.6950,
        longitude: 84.0620,
        phone: "05564-999888",
        block: "Fazilnagar",
      },
    });

    // Admin approves the submission
    const approveRes = await makeRequest({
      path: `/api/submissions/places/admin/${sub._id}/review`,
      method: "PATCH",
      token: adminToken,
      body: {
        action: "approve",
        reviewerNotes: "Approved for public regional map",
      },
    });

    assert.equal(approveRes.status, 200, "Approval should return HTTP 200");
    assert.equal(approveRes.data.success, true);
    assert.ok(approveRes.data.place, "Approved place must be returned in response");
    assert.equal(approveRes.data.place.isPublished, true);
    assert.equal(approveRes.data.place.townBoundaryStatus, "confirmed");

    // Check public map entities endpoint immediately
    const mapRes = await makeRequest({ path: "/api/places/map-entities" });
    assert.equal(mapRes.status, 200);
    const mapList = Array.isArray(mapRes.data) ? mapRes.data : mapRes.data?.data;
    const foundOnMap = mapList.find((p) => p.name === "Sync Test New Village");
    assert.ok(foundOnMap, "Newly approved village must appear in GET /api/places/map-entities");
    assert.equal(foundOnMap.latitude, 26.6950);
    assert.equal(foundOnMap.longitude, 84.0620);
    assert.ok(foundOnMap.mapsUrl.includes("26.695"), "Maps URL should contain approved coordinates");
  });

  // =========================================================================
  // Case 2: Approve an existing location edit -> updates without duplicate
  // =========================================================================
  it("2. Approve an existing location edit -> marker updates without duplication", async () => {
    // Seed an existing map location
    const existingPlace = await Place.create({
      id: "p-sync-test-loc-01",
      slug: "sync-test-existing-location",
      name: "Sync Test Existing Location",
      category: "Villages",
      type: "village",
      latitude: 26.7010,
      longitude: 84.0510,
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=26.701,84.051",
      townBoundaryStatus: "confirmed",
      verificationStatus: "verified",
      isPublished: true,
      isArchived: false,
    });

    // Create an edit request submission targeting this place
    const editSub = await Submission.create({
      userId: citizenUser._id,
      type: "correction",
      title: "Sync Test Existing Location Updated",
      status: "pending",
      placeId: existingPlace._id,
      latitude: 26.7088,
      longitude: 84.0599,
      placeDetails: {
        name: "Sync Test Existing Location Updated",
        type: "village",
        category: "Villages",
        latitude: 26.7088,
        longitude: 84.0599,
        description: "Updated road connectivity notes",
      },
    });

    // Admin approves the edit
    const approveRes = await makeRequest({
      path: `/api/submissions/places/admin/${editSub._id}/review`,
      method: "PATCH",
      token: adminToken,
      body: {
        action: "approve",
        reviewerNotes: "Approved updated coordinates",
      },
    });

    assert.equal(approveRes.status, 200);

    // Verify existing record was updated and no duplicate was created
    const count = await Place.countDocuments({
      $or: [
        { _id: existingPlace._id },
        { name: "Sync Test Existing Location Updated" },
      ],
    });
    assert.equal(count, 1, "There should still be exactly 1 record for this place");

    // Verify public map shows updated coordinates and name
    const mapRes = await makeRequest({ path: "/api/places/map-entities" });
    const mapList = Array.isArray(mapRes.data) ? mapRes.data : mapRes.data?.data;
    const matches = mapList.filter(
      (p) => p.name === "Sync Test Existing Location Updated" || p.name === "Sync Test Existing Location"
    );
    assert.equal(matches.length, 1, "Public map entities must contain only 1 updated marker");
    assert.equal(matches[0].name, "Sync Test Existing Location Updated");
    assert.equal(matches[0].latitude, 26.7088);
    assert.equal(matches[0].longitude, 84.0599);
  });

  // =========================================================================
  // Case 3: Approve a new Directory listing -> appears in correct category
  // =========================================================================
  it("3. Approve a new Directory listing -> appears in GET /api/places and category filter", async () => {
    const contribSub = await ContributionSubmission.create({
      formId: testForm._id,
      formSlug: testForm.slug,
      targetModule: "directory",
      entityType: "place",
      submissionType: "new_entity",
      status: "pending",
      proposedValues: {
        name: "Sync Test Modern Pharmacy",
        category: "Hospitals & Clinics",
        latitude: 26.6850,
        longitude: 84.0480,
        phone: "05564-242555",
        addressFull: "Main Market Road, Fazilnagar",
      },
      evidenceNotes: "Sync Test Pharmacy Submission",
    });

    // Admin approves contribution submission
    const reviewRes = await makeRequest({
      path: `/api/contributions/${contribSub._id}/review`,
      method: "PATCH",
      token: adminToken,
      body: {
        action: "approve",
        adminNotes: "Approved and published immediately",
      },
    });

    assert.equal(reviewRes.status, 200);
    assert.equal(reviewRes.data.success, true);
    assert.ok(reviewRes.data.place);
    assert.equal(reviewRes.data.place.isPublished, true);

    // Query public directory
    const dirRes = await makeRequest({ path: "/api/places?category=Hospitals %26 Clinics" });
    assert.equal(dirRes.status, 200);
    const dirList = Array.isArray(dirRes.data) ? dirRes.data : dirRes.data?.places;
    const foundListing = dirList.find((p) => p.name === "Sync Test Modern Pharmacy");
    assert.ok(foundListing, "New listing must appear in GET /api/places under Hospitals & Clinics");
    assert.equal(foundListing.isPublished, true);
  });

  // =========================================================================
  // Case 4: Approve an existing listing edit -> existing card shows updated values
  // =========================================================================
  it("4. Approve an existing listing edit -> card shows updated values and preserved coordinates", async () => {
    const existingListing = await Place.create({
      id: "p-sync-test-school-01",
      slug: "sync-test-school",
      name: "Sync Test Heritage Academy",
      category: "Schools & Colleges",
      type: "school",
      latitude: 26.6900,
      longitude: 84.0550,
      phone: "05564-242111",
      townBoundaryStatus: "confirmed",
      verificationStatus: "verified",
      isPublished: true,
      isArchived: false,
    });

    // Edit submission submitted
    const editSub = await ContributionSubmission.create({
      formId: testForm._id,
      formSlug: testForm.slug,
      targetModule: "directory",
      entityType: "place",
      submissionType: "correction",
      targetEntityId: String(existingListing._id),
      targetEntityModel: "Place",
      status: "pending",
      proposedValues: {
        name: "Sync Test Heritage Academy Senior Wing",
        phone: "05564-242999",
      },
      evidenceNotes: "Sync Test Edit Academy Details",
    });

    // Approve the edit
    const reviewRes = await makeRequest({
      path: `/api/contributions/${editSub._id}/review`,
      method: "PATCH",
      token: adminToken,
      body: {
        action: "approve",
        adminNotes: "Updated academy contact info",
      },
    });

    assert.equal(reviewRes.status, 200);

    // Verify existing record is updated and coordinates were NOT wiped out or changed to default
    const updated = await Place.findById(existingListing._id);
    assert.equal(updated.name, "Sync Test Heritage Academy Senior Wing");
    assert.equal(updated.phone, "05564-242999");
    assert.equal(updated.latitude, 26.6900, "Verified latitude must be preserved");
    assert.equal(updated.longitude, 84.0550, "Verified longitude must be preserved");

    // Check public directory
    const dirRes = await makeRequest({ path: "/api/places?category=Schools %26 Colleges" });
    const dirList = Array.isArray(dirRes.data) ? dirRes.data : dirRes.data?.places;
    const found = dirList.find((p) => p.name === "Sync Test Heritage Academy Senior Wing");
    assert.ok(found, "Updated school listing must appear in public directory");
    assert.equal(found.phone, "05564-242999");
  });

  // =========================================================================
  // Case 5: Approve the same request twice -> no duplicates, returns 400
  // =========================================================================
  it("5. Approve the same request twice -> rejects duplicate approval and creates no duplicate records", async () => {
    const sub = await Submission.create({
      userId: citizenUser._id,
      type: "community_place",
      title: "Sync Test Double Click Place",
      status: "pending",
      latitude: 26.6800,
      longitude: 84.0450,
      placeDetails: {
        name: "Sync Test Double Click Place",
        category: "Markets & Shops",
        latitude: 26.6800,
        longitude: 84.0450,
      },
    });

    // First approval
    const res1 = await makeRequest({
      path: `/api/submissions/places/admin/${sub._id}/review`,
      method: "PATCH",
      token: adminToken,
      body: { action: "approve" },
    });
    assert.equal(res1.status, 200);

    // Second approval attempt
    const res2 = await makeRequest({
      path: `/api/submissions/places/admin/${sub._id}/review`,
      method: "PATCH",
      token: adminToken,
      body: { action: "approve" },
    });
    assert.equal(res2.status, 400, "Second approval on already reviewed submission must return 400");

    // Ensure only 1 place was created
    const count = await Place.countDocuments({ name: "Sync Test Double Click Place" });
    assert.equal(count, 1, "Database must not create duplicate records on repeated approval clicks");
  });

  // =========================================================================
  // Case 6: Refresh or reopen page -> approved changes remain permanent
  // =========================================================================
  it("6. Refresh or reopen page -> approved changes remain permanent in database", async () => {
    // Place was created in test 1 ("Sync Test New Village")
    const placeInDb = await Place.findOne({ name: "Sync Test New Village" });
    assert.ok(placeInDb, "Record must exist in MongoDB Atlas");
    assert.equal(placeInDb.isPublished, true);
    assert.equal(placeInDb.townBoundaryStatus, "confirmed");

    // Second GET request simulates user reloading the page
    const reloadRes = await makeRequest({ path: "/api/places/map-entities" });
    const list = Array.isArray(reloadRes.data) ? reloadRes.data : reloadRes.data?.data;
    const found = list.find((p) => p.name === "Sync Test New Village");
    assert.ok(found, "Approved village remains present after simulated page reload");
  });

  // =========================================================================
  // Case 7: Reject a submission -> it must NOT accidentally appear publicly
  // =========================================================================
  it("7. Reject a submission -> must NOT appear on public map or public directory", async () => {
    const rejectedSub = await Submission.create({
      userId: citizenUser._id,
      type: "community_place",
      title: "Sync Test Spam Place",
      status: "pending",
      latitude: 26.6700,
      longitude: 84.0300,
      placeDetails: {
        name: "Sync Test Spam Place Not For Public",
        category: "Markets & Shops",
        latitude: 26.6700,
        longitude: 84.0300,
      },
    });

    // Reject the submission
    const rejectRes = await makeRequest({
      path: `/api/submissions/places/admin/${rejectedSub._id}/review`,
      method: "PATCH",
      token: adminToken,
      body: { action: "reject", reviewerNotes: "Spam submission rejected" },
    });
    assert.equal(rejectRes.status, 200);

    // Verify it is NOT in MongoDB as published
    const inDb = await Place.findOne({ name: "Sync Test Spam Place Not For Public", isPublished: true });
    assert.equal(inDb, null, "Rejected submission must not exist as published place in DB");

    // Verify it does not appear in public map entities
    const mapRes = await makeRequest({ path: "/api/places/map-entities" });
    const mapList = Array.isArray(mapRes.data) ? mapRes.data : mapRes.data?.data;
    const foundOnMap = mapList.find((p) => p.name === "Sync Test Spam Place Not For Public");
    assert.equal(foundOnMap, undefined, "Rejected place must NOT appear in public map entities");

    // Verify it does not appear in public directory
    const dirRes = await makeRequest({ path: "/api/places" });
    const dirList = Array.isArray(dirRes.data) ? dirRes.data : dirRes.data?.places;
    const foundInDir = dirList.find((p) => p.name === "Sync Test Spam Place Not For Public");
    assert.equal(foundInDir, undefined, "Rejected place must NOT appear in public directory");
  });

  // =========================================================================
  // Case 8: Confirm counts, filters, and search reflect the approved data
  // =========================================================================
  it("8. Confirm counts, filters, and search reflect approved data", async () => {
    // Check stats summary
    const statsRes = await makeRequest({ path: "/api/places/stats/summary" });
    assert.equal(statsRes.status, 200);
    assert.ok(statsRes.data.published > 0, "Stats must report positive published count");

    // Search query matches approved entity
    const searchRes = await makeRequest({ path: "/api/places?search=Modern%20Pharmacy" });
    assert.equal(searchRes.status, 200);
    const searchList = Array.isArray(searchRes.data) ? searchRes.data : searchRes.data?.places;
    assert.ok(searchList.some((p) => p.name === "Sync Test Modern Pharmacy"), "Search query must find newly approved pharmacy");
  });
});
