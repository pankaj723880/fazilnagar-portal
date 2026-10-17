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

import civicDirectoryRoutes from "../routes/civicDirectory.js";
import User from "../models/User.js";

const TEST_PORT = 5088;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

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

describe("Civic Directory Index Management & CRUD Flow", () => {
  let server;
  let citizenToken;
  let adminToken;
  let createdItemId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI).catch(() => {});
    }

    await User.deleteMany({ email: { $in: ["citizen_crud@fazilnagar.com", "admin_crud@fazilnagar.com"] } });

    const citizen = await User.create({
      name: "Test Citizen CRUD",
      email: "citizen_crud@fazilnagar.com",
      password: "dummy_password",
      role: "user",
      status: "active",
    });

    const admin = await User.create({
      name: "Test Admin CRUD",
      email: "admin_crud@fazilnagar.com",
      password: "dummy_password",
      role: "admin",
      status: "active",
    });

    citizenToken = jwt.sign(
      { id: citizen._id.toString(), email: citizen.email, role: citizen.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { id: admin._id.toString(), email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const app = express();
    app.use(express.json());
    app.use("/api/civic-directory", civicDirectoryRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });
  });

  after(async () => {
    await User.deleteMany({ email: { $in: ["citizen_crud@fazilnagar.com", "admin_crud@fazilnagar.com"] } });
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("1. Public GET /api/civic-directory returns listings successfully", async () => {
    const res = await request("GET", "/api/civic-directory");
    assert.equal(res.status, 200);
    assert.ok(res.data?.success);
    assert.ok(Array.isArray(res.data?.items));
    assert.ok(res.data.items.length >= 9, "Should have at least 9 initial verified places");
  });

  it("2. POST /api/civic-directory without authentication is rejected with 401", async () => {
    const res = await request("POST", "/api/civic-directory", {
      title: "Unauthorized Place",
      category: "healthcare",
    });
    assert.equal(res.status, 401);
  });

  it("3. POST /api/civic-directory with non-admin citizen token is rejected with 403", async () => {
    const res = await request(
      "POST",
      "/api/civic-directory",
      {
        title: "Citizen Place",
        category: "healthcare",
      },
      citizenToken
    );
    assert.equal(res.status, 403);
  });

  it("4. POST /api/civic-directory with admin token creates new listing with full fields", async () => {
    const newListing = {
      title: "Fazilnagar Trauma & Eye Care Center",
      subtitle: "NH-27 Highway Service Lane",
      category: "healthcare",
      categoryLabel: "🏥 Healthcare & Emergency",
      phone: "05564299999",
      lat: 26.6812,
      lng: 84.0488,
      directionsUrl: "https://maps.google.com/?q=26.6812,84.0488",
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800",
      verified: true,
      isActive: true,
      displayOrder: 99,
    };

    const res = await request("POST", "/api/civic-directory", newListing, adminToken);
    assert.equal(res.status, 201);
    assert.ok(res.data?.success);
    assert.ok(res.data?.item);
    assert.equal(res.data.item.title, "Fazilnagar Trauma & Eye Care Center");
    assert.equal(res.data.item.phone, "05564299999");
    assert.equal(res.data.item.verified, true);
    createdItemId = res.data.item._id || res.data.item.id || res.data.item.itemId;
    assert.ok(createdItemId);
  });

  it("5. PUT /api/civic-directory/:id updates listing details successfully", async () => {
    assert.ok(createdItemId, "Must have createdItemId from previous step");
    const updatedPayload = {
      title: "Fazilnagar Super Specialty Eye Care Center",
      subtitle: "Near NH-27 Toll Plaza",
      category: "healthcare",
      categoryLabel: "👁️ Eye Care",
      phone: "09450000000",
      lat: 26.6819,
      lng: 84.0495,
      directionsUrl: "https://maps.google.com/?q=26.6819,84.0495",
      image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800",
      verified: true,
      isActive: true,
      displayOrder: 10,
    };

    const res = await request("PUT", `/api/civic-directory/${createdItemId}`, updatedPayload, adminToken);
    assert.equal(res.status, 200);
    assert.ok(res.data?.success);
    assert.equal(res.data.item?.title, "Fazilnagar Super Specialty Eye Care Center");
    assert.equal(res.data.item?.phone, "09450000000");
  });

  it("6. PATCH /api/civic-directory/:id/toggle-active toggles listing visibility", async () => {
    assert.ok(createdItemId);
    // Toggle to inactive (hidden)
    const resHide = await request("PATCH", `/api/civic-directory/${createdItemId}/toggle-active`, {}, adminToken);
    assert.equal(resHide.status, 200);
    assert.ok(resHide.data?.success);
    assert.equal(resHide.data.item?.isActive, false);

    // Verify it is excluded from public active GET
    const publicRes = await request("GET", "/api/civic-directory");
    const foundPublic = publicRes.data.items.find((i) => (i._id || i.id || i.itemId) === createdItemId);
    assert.equal(foundPublic, undefined, "Hidden listing must not appear on public active GET");

    // Verify it appears when all=true
    const allRes = await request("GET", "/api/civic-directory?all=true");
    const foundAll = allRes.data.items.find((i) => (i._id || i.id || i.itemId) === createdItemId);
    assert.ok(foundAll, "Hidden listing must appear when all=true");

    // Toggle back to active
    const resShow = await request("PATCH", `/api/civic-directory/${createdItemId}/toggle-active`, {}, adminToken);
    assert.equal(resShow.status, 200);
    assert.equal(resShow.data.item?.isActive, true);
  });

  it("7. PATCH /api/civic-directory/reorder updates display sequence", async () => {
    assert.ok(createdItemId);
    const reorderPayload = {
      items: [
        { id: createdItemId, displayOrder: 1 },
      ],
    };

    const res = await request("PATCH", "/api/civic-directory/reorder", reorderPayload, adminToken);
    assert.equal(res.status, 200);
    assert.ok(res.data?.success);

    const checkRes = await request("GET", "/api/civic-directory?all=true");
    const reorderedItem = checkRes.data.items.find((i) => (i._id || i.id || i.itemId) === createdItemId);
    assert.equal(reorderedItem?.displayOrder, 1);
  });

  it("8. DELETE /api/civic-directory/:id removes the listing", async () => {
    assert.ok(createdItemId);
    const res = await request("DELETE", `/api/civic-directory/${createdItemId}`, {}, adminToken);
    assert.equal(res.status, 200);
    assert.ok(res.data?.success);

    // Verify deleted
    const checkRes = await request("GET", "/api/civic-directory?all=true");
    const deletedItem = checkRes.data.items.find((i) => (i._id || i.id || i.itemId) === createdItemId);
    assert.equal(deletedItem, undefined, "Item must be deleted");
  });
});
