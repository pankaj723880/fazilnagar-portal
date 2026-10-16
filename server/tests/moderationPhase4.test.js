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

import messagesRoutes from "../routes/messages.js";
import User from "../models/User.js";
import Block from "../models/Block.js";
import Report from "../models/Report.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import { initSocket } from "../socket.js";

const TEST_PORT = 5102;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 4: Citizen Blocking, Reporting & Moderation Test Suite", () => {
  let server;
  let io;
  let citizenA;
  let citizenB;
  let adminUser;
  let tokenA;
  let tokenB;
  let tokenAdmin;

  let directConv;
  let testMessage;
  let reportId;

  const makeRequest = ({ path, method = "GET", token, body = null }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json", Connection: "close" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = body ? JSON.stringify(body) : null;
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

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
              parsed = { raw: data };
            }
            resolve({ status: res.statusCode, body: parsed });
          });
        }
      );

      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

      const app = express();
      app.use(express.json());
      app.use("/api/messages", messagesRoutes);

      server = http.createServer(app);
      io = initSocket(server);
      await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));

      // Cleanup previous test users and records
      await User.deleteMany({ email: /@test-phase4\.fazilnagar\.in$/ });
      await Block.deleteMany({});
      await Report.deleteMany({ details: /Test report/ });

      citizenA = await User.create({
        name: "Citizen Alpha",
        email: "citizen_a@test-phase4.fazilnagar.in",
        password: "password123",
        username: "citizen_alpha",
        role: "user",
        status: "active",
      });

      citizenB = await User.create({
        name: "Citizen Beta",
        email: "citizen_b@test-phase4.fazilnagar.in",
        password: "password123",
        username: "citizen_beta",
        role: "user",
        status: "active",
      });

      adminUser = await User.create({
        name: "Admin Moderator",
        email: "admin_mod@test-phase4.fazilnagar.in",
        password: "adminpassword123",
        username: "admin_mod",
        role: "admin",
        status: "active",
      });

      tokenA = jwt.sign({ id: citizenA._id.toString(), email: citizenA.email, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
      tokenB = jwt.sign({ id: citizenB._id.toString(), email: citizenB.email, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
      tokenAdmin = jwt.sign({ id: adminUser._id.toString(), email: adminUser.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

      // Setup direct conversation and sample message
      directConv = await Conversation.create({
        type: "direct",
        status: "active",
        initiator: citizenA._id,
        directUserA: citizenA._id,
        directUserB: citizenB._id,
      });

      await ConversationMember.create([
        { conversation: directConv._id, user: citizenA._id, role: "member" },
        { conversation: directConv._id, user: citizenB._id, role: "member" },
      ]);

      testMessage = await Message.create({
        conversation: directConv._id,
        sender: citizenB._id,
        body: "Inappropriate spam message for testing",
        type: "text",
      });
  });

  after(async () => {
    await User.deleteMany({ email: /@test-phase4\.fazilnagar\.in$/ });
    await Conversation.deleteMany({ _id: directConv._id });
    await ConversationMember.deleteMany({ conversation: directConv._id });
    await Message.deleteMany({ conversation: directConv._id });
    await Report.deleteMany({ targetUser: citizenB._id });
    await Block.deleteMany({ blocker: citizenA._id });

    if (server) {
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Citizen can block another citizen (POST /api/messages/block)", async () => {
    const res = await makeRequest({
      path: "/api/messages/block",
      method: "POST",
      token: tokenA,
      body: { targetUserId: citizenB._id.toString() },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const blockRecord = await Block.findOne({ blocker: citizenA._id, blocked: citizenB._id });
    assert.ok(blockRecord);

    const conv = await Conversation.findById(directConv._id);
    assert.equal(conv.status, "blocked");
  });

  it("2. Citizen can list blocked citizens (GET /api/messages/blocked)", async () => {
    const res = await makeRequest({
      path: "/api/messages/blocked",
      method: "GET",
      token: tokenA,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.blockedUsers));
    assert.equal(res.body.blockedUsers.length, 1);
    assert.equal(res.body.blockedUsers[0]._id.toString(), citizenB._id.toString());
  });

  it("3. Citizen can unblock a previously blocked citizen (POST /api/messages/unblock)", async () => {
    const res = await makeRequest({
      path: "/api/messages/unblock",
      method: "POST",
      token: tokenA,
      body: { targetUserId: citizenB._id.toString() },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const blockRecord = await Block.findOne({ blocker: citizenA._id, blocked: citizenB._id });
    assert.equal(blockRecord, null);

    const conv = await Conversation.findById(directConv._id);
    assert.equal(conv.status, "active");
  });

  it("4. Citizen can file a report against user and message (POST /api/messages/report)", async () => {
    const res = await makeRequest({
      path: "/api/messages/report",
      method: "POST",
      token: tokenA,
      body: {
        targetUserId: citizenB._id.toString(),
        targetMessageId: testMessage._id.toString(),
        targetConversationId: directConv._id.toString(),
        reason: "spam",
        details: "Test report: user is sending unsolicited spam messages",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    reportId = res.body.report?._id || res.body.reportId;
    assert.ok(reportId);

    const reportDoc = await Report.findById(reportId);
    assert.equal(reportDoc.status, "pending");
    assert.equal(reportDoc.reason, "spam");
  });

  it("5. Non-admin citizen accessing moderation reports is forbidden (403)", async () => {
    const res = await makeRequest({
      path: "/api/messages/moderation/reports",
      method: "GET",
      token: tokenA,
    });

    assert.equal(res.status, 403);
  });

  it("6. Admin user can fetch moderation reports with pagination (GET /api/messages/moderation/reports)", async () => {
    const res = await makeRequest({
      path: "/api/messages/moderation/reports?status=pending",
      method: "GET",
      token: tokenAdmin,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.reports));
    assert.ok(res.body.reports.length >= 1);
    assert.equal(res.body.reports[0]._id.toString(), reportId.toString());
  });

  it("7. Admin can update report status and add moderator notes (PATCH /api/messages/moderation/reports/:id)", async () => {
    const res = await makeRequest({
      path: `/api/messages/moderation/reports/${reportId}`,
      method: "PATCH",
      token: tokenAdmin,
      body: {
        status: "action_taken",
        moderatorNotes: "Reviewed and verified abusive content. Citizen warned.",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const updated = await Report.findById(reportId);
    assert.equal(updated.status, "action_taken");
    assert.equal(updated.moderatorNotes, "Reviewed and verified abusive content. Citizen warned.");
  });

  it("8. Admin can suspend the reported user via report action (suspendUser: true)", async () => {
    const res = await makeRequest({
      path: `/api/messages/moderation/reports/${reportId}`,
      method: "PATCH",
      token: tokenAdmin,
      body: {
        status: "action_taken",
        moderatorNotes: "Account suspended for repeat policy violation.",
        suspendUser: true,
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const suspendedCitizen = await User.findById(citizenB._id);
    assert.equal(suspendedCitizen.status, "suspended");
  });
});
