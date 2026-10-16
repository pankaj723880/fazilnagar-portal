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
import MessageDeletion from "../models/MessageDeletion.js";
import { initSocket } from "../socket.js";

const TEST_PORT = 5105;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 5: Message Edit & Delete Test Suite", () => {
  let server;
  let userA;
  let userB;
  let adminUser;
  let tokenA;
  let tokenB;
  let tokenAdmin;

  let directConv;
  let recentMessageA;
  let oldMessageA;
  let messageB;

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
    initSocket(server);
    await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));

    // Cleanup previous test users and records
    await User.deleteMany({ email: /@test-phase5\.fazilnagar\.in$/ });

    userA = await User.create({
      name: "User Five A",
      email: "user_a@test-phase5.fazilnagar.in",
      password: "password123",
      username: "user_five_a",
      role: "user",
      status: "active",
    });

    userB = await User.create({
      name: "User Five B",
      email: "user_b@test-phase5.fazilnagar.in",
      password: "password123",
      username: "user_five_b",
      role: "user",
      status: "active",
    });

    adminUser = await User.create({
      name: "Admin Five",
      email: "admin@test-phase5.fazilnagar.in",
      password: "adminpassword123",
      username: "admin_five",
      role: "admin",
      status: "active",
    });

    tokenA = jwt.sign({ id: userA._id.toString(), email: userA.email, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    tokenB = jwt.sign({ id: userB._id.toString(), email: userB.email, role: "user" }, JWT_SECRET, { expiresIn: "1h" });
    tokenAdmin = jwt.sign({ id: adminUser._id.toString(), email: adminUser.email, role: "admin" }, JWT_SECRET, { expiresIn: "1h" });

    directConv = await Conversation.create({
      type: "direct",
      status: "active",
      initiator: userA._id,
      directUserA: userA._id,
      directUserB: userB._id,
    });

    await ConversationMember.create([
      { conversation: directConv._id, user: userA._id, role: "member" },
      { conversation: directConv._id, user: userB._id, role: "member" },
    ]);

    // Message 1: Recent message by User A (sent 1 minute ago)
    recentMessageA = await Message.create({
      conversation: directConv._id,
      sender: userA._id,
      body: "Original text by User A",
      type: "text",
      createdAt: new Date(Date.now() - 60 * 1000),
    });

    // Message 2: Old message by User A (sent 25 minutes ago)
    oldMessageA = await Message.create({
      conversation: directConv._id,
      sender: userA._id,
      body: "Old text by User A (expired edit window)",
      type: "text",
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
    });

    // Message 3: Message by User B
    messageB = await Message.create({
      conversation: directConv._id,
      sender: userB._id,
      body: "Reply text by User B",
      type: "text",
      createdAt: new Date(),
    });
  });

  after(async () => {
    await User.deleteMany({ email: /@test-phase5\.fazilnagar\.in$/ });
    await Conversation.deleteMany({ _id: directConv._id });
    await ConversationMember.deleteMany({ conversation: directConv._id });
    await Message.deleteMany({ conversation: directConv._id });
    await MessageDeletion.deleteMany({ user: { $in: [userA._id, userB._id] } });

    if (server) {
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Sender can edit their message within 15 minutes (PATCH /messages/:id)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${recentMessageA._id}`,
      method: "PATCH",
      token: tokenA,
      body: { body: "Corrected and updated text by User A" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message.body, "Corrected and updated text by User A");
    assert.equal(res.body.message.isEdited, true);

    const doc = await Message.findById(recentMessageA._id);
    assert.equal(doc.body, "Corrected and updated text by User A");
    assert.equal(doc.isEdited, true);
    assert.ok(doc.editedAt);
  });

  it("2. Non-sender cannot edit someone else's message (403 Forbidden)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${recentMessageA._id}`,
      method: "PATCH",
      token: tokenB,
      body: { body: "Malicious modification by User B" },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("3. Empty message body cannot be saved on edit (400 Bad Request)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${recentMessageA._id}`,
      method: "PATCH",
      token: tokenA,
      body: { body: "   " },
    });

    assert.equal(res.status, 400);
  });

  it("4. Cannot edit a message after the 15-minute window expires (400 Bad Request)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${oldMessageA._id}`,
      method: "PATCH",
      token: tokenA,
      body: { body: "Attempting to edit old message" },
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /expired/i);
  });

  it("5. Sender can delete their message for everyone (DELETE deleteType: everyone)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${recentMessageA._id}`,
      method: "DELETE",
      token: tokenA,
      body: { deleteType: "everyone" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.deleteType, "everyone");

    const doc = await Message.findById(recentMessageA._id);
    assert.equal(doc.isDeletedForEveryone, true);
    assert.equal(doc.body, "This message was deleted");
  });

  it("6. Cannot edit a message that has been deleted for everyone (400 Bad Request)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${recentMessageA._id}`,
      method: "PATCH",
      token: tokenA,
      body: { body: "Trying to edit deleted message" },
    });

    assert.equal(res.status, 400);
  });

  it("7. Participant can delete a message for themselves only (DELETE deleteType: me)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${messageB._id}`,
      method: "DELETE",
      token: tokenA,
      body: { deleteType: "me" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.deleteType, "me");

    // Check MessageDeletion record
    const deletionRecord = await MessageDeletion.findOne({ user: userA._id, message: messageB._id });
    assert.ok(deletionRecord);

    // Fetch messages as User A: messageB should NOT be in the response
    const resA = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages`,
      method: "GET",
      token: tokenA,
    });
    const foundInA = resA.body.messages?.some((m) => m._id.toString() === messageB._id.toString());
    assert.equal(foundInA, false);

    // Fetch messages as User B: messageB SHOULD still be in the response
    const resB = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages`,
      method: "GET",
      token: tokenB,
    });
    const foundInB = resB.body.messages?.some((m) => m._id.toString() === messageB._id.toString());
    assert.equal(foundInB, true);
  });

  it("8. Administrator can delete any citizen message for everyone", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${directConv._id}/messages/${messageB._id}`,
      method: "DELETE",
      token: tokenAdmin,
      body: { deleteType: "everyone" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const doc = await Message.findById(messageB._id);
    assert.equal(doc.isDeletedForEveryone, true);
  });
});
