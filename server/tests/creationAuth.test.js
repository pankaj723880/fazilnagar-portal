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

import newsRoutes from "../routes/news.js";
import googleDriveRoutes from "../routes/googleDrive.js";
import submissionRoutes from "../routes/submissions.js";
import placeRoutes from "../routes/places.js";

const TEST_PORT = 5066;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Content Creation & Mutation Security: Authentication & Authorization Guards", () => {
  let server;
  let citizenToken;
  let adminToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    citizenToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString(), email: "citizen@fazilnagar.com", role: "citizen" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { id: new mongoose.Types.ObjectId().toString(), email: "admin@fazilnagar.com", role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const app = express();
    app.use(express.json());

    app.use("/api/news", newsRoutes);
    app.use("/api/google-drive", googleDriveRoutes);
    app.use("/api/submissions", submissionRoutes);
    app.use("/api/places", placeRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const headers = {
        "Content-Type": "application/json",
      };
      if (data) headers["Content-Length"] = Buffer.byteLength(data);
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
          let resData = "";
          res.on("data", (chunk) => (resData += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, data: resData ? JSON.parse(resData) : {} });
            } catch {
              resolve({ status: res.statusCode, data: resData });
            }
          });
        }
      );

      req.on("error", reject);
      if (data) req.write(data);
      req.end();
    });
  };

  it("1. POST /api/news without token is rejected with HTTP 401", async () => {
    const res = await request("POST", "/api/news", { title: "Unauthenticated News" });
    assert.equal(res.status, 401, "Unauthenticated news creation must be rejected with 401");
  });

  it("2. POST /api/google-drive/upload without token is rejected with HTTP 401", async () => {
    const res = await request("POST", "/api/google-drive/upload", {});
    assert.equal(res.status, 401, "Unauthenticated file upload to google drive route must be rejected with 401");
  });

  it("3. POST /api/submissions/upload-images without token is rejected with HTTP 401", async () => {
    const res = await request("POST", "/api/submissions/upload-images", {});
    assert.equal(res.status, 401, "Unauthenticated image upload must be rejected with 401");
  });

  it("4. POST /api/submissions/place without token is rejected with HTTP 401", async () => {
    const res = await request("POST", "/api/submissions/place", { name: "Test Place" });
    assert.equal(res.status, 401, "Unauthenticated place submission must be rejected with 401");
  });

  it("5. POST /api/submissions without token is rejected with HTTP 401", async () => {
    const res = await request("POST", "/api/submissions", { type: "business", title: "Test Submission" });
    assert.equal(res.status, 401, "Unauthenticated general submission must be rejected with 401");
  });

  it("6. POST /api/places without token is rejected with HTTP 401", async () => {
    const res = await request("POST", "/api/places", { name: "Direct Place Creation" });
    assert.equal(res.status, 401, "Unauthenticated place creation must be rejected with 401");
  });

  it("7. POST /api/places with non-admin token is rejected with HTTP 403 Forbidden", async () => {
    const res = await request("POST", "/api/places", { name: "Direct Place Creation" }, citizenToken);
    assert.equal(res.status, 403, "Citizen cannot directly insert official places (requires admin)");
  });

  it("8. Public GET endpoints remain accessible to unauthenticated guests", async () => {
    const res = await request("GET", "/api/places?limit=1");
    assert.equal(res.status, 200, "Public places GET must remain open");
  });
});
