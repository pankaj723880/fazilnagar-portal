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

import News from "../models/News.js";
import Like from "../models/Like.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import newsRoutes, { normalizeMediaUrl } from "../routes/news.js";

const TEST_PORT = 5066;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

// Helper for making HTTP requests
function httpRequest(options, body = null, isMultipart = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on("error", reject);

    if (body) {
      if (isMultipart) {
        req.write(body);
      } else if (typeof body === "string") {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

// Multipart body builder for node test runner
function buildMultipart(boundary, fields = {}, files = []) {
  const chunks = [];

  for (const [key, value] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(
      Buffer.from(`Content-Disposition: form-data; name="${key}"\r\n\r\n`)
    );
    chunks.push(Buffer.from(`${value}\r\n`));
  }

  for (const file of files) {
    chunks.push(Buffer.from(`--${boundary}\r\n`));
    chunks.push(
      Buffer.from(
        `Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      )
    );
    chunks.push(file.content);
    chunks.push(Buffer.from("\r\n"));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return Buffer.concat(chunks);
}

describe("Media Pipeline, Authentication & Stories Regression Tests", () => {
  let server;
  let userAToken;
  let userBToken;
  let userCToken;
  const userAId = new mongoose.Types.ObjectId().toString();
  const userBId = new mongoose.Types.ObjectId().toString();
  const userCId = new mongoose.Types.ObjectId().toString();

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    userAToken = jwt.sign(
      { id: userAId, email: "usera@fazilnagar.com", name: "User Alpha", role: "citizen" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    userBToken = jwt.sign(
      { id: userBId, email: "userb@fazilnagar.com", name: "User Beta", role: "citizen" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    userCToken = jwt.sign(
      { id: userCId, email: "userc@fazilnagar.com", name: "User Charlie", role: "citizen" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
    app.use("/api/news", newsRoutes);
    app.use("/news", newsRoutes);

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------------
  // TEST 1: normalizeMediaUrl helper tests
  // -------------------------------------------------------------------
  it("normalizeMediaUrl should strip blob: URLs and resolve relative and legacy paths", () => {
    assert.equal(normalizeMediaUrl("blob:http://localhost:5173/abc-123"), "");
    assert.equal(normalizeMediaUrl(""), "");
    assert.equal(normalizeMediaUrl(null), "");

    const fakeReq = {
      protocol: "http",
      get: (header) => (header === "host" ? "127.0.0.1:5066" : ""),
      headers: {},
    };

    const relativeNormalized = normalizeMediaUrl("/uploads/photo-123.jpg", fakeReq);
    assert.ok(
      relativeNormalized.includes("/uploads/photo-123.jpg"),
      "Relative upload path must include /uploads/photo-123.jpg"
    );
    assert.ok(!relativeNormalized.startsWith("/uploads"), "Should be prefixed with reachable base URL");

    const legacyNormalized = normalizeMediaUrl("http://localhost:5000/uploads/photo-legacy.png", fakeReq);
    assert.ok(legacyNormalized.includes("/uploads/photo-legacy.png"));
    assert.ok(!legacyNormalized.includes(":5000"), "Legacy port 5000 should be mapped to active host");
  });

  // -------------------------------------------------------------------
  // TEST 2: User A uploads an image with a post; User B can view it
  // -------------------------------------------------------------------
  let createdImageStoryId;
  it("User A creates a story with a photo; User B fetches and sees persistent, non-blob photo", async () => {
    const boundary = "---------------------------testboundary" + Date.now();
    const fakeImageBuffer = Buffer.from(
      "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    );

    const body = buildMultipart(
      boundary,
      {
        title: "Pawa Nagar Temple Heritage Renovation",
        description: "Community renovation works progressing well at the Jain temple grounds in Fazilnagar.",
        category: "Heritage & Culture",
        location: "Pawa Nagar",
      },
      [
        {
          fieldname: "image",
          filename: "temple_renovation.png",
          contentType: "image/png",
          content: fakeImageBuffer,
        },
      ]
    );

    const createRes = await httpRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/news",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          Authorization: `Bearer ${userAToken}`,
        },
      },
      body,
      true
    );

    assert.equal(createRes.status, 201);
    assert.ok(createRes.data._id, "Story must have an _id");
    createdImageStoryId = createRes.data._id;
    assert.equal(createRes.data.mediaType, "image");
    assert.ok(createRes.data.mediaUrl, "mediaUrl must be populated");
    assert.ok(!createRes.data.mediaUrl.startsWith("blob:"), "mediaUrl must not be a blob URL");

    // User B fetches the story via feed
    const feedRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/feed?storyId=${createdImageStoryId}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${userBToken}`,
      },
    });

    assert.equal(feedRes.status, 200);
    const storyInFeed = feedRes.data.stories?.find((s) => String(s._id) === String(createdImageStoryId));
    assert.ok(storyInFeed, "Story must be returned in feed for User B");
    assert.ok(storyInFeed.image || storyInFeed.mediaUrl, "Attached photo must appear for User B");
    assert.ok(!storyInFeed.mediaUrl.startsWith("blob:"), "Attached photo URL must never be a blob URL");
    assert.equal(storyInFeed.mediaType, "image");
  });

  // -------------------------------------------------------------------
  // TEST 3: User A creates a story with a video; viewers can play it
  // -------------------------------------------------------------------
  let createdVideoStoryId;
  it("User A creates a story with a video; viewers fetch and play the video", async () => {
    const boundary = "---------------------------videoboundary" + Date.now();
    const fakeVideoBuffer = Buffer.from("ftypisom\x00\x00\x02\x00isomiso2mp41\x00\x00\x00\x08free");

    const body = buildMultipart(
      boundary,
      {
        title: "Fazilnagar Sports Tournament Highlights",
        description: "Watch thrilling moments from today's Sarvodaya Inter College cricket match.",
        category: "Sports & Melas",
        location: "Sarvodaya Ground",
      },
      [
        {
          fieldname: "video",
          filename: "cricket_match.mp4",
          contentType: "video/mp4",
          content: fakeVideoBuffer,
        },
      ]
    );

    const createRes = await httpRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/news",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          Authorization: `Bearer ${userAToken}`,
        },
      },
      body,
      true
    );

    assert.equal(createRes.status, 201);
    createdVideoStoryId = createRes.data._id;
    assert.equal(createRes.data.mediaType, "video");
    assert.ok(createRes.data.video || createRes.data.mediaUrl);

    // Unauthenticated guest viewer fetches single story
    const singleRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdVideoStoryId}`,
      method: "GET",
    });

    assert.equal(singleRes.status, 200);
    assert.equal(singleRes.data.mediaType, "video");
    assert.ok(singleRes.data.video.includes("/uploads/") || singleRes.data.video.includes("drive"));
  });

  // -------------------------------------------------------------------
  // TEST 4: Refreshing and re-fetching does not break media URLs
  // -------------------------------------------------------------------
  it("Refreshing/re-fetching maintains persistent media URLs", async () => {
    const res1 = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}`,
      method: "GET",
    });
    const res2 = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}`,
      method: "GET",
    });

    assert.equal(res1.status, 200);
    assert.equal(res2.status, 200);
    assert.equal(res1.data.mediaUrl, res2.data.mediaUrl, "Media URL must be identical across refreshes");
  });

  // -------------------------------------------------------------------
  // TEST 5: Direct unauthenticated calls to like and comment endpoints are rejected
  // -------------------------------------------------------------------
  it("Guests attempting to like or comment directly without authentication receive 401 Unauthorized", async () => {
    // 1. Unauthenticated Like
    const likeRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/like`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { anonId: "guest_attacker" });

    assert.equal(likeRes.status, 401, "Like endpoint must reject unauthenticated requests with 401");

    // 2. Unauthenticated Comment
    const commentRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/comments`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { text: "Unauthenticated spam comment" });

    assert.equal(commentRes.status, 401, "Comment endpoint must reject unauthenticated requests with 401");

    // 3. Unauthenticated Reply
    const replyRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/comments`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, { text: "Unauthenticated reply", parentId: new mongoose.Types.ObjectId().toString() });

    assert.equal(replyRes.status, 401, "Reply endpoint must reject unauthenticated requests with 401");

    // 4. Unauthenticated Comment Like
    const commentLikeRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/comments/${new mongoose.Types.ObjectId()}/like`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }, {});

    assert.equal(commentLikeRes.status, 401, "Comment like endpoint must reject unauthenticated requests with 401");
  });

  // -------------------------------------------------------------------
  // TEST 6: Authenticated users can like and comment successfully
  // -------------------------------------------------------------------
  let createdCommentId;
  it("Authenticated user can like, unlike (no duplicates), and post comments", async () => {
    // User B likes story
    const like1 = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/like`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${userBToken}`,
        "Content-Type": "application/json",
      },
    });

    assert.equal(like1.status, 200);
    assert.equal(like1.data.liked, true);
    assert.equal(like1.data.likeCount, 1);

    // User B unlikes story (duplicate like toggles off)
    const like2 = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/like`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${userBToken}`,
        "Content-Type": "application/json",
      },
    });

    assert.equal(like2.status, 200);
    assert.equal(like2.data.liked, false);
    assert.equal(like2.data.likeCount, 0);

    // Relike for persistence
    await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/like`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${userBToken}`,
        "Content-Type": "application/json",
      },
    });

    // User B posts a comment
    const commentRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/comments`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${userBToken}`,
        "Content-Type": "application/json",
      },
    }, { text: "Proud to see rapid development in our town Fazilnagar!" });

    assert.equal(commentRes.status, 201);
    assert.ok(commentRes.data.comment);
    assert.equal(commentRes.data.comment.authorName, "User Beta");
    assert.equal(String(commentRes.data.comment.userId), userBId);
    createdCommentId = commentRes.data.comment._id;

    // Verify comment is readable publicly
    const getCommentsRes = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/comments`,
      method: "GET",
    });

    assert.equal(getCommentsRes.status, 200);
    assert.ok(getCommentsRes.data.comments.some((c) => String(c._id) === String(createdCommentId)));
  });

  // -------------------------------------------------------------------
  // TEST 7: Authorization on comment deletion
  // -------------------------------------------------------------------
  it("Non-author cannot delete comment (403), while author can delete (200)", async () => {
    // User C (unrelated resident) tries to delete User B's comment
    const unauthorizedDelete = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/comments/${createdCommentId}`,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userCToken}`,
      },
    });

    assert.equal(unauthorizedDelete.status, 403, "Must return 403 Forbidden for non-author non-admin");

    // User B (comment author) deletes their own comment
    const authorizedDelete = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/${createdImageStoryId}/comments/${createdCommentId}`,
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${userBToken}`,
      },
    });

    assert.equal(authorizedDelete.status, 200, "Author must be authorized to delete their comment");
  });

  // -------------------------------------------------------------------
  // TEST 8: Rejection of invalid file types and oversized uploads
  // -------------------------------------------------------------------
  it("Rejects unsupported file types with 400 or 500 error", async () => {
    const boundary = "---------------------------badboundary" + Date.now();
    const body = buildMultipart(
      boundary,
      {
        title: "Invalid File Upload Test",
        description: "Testing rejection of executable scripts.",
      },
      [
        {
          fieldname: "image",
          filename: "malicious_script.exe",
          contentType: "application/x-msdownload",
          content: Buffer.from("MZfakeexecutablecontent"),
        },
      ]
    );

    const res = await httpRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/news",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          Authorization: `Bearer ${userAToken}`,
        },
      },
      body,
      true
    );

    // Multer fileFilter returns an Error, producing 500 or 400
    assert.ok(res.status === 400 || res.status === 500, `Expected rejection, got status: ${res.status}`);
  });

  // -------------------------------------------------------------------
  // TEST 9: Rejection of blob: URLs in body
  // -------------------------------------------------------------------
  it("Rejects/strips client-submitted blob: URLs from MongoDB persistence", async () => {
    const res = await httpRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/news",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userAToken}`,
        },
      },
      {
        title: "Blob Rejection Verification Story",
        description: "Checking that ephemeral blob URLs are never stored.",
        imageUrl: "blob:http://localhost:5173/3c5b905b-8fb7-447a-8ab1-8698eaefba03",
        videoUrl: "blob:http://localhost:5173/b7638067-15ef-4c6e-8270-e42bc5caec4a",
      }
    );

    assert.equal(res.status, 201);
    assert.equal(res.data.image, "", "Image must not contain blob URL");
    assert.equal(res.data.video, "", "Video must not contain blob URL");
    assert.equal(res.data.mediaUrl, "", "MediaUrl must not contain blob URL");

    // Clean up test story
    if (res.data._id) {
      await News.findByIdAndDelete(res.data._id);
    }
  });

  // -------------------------------------------------------------------
  // TEST 10: Auto-detection and recovery of misclassified media
  // (e.g. a PNG image submitted or saved with video fieldname / property)
  // -------------------------------------------------------------------
  it("Auto-corrects misclassified media (e.g. PNG stored in video field) so image renders for everyone", async () => {
    const misclassifiedStory = await News.create({
      title: "Navaratri Durga Mata Story",
      description: "Photo of festival saved under video property by legacy client.",
      summary: "Durga mata ji",
      category: "General",
      location: "Fazilnagar",
      source: "Citizen Reporter",
      image: "",
      video: "/uploads/video-1792059157748-6651485.png",
      status: "approved",
      isPublished: true,
      author: userAId,
    });

    const res = await httpRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/news/feed?page=1&limit=5&storyId=${misclassifiedStory._id}`,
      method: "GET",
    });

    assert.equal(res.status, 200);
    const storyInFeed = res.data.stories.find((s) => String(s._id) === String(misclassifiedStory._id));
    assert.ok(storyInFeed, "Story should be returned in feed");
    assert.equal(storyInFeed.mediaType, "image", "Should be auto-corrected to mediaType 'image'");
    assert.ok(storyInFeed.image.includes("video-1792059157748-6651485.png"), "Image property should receive the URL");
    assert.ok(storyInFeed.mediaUrl.includes("video-1792059157748-6651485.png"), "MediaUrl should receive the URL");
    assert.equal(storyInFeed.video, "", "Video property should be cleared so video player doesn't fail");

    await News.findByIdAndDelete(misclassifiedStory._id);
  });

  // -------------------------------------------------------------------
  // TEST 11: Clean up test documents
  // -------------------------------------------------------------------
  it("Cleans up created test records cleanly without modifying production data", async () => {
    if (createdImageStoryId) {
      await News.findByIdAndDelete(createdImageStoryId);
      await Like.deleteMany({ newsId: createdImageStoryId });
      await Comment.deleteMany({ newsId: createdImageStoryId });
    }
    if (createdVideoStoryId) {
      await News.findByIdAndDelete(createdVideoStoryId);
      await Like.deleteMany({ newsId: createdVideoStoryId });
      await Comment.deleteMany({ newsId: createdVideoStoryId });
    }
  });
});
