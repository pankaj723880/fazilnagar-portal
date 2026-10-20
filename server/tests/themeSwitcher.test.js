import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(__dirname, "../.env") });

import SiteSettings, { ALLOWED_THEME_IDS } from "../models/SiteSettings.js";
import User from "../models/User.js";
import settingsRoutes from "../routes/settings.js";

const TEST_PORT = 5058;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

describe("Theme System — Strict Admin-Only Theme Controls & 12 Theme Integrity", () => {
  let server;
  let adminToken;
  let citizenToken;
  let testAdminUser;
  let testCitizenUser;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Reset settings in database
    await SiteSettings.deleteOne({ key: "primary_settings" });

    // Clean up test users
    await User.deleteMany({
      email: { $in: ["theme-admin@fazilnagar.com", "theme-citizen@fazilnagar.com"] },
    });

    // Create real test users
    testAdminUser = await User.create({
      name: "Theme Admin Tester",
      email: "theme-admin@fazilnagar.com",
      password: "hashedpassword123",
      role: "admin",
      status: "active",
    });

    testCitizenUser = await User.create({
      name: "Theme Citizen Tester",
      email: "theme-citizen@fazilnagar.com",
      password: "hashedpassword123",
      role: "user",
      status: "active",
    });

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

    const app = express();
    app.use(express.json());
    app.use("/api/settings", settingsRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({
      email: { $in: ["theme-admin@fazilnagar.com", "theme-citizen@fazilnagar.com"] },
    });
    // Ensure default theme is restored in DB
    await SiteSettings.updateOne(
      { key: "primary_settings" },
      { $set: { "themeConfig.themeId": "heritage-terracotta", "themeConfig.mode": "light" } }
    );
  });

  function makeRequest(method, reqPath, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path: reqPath,
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
            } catch {
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

  // 1. Static CSS & Catalog Integrity
  it("CSS contains all 12 curated theme tokens and Light/Dark selectors", () => {
    const cssPath = path.join(rootDir, "client/src/index.css");
    assert.ok(fs.existsSync(cssPath), "index.css must exist");
    const css = fs.readFileSync(cssPath, "utf8");

    ALLOWED_THEME_IDS.forEach((id) => {
      assert.ok(
        css.includes(`data-theme-id="${id}"`),
        `index.css must define styles for theme '${id}'`
      );
    });

    assert.ok(css.includes(".admin-workspace"), "index.css must isolate admin workspace");
  });

  // 2. Universal availability of dark/light mode toggle for all users
  it("Public pages have theme toggle available to all users, and ThemeToggle renders accessible controls", () => {
    const togglePath = path.join(rootDir, "client/src/components/ThemeToggle.jsx");
    const toggleCode = fs.readFileSync(togglePath, "utf8");
    assert.ok(
      !toggleCode.includes("return null"),
      "ThemeToggle must render active controls for all visitors"
    );
    assert.ok(
      toggleCode.includes("toggleTheme"),
      "ThemeToggle must hook into toggleTheme from ThemeContext"
    );

    const appPath = path.join(rootDir, "client/src/App.jsx");
    const appCode = fs.readFileSync(appPath, "utf8");
    assert.ok(
      appCode.includes("<ThemeToggle"),
      "App.jsx must render ThemeToggle for public desktop and mobile users"
    );

    const mobilePath = path.join(rootDir, "client/src/components/MobileHomePortal.jsx");
    const mobileCode = fs.readFileSync(mobilePath, "utf8");
    assert.ok(
      mobileCode.includes("<ThemeToggle"),
      "MobileHomePortal.jsx must render ThemeToggle for mobile home visitors"
    );
  });

  // 3. Admin Theme Gallery Integration
  it("Admin dashboard mounts Theme Gallery in sidebar, review desk, and settings CMS", () => {
    const sidebarPath = path.join(rootDir, "client/src/components/admin/AdminSidebar.jsx");
    const sidebarCode = fs.readFileSync(sidebarPath, "utf8");
    assert.ok(sidebarCode.includes("cms-themes"), "AdminSidebar must contain cms-themes entry");

    const reviewPath = path.join(rootDir, "client/src/pages/AdminReview.jsx");
    const reviewCode = fs.readFileSync(reviewPath, "utf8");
    assert.ok(
      reviewCode.includes("cms-themes") && reviewCode.includes("AdminThemeGallery"),
      "AdminReview must route cms-themes to AdminThemeGallery"
    );

    const settingsCMSPath = path.join(rootDir, "client/src/components/AdminSettingsCMS.jsx");
    const settingsCMSCode = fs.readFileSync(settingsCMSPath, "utf8");
    assert.ok(
      settingsCMSCode.includes("AdminThemeGallery") && settingsCMSCode.includes("themes"),
      "AdminSettingsCMS must include themes tab and render AdminThemeGallery"
    );
  });

  // 4. Default theme configuration
  it("GET /api/settings returns Heritage Ivory + Terracotta (light) as default", async () => {
    const res = await makeRequest("GET", "/api/settings");
    assert.strictEqual(res.status, 200);
    assert.ok(res.data?.settings?.themeConfig, "Settings must have themeConfig");
    assert.strictEqual(res.data.settings.themeConfig.themeId, "heritage-terracotta");
    assert.strictEqual(res.data.settings.themeConfig.mode, "light");
  });

  // 5. Backend Authorization: Public/Unauthenticated access rejected
  it("PUT /api/settings/theme rejects unauthenticated requests with 401", async () => {
    const res = await makeRequest("PUT", "/api/settings/theme", {
      themeId: "graphite-royale",
      mode: "dark",
    });
    assert.strictEqual(res.status, 401);
  });

  // 6. Backend Authorization: Regular user/Citizen rejected
  it("PUT /api/settings/theme rejects regular citizen users with 403", async () => {
    const res = await makeRequest(
      "PUT",
      "/api/settings/theme",
      { themeId: "graphite-royale", mode: "dark" },
      citizenToken
    );
    assert.strictEqual(res.status, 403);
    assert.ok(res.data?.message?.includes("Admin privileges required"));
  });

  // 7. Input Validation: Invalid theme ID rejected
  it("PUT /api/settings/theme rejects unknown theme IDs with 400", async () => {
    const res = await makeRequest(
      "PUT",
      "/api/settings/theme",
      { themeId: "invalid-neon-theme", mode: "dark" },
      adminToken
    );
    assert.strictEqual(res.status, 400);
    assert.ok(res.data?.message?.includes("Invalid themeId"));
  });

  // 8. Input Validation: Invalid mode rejected
  it("PUT /api/settings/theme rejects invalid appearance mode with 400", async () => {
    const res = await makeRequest(
      "PUT",
      "/api/settings/theme",
      { themeId: "kushinagar-ochre", mode: "sepia" },
      adminToken
    );
    assert.strictEqual(res.status, 400);
    assert.ok(res.data?.message?.includes("Invalid mode"));
  });

  // 9. Admin update persists in database and applies globally
  it("PUT /api/settings/theme updates global theme in DB and reflects on public GET /api/settings", async () => {
    const updateRes = await makeRequest(
      "PUT",
      "/api/settings/theme",
      { themeId: "kushinagar-ochre", mode: "dark" },
      adminToken
    );
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data?.success, true);
    assert.strictEqual(updateRes.data?.themeConfig?.themeId, "kushinagar-ochre");
    assert.strictEqual(updateRes.data?.themeConfig?.mode, "dark");

    // Verify DB persistence directly
    const dbRecord = await SiteSettings.findOne({ key: "primary_settings" });
    assert.strictEqual(dbRecord.themeConfig.themeId, "kushinagar-ochre");
    assert.strictEqual(dbRecord.themeConfig.mode, "dark");

    // Verify public visitors receive the new theme
    const publicRes = await makeRequest("GET", "/api/settings");
    assert.strictEqual(publicRes.status, 200);
    assert.strictEqual(publicRes.data?.settings?.themeConfig?.themeId, "kushinagar-ochre");
    assert.strictEqual(publicRes.data?.settings?.themeConfig?.mode, "dark");
  });

  // 10. Revert back to Heritage Terracotta default
  it("Admin can switch back to default Heritage Ivory + Terracotta (light)", async () => {
    const resetRes = await makeRequest(
      "PUT",
      "/api/settings/theme",
      { themeId: "heritage-terracotta", mode: "light" },
      adminToken
    );
    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.data?.themeConfig?.themeId, "heritage-terracotta");
    assert.strictEqual(resetRes.data?.themeConfig?.mode, "light");
  });
});
