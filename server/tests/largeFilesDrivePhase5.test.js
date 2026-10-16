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

const TEST_PORT = 5109;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Phase 5: 1 GB Large File & Google Drive Attachment Architecture", () => {
  let server;
  let userA;
  let userB;
  let userNonMember;
  let tokenA;
  let tokenB;
  let tokenNonMember;
  let conversationId;
  let testUploadId;

  const uploadMultipart = ({ path: reqPath, token, fileBuffer, fileName, mimeType, fields = {}, fieldName = "chunk" }) => {
    return new Promise((resolve, reject) => {
      const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
      const headers = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        Connection: "close",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      let bodyParts = [];

      for (const [key, val] of Object.entries(fields)) {
        bodyParts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
          )
        );
      }

      if (fileBuffer) {
        bodyParts.push(
          Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
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
            } catch {
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
            } catch {
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
    await mongoose.connect(MONGO_URI);

    const app = express();
    app.use(express.json());
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
    app.use("/api/messages", messagesRoutes);

    server = http.createServer(app);
    initSocket(server);

    await new Promise((resolve) => server.listen(TEST_PORT, resolve));

    const timestamp = Date.now();
    userA = await User.create({
      name: `DriveUserA_${timestamp}`,
      email: `drive_a_${timestamp}@fazilnagar.local`,
      password: "password123",
      role: "user",
    });

    userB = await User.create({
      name: `DriveUserB_${timestamp}`,
      email: `drive_b_${timestamp}@fazilnagar.local`,
      password: "password123",
      role: "user",
    });

    userNonMember = await User.create({
      name: `DriveUserNonMember_${timestamp}`,
      email: `drive_nonmember_${timestamp}@fazilnagar.local`,
      password: "password123",
      role: "user",
    });

    tokenA = jwt.sign({ id: userA._id, role: userA.role }, JWT_SECRET, { expiresIn: "1h" });
    tokenB = jwt.sign({ id: userB._id, role: userB.role }, JWT_SECRET, { expiresIn: "1h" });
    tokenNonMember = jwt.sign({ id: userNonMember._id, role: userNonMember.role }, JWT_SECRET, { expiresIn: "1h" });

    const conversation = await Conversation.create({
      type: "direct",
      isGroup: false,
      initiator: userA._id,
    });
    conversationId = conversation._id.toString();

    await ConversationMember.create({
      conversation: conversation._id,
      user: userA._id,
      role: "member",
    });

    await ConversationMember.create({
      conversation: conversation._id,
      user: userB._id,
      role: "member",
    });
  });

  after(async () => {
    if (userA) await User.deleteOne({ _id: userA._id });
    if (userB) await User.deleteOne({ _id: userB._id });
    if (userNonMember) await User.deleteOne({ _id: userNonMember._id });
    if (conversationId) {
      await Conversation.deleteOne({ _id: conversationId });
      await ConversationMember.deleteMany({ conversation: conversationId });
      await Message.deleteMany({ conversationId });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  it("1. Rejects chunk upload init if user is not a conversation member", async () => {
    const res = await makeJsonRequest({
      path: `/api/messages/conversations/${conversationId}/upload/init`,
      method: "POST",
      token: tokenNonMember,
      body: {
        fileName: "big_video.mp4",
        fileSize: 50 * 1024 * 1024,
        mimeType: "video/mp4",
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
  });

  it("2. Rejects chunk upload init for files exceeding 1 GB limit", async () => {
    const res = await makeJsonRequest({
      path: `/api/messages/conversations/${conversationId}/upload/init`,
      method: "POST",
      token: tokenA,
      body: {
        fileName: "huge_archive.zip",
        fileSize: 1024 * 1024 * 1024 + 100, // > 1 GB
        mimeType: "application/zip",
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /1 GB/i);
  });

  it("3. Rejects chunk upload init for blocked executable extensions (.exe, .bat, .sh)", async () => {
    const res = await makeJsonRequest({
      path: `/api/messages/conversations/${conversationId}/upload/init`,
      method: "POST",
      token: tokenA,
      body: {
        fileName: "malicious_script.bat",
        fileSize: 1024 * 1024,
        mimeType: "application/octet-stream",
      },
    });

    assert.equal(res.status, 400);
    assert.match(res.body.message, /not allowed/i);
  });

  it("4. Successfully initializes a chunked upload session for a large video file", async () => {
    const res = await makeJsonRequest({
      path: `/api/messages/conversations/${conversationId}/upload/init`,
      method: "POST",
      token: tokenA,
      body: {
        fileName: "fazilnagar_event_4k.mp4",
        fileSize: 10 * 1024 * 1024, // 10 MB total
        mimeType: "video/mp4",
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.uploadId);
    assert.ok(res.body.chunkSize > 0);
    assert.ok(res.body.totalChunks >= 1);

    testUploadId = res.body.uploadId;
  });

  it("5. Uploads chunk 0 and chunk 1 for the initiated session", async () => {
    assert.ok(testUploadId, "Upload ID must exist from init");

    // Chunk 0: 5 MB mock binary
    const chunk0 = Buffer.alloc(5 * 1024 * 1024, "a");
    const res0 = await uploadMultipart({
      path: `/api/messages/conversations/${conversationId}/upload/chunk`,
      token: tokenA,
      fileBuffer: chunk0,
      fileName: "chunk0.bin",
      mimeType: "application/octet-stream",
      fields: {
        uploadId: testUploadId,
        chunkIndex: "0",
      },
    });

    assert.equal(res0.status, 200);
    assert.equal(res0.body.success, true);
    assert.equal(res0.body.chunkIndex, 0);

    // Chunk 1: 5 MB mock binary
    const chunk1 = Buffer.alloc(5 * 1024 * 1024, "b");
    const res1 = await uploadMultipart({
      path: `/api/messages/conversations/${conversationId}/upload/chunk`,
      token: tokenA,
      fileBuffer: chunk1,
      fileName: "chunk1.bin",
      mimeType: "application/octet-stream",
      fields: {
        uploadId: testUploadId,
        chunkIndex: "1",
      },
    });

    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);
    assert.equal(res1.body.chunkIndex, 1);
  });

  it("6. Completes chunked upload, assembles chunks, stores file, and returns message with storage metadata", async () => {
    assert.ok(testUploadId, "Upload ID must exist");

    const res = await makeJsonRequest({
      path: `/api/messages/conversations/${conversationId}/upload/complete`,
      method: "POST",
      token: tokenA,
      body: {
        uploadId: testUploadId,
        fileName: "fazilnagar_event_4k.mp4",
        totalChunks: 2,
        mimeType: "video/mp4",
        caption: "High definition recording of town meeting",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.message);
    assert.equal(res.body.message.type, "video");
    assert.equal(res.body.message.fileName, "fazilnagar_event_4k.mp4");
    assert.equal(res.body.message.body, "High definition recording of town meeting");
    assert.ok(res.body.message.storageProvider, "Should have storageProvider ('local' or 'google_drive')");

    // Verify in database
    const savedMsg = await Message.findById(res.body.message._id);
    assert.ok(savedMsg);
    assert.equal(savedMsg.fileName, "fazilnagar_event_4k.mp4");
    assert.ok(["local", "google_drive"].includes(savedMsg.storageProvider));
    assert.equal(savedMsg.fileSize, 10 * 1024 * 1024);
  });

  it("7. Direct media upload properly populates storageProvider field", async () => {
    const testDocBuffer = Buffer.from("Fazilnagar Official Circular 2026 Content");
    const res = await uploadMultipart({
      path: `/api/messages/conversations/${conversationId}/media`,
      token: tokenA,
      fileBuffer: testDocBuffer,
      fileName: "official_circular.pdf",
      mimeType: "application/pdf",
      fieldName: "media",
      fields: {
        caption: "Town Notice",
      },
    });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.message);
    assert.equal(res.body.message.type, "document");
    assert.equal(res.body.message.fileName, "official_circular.pdf");
    assert.ok(["local", "google_drive"].includes(res.body.message.storageProvider));
  });
});
