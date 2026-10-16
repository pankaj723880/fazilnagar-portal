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
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import { initSocket } from "../socket.js";

const TEST_PORT = 5108;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 3: Emoji Reactions & Rich Messaging Test Suite", () => {
  let server;
  let user1;
  let user2;
  let user3;
  let token1;
  let token2;
  let token3;
  let conversationId;
  let targetMessageId;

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
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, body: parsed });
            } catch (err) {
              resolve({ status: res.statusCode, raw: data });
            }
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
    server = http.createServer(app);
    initSocket(server);
    app.use("/api/messages", messagesRoutes);

    await new Promise((resolve) => server.listen(TEST_PORT, resolve));

    const ts = Date.now();
    user1 = await User.create({
      name: "Phase 3 Citizen 1",
      email: `p3_cit1_${ts}@test.com`,
      password: "hashedPassword123",
      username: `p3cit1_${ts}`,
      status: "active",
    });

    user2 = await User.create({
      name: "Phase 3 Citizen 2",
      email: `p3_cit2_${ts}@test.com`,
      password: "hashedPassword123",
      username: `p3cit2_${ts}`,
      status: "active",
    });

    user3 = await User.create({
      name: "Phase 3 Citizen 3 (Outsider)",
      email: `p3_cit3_${ts}@test.com`,
      password: "hashedPassword123",
      username: `p3cit3_${ts}`,
      status: "active",
    });

    token1 = jwt.sign({ id: user1._id, role: "user" }, JWT_SECRET);
    token2 = jwt.sign({ id: user2._id, role: "user" }, JWT_SECRET);
    token3 = jwt.sign({ id: user3._id, role: "user" }, JWT_SECRET);

    const conv = await Conversation.create({
      type: "direct",
      status: "active",
      initiator: user1._id,
      pinnedBy: [],
      mutedBy: [],
      archivedBy: [],
    });
    conversationId = conv._id.toString();

    await ConversationMember.create([
      { conversation: conv._id, user: user1._id, status: "active", role: "member" },
      { conversation: conv._id, user: user2._id, status: "active", role: "member" },
    ]);

    const msg = await Message.create({
      conversation: conv._id,
      sender: user1._id,
      body: "Hello! React to this test message with an emoji 🙏",
      type: "text",
      reactions: [],
    });
    targetMessageId = msg._id.toString();
  });

  after(async () => {
    if (conversationId) {
      await Conversation.deleteOne({ _id: conversationId });
      await ConversationMember.deleteMany({ conversation: conversationId });
      await Message.deleteMany({ conversation: conversationId });
    }
    if (user1) await User.deleteOne({ _id: user1._id });
    if (user2) await User.deleteOne({ _id: user2._id });
    if (user3) await User.deleteOne({ _id: user3._id });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Reject reaction when emoji is missing or empty", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${targetMessageId}/react`,
      method: "POST",
      token: token1,
      body: { emoji: "" },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it("2. Non-member citizen cannot react to conversation messages (403)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${targetMessageId}/react`,
      method: "POST",
      token: token3,
      body: { emoji: "❤️" },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("3. Conversation member can add an emoji reaction", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${targetMessageId}/react`,
      method: "POST",
      token: token2,
      body: { emoji: "❤️" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.reactions.length, 1);
    assert.equal(res.body.reactions[0].emoji, "❤️");
    assert.equal(res.body.reactions[0].user._id.toString(), user2._id.toString());
  });

  it("4. Changing reaction to a different emoji replaces previous reaction without duplicating", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${targetMessageId}/react`,
      method: "POST",
      token: token2,
      body: { emoji: "👍" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.reactions.length, 1);
    assert.equal(res.body.reactions[0].emoji, "👍");
    assert.equal(res.body.reactions[0].user._id.toString(), user2._id.toString());
  });

  it("5. Reacting with the exact same emoji toggles it off (removes reaction)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${targetMessageId}/react`,
      method: "POST",
      token: token2,
      body: { emoji: "👍" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.reactions.length, 0);
  });

  it("6. Multiple members can react independently with same or different emojis", async () => {
    await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${targetMessageId}/react`,
      method: "POST",
      token: token1,
      body: { emoji: "🔥" },
    });

    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${targetMessageId}/react`,
      method: "POST",
      token: token2,
      body: { emoji: "🔥" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.reactions.length, 2);
    assert.equal(res.body.reactions[0].emoji, "🔥");
    assert.equal(res.body.reactions[1].emoji, "🔥");
  });

  it("7. GET messages endpoint returns populated reactions array", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/messages`,
      method: "GET",
      token: token1,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const target = res.body.messages.find((m) => m._id === targetMessageId);
    assert.ok(target);
    assert.equal(target.reactions.length, 2);
    assert.equal(target.reactions[0].emoji, "🔥");
    assert.ok(target.reactions[0].user.name);
  });

  it("8. Citizen can update conversation preferences (pin, mute, archive)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${conversationId}/preferences`,
      method: "PATCH",
      token: token1,
      body: { isPinned: true, isMuted: true, isArchived: false },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.preferences.isPinned, true);
    assert.equal(res.body.preferences.isMuted, true);
    assert.equal(res.body.preferences.isArchived, false);
  });
});
