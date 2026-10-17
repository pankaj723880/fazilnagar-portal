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

import placeRoutes from "../routes/places.js";
import Place from "../models/Place.js";
import User from "../models/User.js";
import { REGIONAL_LOCATIONS, FAZILNAGAR_CENTRE } from "../../client/src/data/regionalLocations.js";

const TEST_PORT = 5089;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

let server;
let adminToken;
let userToken;
let testAdminUser;
let testRegularUser;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {};
    if (payload) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(payload);
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe("Map Entity Management & Google Maps Navigation Test Suite", () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/places", placeRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));

    // Clean up test places and test users before starting
    await Place.deleteMany({
      $or: [
        { slug: { $regex: /^test-/i } },
        { name: { $regex: /^Test /i } },
      ],
    });
    await User.deleteMany({ email: { $in: ["mapadmin@test.com", "mapregular@test.com"] } });

    testAdminUser = await User.create({
      name: "Map Test Admin",
      email: "mapadmin@test.com",
      phone: "9999990001",
      password: "hashed_test_password",
      role: "admin",
      status: "active",
    });

    testRegularUser = await User.create({
      name: "Map Regular User",
      email: "mapregular@test.com",
      phone: "9999990002",
      password: "hashed_test_password",
      role: "user",
      status: "active",
    });

    adminToken = jwt.sign(
      { id: testAdminUser._id.toString(), email: testAdminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    userToken = jwt.sign(
      { id: testRegularUser._id.toString(), email: testRegularUser.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  after(async () => {
    await Place.deleteMany({ slug: { $regex: /^test-/ } });
    await User.deleteMany({ email: { $in: ["mapadmin@test.com", "mapregular@test.com"] } });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Audit & Root Cause Verification
  it("1. Root Cause Fix: Lavkush Purab Patti has verified coordinates 26.7095, 84.0507 (not Karmaini 26.7110, 84.0790)", () => {
    const lavkush = REGIONAL_LOCATIONS.find(
      (l) => l.name === "Lavkush Purab Patti" || l.sno === 34
    );
    assert.ok(lavkush, "Lavkush Purab Patti must exist in regional locations dataset");
    assert.equal(lavkush.sno, 34);
    assert.equal(lavkush.latitude, 26.7095, "Lavkush Purab Patti latitude must be 26.7095");
    assert.equal(lavkush.longitude, 84.0507, "Lavkush Purab Patti longitude must be 84.0507");
    assert.equal(lavkush.compassDirection, "N", "Bearing must be North");
    assert.equal(lavkush.distanceKm, 3.0, "Distance from Fazilnagar centre must be ~3.0 km");
    assert.ok(
      lavkush.coordinateSource?.includes("Census") || lavkush.coordinateSource?.includes("189499"),
      "Coordinate source must reference Census 2011 / LGD 189499"
    );

    // Verify Karmaini coordinates are distinct and not confused
    const karmaini = REGIONAL_LOCATIONS.find((l) => l.name.includes("Karmaini"));
    if (karmaini) {
      assert.notEqual(
        lavkush.longitude,
        karmaini.longitude,
        "Lavkush Purab Patti longitude (84.0507) must not equal Karmaini longitude (84.0790)"
      );
    }
  });

  // 2. Google Maps Navigation URL Format
  it("2. Google Maps URL Generation: format must strictly use exact saved numeric coordinates", () => {
    const lavkush = REGIONAL_LOCATIONS.find((l) => l.sno === 34);
    const expectedQuery = `${lavkush.latitude}%2C${lavkush.longitude}`;
    const expectedUrl = `https://www.google.com/maps/search/?api=1&query=${expectedQuery}`;

    assert.equal(
      expectedUrl,
      "https://www.google.com/maps/search/?api=1&query=26.7095%2C84.0507",
      "URL must match required https://www.google.com/maps/search/?api=1&query=LATITUDE%2CLONGITUDE format"
    );
    assert.ok(!expectedUrl.includes("Karmaini"), "Navigation URL must never mention Karmaini for Lavkush Purab Patti");
    assert.ok(!expectedUrl.includes("84.0790"), "Navigation URL must not use Karmaini longitude");
  });

  // 3. Public API Endpoint: GET /api/places/map-entities
  it("3. Public GET /api/places/map-entities returns active map entities without requiring authentication", async () => {
    const res = await request("GET", "/api/places/map-entities");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(Array.isArray(res.data.data), "Response data must be an array");
    assert.ok(res.data.data.length > 0, "Must return map entities");
  });

  // 4. Server-Side Authorization: Admin write protection
  it("4. Authorization: Admin CRUD endpoints reject unauthenticated or non-admin requests", async () => {
    // Unauthenticated GET /api/places/admin -> 401
    const unauthGet = await request("GET", "/api/places/admin");
    assert.equal(unauthGet.status, 401);

    // Regular user GET /api/places/admin -> 403
    const userGet = await request("GET", "/api/places/admin", null, userToken);
    assert.equal(userGet.status, 403);

    // Admin user GET /api/places/admin -> 200
    const adminGet = await request("GET", "/api/places/admin", null, adminToken);
    assert.equal(adminGet.status, 200);
    assert.ok(Array.isArray(adminGet.data), "Admin places response must be an array");

    // Unauthenticated POST /api/places -> 401
    const unauthPost = await request("POST", "/api/places", { name: "Test Entity" });
    assert.equal(unauthPost.status, 401);

    // Regular user POST /api/places -> 403
    const userPost = await request("POST", "/api/places", { name: "Test Entity" }, userToken);
    assert.equal(userPost.status, 403);
  });

  // 5. CRUD: Create new Map Entity with coordinate validation
  it("5. CRUD Create: Validates latitude (-90..90) and longitude (-180..180) and creates entity", async () => {
    // Invalid latitude (> 90) -> 400
    const invalidLat = await request(
      "POST",
      "/api/places",
      {
        name: "Test Invalid Lat",
        category: "village",
        latitude: 95.0,
        longitude: 84.05,
      },
      adminToken
    );
    assert.equal(invalidLat.status, 400);

    // Invalid longitude (> 180) -> 400
    const invalidLng = await request(
      "POST",
      "/api/places",
      {
        name: "Test Invalid Lng",
        category: "village",
        latitude: 26.70,
        longitude: 185.0,
      },
      adminToken
    );
    assert.equal(invalidLng.status, 400);

    // Valid creation
    const validCreate = await request(
      "POST",
      "/api/places",
      {
        name: "Test New Village",
        hindiName: "टेस्ट नया गाँव",
        category: "village",
        entityType: "village",
        latitude: 26.6950,
        longitude: 84.0620,
        addressFull: "Test Village, Fazilnagar Block, Kushinagar",
        district: "Kushinagar",
        state: "Uttar Pradesh",
        country: "India",
        verificationStatus: "verified",
        coordinateSource: "Field Survey 2026",
      },
      adminToken
    );
    assert.equal(validCreate.status, 201);
    assert.ok(validCreate.data.place, "Response must contain created place");
    assert.equal(validCreate.data.place.name, "Test New Village");
    const createdLat = Number(validCreate.data.place.latitude ?? validCreate.data.place.location?.coordinates?.[1]);
    const createdLng = Number(validCreate.data.place.longitude ?? validCreate.data.place.location?.coordinates?.[0]);
    assert.equal(createdLat, 26.6950);
    assert.equal(createdLng, 84.0620);
    assert.ok(
      validCreate.data.place.mapsUrl?.includes("26.695"),
      "mapsUrl must contain exact saved numeric coordinates"
    );
  });

  // 6. CRUD: Duplicate name detection
  it("6. Duplicate detection: Rejects duplicate entity name in the same category", async () => {
    const duplicate = await request(
      "POST",
      "/api/places",
      {
        name: "Test New Village",
        category: "village",
        latitude: 26.6950,
        longitude: 84.0620,
      },
      adminToken
    );
    assert.equal(duplicate.status, 409);
    assert.ok(duplicate.data.message?.includes("already exists"));
  });

  // 7. CRUD: Update entity position & details
  it("7. CRUD Update: Updates entity coordinates and recalculates navigation URL", async () => {
    const found = await Place.findOne({ name: "Test New Village" });
    assert.ok(found, "Test New Village must exist");

    const updateRes = await request(
      "PUT",
      `/api/places/${found._id}`,
      {
        name: "Test New Village Corrected",
        latitude: 26.7010,
        longitude: 84.0650,
        verificationStatus: "verified",
      },
      adminToken
    );

    assert.equal(updateRes.status, 200);
    assert.ok(updateRes.data.place, "Response must include updated place");
    assert.equal(updateRes.data.place.name, "Test New Village Corrected");
    const updatedLat = Number(updateRes.data.place.latitude ?? updateRes.data.place.location?.coordinates?.[1]);
    const updatedLng = Number(updateRes.data.place.longitude ?? updateRes.data.place.location?.coordinates?.[0]);
    assert.equal(updatedLat, 26.7010);
    assert.equal(updatedLng, 84.0650);
    assert.ok(
      updateRes.data.place.mapsUrl?.includes("26.701"),
      "mapsUrl must update with corrected coordinates"
    );
  });

  // 8. Safety Protection: Cannot delete central Fazilnagar Hub
  it("8. Safeguard Protection: Rejects deletion of Fazilnagar Central Hub", async () => {
    const deleteHub = await request("DELETE", "/api/places/fazilnagar-hub", null, adminToken);
    assert.equal(deleteHub.status, 400);
    assert.ok(deleteHub.data.message?.includes("protected") || deleteHub.data.message?.includes("Hub"));
  });

  // 9. CRUD Delete: Safely deletes test entity
  it("9. CRUD Delete: Authorized admin can delete an entity", async () => {
    const found = await Place.findOne({ name: "Test New Village Corrected" });
    assert.ok(found);

    const deleteRes = await request("DELETE", `/api/places/${found._id}`, null, adminToken);
    assert.equal(deleteRes.status, 200);
    assert.ok(deleteRes.data.message?.includes("deleted"));

    const check = await Place.findById(found._id);
    assert.equal(check, null, "Deleted entity must no longer exist in database");
  });
});
