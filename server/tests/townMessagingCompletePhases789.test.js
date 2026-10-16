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
import Block from "../models/Block.js";
import { initSocket } from "../socket.js";

const TEST_PORT = 5109;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 7, 8, 9: Town Messaging Complete Integration Suite", () => {
  let server;
  let userAlice;
  let userBob;
  let userEve;
  let tokenAlice;
  let tokenBob;
  let tokenEve;
  let conversationId;
  let groupConversationId;

  // HTTP helper function for JSON requests
  const makeJsonRequest = ({ method, path: reqPath, token, body }) => {
    return new Promise((resolve, reject) => {
      const dataString = body ? JSON.stringify(body) : null;
      const headers = {
        "Content-Type": "application/json",
        Connection: "close",
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (dataString) headers["Content-Length"] = Buffer.byteLength(dataString);

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path: reqPath,
          method,
          headers,
        },
        (res) => {
          let chunks = "";
          res.on("data", (chunk) => (chunks += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(chunks);
              resolve({ status: res.statusCode, body: parsed });
            } catch {
              resolve({ status: res.statusCode, body: chunks });
            }
          });
        }
      );

      req.on("error", reject);
      if (dataString) req.write(dataString);
      req.end();
    });
  };

  // HTTP helper function for multipart form upload (file validation tests)
  const makeMultipartRequest = ({ reqPath, token, fieldName, filename, fileBuffer, mimeType }) => {
    return new Promise((resolve, reject) => {
      const boundary = "----FazilnagarSecurityBoundary" + Date.now();
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;

      const payload = Buffer.concat([
        Buffer.from(header, "utf8"),
        fileBuffer,
        Buffer.from(footer, "utf8"),
      ]);

      const headers = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": payload.length,
        Connection: "close",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path: reqPath,
          method: "POST",
          headers,
        },
        (res) => {
          let chunks = "";
          res.on("data", (chunk) => (chunks += chunk));
          res.on("end", () => {
            try {
              const parsed = JSON.parse(chunks);
              resolve({ status: res.statusCode, body: parsed });
            } catch {
              resolve({ status: res.statusCode, body: chunks });
            }
          });
        }
      );

      req.on("error", reject);
      req.write(payload);
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

    await new Promise((res) => server.listen(TEST_PORT, res));

    const rand = Date.now();
    userAlice = await User.create({
      name: "Alice Fazilnagar",
      email: `alice_${rand}@fazilnagar.local`,
      phone: `99111${rand.toString().slice(-5)}`,
      password: "hashedPassword123",
      role: "user",
      status: "active",
      username: `alice_${rand.toString().slice(-6)}`,
    });

    userBob = await User.create({
      name: "Bob Fazilnagar",
      email: `bob_${rand}@fazilnagar.local`,
      phone: `99222${rand.toString().slice(-5)}`,
      password: "hashedPassword123",
      role: "user",
      status: "active",
      username: `bob_${rand.toString().slice(-6)}`,
    });

    userEve = await User.create({
      name: "Eve External",
      email: `eve_${rand}@fazilnagar.local`,
      phone: `99333${rand.toString().slice(-5)}`,
      password: "hashedPassword123",
      role: "user",
      status: "active",
      username: `eve_${rand.toString().slice(-6)}`,
    });

    tokenAlice = jwt.sign(
      { id: userAlice._id.toString(), email: userAlice.email, role: userAlice.role },
      JWT_SECRET
    );
    tokenBob = jwt.sign(
      { id: userBob._id.toString(), email: userBob.email, role: userBob.role },
      JWT_SECRET
    );
    tokenEve = jwt.sign(
      { id: userEve._id.toString(), email: userEve.email, role: userEve.role },
      JWT_SECRET
    );

    // Seed direct conversation between Alice and Bob
    const directConv = await Conversation.create({
      type: "direct",
      status: "active",
      initiator: userAlice._id,
      createdBy: userAlice._id,
    });
    conversationId = directConv._id.toString();

    await ConversationMember.create([
      { conversation: directConv._id, user: userAlice._id, role: "admin", status: "active" },
      { conversation: directConv._id, user: userBob._id, role: "member", status: "active" },
    ]);
  });

  after(async () => {
    if (userAlice) await User.deleteOne({ _id: userAlice._id });
    if (userBob) await User.deleteOne({ _id: userBob._id });
    if (userEve) await User.deleteOne({ _id: userEve._id });

    if (conversationId) {
      await Conversation.deleteOne({ _id: conversationId });
      await ConversationMember.deleteMany({ conversation: conversationId });
      await Message.deleteMany({ conversation: conversationId });
      await Block.deleteMany({
        $or: [
          { blocker: userAlice._id },
          { blocker: userBob._id },
          { blocked: userAlice._id },
          { blocked: userBob._id },
        ],
      });
    }

    if (groupConversationId) {
      await Conversation.deleteOne({ _id: groupConversationId });
      await ConversationMember.deleteMany({ conversation: groupConversationId });
      await Message.deleteMany({ conversation: groupConversationId });
    }

    if (server) {
      await new Promise((res) => server.close(res));
    }
  });

  // ==========================================
  // PHASE 7: Search & Discovery Inside Conversations
  // ==========================================
  describe("Phase 7: Search & Discovery inside Conversation", () => {
    let seededMsg1;
    let seededMsg2;
    let seededMsg3;

    it("should send multiple messages with search keywords and timestamps", async () => {
      const res1 = await makeJsonRequest({
        method: "POST",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenAlice,
        body: { body: "Namaste Fazilnagar Market report for today" },
      });
      assert.ok([200, 201].includes(res1.status));
      assert.equal(res1.body.success, true);
      seededMsg1 = res1.body.message;

      // Small tick delay to ensure timestamp progression
      await new Promise((r) => setTimeout(r, 20));

      const res2 = await makeJsonRequest({
        method: "POST",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenBob,
        body: { body: "The civic ward meeting will occur in Fazilnagar Block Office" },
      });
      assert.ok([200, 201].includes(res2.status));
      seededMsg2 = res2.body.message;

      await new Promise((r) => setTimeout(r, 20));

      const res3 = await makeJsonRequest({
        method: "POST",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenAlice,
        body: { body: "Emergency contact numbers for Fazilnagar hospital" },
      });
      assert.ok([200, 201].includes(res3.status));
      seededMsg3 = res3.body.message;
    });

    it("should retrieve messages with limit parameter and chronological ordering", async () => {
      const res = await makeJsonRequest({
        method: "GET",
        path: `/api/messages/conversations/${conversationId}/messages?limit=2`,
        token: tokenAlice,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.messages.length, 2);
      assert.equal(res.body.hasMore, true);
      // Latest 2 messages in chronological order
      assert.equal(res.body.messages[1].body, "Emergency contact numbers for Fazilnagar hospital");
    });

    it("should support cursor pagination via 'before' parameter", async () => {
      const res = await makeJsonRequest({
        method: "GET",
        path: `/api/messages/conversations/${conversationId}/messages?before=${seededMsg3._id}&limit=2`,
        token: tokenAlice,
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const bodies = res.body.messages.map((m) => m.body);
      assert.ok(bodies.includes("Namaste Fazilnagar Market report for today"));
      assert.ok(bodies.includes("The civic ward meeting will occur in Fazilnagar Block Office"));
    });
  });

  // ==========================================
  // PHASE 8: Rich Notifications, Unread Badges & Delivery Deduplication
  // ==========================================
  describe("Phase 8: Unread Badges & Delivery Sync Deduplication", () => {
    it("should increment recipient unreadCount when a new message is sent", async () => {
      // Alice sends a message to Bob
      const sendRes = await makeJsonRequest({
        method: "POST",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenAlice,
        body: { body: "Unread count test notification message" },
      });
      assert.ok([200, 201].includes(sendRes.status));

      // Verify Bob's membership unreadCount is > 0
      const bobMember = await ConversationMember.findOne({
        conversation: conversationId,
        user: userBob._id,
      });
      assert.ok(bobMember.unreadCount > 0);
    });

    it("should reset unreadCount to 0 when Bob fetches messages", async () => {
      const readRes = await makeJsonRequest({
        method: "GET",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenBob,
      });
      assert.equal(readRes.status, 200);

      const bobMember = await ConversationMember.findOne({
        conversation: conversationId,
        user: userBob._id,
      });
      assert.equal(bobMember.unreadCount, 0);
    });

    it("should deduplicate offline/reconnecting messages via clientMessageId", async () => {
      const clientMsgId = "offline-client-uuid-999-phase8";

      // First delivery
      const res1 = await makeJsonRequest({
        method: "POST",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenAlice,
        body: {
          body: "Message with clientMessageId deduplication",
          clientMessageId: clientMsgId,
        },
      });
      assert.ok([200, 201].includes(res1.status));
      assert.equal(res1.body.success, true);
      const originalId = res1.body.message._id;

      // Second delivery (simulating offline replay or socket retry)
      const res2 = await makeJsonRequest({
        method: "POST",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenAlice,
        body: {
          body: "Message with clientMessageId deduplication",
          clientMessageId: clientMsgId,
        },
      });
      assert.equal(res2.status, 200);
      assert.equal(res2.body.success, true);
      assert.equal(res2.body.duplicate, true);
      assert.equal(res2.body.message._id.toString(), originalId.toString());

      // Ensure only 1 document exists in MongoDB
      const count = await Message.countDocuments({
        conversation: conversationId,
        clientMessageId: clientMsgId,
      });
      assert.equal(count, 1);
    });
  });

  // ==========================================
  // PHASE 9: Security, Rate Limiting, File Validation & Privacy Hardening
  // ==========================================
  describe("Phase 9: Security, Rate Limiting & Privacy Hardening", () => {
    it("should reject message access from non-members with 403 Forbidden", async () => {
      const res = await makeJsonRequest({
        method: "GET",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenEve, // Eve is not a member of Alice-Bob conversation
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
    });

    it("should reject empty or whitespace-only messages with 400 Bad Request", async () => {
      const res = await makeJsonRequest({
        method: "POST",
        path: `/api/messages/conversations/${conversationId}/messages`,
        token: tokenAlice,
        body: { body: "   " },
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /cannot be empty/i);
    });

    it("should reject dangerous executable and script uploads (.exe, .bat, .sh)", async () => {
      const fakeExecutable = Buffer.from("MZ9000FakeExecutableBinaryPayload");
      const res = await makeMultipartRequest({
        reqPath: `/api/messages/conversations/${conversationId}/media`,
        token: tokenAlice,
        fieldName: "file",
        filename: "malicious_payload.exe",
        fileBuffer: fakeExecutable,
        mimeType: "application/x-msdownload",
      });

      // Multer filter rejects with error, Express returns 400 or 500 error
      assert.ok([400, 500].includes(res.status));
      assert.match(JSON.stringify(res.body), /not allowed|security/i);
    });

    it("should reject direct conversation creation when a user is blocked", async () => {
      // Bob blocks Alice
      await Block.create({ blocker: userBob._id, blocked: userAlice._id });

      const res = await makeJsonRequest({
        method: "POST",
        path: "/api/messages/conversations/direct",
        token: tokenAlice,
        body: { recipientId: userBob._id.toString() },
      });

      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /block|privacy/i);

      // Clean up block
      await Block.deleteOne({ blocker: userBob._id, blocked: userAlice._id });
    });

    it("should prevent non-admin group members from editing group settings", async () => {
      // Alice creates a group with Bob
      const groupRes = await makeJsonRequest({
        method: "POST",
        path: "/api/messages/conversations/group",
        token: tokenAlice,
        body: {
          groupName: "Fazilnagar Ward 5 Council",
          groupDescription: "Civic discussions and announcements",
          memberIds: [userBob._id.toString()],
        },
      });
      assert.equal(groupRes.status, 201);
      groupConversationId = groupRes.body.conversation._id;

      // Bob (member, non-admin) attempts to change group name
      const patchRes = await makeJsonRequest({
        method: "PATCH",
        path: `/api/messages/conversations/${groupConversationId}/group`,
        token: tokenBob,
        body: { groupName: "Unauthorized Hijacked Name" },
      });

      assert.equal(patchRes.status, 403);
      assert.equal(patchRes.body.success, false);
      assert.match(patchRes.body.message, /admin/i);
    });
  });
});
