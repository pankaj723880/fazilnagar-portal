import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { io as ClientIO } from "../../client/node_modules/socket.io-client/build/esm/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import messagesRoutes from "../routes/messages.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import { initSocket, getOnlineUsers, isUserOnline } from "../socket.js";

const TEST_PORT = 5108;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 8: Offline PWA, Presence & Delivery Polish Test Suite", () => {
  let server;
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let conversationId;
  let clientSocketA;

  // HTTP request helper
  const makeRequest = ({ method, path: reqPath, token, body }) => {
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

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Setup Express App with routes and Socket.IO
    const app = express();
    app.use(express.json());
    app.use("/api/messages", messagesRoutes);

    server = http.createServer(app);
    initSocket(server);

    await new Promise((res) => server.listen(TEST_PORT, res));

    // Seed test users
    const rand = Date.now();
    userA = await User.create({
      name: "Presence Citizen A",
      email: `citizenA_phase8_${rand}@fazilnagar.local`,
      phone: `99901${rand.toString().slice(-5)}`,
      password: "hashedPassword123",
      role: "user",
      status: "active",
      username: `citizenA_${rand.toString().slice(-6)}`,
    });

    userB = await User.create({
      name: "Presence Citizen B",
      email: `citizenB_phase8_${rand}@fazilnagar.local`,
      phone: `99902${rand.toString().slice(-5)}`,
      password: "hashedPassword123",
      role: "user",
      status: "active",
      username: `citizenB_${rand.toString().slice(-6)}`,
    });

    tokenA = jwt.sign({ id: userA._id.toString(), email: userA.email, role: userA.role }, JWT_SECRET);
    tokenB = jwt.sign({ id: userB._id.toString(), email: userB.email, role: userB.role }, JWT_SECRET);

    // Create 1-to-1 conversation
    const conv = await Conversation.create({
      type: "direct",
      status: "active",
      initiator: userA._id,
      createdBy: userA._id,
    });
    conversationId = conv._id.toString();

    await ConversationMember.create([
      { conversation: conv._id, user: userA._id, role: "member", status: "active" },
      { conversation: conv._id, user: userB._id, role: "member", status: "active" },
    ]);
  });

  after(async () => {
    if (clientSocketA && clientSocketA.connected) {
      clientSocketA.disconnect();
    }
    if (userA) await User.deleteOne({ _id: userA._id });
    if (userB) await User.deleteOne({ _id: userB._id });
    if (conversationId) {
      await Conversation.deleteOne({ _id: conversationId });
      await ConversationMember.deleteMany({ conversation: conversationId });
      await Message.deleteMany({ conversation: conversationId });
    }
    if (server) {
      await new Promise((res) => server.close(res));
    }
    await mongoose.disconnect();
  });

  it("1. Presence endpoint rejects unauthenticated request (401)", async () => {
    const res = await makeRequest({
      method: "GET",
      path: "/api/messages/presence",
    });

    assert.equal(res.status, 401);
  });

  it("2. Presence endpoint returns onlineUserIds list when authenticated", async () => {
    const res = await makeRequest({
      method: "GET",
      path: "/api/messages/presence",
      token: tokenA,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.onlineUserIds));
  });

  it("3. User socket connection registers user in presence tracking", async () => {
    assert.equal(isUserOnline(userA._id.toString()), false);

    clientSocketA = ClientIO(`http://127.0.0.1:${TEST_PORT}`, {
      auth: { token: tokenA },
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise((resolve, reject) => {
      clientSocketA.on("connect", resolve);
      clientSocketA.on("connect_error", reject);
      setTimeout(() => reject(new Error("Socket connect timeout")), 4000);
    });

    // Verify userA is now recorded as online
    assert.equal(isUserOnline(userA._id.toString()), true);
    const onlineList = getOnlineUsers();
    assert.ok(onlineList.includes(userA._id.toString()));
  });

  it("4. Socket get_online_users event responds with active citizens list", async () => {
    const onlineIds = await new Promise((resolve) => {
      clientSocketA.emit("get_online_users", (data) => {
        resolve(data?.onlineUserIds || []);
      });
    });

    assert.ok(Array.isArray(onlineIds));
    assert.ok(onlineIds.includes(userA._id.toString()));
  });

  it("5. Sending message with clientMessageId supports client-side reconciliation", async () => {
    const clientTempId = "temp-client-msg-12345";
    const res = await makeRequest({
      method: "POST",
      path: `/api/messages/conversations/${conversationId}/messages`,
      token: tokenA,
      body: {
        body: "Reconciliation message with temporary client ID",
        type: "text",
        clientMessageId: clientTempId,
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message.clientMessageId, clientTempId);
    assert.equal(res.body.message.body, "Reconciliation message with temporary client ID");
  });

  it("6. Socket disconnect removes user from presence tracking", async () => {
    clientSocketA.disconnect();

    // Small delay for disconnect event processing
    await new Promise((r) => setTimeout(r, 200));

    assert.equal(isUserOnline(userA._id.toString()), false);
    const onlineList = getOnlineUsers();
    assert.ok(!onlineList.includes(userA._id.toString()));
  });
});
