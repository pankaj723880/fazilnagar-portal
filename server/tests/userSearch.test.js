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

import usersRoutes from "../routes/users.js";
import User from "../models/User.js";
import Block from "../models/Block.js";

const TEST_PORT = 5088;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 2: Town Messaging User Search Test Suite", () => {
  let server;
  let userCaller;
  let userEnglish;
  let userHindi;
  let userEmailOptIn;
  let userEmailOptOut;
  let userBlockedByCaller;
  let userBlockedCaller;

  let callerToken;

  const makeRequest = ({ path, method = "GET", token }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json", Connection: "close" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path,
          method,
          headers,
          agent: false,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            let body = {};
            try {
              body = JSON.parse(data);
            } catch {
              body = { raw: data };
            }
            resolve({ status: res.statusCode, body });
          });
        }
      );

      req.on("error", reject);
      req.end();
    });
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/users", usersRoutes);

    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));

    // Clean up test users
    await User.deleteMany({ email: /@test-search\.fazilnagar\.in$/ });

    userCaller = await User.create({
      name: "Caller Citizen",
      email: "caller@test-search.fazilnagar.in",
      password: "hashedpassword123",
      username: "caller_cit",
      status: "active",
    });

    callerToken = jwt.sign(
      { id: userCaller._id.toString(), email: userCaller.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    userEnglish = await User.create({
      name: "Rajesh Kumar",
      email: "rajesh@test-search.fazilnagar.in",
      password: "hashedpassword123",
      username: "rajesh_fazilnagar",
      area: "Mahaveer Chowk",
      status: "active",
      showEmail: true,
    });

    userHindi = await User.create({
      name: "पंकज कुमार मद्धेशिया",
      email: "pankaj_hindi@test-search.fazilnagar.in",
      password: "hashedpassword123",
      username: "pankaj_kushinagar",
      area: "Fazilnagar Bazar",
      status: "active",
    });

    userEmailOptIn = await User.create({
      name: "Doctor Verma",
      email: "drverma@test-search.fazilnagar.in",
      password: "hashedpassword123",
      username: "dr_verma",
      findByEmail: true,
      status: "active",
    });

    userEmailOptOut = await User.create({
      name: "Secret User",
      email: "hidden@test-search.fazilnagar.in",
      password: "hashedpassword123",
      username: "secret_agent",
      findByEmail: false,
      status: "active",
    });

    userBlockedByCaller = await User.create({
      name: "Blocked By Me",
      email: "blockedbyme@test-search.fazilnagar.in",
      password: "hashedpassword123",
      username: "blocked_guy_1",
      status: "active",
    });

    userBlockedCaller = await User.create({
      name: "He Blocked Me",
      email: "blockedme@test-search.fazilnagar.in",
      password: "hashedpassword123",
      username: "blocker_guy_2",
      status: "active",
    });

    await Block.create({ blocker: userCaller._id, blocked: userBlockedByCaller._id });
    await Block.create({ blocker: userBlockedCaller._id, blocked: userCaller._id });
  });

  after(async () => {
    await User.deleteMany({ email: /@test-search\.fazilnagar\.in$/ });
    await Block.deleteMany({
      $or: [
        { blocker: userCaller._id },
        { blocked: userCaller._id },
      ],
    });

    if (server) {
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Unauthenticated search request is rejected with 401", async () => {
    const res = await makeRequest({ path: "/api/users/search?q=Rajesh" });
    assert.equal(res.status, 401);
  });

  it("2. Queries under 2 characters return empty array with guidance message", async () => {
    const res = await makeRequest({ path: "/api/users/search?q=R", token: callerToken });
    assert.equal(res.status, 200);
    assert.equal(res.body.users.length, 0);
    assert.match(res.body.message, /at least 2 characters/i);
  });

  it("3. Search by English name matches case-insensitively and masks email if showEmail is true", async () => {
    const res = await makeRequest({ path: "/api/users/search?q=rajesh", token: callerToken });
    assert.equal(res.status, 200);
    assert.ok(res.body.users.length >= 1);
    const found = res.body.users.find((u) => u.username === "rajesh_fazilnagar");
    assert.ok(found);
    assert.equal(found.name, "Rajesh Kumar");
    assert.equal(found.area, "Mahaveer Chowk");
    assert.match(found.maskedEmail, /ra\*\*\*\*@test-search\.fazilnagar\.in/);
    assert.equal(found.password, undefined);
  });

  it("4. Search supports Hindi/Devanagari characters", async () => {
    const query = encodeURIComponent("पंकज");
    const res = await makeRequest({ path: `/api/users/search?q=${query}`, token: callerToken });
    assert.equal(res.status, 200);
    assert.ok(res.body.users.length >= 1);
    const found = res.body.users.find((u) => u.username === "pankaj_kushinagar");
    assert.ok(found);
    assert.equal(found.name, "पंकज कुमार मद्धेशिया");
  });

  it("5. Search by username matches accurately", async () => {
    const res = await makeRequest({ path: "/api/users/search?q=pankaj_kushinagar", token: callerToken });
    assert.equal(res.status, 200);
    const found = res.body.users.find((u) => u.username === "pankaj_kushinagar");
    assert.ok(found);
  });

  it("6. Caller never sees themselves in search results", async () => {
    const res = await makeRequest({ path: "/api/users/search?q=Caller", token: callerToken });
    assert.equal(res.status, 200);
    const found = res.body.users.find((u) => u.username === "caller_cit");
    assert.equal(found, undefined);
  });

  it("7. Email search succeeds ONLY when user explicitly enabled findByEmail", async () => {
    // 7A: Dr Verma has findByEmail: true
    const resOptIn = await makeRequest({
      path: "/api/users/search?q=drverma@test-search.fazilnagar.in",
      token: callerToken,
    });
    assert.equal(resOptIn.status, 200);
    const foundOptIn = resOptIn.body.users.find((u) => u.username === "dr_verma");
    assert.ok(foundOptIn);

    // 7B: Secret User has findByEmail: false -> must NOT be found
    const resOptOut = await makeRequest({
      path: "/api/users/search?q=hidden@test-search.fazilnagar.in",
      token: callerToken,
    });
    assert.equal(resOptOut.status, 200);
    const foundOptOut = resOptOut.body.users.find((u) => u.username === "secret_agent");
    assert.equal(foundOptOut, undefined);
  });

  it("8. Blocked users (both blocked by caller and who blocked caller) are hidden from search results", async () => {
    const res1 = await makeRequest({ path: "/api/users/search?q=blocked_guy_1", token: callerToken });
    assert.equal(res1.status, 200);
    assert.equal(res1.body.users.find((u) => u.username === "blocked_guy_1"), undefined);

    const res2 = await makeRequest({ path: "/api/users/search?q=blocker_guy_2", token: callerToken });
    assert.equal(res2.status, 200);
    assert.equal(res2.body.users.find((u) => u.username === "blocker_guy_2"), undefined);
  });
});
