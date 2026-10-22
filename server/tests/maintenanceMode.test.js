import { describe, it, before, after, beforeEach } from "node:test";
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

import SiteSettings, { isMaintenanceActive, DEFAULT_MAINTENANCE } from "../models/SiteSettings.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import maintenanceMiddleware from "../middleware/maintenance.js";
import settingsRoutes, { invalidateServerSettingsCache } from "../routes/settings.js";

const TEST_PORT = 5088;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("GLOBAL MAINTENANCE MODE & RECOVERY TEST SUITE", () => {
  let server;
  let adminUser;
  let citizenUser;
  let adminToken;
  let citizenToken;

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
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: parsed,
            });
          });
        }
      );

      req.on("error", reject);

      if (body) {
        req.write(typeof body === "string" ? body : JSON.stringify(body));
      }
      req.end();
    });
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Create test admin and citizen users
    await User.deleteMany({ email: { $in: ["maint_admin@fazilnagar.in", "maint_citizen@fazilnagar.in"] } });

    adminUser = await User.create({
      name: "Maint Admin",
      email: "maint_admin@fazilnagar.in",
      password: "password123",
      role: "admin",
      status: "active",
    });

    citizenUser = await User.create({
      name: "Maint Citizen",
      email: "maint_citizen@fazilnagar.in",
      password: "password123",
      role: "user",
      status: "active",
    });

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: "admin", email: adminUser.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    citizenToken = jwt.sign(
      { id: citizenUser._id.toString(), role: "user", email: citizenUser.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Build Express test app mirroring server.js architecture
    const app = express();
    app.use(express.json());

    // Mount Maintenance Middleware centrally
    app.use(maintenanceMiddleware);

    // Settings routes
    app.use("/api/settings", settingsRoutes);

    // Dummy public routes to simulate portal APIs
    app.get("/api/news", (req, res) => {
      res.json({ success: true, news: ["Story 1", "Story 2"] });
    });

    app.get("/api/directory", (req, res) => {
      res.json({ success: true, places: ["Hospital", "School"] });
    });

    app.post("/api/submissions", (req, res) => {
      res.json({ success: true, message: "Created" });
    });

    // Dummy auth route (must be exempt from maintenance)
    app.post("/api/auth/login", (req, res) => {
      res.json({ success: true, token: "mock_login_token" });
    });

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, "127.0.0.1", resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    // Clean up test users and reset maintenance to OFF
    await User.deleteMany({ email: { $in: ["maint_admin@fazilnagar.in", "maint_citizen@fazilnagar.in"] } });
    await SiteSettings.updateOne(
      {},
      {
        $set: {
          "maintenance.enabled": false,
          "maintenance.scheduledStartTime": null,
          "maintenance.scheduledEndTime": null,
        },
      }
    );
    invalidateServerSettingsCache();
  });

  beforeEach(async () => {
    // Reset maintenance mode to OFF before each test and clear server cache
    await SiteSettings.updateOne(
      {},
      {
        $set: {
          "maintenance.enabled": false,
          "maintenance.scheduledStartTime": null,
          "maintenance.scheduledEndTime": null,
          "maintenance.message": DEFAULT_MAINTENANCE.message,
          "maintenance.reopeningText": DEFAULT_MAINTENANCE.reopeningText,
        },
      },
      { upsert: true }
    );
    invalidateServerSettingsCache();
  });

  it("1. Maintenance OFF: Public requests succeed normally", async () => {
    const res = await makeRequest({ path: "/api/news" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.deepEqual(res.body.news, ["Story 1", "Story 2"]);
  });

  it("2. Maintenance ON: Blocks unauthenticated and citizen public requests with HTTP 503", async () => {
    // Enable maintenance
    await SiteSettings.updateOne(
      {},
      {
        $set: {
          "maintenance.enabled": true,
          "maintenance.message": "Scheduled upgrades in progress.",
          "maintenance.reopeningText": "Back at 5:00 PM",
        },
      }
    );
    invalidateServerSettingsCache();

    // Unauthenticated visitor request
    const unauthRes = await makeRequest({ path: "/api/news" });
    assert.equal(unauthRes.statusCode, 503);
    assert.equal(unauthRes.headers["retry-after"], "300");
    assert.equal(unauthRes.body.maintenanceActive, true);
    assert.equal(unauthRes.body.message, "Scheduled upgrades in progress.");
    assert.equal(unauthRes.body.reopeningText, "Back at 5:00 PM");

    // Regular citizen request
    const citizenRes = await makeRequest({ path: "/api/directory", token: citizenToken });
    assert.equal(citizenRes.statusCode, 503);
    assert.equal(citizenRes.body.maintenanceActive, true);

    // Block public POST requests
    const postRes = await makeRequest({
      path: "/api/submissions",
      method: "POST",
      body: { title: "New Place" },
    });
    assert.equal(postRes.statusCode, 503);
  });

  it("3. Unauthenticated/Tampered requests cannot bypass maintenance", async () => {
    await SiteSettings.updateOne({}, { $set: { "maintenance.enabled": true } });
    invalidateServerSettingsCache();

    // Forged token signed with wrong secret
    const forgedToken = jwt.sign({ id: adminUser._id.toString(), role: "admin" }, "wrong_secret");
    const forgedRes = await makeRequest({ path: "/api/news", token: forgedToken });
    assert.equal(forgedRes.statusCode, 503);

    // Fake query parameters or bypass attempts
    const paramRes = await makeRequest({ path: "/api/news?bypass=true&admin=1" });
    assert.equal(paramRes.statusCode, 503);
  });

  it("4. Authentication and Settings GET routes remain accessible during maintenance", async () => {
    await SiteSettings.updateOne({}, { $set: { "maintenance.enabled": true } });
    invalidateServerSettingsCache();

    // Auth endpoint
    const authRes = await makeRequest({
      path: "/api/auth/login",
      method: "POST",
      body: { email: "admin@fazilnagar.in", password: "password123" },
    });
    assert.equal(authRes.statusCode, 200);
    assert.equal(authRes.body.token, "mock_login_token");

    // Public settings GET route
    const settingsRes = await makeRequest({ path: "/api/settings" });
    assert.equal(settingsRes.statusCode, 200);
    assert.equal(settingsRes.body.settings.maintenance.isActive, true);

    // Dedicated maintenance status GET route
    const maintStatusRes = await makeRequest({ path: "/api/settings/maintenance" });
    assert.equal(maintStatusRes.statusCode, 200);
    assert.equal(maintStatusRes.body.isActive, true);
  });

  it("5. Authenticated Admin bypasses maintenance on public and admin routes", async () => {
    await SiteSettings.updateOne({}, { $set: { "maintenance.enabled": true } });
    invalidateServerSettingsCache();

    // Admin accessing public news API
    const newsRes = await makeRequest({ path: "/api/news", token: adminToken });
    assert.equal(newsRes.statusCode, 200);
    assert.equal(newsRes.body.success, true);

    // Admin accessing directory API
    const dirRes = await makeRequest({ path: "/api/directory", token: adminToken });
    assert.equal(dirRes.statusCode, 200);
    assert.equal(dirRes.body.success, true);
  });

  it("6. Scheduled maintenance activation & deactivation based on server time", async () => {
    const now = Date.now();

    // Past window (should NOT be active)
    const pastSettings = {
      maintenance: {
        enabled: false,
        scheduledStartTime: new Date(now - 100000).toISOString(),
        scheduledEndTime: new Date(now - 50000).toISOString(),
      },
    };
    assert.equal(isMaintenanceActive(pastSettings), false);

    // Future window (should NOT be active yet)
    const futureSettings = {
      maintenance: {
        enabled: false,
        scheduledStartTime: new Date(now + 50000).toISOString(),
        scheduledEndTime: new Date(now + 100000).toISOString(),
      },
    };
    assert.equal(isMaintenanceActive(futureSettings), false);

    // Active scheduled window (MUST be active automatically)
    const activeWindowSettings = {
      maintenance: {
        enabled: false,
        scheduledStartTime: new Date(now - 50000).toISOString(),
        scheduledEndTime: new Date(now + 50000).toISOString(),
      },
    };
    assert.equal(isMaintenanceActive(activeWindowSettings), true);

    // Open-ended window starting in past (MUST be active)
    const openEndedSettings = {
      maintenance: {
        enabled: false,
        scheduledStartTime: new Date(now - 50000).toISOString(),
        scheduledEndTime: null,
      },
    };
    assert.equal(isMaintenanceActive(openEndedSettings), true);
  });

  it("7. Settings validation: End time before start time is rejected with 400", async () => {
    const now = Date.now();
    const invalidPayload = {
      enabled: false,
      scheduledStartTime: new Date(now + 50000).toISOString(),
      scheduledEndTime: new Date(now + 10000).toISOString(), // earlier than start!
    };

    const res = await makeRequest({
      path: "/api/settings/maintenance",
      method: "PUT",
      token: adminToken,
      body: invalidPayload,
    });

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Scheduled end time must be after scheduled start time/i);
  });

  it("8. Non-admin cannot modify maintenance settings (403 Forbidden)", async () => {
    const res = await makeRequest({
      path: "/api/settings/maintenance",
      method: "PUT",
      token: citizenToken,
      body: { enabled: true },
    });

    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /Admin privileges required/i);
  });

  it("9. Admin toggle maintenance ON & OFF records Audit Log entries", async () => {
    // 1. Turn ON via API
    const turnOnRes = await makeRequest({
      path: "/api/settings/maintenance",
      method: "PUT",
      token: adminToken,
      body: {
        enabled: true,
        message: "Emergency database upgrade",
        reopeningText: "Reopening soon",
      },
    });
    assert.equal(turnOnRes.statusCode, 200);
    assert.equal(turnOnRes.body.maintenance.enabled, true);

    // Verify AuditLog entry for enabling
    const enableLog = await AuditLog.findOne({
      entityType: "SiteSettings",
      entityTitle: "Maintenance Mode",
      adminUser: adminUser._id,
    }).sort({ createdAt: -1 });

    assert.ok(enableLog, "Audit log entry for maintenance mode must exist");
    assert.match(enableLog.changesSummary, /Enabled Maintenance Mode/i);

    // 2. Turn OFF via API
    const turnOffRes = await makeRequest({
      path: "/api/settings/maintenance",
      method: "PUT",
      token: adminToken,
      body: {
        enabled: false,
      },
    });
    assert.equal(turnOffRes.statusCode, 200);
    assert.equal(turnOffRes.body.maintenance.enabled, false);

    // Verify AuditLog entry for disabling
    const disableLog = await AuditLog.findOne({
      entityType: "SiteSettings",
      entityTitle: "Maintenance Mode",
      adminUser: adminUser._id,
    }).sort({ createdAt: -1 });

    assert.ok(disableLog, "Audit log entry for disabling maintenance must exist");
    assert.match(disableLog.changesSummary, /Disabled Maintenance Mode/i);

    // 3. Verify audit logs API endpoint
    const auditRes = await makeRequest({
      path: "/api/settings/maintenance/audit-logs",
      token: adminToken,
    });
    assert.equal(auditRes.statusCode, 200);
    assert.ok(Array.isArray(auditRes.body.auditLogs));
    assert.ok(auditRes.body.auditLogs.length >= 2);
  });
});
