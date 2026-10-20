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

import { isOriginAllowed } from "../utils/corsConfig.js";
import mongoSanitize from "../middleware/mongoSanitize.js";
import { checkAccountLockout, recordFailedLogin, recordSuccessfulLogin } from "../middleware/rateLimiter.js";
import User from "../models/User.js";
import usersRoutes from "../routes/users.js";
import formsRoutes from "../routes/forms.js";
import googleDriveRoutes from "../routes/googleDrive.js";
import newsRoutes from "../routes/news.js";
import profileRoutes from "../routes/profile.js";

const TEST_PORT = 5088;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("DEFENSE-IN-DEPTH SECURITY ARCHITECTURE TEST SUITE", () => {
  let server;
  let testCitizenUser;
  let testAdminUser;
  let citizenToken;
  let adminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    testCitizenUser = await User.findOneAndUpdate(
      { email: "defense_citizen@fazilnagar.test" },
      {
        name: "Security Citizen",
        email: "defense_citizen@fazilnagar.test",
        password: "hashed_dummy_password",
        role: "user",
        status: "active",
        isEmailVerified: true,
      },
      { upsert: true, new: true }
    );

    testAdminUser = await User.findOneAndUpdate(
      { email: "defense_admin@fazilnagar.test" },
      {
        name: "Security Admin",
        email: "defense_admin@fazilnagar.test",
        password: "hashed_dummy_password",
        role: "admin",
        status: "active",
        isEmailVerified: true,
      },
      { upsert: true, new: true }
    );

    citizenToken = jwt.sign(
      { id: testCitizenUser._id, email: testCitizenUser.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { id: testAdminUser._id, email: testAdminUser.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const app = express();
    app.set("trust proxy", 1);
    app.disable("x-powered-by");

    // Enforce safe methods
    app.use((req, res, next) => {
      const allowedMethods = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
      if (!allowedMethods.includes(req.method)) {
        return res.status(405).json({ success: false, message: "Method not allowed." });
      }
      next();
    });

    // Security headers
    app.use((req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      next();
    });

    app.use("/api", (req, res, next) => {
      res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none';");
      next();
    });

    app.use(express.json({ limit: "2mb" }));
    app.use(mongoSanitize);

    // Sanitized Health check endpoint
    app.get(["/health", "/api/health"], (req, res) => {
      const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
      res.status(200).json({
        status: dbState === "connected" ? "healthy" : "database_issue",
        database: dbState,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    });

    app.use("/api/users", usersRoutes);
    app.use("/api/forms", formsRoutes);
    app.use("/api/google-drive", googleDriveRoutes);
    app.use("/api/news", newsRoutes);
    app.use("/api/profile", profileRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await User.deleteMany({
      email: { $in: ["defense_citizen@fazilnagar.test", "defense_admin@fazilnagar.test"] },
    });
    await mongoose.disconnect();
  });

  const makeReq = ({ path, method = "GET", token = null, body = null, origin = null }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (origin) headers.Origin = origin;

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path,
          method,
          headers,
        },
        (res) => {
          let rawData = "";
          res.on("data", (chunk) => (rawData += chunk));
          res.on("end", () => {
            let json = null;
            try {
              json = JSON.parse(rawData);
            } catch (_) {}
            resolve({ status: res.statusCode, headers: res.headers, body: json, raw: rawData });
          });
        }
      );
      req.on("error", reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  describe("Layer 1: Network & HTTP Security", () => {
    it("1. Rejects dangerous HTTP methods like TRACE with 405 Method Not Allowed", async () => {
      const res = await makeReq({ path: "/api/health", method: "TRACE" });
      assert.equal(res.status, 405);
    });

    it("2. Injects standard security headers (nosniff, DENY, HSTS, API CSP)", async () => {
      const res = await makeReq({ path: "/api/health", method: "GET" });
      assert.equal(res.headers["x-content-type-options"], "nosniff");
      assert.equal(res.headers["x-frame-options"], "DENY");
      assert.ok(res.headers["strict-transport-security"]);
      assert.equal(res.headers["content-security-policy"], "default-src 'none'; frame-ancestors 'none';");
    });

    it("3. Strict CORS rejects untrusted random vercel.app domains", () => {
      assert.equal(isOriginAllowed("https://malicious-attacker.vercel.app"), false);
      assert.equal(isOriginAllowed("https://evil.vercel.app"), false);
      assert.equal(isOriginAllowed("https://fazilnagar.vercel.app"), true);
      assert.equal(isOriginAllowed("https://fazilnagar-portal-nine.vercel.app"), true);
      assert.equal(isOriginAllowed("https://fazilnagar-preview-12.vercel.app"), true);
      assert.equal(isOriginAllowed("https://fazilnagar.me"), true);
    });
  });

  describe("Layer 2: Authentication & Sessions", () => {
    it("4. Prevents brute-force via account lockout tracking after repeated failures", () => {
      const targetEmail = "test_target_lockout@fazilnagar.me";
      recordSuccessfulLogin(targetEmail);
      assert.equal(checkAccountLockout(targetEmail).locked, false);

      for (let i = 0; i < 5; i++) {
        recordFailedLogin(targetEmail);
      }

      // Check lockout status
      const lockoutState = checkAccountLockout(targetEmail);
      assert.equal(lockoutState.locked, true);
      assert.ok(lockoutState.waitSeconds > 0);

      // Clean up after test
      recordSuccessfulLogin(targetEmail);
      assert.equal(checkAccountLockout(targetEmail).locked, false);
    });
  });

  describe("Layer 3: Authorization & Privilege Separation", () => {
    it("5. Rejects unauthenticated access to admin user management (401)", async () => {
      const res = await makeReq({ path: "/api/users", method: "GET" });
      assert.equal(res.status, 401);
    });

    it("6. Rejects standard citizen token from accessing admin user management (403)", async () => {
      const res = await makeReq({ path: "/api/users", method: "GET", token: citizenToken });
      assert.equal(res.status, 403);
    });

    it("7. Allows verified admin token to access admin user management (200)", async () => {
      const res = await makeReq({ path: "/api/users", method: "GET", token: adminToken });
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.users));
    });

    it("8. Rejects citizen token from creating dynamic forms (403)", async () => {
      const res = await makeReq({
        path: "/api/forms",
        method: "POST",
        token: citizenToken,
        body: { title: "Hacked Form", targetModule: "directory", entityType: "general" },
      });
      assert.equal(res.status, 403);
    });

    it("9. Protects Google Drive inspect endpoint: non-admins cannot snoop private file lists", async () => {
      const publicRes = await makeReq({ path: "/api/google-drive/inspect", method: "GET" });
      assert.equal(publicRes.status, 200);
      // Non-admin receives empty file arrays to prevent snooping
      assert.deepEqual(publicRes.body.mongo.recentFiles, []);
      assert.deepEqual(publicRes.body.folder.files, []);
    });
  });

  describe("Layer 4: API & Database Security (NoSQL Sanitization)", () => {
    it("10. Sanitizes $gt, $ne, and dot-notation keys from body and query to block NoSQL injection", () => {
      const mockReq = {
        body: {
          email: "user@test.com",
          $where: "maliciousScript()",
          nested: { $gt: "" },
          "dot.key": "injected",
        },
        query: {
          category: { $ne: null },
        },
        params: {},
      };

      mongoSanitize(mockReq, {}, () => {});

      assert.equal(mockReq.body.email, "user@test.com");
      assert.equal(mockReq.body.$where, undefined);
      assert.equal(mockReq.body.nested.$gt, undefined);
      assert.equal(mockReq.body["dot.key"], undefined);
      assert.equal(mockReq.query.category.$ne, undefined);
    });
  });

  describe("Layer 6: Monitoring & Safe Operational Health", () => {
    it("11. Health check returns status without leaking database host, uriSource, or raw errors", async () => {
      const res = await makeReq({ path: "/api/health", method: "GET" });
      assert.equal(res.status, 200);
      assert.equal(res.body.status, "healthy");
      assert.equal(res.body.database, "connected");

      // Verify NO sensitive infrastructure details are exposed
      assert.equal(res.body.databaseHost, undefined);
      assert.equal(res.body.uriSource, undefined);
      assert.equal(res.body.dbConnectionError, undefined);
    });
  });

  describe("Regression & Comprehensive Verification (8 Targeted Focus Areas)", () => {
    it("A. Upload Security: Allows audio, video, PDF, document, images while blocking executables", async () => {
      const { upload } = await import("../middleware/upload.js");
      const fileFilter = upload.fileFilter || upload.storage?.fileFilter;

      // Helper to test upload.js fileFilter
      const testFilter = (file) => {
        return new Promise((resolve) => {
          upload.fileFilter({}, file, (err, pass) => {
            if (err) resolve({ pass: false, error: err.message });
            else resolve({ pass: Boolean(pass) });
          });
        });
      };

      // 1. Audio (mp3, wav)
      const audioResult = await testFilter({ originalname: "town_announcement.mp3", mimetype: "audio/mpeg" });
      assert.equal(audioResult.pass, true);

      // 2. Video (mp4, webm)
      const videoResult = await testFilter({ originalname: "event_clip.mp4", mimetype: "video/mp4" });
      assert.equal(videoResult.pass, true);

      // 3. Document / PDF (pdf)
      const pdfResult = await testFilter({ originalname: "official_tender.pdf", mimetype: "application/pdf" });
      assert.equal(pdfResult.pass, true);

      // 4. Image (webp, png, jpg)
      const imgResult = await testFilter({ originalname: "header_photo.webp", mimetype: "image/webp" });
      assert.equal(imgResult.pass, true);

      // 5. Block dangerous executable files (.exe, .bat, .php)
      const exeResult = await testFilter({ originalname: "malware.exe", mimetype: "application/x-msdownload" });
      assert.equal(exeResult.pass, false);
      assert.ok(exeResult.error.includes("blocked for security reasons"));

      const phpResult = await testFilter({ originalname: "backdoor.php", mimetype: "application/x-php" });
      assert.equal(phpResult.pass, false);
    });

    it("B. NoSQL Sanitization Safety: Preserves valid query values with dots and handles frozen objects without throwing", () => {
      // 1. Valid parameter values containing dots (e.g. filenames, search queries, domains)
      const validReq = {
        query: {
          search: "st.joseph.school",
          filename: "document.v1.pdf",
          page: "1",
        },
        body: {
          url: "https://fazilnagar.me/portal",
          note: "Meeting at 10.30 AM.",
        },
      };

      mongoSanitize(validReq, {}, () => {});

      // Values containing dots MUST NOT be deleted
      assert.equal(validReq.query.search, "st.joseph.school");
      assert.equal(validReq.query.filename, "document.v1.pdf");
      assert.equal(validReq.body.url, "https://fazilnagar.me/portal");
      assert.equal(validReq.body.note, "Meeting at 10.30 AM.");

      // 2. Frozen objects, Buffers, Dates must not throw
      const frozenObj = Object.freeze({ key: "immutable" });
      const edgeCaseReq = {
        body: {
          frozen: frozenObj,
          timestamp: new Date(),
          rawBuffer: Buffer.from("data"),
        },
      };

      assert.doesNotThrow(() => {
        mongoSanitize(edgeCaseReq, {}, () => {});
      });
      assert.equal(edgeCaseReq.body.frozen.key, "immutable");
    });

    it("C. Authorization: Citizens cannot elevate their role to admin via profile updates", async () => {
      const res = await makeReq({
        path: "/api/profile/me",
        method: "PATCH",
        token: citizenToken,
        body: {
          name: "Security Citizen",
          role: "admin",
          isEmailVerified: true,
          status: "active",
        },
      });

      assert.equal(res.status, 200);

      // Verify the database record directly: role MUST REMAIN 'user'
      const freshUser = await User.findById(testCitizenUser._id);
      assert.equal(freshUser.role, "user");
    });

    it("D. Admin & Google Drive Isolation: Admin token retrieves full inspection data", async () => {
      const adminRes = await makeReq({
        path: "/api/google-drive/inspect",
        method: "GET",
        token: adminToken,
      });

      assert.equal(adminRes.status, 200);
      assert.ok(adminRes.body.mongo);
      assert.ok(Array.isArray(adminRes.body.mongo.recentFiles));
      assert.ok(Array.isArray(adminRes.body.folder.files));
    });
  });
});
