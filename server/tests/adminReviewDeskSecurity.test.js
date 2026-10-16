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

import submissionRoutes from "../routes/submissions.js";
import User from "../models/User.js";
import RevokedToken from "../models/RevokedToken.js";

const TEST_PORT = 5077;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("CRITICAL SECURITY: Admin Review Desk Authentication & Authorization Enforcement", () => {
  let server;
  let citizenUser;
  let adminUser;
  let demotedUser;
  let suspendedAdminUser;

  let citizenToken;
  let adminToken;
  let demotedToken;
  let suspendedAdminToken;
  let revokedAdminToken;
  let forgedToken;

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

    // Clean up any test users from previous runs
    await User.deleteMany({ email: { $in: [
      "test_citizen_sec@fazilnagar.com",
      "test_admin_sec@fazilnagar.com",
      "test_demoted_sec@fazilnagar.com",
      "test_suspended_sec@fazilnagar.com"
    ] } });

    // 1. Create real database records for testing
    citizenUser = await User.create({
      name: "Test Citizen User",
      email: "test_citizen_sec@fazilnagar.com",
      password: "hashed_dummy_password",
      role: "user",
      status: "active",
    });

    adminUser = await User.create({
      name: "Test Authorized Admin",
      email: "test_admin_sec@fazilnagar.com",
      password: "hashed_dummy_password",
      role: "admin",
      status: "active",
    });

    demotedUser = await User.create({
      name: "Test Demoted User",
      email: "test_demoted_sec@fazilnagar.com",
      password: "hashed_dummy_password",
      role: "user", // Demoted in DB
      status: "active",
    });

    suspendedAdminUser = await User.create({
      name: "Test Suspended Admin",
      email: "test_suspended_sec@fazilnagar.com",
      password: "hashed_dummy_password",
      role: "admin",
      status: "suspended",
    });

    // 2. Generate corresponding JWTs
    citizenToken = jwt.sign(
      { id: citizenUser._id.toString(), email: citizenUser.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Demoted user token claims admin, but DB has role 'user'
    demotedToken = jwt.sign(
      { id: demotedUser._id.toString(), email: demotedUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    suspendedAdminToken = jwt.sign(
      { id: suspendedAdminUser._id.toString(), email: suspendedAdminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    revokedAdminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: "admin", nonce: "revoked-session" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Save revoked token to blacklist
    await RevokedToken.create({
      token: revokedAdminToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });

    // Token signed with fake/wrong key
    forgedToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: "admin" },
      "forged_wrong_secret_key",
      { expiresIn: "1h" }
    );

    // 3. Start test express app
    const app = express();
    app.use(express.json());
    app.use("/api/submissions", submissionRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test data
    await User.deleteMany({ email: { $in: [
      "test_citizen_sec@fazilnagar.com",
      "test_admin_sec@fazilnagar.com",
      "test_demoted_sec@fazilnagar.com",
      "test_suspended_sec@fazilnagar.com"
    ] } });
    await RevokedToken.deleteOne({ token: revokedAdminToken });
  });

  // --- Category A: Unauthenticated Public Visitors (HTTP 401) ---
  describe("A. Public Visitors (Not Logged In) -> Must be rejected with HTTP 401", () => {
    it("1. GET /api/submissions without token returns 401", async () => {
      const res = await makeRequest({ path: "/api/submissions" });
      assert.equal(res.status, 401, "Expected HTTP 401 Unauthorized for unauthenticated review list request");
    });

    it("2. GET /api/submissions/places/admin without token returns 401", async () => {
      const res = await makeRequest({ path: "/api/submissions/places/admin" });
      assert.equal(res.status, 401, "Expected HTTP 401 Unauthorized for unauthenticated place review list request");
    });

    it("3. GET /api/submissions/:id without token returns 401", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({ path: `/api/submissions/${dummyId}` });
      assert.equal(res.status, 401, "Expected HTTP 401 Unauthorized for unauthenticated single submission request");
    });

    it("4. PATCH /api/submissions/:id/status without token returns 401", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({
        path: `/api/submissions/${dummyId}/status`,
        method: "PATCH",
        body: { status: "approved" },
      });
      assert.equal(res.status, 401, "Expected HTTP 401 Unauthorized for unauthenticated status patch");
    });

    it("5. PATCH /api/submissions/places/admin/:id/review without token returns 401", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({
        path: `/api/submissions/places/admin/${dummyId}/review`,
        method: "PATCH",
        body: { decision: "approved" },
      });
      assert.equal(res.status, 401, "Expected HTTP 401 Unauthorized for unauthenticated place review patch");
    });

    it("6. DELETE /api/submissions/:id without token returns 401", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({
        path: `/api/submissions/${dummyId}`,
        method: "DELETE",
      });
      assert.equal(res.status, 401, "Expected HTTP 401 Unauthorized for unauthenticated submission deletion");
    });
  });

  // --- Category B: Authenticated Normal Citizens (HTTP 403 Forbidden) ---
  describe("B. Authenticated Normal Citizen Users -> Must be rejected with HTTP 403 Forbidden", () => {
    it("1. GET /api/submissions with citizen token returns 403", async () => {
      const res = await makeRequest({ path: "/api/submissions", token: citizenToken });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden for citizen attempting to view submissions desk");
    });

    it("2. GET /api/submissions/places/admin with citizen token returns 403", async () => {
      const res = await makeRequest({ path: "/api/submissions/places/admin", token: citizenToken });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden for citizen attempting to view place review desk");
    });

    it("3. GET /api/submissions/:id with citizen token returns 403", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({ path: `/api/submissions/${dummyId}`, token: citizenToken });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden for citizen attempting to view single submission");
    });

    it("4. PATCH /api/submissions/:id/status with citizen token returns 403", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({
        path: `/api/submissions/${dummyId}/status`,
        method: "PATCH",
        token: citizenToken,
        body: { status: "approved" },
      });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden for citizen attempting to approve/reject submission");
    });

    it("5. PATCH /api/submissions/places/admin/:id/review with citizen token returns 403", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({
        path: `/api/submissions/places/admin/${dummyId}/review`,
        method: "PATCH",
        token: citizenToken,
        body: { decision: "approved" },
      });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden for citizen attempting to review place submission");
    });

    it("6. DELETE /api/submissions/:id with citizen token returns 403", async () => {
      const dummyId = new mongoose.Types.ObjectId().toString();
      const res = await makeRequest({
        path: `/api/submissions/${dummyId}`,
        method: "DELETE",
        token: citizenToken,
      });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden for citizen attempting to delete submission");
    });
  });

  // --- Category C: Token Tampering & Database Cross-Verification ---
  describe("C. Anti-Tampering & Live Database State Verification", () => {
    it("1. Token signed with wrong secret is rejected with 401", async () => {
      const res = await makeRequest({ path: "/api/submissions", token: forgedToken });
      assert.equal(res.status, 401, "Expected HTTP 401 for forged token signature");
    });

    it("2. Demoted user (token says admin, DB says user) is rejected with 403", async () => {
      const res = await makeRequest({ path: "/api/submissions", token: demotedToken });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden when live DB role is user despite token claims");
    });

    it("3. Suspended admin user is rejected with 403", async () => {
      const res = await makeRequest({ path: "/api/submissions", token: suspendedAdminToken });
      assert.equal(res.status, 403, "Expected HTTP 403 Forbidden when admin user status is suspended");
    });

    it("4. Revoked admin token (logged out) is rejected with 401", async () => {
      const res = await makeRequest({ path: "/api/submissions", token: revokedAdminToken });
      assert.equal(res.status, 401, "Expected HTTP 401 Unauthorized for logged-out / blacklisted admin token");
    });
  });

  // --- Category D: Authorized Administrator Access (HTTP 200) ---
  describe("D. Authorized Administrator Access", () => {
    it("1. GET /api/submissions with authorized admin token succeeds with 200", async () => {
      const res = await makeRequest({ path: "/api/submissions", token: adminToken });
      assert.equal(res.status, 200, "Expected HTTP 200 OK for authorized admin accessing review records");
      assert.equal(Array.isArray(res.data), true, "Expected submissions list to be an array");
    });

    it("2. GET /api/submissions/places/admin with authorized admin token succeeds with 200", async () => {
      const res = await makeRequest({ path: "/api/submissions/places/admin", token: adminToken });
      assert.equal(res.status, 200, "Expected HTTP 200 OK for authorized admin accessing place reviews");
      assert.equal(Array.isArray(res.data), true, "Expected place submissions list to be an array");
    });
  });
});
