import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import googleDriveRoutes, { verifyDriveAuth, createOAuth2Client } from "../routes/googleDrive.js";

const PORT = 5119;

describe("Google Drive OAuth & Diagnostics Architecture", () => {
  let server;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/google-drive", googleDriveRoutes);
    await new Promise((resolve) => {
      server = app.listen(PORT, resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("1. verifyDriveAuth cleanly handles missing credentials without throwing", async () => {
    const oldId = process.env.GOOGLE_CLIENT_ID;
    const oldSecret = process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const res = await verifyDriveAuth();
    assert.equal(res.configured, false);
    assert.equal(res.connected, false);
    assert.equal(res.error, "missing_credentials");
    assert.equal(res.folderName, "Fazilnagar Media");

    if (oldId) process.env.GOOGLE_CLIENT_ID = oldId;
    if (oldSecret) process.env.GOOGLE_CLIENT_SECRET = oldSecret;
  });

  it("2. GET /api/google-drive/status returns HTTP 200 with actionable diagnostic JSON without leaking secrets", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/google-drive/status`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(typeof data.configured === "boolean");
    assert.ok(typeof data.connected === "boolean");
    assert.ok(typeof data.reconnectRequired === "boolean");
    assert.equal(data.folderName, "Fazilnagar Media");
    assert.equal(typeof data.mediaCount, "number");

    // Ensure no secret keys leaked
    assert.equal(data.clientSecret, undefined);
    assert.equal(data.refreshToken, undefined);
    assert.equal(data.tokens, undefined);
  });

  it("3. GET /api/google-drive/inspect returns HTTP 200 even when disconnected or expired", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/google-drive/inspect`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(typeof data.connected === "boolean");
    assert.ok(typeof data.configured === "boolean");
    assert.ok(data.folder !== undefined);
    assert.equal(data.folder.folderName, "Fazilnagar Media");
    assert.ok(data.mongo !== undefined);
  });

  it("4. POST /api/google-drive/upload rejects unauthenticated requests with HTTP 401", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/google-drive/upload`, {
      method: "POST",
    });
    assert.equal(res.status, 401);
  });

  it("5. POST /api/google-drive/admin/upload rejects unauthenticated requests with HTTP 401", async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/google-drive/admin/upload`, {
      method: "POST",
    });
    assert.equal(res.status, 401);
  });
});
