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

import SiteSettings from "../models/SiteSettings.js";
import User from "../models/User.js";
import profileRoutes from "../routes/profile.js";
import settingsRoutes from "../routes/settings.js";

const TEST_PORT = 5062;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

describe("Theme System — Independent Personal Theme Preferences & Isolation", () => {
  let server;
  let userAToken;
  let userBToken;
  let adminToken;
  let userA;
  let userB;
  let adminUser;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    await User.deleteMany({
      email: { $in: ["user-alpha@fazilnagar.com", "user-beta@fazilnagar.com", "admin-theme@fazilnagar.com"] },
    });

    userA = await User.create({
      name: "Citizen Alpha",
      email: "user-alpha@fazilnagar.com",
      password: "password123",
      role: "user",
      status: "active",
      themePreference: null,
    });

    userB = await User.create({
      name: "Citizen Beta",
      email: "user-beta@fazilnagar.com",
      password: "password123",
      role: "user",
      status: "active",
      themePreference: null,
    });

    adminUser = await User.create({
      name: "Admin Theme Tester",
      email: "admin-theme@fazilnagar.com",
      password: "password123",
      role: "admin",
      status: "active",
      themePreference: null,
    });

    userAToken = jwt.sign(
      { id: userA._id.toString(), email: userA.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    userBToken = jwt.sign(
      { id: userB._id.toString(), email: userB.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), email: adminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const app = express();
    app.use(express.json());
    app.use("/api/profile", profileRoutes);
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
      email: { $in: ["user-alpha@fazilnagar.com", "user-beta@fazilnagar.com", "admin-theme@fazilnagar.com"] },
    });
    await mongoose.disconnect();
  });

  function makeRequest(method, reqPath, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const options = {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: reqPath,
        method,
        headers,
      };

      const req = http.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      });

      req.on("error", reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  it("1. User A can save their personal theme preference to 'dark' via PATCH /api/profile/me", async () => {
    const res = await makeRequest("PATCH", "/api/profile/me", { themePreference: "dark" }, userAToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.success, true);
    assert.strictEqual(res.data?.profile?.themePreference, "dark");

    // Verify directly in DB
    const refreshed = await User.findById(userA._id);
    assert.strictEqual(refreshed.themePreference, "dark");
  });

  it("2. User B's theme preference remains completely isolated and unchanged", async () => {
    const res = await makeRequest("GET", "/api/profile/me", null, userBToken);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data?.profile?.themePreference, null);

    // Set User B's preference to 'light'
    const patchRes = await makeRequest("PATCH", "/api/profile/me", { themePreference: "light" }, userBToken);
    assert.strictEqual(patchRes.status, 200);
    assert.strictEqual(patchRes.data?.profile?.themePreference, "light");

    // Re-verify User A is STILL 'dark'
    const userARes = await makeRequest("GET", "/api/profile/me", null, userAToken);
    assert.strictEqual(userARes.data?.profile?.themePreference, "dark");
  });

  it("3. Admin updating global site settings does NOT overwrite User A's or User B's personal preference", async () => {
    const adminRes = await makeRequest(
      "PUT",
      "/api/settings/theme",
      { themeId: "pawanagar-emerald", mode: "light" },
      adminToken
    );
    assert.strictEqual(adminRes.status, 200);

    // Verify User A still has personal 'dark' preference
    const checkA = await makeRequest("GET", "/api/profile/me", null, userAToken);
    assert.strictEqual(checkA.data?.profile?.themePreference, "dark");

    // Verify User B still has personal 'light' preference
    const checkB = await makeRequest("GET", "/api/profile/me", null, userBToken);
    assert.strictEqual(checkB.data?.profile?.themePreference, "light");
  });

  it("4. Client ThemeContext.jsx implements dedicated localStorage key 'fazilnagar-theme'", () => {
    const themeContextPath = path.join(rootDir, "client/src/context/ThemeContext.jsx");
    const code = fs.readFileSync(themeContextPath, "utf-8");

    assert.ok(code.includes("fazilnagar-theme"), "ThemeContext must use dedicated 'fazilnagar-theme' storage key");
    assert.ok(code.includes("getStoredPersonalMode"), "ThemeContext must define personal mode resolver");
    assert.ok(code.includes("saveStoredPersonalMode"), "ThemeContext must save personal mode");
  });

  it("5. Client ThemeContext.jsx isolates personal theme mode from broadcast events", () => {
    const themeContextPath = path.join(rootDir, "client/src/context/ThemeContext.jsx");
    const code = fs.readFileSync(themeContextPath, "utf-8");

    // Ensure broadcast channel is only used for PALETTE_UPDATED and does NOT broadcast personal mode
    assert.ok(code.includes("PALETTE_UPDATED"), "Broadcast should only sync palette/visual identity");
    assert.ok(
      !code.includes("channel.postMessage({ type: \"THEME_UPDATED\", config })"),
      "Must not broadcast global theme mode that forces other tabs/users into same mode"
    );
  });

  it("6. AdminTopbar.jsx mounts personal ThemeToggle and supports dark mode", () => {
    const topbarPath = path.join(rootDir, "client/src/components/admin/AdminTopbar.jsx");
    const code = fs.readFileSync(topbarPath, "utf-8");

    assert.ok(code.includes("<ThemeToggle"), "AdminTopbar must render ThemeToggle for administrator");
    assert.ok(code.includes("dark:bg-"), "AdminTopbar must include dark mode background classes");
  });

  it("7. AdminLayout.jsx includes dark mode workspace classes", () => {
    const layoutPath = path.join(rootDir, "client/src/components/admin/AdminLayout.jsx");
    const code = fs.readFileSync(layoutPath, "utf-8");

    assert.ok(code.includes("dark:bg-"), "AdminLayout must include dark mode background class");
    assert.ok(code.includes("dark:text-"), "AdminLayout must include dark mode text class");
  });
});
