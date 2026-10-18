import test from "node:test";
import assert from "node:assert/strict";
import http from "http";
import express from "express";
import mongoose from "mongoose";
import submissionsRoutes from "../routes/submissions.js";
import Submission from "../models/Submission.js";

// Setup lightweight test Express application
const app = express();
app.use(express.json());
app.use("/api/submissions", submissionsRoutes);

// Unmapped API 404 handler
app.all("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint ${req.method} ${req.originalUrl} not found.`,
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload received.",
    });
  }
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "An unexpected internal server error occurred.",
  });
});

let server;
let baseUrl;

test.before(async () => {
  // Connect in-memory or mongo URI if present
  const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_test_upgrade";
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    }
  } catch (e) {
    // MongoDB mock fallback if local daemon is not running
  }

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (mongoose.connection.readyState !== 0) {
    try {
      await Submission.deleteMany({ referenceId: /^FZ-SUB-TEST/ });
    } catch (_) {}
  }
});

test("1. POST /api/submissions/correction validates required fields", async () => {
  // Missing name
  const res1 = await fetch(`${baseUrl}/api/submissions/correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", emailOrPhone: "9876543210", correctionDetails: "Wrong phone" }),
  });
  const data1 = await res1.json();
  assert.equal(res1.status, 400);
  assert.equal(data1.success, false);
  assert.match(data1.message, /name is required/i);

  // Missing contact
  const res2 = await fetch(`${baseUrl}/api/submissions/correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Ramesh", emailOrPhone: "", correctionDetails: "Wrong phone" }),
  });
  const data2 = await res2.json();
  assert.equal(res2.status, 400);
  assert.equal(data2.success, false);
  assert.match(data2.message, /phone number or email/i);

  // Missing details
  const res3 = await fetch(`${baseUrl}/api/submissions/correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Ramesh", emailOrPhone: "9876543210", listingName: "CHC Hospital", correctionDetails: "" }),
  });
  const data3 = await res3.json();
  assert.equal(res3.status, 400);
  assert.equal(data3.success, false);
  assert.match(data3.message, /provide details/i);
});

test("2. Unmapped API routes return standardized JSON 404 response", async () => {
  const res = await fetch(`${baseUrl}/api/non-existent-route-xyz`);
  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /not found/i);
});

test("3. Malformed JSON payload returns 400 JSON without HTML crash", async () => {
  const res = await fetch(`${baseUrl}/api/submissions/correction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ malformed json...",
  });
  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.match(data.message, /malformed json/i);
});
