import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });
process.env.NODE_ENV = "test";

import authRoutes from "../routes/auth.js";
import profileRoutes from "../routes/profile.js";
import User from "../models/User.js";
import { getTestSentEmails } from "../utils/emailService.js";

const TEST_PORT = 5110;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Global Uniqueness Suite for Username and Mobile Phone", () => {
  let server;
  let testUserIds = [];

  const rand = Math.floor(Math.random() * 89999 + 10000);
  const u1Username = `unique_u1_${rand}`;
  const u1Phone = `98111${rand}`;
  const u1Email = `u1_${rand}@example.com`;

  const u2Username = `unique_u2_${rand}`;
  const u2Phone = `98222${rand}`;
  const u2Email = `u2_${rand}@example.com`;

  let u1Token;
  let u2Token;

  const registerAndVerify = async (data) => {
    const initRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (initRes.status !== 200) {
      return initRes;
    }
    const emails = getTestSentEmails();
    const otp = emails[emails.length - 1].otp;
    return fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, otp }),
    });
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/profile", profileRoutes);

    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(TEST_PORT, resolve);
    });
  });

  after(async () => {
    if (testUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: testUserIds } });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("1. Successfully registers User 1 with unique username and phone", async () => {
    const res = await registerAndVerify({
      name: "Test User 1",
      email: u1Email,
      password: "password123",
      username: u1Username,
      phone: `+91 ${u1Phone}`, // with country code
    });

    const body = await res.json();
    assert.equal(res.status, 201, `Failed to register: ${JSON.stringify(body)}`);
    assert.equal(body.user.username, u1Username);
    assert.equal(body.user.phone, u1Phone);
    assert.ok(body.token);

    u1Token = body.token;
    testUserIds.push(body.user.id);
  });

  it("2. Rejects registration when username is already taken", async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Imposter User",
        email: `imposter_${rand}@example.com`,
        password: "password123",
        username: u1Username, // collision
        phone: `99333${rand}`,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.message, /already taken/i);
  });

  it("3. Rejects registration when phone number is already registered (even with leading 0 or +91)", async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate Phone User",
        email: `dup_phone_${rand}@example.com`,
        password: "password123",
        username: `dup_phone_${rand}`,
        phone: `0${u1Phone}`, // collision through 0-prefix normalization
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.message, /mobile number is already registered/i);
  });

  it("4. Allows User 2 to register with unique credentials", async () => {
    const res = await registerAndVerify({
      name: "Test User 2",
      email: u2Email,
      password: "password123",
      username: u2Username,
      phone: u2Phone,
    });

    const body = await res.json();
    assert.equal(res.status, 201);
    assert.equal(body.user.username, u2Username);
    assert.equal(body.user.phone, u2Phone);

    u2Token = body.token;
    testUserIds.push(body.user.id);
  });

  it("5. Rejects profile PATCH when User 2 attempts to claim User 1's phone", async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/profile/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${u2Token}`,
      },
      body: JSON.stringify({
        phone: `+91 ${u1Phone}`,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.message, /mobile number is already registered/i);
  });

  it("6. Rejects profile PATCH when User 2 attempts to claim User 1's username", async () => {
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/profile/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${u2Token}`,
      },
      body: JSON.stringify({
        username: u1Username,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 400);
    assert.match(body.message, /already taken/i);
  });

  it("7. Allows User 2 to update profile with a brand new unused phone number", async () => {
    const newPhone = `98999${rand}`;
    const res = await fetch(`http://127.0.0.1:${TEST_PORT}/api/profile/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${u2Token}`,
      },
      body: JSON.stringify({
        phone: newPhone,
      }),
    });

    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.profile.phone, newPhone);
  });
});
