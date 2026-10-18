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

import SiteSettings, {
  DEFAULT_ACTION_BUTTONS,
  DEFAULT_TRUST_BADGES,
} from "../models/SiteSettings.js";
import User from "../models/User.js";
import settingsRoutes from "../routes/settings.js";
import formsRoutes from "../routes/forms.js";

const TEST_PORT = 5055;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

describe("Settings Persistence & Live Version Endpoint Verification", () => {
  let server;
  let adminToken;
  let citizenToken;
  let testAdminUser;
  let testCitizenUser;

  before(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Reset settings in database for clean test
    await SiteSettings.deleteOne({ key: "primary_settings" });

    // Clean up any existing test users
    await User.deleteMany({ email: { $in: ["admin-settings@fazilnagar.com", "citizen-settings@fazilnagar.com"] } });

    // Create real test users in database so requireAdmin DB check succeeds
    testAdminUser = await User.create({
      name: "Admin Settings Tester",
      email: "admin-settings@fazilnagar.com",
      password: "hashedpassword123",
      role: "admin",
      status: "active",
    });

    testCitizenUser = await User.create({
      name: "Citizen Settings Tester",
      email: "citizen-settings@fazilnagar.com",
      password: "hashedpassword123",
      role: "user",
      status: "active",
    });

    // Generate JWT tokens
    adminToken = jwt.sign(
      { id: testAdminUser._id.toString(), email: testAdminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    citizenToken = jwt.sign(
      { id: testCitizenUser._id.toString(), email: testCitizenUser.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Setup Express app
    const app = express();
    app.use(express.json());
    app.use("/api/settings", settingsRoutes);
    app.use("/settings", settingsRoutes);
    app.use("/api/forms", formsRoutes);
    app.use("/forms", formsRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({ email: { $in: ["admin-settings@fazilnagar.com", "citizen-settings@fazilnagar.com"] } });
  });

  function makeRequest(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

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
            try {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                data: JSON.parse(data),
              });
            } catch (e) {
              resolve({ status: res.statusCode, headers: res.headers, raw: data });
            }
          });
        }
      );
      req.on("error", reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  it("1. GET /api/settings/live-version responds with 200 and valid timestamp", async () => {
    const res = await makeRequest("GET", "/api/settings/live-version");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(typeof res.data.updatedAt === "number");
    assert.ok(typeof res.data.timestamp === "number");
  });

  it("2. GET /settings/live-version (fallback mount) also responds with 200", async () => {
    const res = await makeRequest("GET", "/settings/live-version");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(typeof res.data.updatedAt === "number");
  });

  it("3. GET /api/settings returns initialized defaults with active buttons and badges", async () => {
    const res = await makeRequest("GET", "/api/settings");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    const s = res.data.settings;
    assert.ok(Array.isArray(s.heroContent.actionButtons));
    assert.equal(s.heroContent.actionButtons.length, 5);
    assert.ok(Array.isArray(s.heroContent.trustBadges));
    assert.equal(s.heroContent.trustBadges.length, 3);

    // All should default to isActive: true
    s.heroContent.actionButtons.forEach((b) => assert.equal(b.isActive, true));
    s.heroContent.trustBadges.forEach((b) => assert.equal(b.isActive, true));
  });

  it("4. PUT /api/settings requires admin authentication", async () => {
    // Unauthenticated
    const resNoAuth = await makeRequest("PUT", "/api/settings", { siteName: "Test" });
    assert.equal(resNoAuth.status, 401);

    // Citizen
    const resCitizen = await makeRequest("PUT", "/api/settings", { siteName: "Test" }, citizenToken);
    assert.equal(resCitizen.status, 403);
  });

  it("5. PUT /api/settings: Hiding an action button and badge persists as false in MongoDB", async () => {
    // Fetch current settings
    const initial = await makeRequest("GET", "/api/settings");
    const settings = initial.data.settings;

    // Modify: hide button 0 ('btn-explore') and hide badge 1 ('tb-2')
    const updatedButtons = settings.heroContent.actionButtons.map((b, i) =>
      i === 0 ? { ...b, isActive: false } : b
    );
    const updatedBadges = settings.heroContent.trustBadges.map((t, i) =>
      i === 1 ? { ...t, isActive: false } : t
    );

    const updatePayload = {
      heroContent: {
        ...settings.heroContent,
        actionButtons: updatedButtons,
        trustBadges: updatedBadges,
      },
    };

    const putRes = await makeRequest("PUT", "/api/settings", updatePayload, adminToken);
    assert.equal(putRes.status, 200);
    assert.equal(putRes.data.success, true);

    // Verify in MongoDB document directly
    const dbDoc = await SiteSettings.findOne({ key: "primary_settings" }).lean();
    assert.equal(dbDoc.heroContent.actionButtons[0].isActive, false);
    assert.equal(dbDoc.heroContent.actionButtons[0].id, "btn-explore");
    // Verify other buttons were NOT reset
    assert.equal(dbDoc.heroContent.actionButtons[1].isActive, true);
    assert.equal(dbDoc.heroContent.actionButtons[2].isActive, true);
    assert.equal(dbDoc.heroContent.actionButtons[3].isActive, true);
    assert.equal(dbDoc.heroContent.actionButtons[4].isActive, true);

    // Verify badges in MongoDB
    assert.equal(dbDoc.heroContent.trustBadges[0].isActive, true);
    assert.equal(dbDoc.heroContent.trustBadges[1].isActive, false);
    assert.equal(dbDoc.heroContent.trustBadges[2].isActive, true);
    assert.equal(dbDoc.heroContent.trustBadges[1].id, "tb-2");
  });

  it("6. Refreshing settings (GET /api/settings) preserves hidden items accurately", async () => {
    const res = await makeRequest("GET", "/api/settings");
    assert.equal(res.status, 200);
    const s = res.data.settings;

    const btn0 = s.heroContent.actionButtons[0];
    assert.equal(btn0.id, "btn-explore");
    assert.equal(btn0.isActive, false);

    const badge1 = s.heroContent.trustBadges[1];
    assert.equal(badge1.id, "tb-2");
    assert.equal(badge1.isActive, false);
  });

  it("7. Unhiding the button and badge restores isActive: true", async () => {
    const current = await makeRequest("GET", "/api/settings");
    const settings = current.data.settings;

    const restoredButtons = settings.heroContent.actionButtons.map((b) => ({
      ...b,
      isActive: true,
    }));
    const restoredBadges = settings.heroContent.trustBadges.map((t) => ({
      ...t,
      isActive: true,
    }));

    const putRes = await makeRequest(
      "PUT",
      "/api/settings",
      {
        heroContent: {
          ...settings.heroContent,
          actionButtons: restoredButtons,
          trustBadges: restoredBadges,
        },
      },
      adminToken
    );
    assert.equal(putRes.status, 200);

    const reloaded = await makeRequest("GET", "/api/settings");
    reloaded.data.settings.heroContent.actionButtons.forEach((b) =>
      assert.equal(b.isActive, true)
    );
    reloaded.data.settings.heroContent.trustBadges.forEach((t) =>
      assert.equal(t.isActive, true)
    );
  });

  it("8. GET /api/settings includes contributionFormSettings with default hideNavbarAndFooter: false", async () => {
    const res = await makeRequest("GET", "/api/settings");
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.settings.contributionFormSettings);
    assert.equal(res.data.settings.contributionFormSettings.hideNavbarAndFooter, false);
  });

  it("9. PUT /api/settings: Citizen cannot modify contributionFormSettings (403 Forbidden)", async () => {
    const res = await makeRequest(
      "PUT",
      "/api/settings",
      { contributionFormSettings: { hideNavbarAndFooter: true } },
      citizenToken
    );
    assert.equal(res.status, 403);
  });

  it("10. PUT /api/settings: Admin toggling hideNavbarAndFooter to true persists in DB and returns in GET", async () => {
    const putRes = await makeRequest(
      "PUT",
      "/api/settings",
      { contributionFormSettings: { hideNavbarAndFooter: true } },
      adminToken
    );
    assert.equal(putRes.status, 200);
    assert.equal(putRes.data.success, true);
    assert.equal(putRes.data.settings.contributionFormSettings.hideNavbarAndFooter, true);

    // Verify in MongoDB directly
    const dbDoc = await SiteSettings.findOne({ key: "primary_settings" }).lean();
    assert.equal(dbDoc.contributionFormSettings?.hideNavbarAndFooter, true);

    // Verify subsequent GET returns the persisted setting
    const getRes = await makeRequest("GET", "/api/settings");
    assert.equal(getRes.status, 200);
    assert.equal(getRes.data.settings.contributionFormSettings?.hideNavbarAndFooter, true);
  });

  it("11. PUT /api/settings: Admin toggling hideNavbarAndFooter back to false persists in DB", async () => {
    const putRes = await makeRequest(
      "PUT",
      "/api/settings",
      { contributionFormSettings: { hideNavbarAndFooter: false } },
      adminToken
    );
    assert.equal(putRes.status, 200);
    assert.equal(putRes.data.settings.contributionFormSettings.hideNavbarAndFooter, false);

    const dbDoc = await SiteSettings.findOne({ key: "primary_settings" }).lean();
    assert.equal(dbDoc.contributionFormSettings?.hideNavbarAndFooter, false);
  });

  it("12. GET /api/forms/public/area-details returns the published area-details form with 200", async () => {
    const res = await makeRequest("GET", "/api/forms/public/area-details");
    assert.equal(res.status, 200);
    assert.equal(res.data.slug, "area-details");
    assert.equal(res.data.status, "published");
    assert.equal(res.data.targetModule, "map");
    assert.ok(Array.isArray(res.data.fields));
    assert.ok(res.data.fields.length >= 5);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });
});
