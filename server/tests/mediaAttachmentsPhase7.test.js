import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import messagesRoutes from "../routes/messages.js";
import User from "../models/User.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import { initSocket } from "../socket.js";

const TEST_PORT = 5107;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 7: Media & Attachments Test Suite", () => {
  let server;
  let userA;
  let userB;
  let userNonMember;
  let tokenA;
  let tokenB;
  let tokenNonMember;
  let conversationId;
  let uploadedMessageId;
  let createdFilePath;

  // Helper for multipart/form-data upload using Node native http
  const uploadMultipart = ({ path: reqPath, token, fileBuffer, fileName, mimeType, fields = {} }) => {
    return new Promise((resolve, reject) => {
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      const headers = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Connection: "close",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      let bodyParts = [];

      // Append text fields
      for (const [key, val] of Object.entries(fields)) {
        bodyParts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
          )
        );
      }

      // Append file
      if (fileBuffer) {
        bodyParts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
          )
        );
        bodyParts.push(fileBuffer);
        bodyParts.push(Buffer.from("\r\n"));
      }

      bodyParts.push(Buffer.from(`--${boundary}--\r\n`));
      const fullBody = Buffer.concat(bodyParts);
      headers["Content-Length"] = fullBody.length;

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path: reqPath,
          method: "POST",
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
      req.write(fullBody);
      req.end();
    });
  };

  const makeJsonRequest = ({ path: reqPath, method = "GET", token, body = null }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json", Connection: "close" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = body ? JSON.stringify(body) : null;
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path: reqPath,
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

    // Create citizens
    userA = await User.create({
      name: "Phase7 Citizen A",
      email: `p7a_${Date.now()}@fazilnagar.local`,
      password: "hashedpassword123",
      role: "user",
      status: "active",
      area: "Main Market",
    });

    userB = await User.create({
      name: "Phase7 Citizen B",
      email: `p7b_${Date.now()}@fazilnagar.local`,
      password: "hashedpassword123",
      role: "user",
      status: "active",
      area: "Ward 2",
    });

    userNonMember = await User.create({
      name: "Phase7 NonMember",
      email: `p7nm_${Date.now()}@fazilnagar.local`,
      password: "hashedpassword123",
      role: "user",
      status: "active",
      area: "Highway Road",
    });

    tokenA = jwt.sign({ id: userA._id, email: userA.email, role: "user" }, JWT_SECRET);
    tokenB = jwt.sign({ id: userB._id, email: userB.email, role: "user" }, JWT_SECRET);
    tokenNonMember = jwt.sign({ id: userNonMember._id, email: userNonMember.email, role: "user" }, JWT_SECRET);

    // Create conversation between userA and userB
    const conv = await Conversation.create({
      type: "direct",
      status: "active",
      initiator: userA._id,
      lastMessage: { text: "Hello", sender: userA._id, createdAt: new Date() },
      lastMessageAt: new Date(),
    });
    conversationId = conv._id.toString();

    await ConversationMember.insertMany([
      { conversation: conv._id, user: userA._id, role: "member", status: "active" },
      { conversation: conv._id, user: userB._id, role: "member", status: "active" },
    ]);
  });

  after(async () => {
    const uids = [userA?._id, userB?._id, userNonMember?._id].filter(Boolean);
    if (conversationId) {
      await Conversation.deleteOne({ _id: conversationId });
      await ConversationMember.deleteMany({ conversation: conversationId });
      await Message.deleteMany({ conversation: conversationId });
    }
    await User.deleteMany({ _id: { $in: uids } });

    // Clean up test file if on disk
    if (createdFilePath && fs.existsSync(createdFilePath)) {
      try { fs.unlinkSync(createdFilePath); } catch (_) {}
    }

    if (server) {
      if (server.closeAllConnections) server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Reject upload without image file (400 Bad Request)", async () => {
    const res = await uploadMultipart({
      path: `/api/messages/conversations/${conversationId}/media`,
      token: tokenA,
      fields: { caption: "No file attached" },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it("2. Reject non-image file attachment (400 Bad Request)", async () => {
    const textBuffer = Buffer.from("This is a plain text file pretending to be image");
    const res = await uploadMultipart({
      path: `/api/messages/conversations/${conversationId}/media`,
      token: tokenA,
      fileBuffer: textBuffer,
      fileName: "document.txt",
      mimeType: "text/plain",
      fields: { caption: "Invalid file" },
    });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  it("3. Reject upload from non-member citizen (403 Forbidden)", async () => {
    // 1x1 1-pixel transparent PNG buffer
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const res = await uploadMultipart({
      path: `/api/messages/conversations/${conversationId}/media`,
      token: tokenNonMember,
      fileBuffer: pngBuffer,
      fileName: "test.png",
      mimeType: "image/png",
      fields: { caption: "Hacker photo" },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("4. Active member can upload image attachment with caption", async () => {
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const res = await uploadMultipart({
      path: `/api/messages/conversations/${conversationId}/media`,
      token: tokenA,
      fileBuffer: pngBuffer,
      fileName: "market-photo.png",
      mimeType: "image/png",
      fields: { caption: "Fazilnagar Weekly Market Fresh Produce" },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message.type, "image");
    assert.equal(res.body.message.body, "Fazilnagar Weekly Market Fresh Produce");
    assert.match(res.body.message.mediaUrl, /^\/uploads\/messages\/media-/);

    uploadedMessageId = res.body.message._id;

    // Track on-disk file for cleanup
    createdFilePath = path.join(__dirname, "..", res.body.message.mediaUrl);
    assert.equal(fs.existsSync(createdFilePath), true);

    // Verify conversation lastMessage updated
    const conv = await Conversation.findById(conversationId);
    assert.equal(conv.lastMessage.type, "image");
    assert.match(conv.lastMessage.text, /📷 Fazilnagar Weekly Market/);
  });

  it("5. Image message can be retrieved via conversation message history", async () => {
    const res = await makeJsonRequest({
      path: `/api/messages/conversations/${conversationId}/messages`,
      method: "GET",
      token: tokenB,
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const imgMsg = res.body.messages.find((m) => m._id === uploadedMessageId);
    assert.ok(imgMsg);
    assert.equal(imgMsg.type, "image");
    assert.match(imgMsg.mediaUrl, /^\/uploads\/messages\//);
    assert.equal(imgMsg.body, "Fazilnagar Weekly Market Fresh Produce");
  });

  it("6. Deleting image for everyone removes body and resets preview", async () => {
    const res = await makeJsonRequest({
      path: `/api/messages/conversations/${conversationId}/messages/${uploadedMessageId}`,
      method: "DELETE",
      token: tokenA,
      body: { deleteType: "everyone" },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const msgInDb = await Message.findById(uploadedMessageId);
    assert.equal(msgInDb.isDeletedForEveryone, true);
    assert.equal(msgInDb.body, "This message was deleted");
    assert.equal(msgInDb.mediaUrl, "");
  });
});
