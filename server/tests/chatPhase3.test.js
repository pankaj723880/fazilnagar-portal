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
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import { initSocket } from "../socket.js";

const TEST_PORT = 5099;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 3: One-to-One Real-Time Chat Test Suite", () => {
  let server;
  let userA;
  let userB;
  let userC;
  let tokenA;
  let tokenB;
  let tokenC;

  let conversationAB;

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
          agent: false,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            let parsed = {};
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
    initSocket(server);

    await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));

    // Clean up previous test users
    await User.deleteMany({ email: /@test-phase3\.fazilnagar\.in$/ });

    userA = await User.create({
      name: "User Alpha",
      email: "user_a@test-phase3.fazilnagar.in",
      password: "password123",
      username: "user_alpha",
      status: "active",
      whoCanMessage: "everyone",
    });

    userB = await User.create({
      name: "User Beta",
      email: "user_b@test-phase3.fazilnagar.in",
      password: "password123",
      username: "user_beta",
      status: "active",
      whoCanMessage: "requests", // requires approval
    });

    userC = await User.create({
      name: "User Gamma",
      email: "user_c@test-phase3.fazilnagar.in",
      password: "password123",
      username: "user_gamma",
      status: "active",
    });

    tokenA = jwt.sign({ id: userA._id.toString(), email: userA.email }, JWT_SECRET, { expiresIn: "1h" });
    tokenB = jwt.sign({ id: userB._id.toString(), email: userB.email }, JWT_SECRET, { expiresIn: "1h" });
    tokenC = jwt.sign({ id: userC._id.toString(), email: userC.email }, JWT_SECRET, { expiresIn: "1h" });
  });

  after(async () => {
    await User.deleteMany({ email: /@test-phase3\.fazilnagar\.in$/ });
    if (conversationAB) {
      await Conversation.deleteOne({ _id: conversationAB._id });
      await ConversationMember.deleteMany({ conversation: conversationAB._id });
      await Message.deleteMany({ conversation: conversationAB._id });
    }

    if (server) {
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Unauthenticated conversation list request returns 401", async () => {
    const res = await makeRequest({ path: "/api/messages/conversations" });
    assert.equal(res.status, 401);
  });

  it("2. Direct chat creation checks recipient privacy: sets pending when recipient has whoCanMessage='requests'", async () => {
    const res = await makeRequest({
      path: "/api/messages/conversations/direct",
      method: "POST",
      token: tokenA,
      body: { recipientId: userB._id.toString() },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.conversation.status, "pending");
    assert.equal(res.body.conversation.initiator.toString(), userA._id.toString());
    conversationAB = res.body.conversation;
  });

  it("3. Non-member User C cannot send messages to Conversation A-B (403 Unauthorized)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationAB._id}/messages`,
      method: "POST",
      token: tokenC,
      body: { body: "Intruder message", clientMessageId: "c-intruder-1" },
    });

    assert.equal(res.status, 403);
  });

  it("4. Initiator User A sends message with deduplication and unread count tracking", async () => {
    const clientMessageId = `msg-${Date.now()}`;
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationAB._id}/messages`,
      method: "POST",
      token: tokenA,
      body: { body: "Namaste User B! Welcome to Fazilnagar.", clientMessageId },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message.body, "Namaste User B! Welcome to Fazilnagar.");
    assert.equal(res.body.message.sender.name, "User Alpha");

    // Repeat send with same clientMessageId -> must return duplicate gracefully
    const dupRes = await makeRequest({
      path: `/api/messages/conversations/${conversationAB._id}/messages`,
      method: "POST",
      token: tokenA,
      body: { body: "Namaste User B! Welcome to Fazilnagar.", clientMessageId },
    });

    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.duplicate, true);

    // Verify recipient unreadCount was incremented
    const memberB = await ConversationMember.findOne({
      conversation: conversationAB._id,
      user: userB._id,
    });
    assert.equal(memberB.unreadCount, 1);
  });

  it("5. History retrieval fetches latest messages and auto-marks read for recipient", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationAB._id}/messages`,
      token: tokenB,
    });

    assert.equal(res.status, 200);
    assert.ok(res.body.messages.length >= 1);
    assert.equal(res.body.messages[res.body.messages.length - 1].body, "Namaste User B! Welcome to Fazilnagar.");

    // Member B's unread count should now be 0
    const memberB = await ConversationMember.findOne({
      conversation: conversationAB._id,
      user: userB._id,
    });
    assert.equal(memberB.unreadCount, 0);
  });

  it("6. Recipient User B accepts message request -> conversation status becomes active", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationAB._id}/respond`,
      method: "POST",
      token: tokenB,
      body: { action: "accept" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const updated = await Conversation.findById(conversationAB._id);
    assert.equal(updated.status, "active");
  });

  it("7. Block enforcement: blocked user cannot start or message in direct conversations", async () => {
    // Add block relationship
    await Block.create({ blocker: userC._id, blocked: userA._id });

    const res = await makeRequest({
      path: "/api/messages/conversations/direct",
      method: "POST",
      token: tokenA,
      body: { recipientId: userC._id.toString() },
    });

    assert.equal(res.status, 403);
    await Block.deleteMany({ blocker: userC._id });
  });
});
