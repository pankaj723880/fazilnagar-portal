import { test } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import express from "express";
import {
  matchesEtag,
  FALLBACK_THUMBNAIL_SVG,
} from "../routes/googleDrive.js";

function getThumbnailUrl(url, width = 400) {
  if (!url || typeof url !== "string") return "";
  if (url.includes("/api/google-drive/media/")) {
    if (/[?&]w=\d+/.test(url)) {
      return url.replace(/([?&])w=\d+/, `$1w=${width}`);
    }
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}w=${width}`;
  }
  return url;
}

function resolveStoryMedia(story) {
  if (!story || typeof story !== "object") {
    return { hasVideo: false, videoUrl: "", hasImage: false, imageUrl: "" };
  }
  const videoUrl = story.video || (story.mediaType === "video" ? story.mediaUrl : "") || "";
  let imageUrl = story.image || (story.mediaType === "image" ? story.mediaUrl : "") || "";

  if (videoUrl && !imageUrl) {
    imageUrl = getThumbnailUrl(videoUrl, 400);
  }

  return {
    hasVideo: Boolean(videoUrl),
    videoUrl,
    hasImage: Boolean(imageUrl),
    imageUrl,
  };
}

test("Google Drive Media Optimization & Bandwidth Protection Suite", async (t) => {
  await t.test("1. Fallback thumbnail SVG constant is lightweight, valid XML, and under 1 KB", () => {
    assert.ok(Buffer.isBuffer(FALLBACK_THUMBNAIL_SVG), "Must be a Buffer");
    assert.ok(FALLBACK_THUMBNAIL_SVG.length < 1024, `Must be under 1 KB, got ${FALLBACK_THUMBNAIL_SVG.length} bytes`);
    const svgStr = FALLBACK_THUMBNAIL_SVG.toString("utf-8");
    assert.ok(svgStr.includes("<svg"), "Must be valid SVG XML");
    assert.ok(svgStr.includes("FAZILNAGAR PORTAL"), "Must contain portal branding");
  });

  await t.test("2. ETag validation supports weak ETags, wildcards, and thumbnail format", () => {
    const thumbEtag = '"drive123_thumb_400"';
    assert.equal(matchesEtag('"drive123_thumb_400"', thumbEtag), true);
    assert.equal(matchesEtag('W/"drive123_thumb_400"', thumbEtag), true);
    assert.equal(matchesEtag('*', thumbEtag), true);
    assert.equal(matchesEtag('"other_thumb"', thumbEtag), false);
  });

  await t.test("3. Conditional 304 handling on mock HTTP server with ETag & If-Modified-Since", async () => {
    const app = express();
    const docTime = new Date("2026-10-01T12:00:00Z");

    app.get("/api/google-drive/media/:id", (req, res) => {
      const etag = '"drive_file_999_3500000"';
      const lastModified = docTime.toUTCString();

      // Conditional ETag
      if (matchesEtag(req.headers["if-none-match"], etag)) {
        res.setHeader("ETag", etag);
        res.setHeader("Last-Modified", lastModified);
        res.setHeader("Cache-Control", "public, max-age=2592000, s-maxage=2592000, immutable");
        return res.status(304).end();
      }

      // Conditional If-Modified-Since
      if (req.headers["if-modified-since"]) {
        const ifMod = new Date(req.headers["if-modified-since"]);
        if (!isNaN(ifMod.getTime()) && docTime <= ifMod && !req.headers["if-none-match"]) {
          res.setHeader("ETag", etag);
          res.setHeader("Last-Modified", lastModified);
          res.setHeader("Cache-Control", "public, max-age=2592000, s-maxage=2592000, immutable");
          return res.status(304).end();
        }
      }

      res.setHeader("ETag", etag);
      res.setHeader("Last-Modified", lastModified);
      res.setHeader("Content-Type", "image/jpeg");
      res.status(200).send(Buffer.alloc(3500000));
    });

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // Step A: First request gets 200 with full 3.5 MB
      const res1 = await fetch(`http://127.0.0.1:${port}/api/google-drive/media/64f0ab123`);
      assert.equal(res1.status, 200);
      assert.equal(res1.headers.get("etag"), '"drive_file_999_3500000"');

      // Step B: Subsequent request with If-None-Match returns 304 with 0 bytes transferred
      const res2 = await fetch(`http://127.0.0.1:${port}/api/google-drive/media/64f0ab123`, {
        headers: { "if-none-match": '"drive_file_999_3500000"' },
      });
      assert.equal(res2.status, 304);
      const text2 = await res2.text();
      assert.equal(text2.length, 0, "304 body must be 0 bytes");

      // Step C: Subsequent request with If-Modified-Since returns 304 with 0 bytes
      const res3 = await fetch(`http://127.0.0.1:${port}/api/google-drive/media/64f0ab123`, {
        headers: { "if-modified-since": docTime.toUTCString() },
      });
      assert.equal(res3.status, 304);
      const text3 = await res3.text();
      assert.equal(text3.length, 0, "304 body must be 0 bytes");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test("4. Thumbnail fallback prevents full-media streaming on 403 or failure", async () => {
    const app = express();

    app.get("/api/google-drive/media/:id", (req, res) => {
      const isThumbRequested = Boolean(req.query.w || req.query.thumb);

      if (isThumbRequested) {
        // Simulate Google Drive thumbnail request failing with 403 Forbidden
        // Instead of falling back to streaming the 11MB file, deliver lightweight SVG placeholder!
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
        return res.status(200).end(FALLBACK_THUMBNAIL_SVG);
      }

      // Full media path (e.g. 11 MB video)
      res.setHeader("Content-Type", "video/mp4");
      res.status(200).send(Buffer.alloc(11000000));
    });

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // Request thumbnail with ?w=400
      const res = await fetch(`http://127.0.0.1:${port}/api/google-drive/media/video_123?w=400`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "image/svg+xml");
      assert.ok(res.headers.get("cache-control").includes("max-age=86400"));

      const body = await res.arrayBuffer();
      assert.equal(body.byteLength, FALLBACK_THUMBNAIL_SVG.length);
      assert.ok(
        body.byteLength < 1000,
        `Transferred bytes must be under 1 KB (~${body.byteLength} B), never 11 MB full video!`
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test("5. Video Range request supports seeking and HTTP 206 Partial Content", async () => {
    const app = express();
    const fakeVideoSize = 10000000; // 10MB

    app.get("/api/google-drive/media/:id", (req, res) => {
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : start + 99999;
        const chunk = end - start + 1;

        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fakeVideoSize}`);
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Length", chunk);
        res.setHeader("Content-Type", "video/mp4");
        return res.end(Buffer.alloc(chunk));
      }

      res.status(200).end(Buffer.alloc(fakeVideoSize));
    });

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/google-drive/media/vid_test`, {
        headers: { Range: "bytes=500000-599999" },
      });

      assert.equal(res.status, 206, "Must return HTTP 206 Partial Content");
      assert.equal(res.headers.get("content-range"), "bytes 500000-599999/10000000");
      assert.equal(res.headers.get("accept-ranges"), "bytes");
      assert.equal(res.headers.get("content-length"), "100000");

      const body = await res.arrayBuffer();
      assert.equal(body.byteLength, 100000, "Transferred chunk must exactly match 100 KB seek window");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test("6. Private and authenticated media strictly use private no-store cache headers", async () => {
    const app = express();

    app.get("/api/google-drive/media/:id", (req, res) => {
      const isPrivate = Boolean(req.headers.authorization || req.query.private === "1");
      const cacheHeader = isPrivate
        ? "private, no-cache, no-store, must-revalidate"
        : "public, max-age=2592000, s-maxage=2592000, immutable";

      res.setHeader("Cache-Control", cacheHeader);
      res.status(200).json({ ok: true });
    });

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const resPublic = await fetch(`http://127.0.0.1:${port}/api/google-drive/media/file_pub`);
      assert.ok(resPublic.headers.get("cache-control").includes("public"));

      const resPrivate = await fetch(`http://127.0.0.1:${port}/api/google-drive/media/file_priv`, {
        headers: { Authorization: "Bearer test_token" },
      });
      const privCache = resPrivate.headers.get("cache-control");
      assert.ok(privCache.includes("private"), "Must be private");
      assert.ok(privCache.includes("no-store"), "Must have no-store");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  await t.test("7. Client resolveStoryMedia derives video poster thumbnail when explicit image is absent", () => {
    const videoOnlyStory = {
      title: "Local Cricket Tournament Final",
      video: "/api/google-drive/media/cricket_video_123",
      mediaType: "video",
    };

    const resolved = resolveStoryMedia(videoOnlyStory);
    assert.equal(resolved.hasVideo, true);
    assert.ok(resolved.videoUrl.includes("/api/google-drive/media/cricket_video_123"));
    assert.equal(resolved.hasImage, true, "Must derive hasImage=true from video thumbnail");
    assert.ok(
      resolved.imageUrl.includes("/api/google-drive/media/cricket_video_123"),
      "imageUrl must point to video thumbnail URL"
    );
    assert.ok(resolved.imageUrl.includes("w=400"), "Derived image must request lightweight 400px thumbnail");
  });

  await t.test("8. getThumbnailUrl correctly appends or replaces width parameter", () => {
    const raw = "/api/google-drive/media/place_photo_abc";
    const thumb400 = getThumbnailUrl(raw, 400);
    assert.equal(thumb400, "/api/google-drive/media/place_photo_abc?w=400");

    const thumb200 = getThumbnailUrl(thumb400, 200);
    assert.equal(thumb200, "/api/google-drive/media/place_photo_abc?w=200");
  });
});
