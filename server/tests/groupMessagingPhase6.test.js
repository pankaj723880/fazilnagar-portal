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

const TEST_PORT = 5106;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 6: Group Messaging Test Suite", () => {
  let server;
  let userCreator;
  let userMember1;
  let userMember2;
  let userNonMember;
  let tokenCreator;
  let tokenMember1;
  let tokenMember2;
  let tokenNonMember;
  let groupConvId;

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
    app.use("/api/messages", messagesRoutes);

    server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => server.listen(TEST_PORT, "127.0.0.1", resolve));

    // Create test citizens
    userCreator = await User.create({
      name: "Phase6 Creator Citizen",
      email: `creator_${Date.now()}@fazilnagar.local`,
      password: "hashedpassword123",
      role: "user",
      status: "active",
      area: "Main Market",
    });

    userMember1 = await User.create({
      name: "Phase6 Member One",
      email: `member1_${Date.now()}@fazilnagar.local`,
      password: "hashedpassword123",
      role: "user",
      status: "active",
      area: "Ward 4",
    });

    userMember2 = await User.create({
      name: "Phase6 Member Two",
      email: `member2_${Date.now()}@fazilnagar.local`,
      password: "hashedpassword123",
      role: "user",
      status: "active",
      area: "Block Road",
    });

    userNonMember = await User.create({
      name: "Phase6 Non Member",
      email: `nonmember_${Date.now()}@fazilnagar.local`,
      password: "hashedpassword123",
      role: "user",
      status: "active",
      area: "Pawan Nagar",
    });

    tokenCreator = jwt.sign({ id: userCreator._id, email: userCreator.email, role: "user" }, JWT_SECRET);
    tokenMember1 = jwt.sign({ id: userMember1._id, email: userMember1.email, role: "user" }, JWT_SECRET);
    tokenMember2 = jwt.sign({ id: userMember2._id, email: userMember2.email, role: "user" }, JWT_SECRET);
    tokenNonMember = jwt.sign({ id: userNonMember._id, email: userNonMember.email, role: "user" }, JWT_SECRET);
  });

  after(async () => {
    // Cleanup created data
    const uids = [userCreator?._id, userMember1?._id, userMember2?._id, userNonMember?._id].filter(Boolean);
    if (groupConvId) {
      await Conversation.deleteOne({ _id: groupConvId });
      await ConversationMember.deleteMany({ conversation: groupConvId });
      await Message.deleteMany({ conversation: groupConvId });
    }
    await User.deleteMany({ _id: { $in: uids } });

    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Reject creating group with missing or short name", async () => {
    const res = await makeRequest({
      path: "/api/messages/conversations/group",
      method: "POST",
      token: tokenCreator,
      body: {
        groupName: "A",
        memberIds: [userMember1._id.toString()],
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it("2. Reject creating group without any other members", async () => {
    const res = await makeRequest({
      path: "/api/messages/conversations/group",
      method: "POST",
      token: tokenCreator,
      body: {
        groupName: "Fazilnagar Traders Association",
        memberIds: [],
      },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it("3. Citizen can create a community group conversation with members", async () => {
    const res = await makeRequest({
      path: "/api/messages/conversations/group",
      method: "POST",
      token: tokenCreator,
      body: {
        groupName: "Fazilnagar Traders Association",
        groupDescription: "Discussion group for local merchants and shops",
        memberIds: [userMember1._id.toString()],
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.conversation.type, "group");
    assert.equal(res.body.conversation.groupName, "Fazilnagar Traders Association");
    assert.equal(res.body.conversation.myRole, "admin");

    groupConvId = res.body.conversation._id;

    // Verify creator is admin and member1 is regular member in DB
    const creatorMem = await ConversationMember.findOne({ conversation: groupConvId, user: userCreator._id });
    const m1Mem = await ConversationMember.findOne({ conversation: groupConvId, user: userMember1._id });

    assert.equal(creatorMem.role, "admin");
    assert.equal(creatorMem.status, "active");
    assert.equal(m1Mem.role, "member");
    assert.equal(m1Mem.status, "active");
  });

  it("4. Group members can list all active group members", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/members`,
      method: "GET",
      token: tokenMember1,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(Array.isArray(res.body.members), true);
    assert.equal(res.body.members.length, 2);
  });

  it("5. Non-member cannot access group members (403)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/members`,
      method: "GET",
      token: tokenNonMember,
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("6. Regular group member cannot add new members (403)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/members`,
      method: "POST",
      token: tokenMember1,
      body: {
        memberIds: [userMember2._id.toString()],
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("7. Group admin can add new member to group", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/members`,
      method: "POST",
      token: tokenCreator,
      body: {
        memberIds: [userMember2._id.toString()],
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.addedCount, 1);

    const m2Mem = await ConversationMember.findOne({ conversation: groupConvId, user: userMember2._id });
    assert.equal(m2Mem.status, "active");
    assert.equal(m2Mem.role, "member");
  });

  it("8. Group admin can update group name & description", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/group`,
      method: "PATCH",
      token: tokenCreator,
      body: {
        groupName: "Fazilnagar Business Community",
        groupDescription: "Updated town business discussions",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.group.groupName, "Fazilnagar Business Community");

    const conv = await Conversation.findById(groupConvId);
    assert.equal(conv.groupName, "Fazilnagar Business Community");
  });

  it("9. Regular member cannot remove another member (403)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/members/${userMember2._id}`,
      method: "DELETE",
      token: tokenMember1,
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("10. Group admin can remove a member from group", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/members/${userMember2._id}`,
      method: "DELETE",
      token: tokenCreator,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const m2Mem = await ConversationMember.findOne({ conversation: groupConvId, user: userMember2._id });
    assert.equal(m2Mem.status, "left");
  });

  it("11. Removed member cannot send messages to group (403)", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/messages`,
      method: "POST",
      token: tokenMember2,
      body: {
        body: "I was removed but trying to message",
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("12. Member can leave group on their own", async () => {
    const res = await makeRequest({
      path: `/api/messages/conversations/${groupConvId}/members/${userMember1._id}`,
      method: "DELETE",
      token: tokenMember1,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const m1Mem = await ConversationMember.findOne({ conversation: groupConvId, user: userMember1._id });
    assert.equal(m1Mem.status, "left");
  });
});
