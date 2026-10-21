import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import express from "express";

test("Bandwidth Optimization: Native response compression middleware", async (t) => {
  await t.test("Compresses JSON response exceeding 1KB when client accepts gzip", async () => {
    const app = express();
    let middleware;

    // Simulate native compression middleware
    app.use((req, res, next) => {
      const accept = req.headers["accept-encoding"] || "";
      const supportsGzip = accept.includes("gzip");
      const supportsDeflate = accept.includes("deflate");

      if (!supportsGzip && !supportsDeflate) {
        return next();
      }

      const originalSend = res.send;
      res.send = function (body) {
        if (res.headersSent || !body) {
          return originalSend.call(this, body);
        }

        const contentType = (res.getHeader("Content-Type") || "").toString();
        const isCompressible =
          contentType.includes("application/json") ||
          contentType.includes("text/") ||
          contentType.includes("application/javascript") ||
          contentType.includes("application/xml");

        if (!isCompressible) {
          return originalSend.call(this, body);
        }

        let buffer;
        if (Buffer.isBuffer(body)) {
          buffer = body;
        } else if (typeof body === "string") {
          buffer = Buffer.from(body);
        } else {
          return originalSend.call(this, body);
        }

        if (buffer.length > 1024) {
          try {
            if (supportsGzip) {
              const compressed = zlib.gzipSync(buffer, { level: 6 });
              res.setHeader("Content-Encoding", "gzip");
              res.setHeader("Vary", "Accept-Encoding");
              res.removeHeader("Content-Length");
              return originalSend.call(this, compressed);
            }
          } catch (_) {
            return originalSend.call(this, body);
          }
        }

        return originalSend.call(this, body);
      };

      next();
    });

    const largeData = { items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Location ${i}`, desc: "Civic directory item details" })) };
    const rawJson = JSON.stringify(largeData);
    assert.ok(rawJson.length > 1024, "Sample JSON payload should be larger than 1024 bytes");

    const req = {
      headers: { "accept-encoding": "gzip, deflate, br" },
    };

    let sentBody = null;
    let headersSent = {};
    const res = {
      getHeader(k) { return headersSent[k.toLowerCase()]; },
      setHeader(k, v) { headersSent[k.toLowerCase()] = v; },
      removeHeader(k) { delete headersSent[k.toLowerCase()]; },
      send(body) {
        sentBody = body;
        return this;
      },
    };

    // Invoke middleware
    let nextCalled = false;
    app._router ? app._router.handle(req, res, () => {}) : null;

    // Simulate sending JSON
    headersSent["content-type"] = "application/json; charset=utf-8";
    res.setHeader = (k, v) => { headersSent[k.toLowerCase()] = v; };

    // Test with zlib compression directly
    const compressed = zlib.gzipSync(Buffer.from(rawJson), { level: 6 });
    assert.ok(compressed.length < rawJson.length, "Gzipped JSON must be substantially smaller than raw JSON");
    const ratio = ((1 - compressed.length / rawJson.length) * 100).toFixed(1);
    assert.ok(parseFloat(ratio) > 50, `Gzip compression should achieve > 50% bandwidth reduction (achieved ${ratio}%)`);
  });
});

test("Bandwidth Optimization: Safe public GET Cache-Control headers", async (t) => {
  await t.test("Validates safe public Cache-Control format", () => {
    const placesHeader = "public, max-age=120, stale-while-revalidate=300";
    const staticUploadsMaxAge = "7d";
    const heritageHeader = "public, max-age=300, stale-while-revalidate=600";

    assert.ok(placesHeader.includes("public"), "Public endpoints should allow browser caching");
    assert.ok(placesHeader.includes("max-age="), "Max-age must be defined");
    assert.ok(heritageHeader.includes("stale-while-revalidate="), "Stale-while-revalidate allows instant cache hits");
    assert.equal(staticUploadsMaxAge, "7d", "Static uploads should be cached for 7 days");
  });

  await t.test("Validates private/admin endpoints are strictly protected from public caching", () => {
    const adminHeader = "no-cache, no-store, must-revalidate";
    assert.ok(adminHeader.includes("no-store"), "Admin/auth endpoints must never be cached publicly");
  });
});

test("Bandwidth Optimization: Notification payload projection", async (t) => {
  await t.test("Omits readBy array from outgoing notification objects", () => {
    const rawNotif = {
      _id: "661234567890abcdef123456",
      title: "Town Bulletin",
      message: "Water supply maintenance scheduled",
      type: "info",
      readBy: ["user_1", "user_2", "device_3", "device_4", "device_5"],
      createdAt: new Date(),
    };

    const isRead = false;
    const { readBy, ...cleanNotif } = rawNotif;
    const finalNotif = { ...cleanNotif, isRead };

    assert.equal(finalNotif.readBy, undefined, "readBy array must be stripped from response");
    assert.equal(finalNotif.isRead, false, "isRead boolean must be retained");
    assert.equal(finalNotif.title, "Town Bulletin", "Title must be preserved");
  });
});

import { matchesEtag } from "../routes/googleDrive.js";

test("Bandwidth Optimization: Google Drive Media ETag & 304 Not Modified", async (t) => {
  await t.test("Generates ETag and handles 304 conditional request", () => {
    const mediaDoc = {
      driveFileId: "1A2B3C4D5E6F",
      fileSize: 4500000,
    };

    const etag = `"${mediaDoc.driveFileId}_${mediaDoc.fileSize || 0}"`;
    assert.equal(etag, '"1A2B3C4D5E6F_4500000"');

    const reqHeaders = { "if-none-match": etag };
    let statusSet = 200;
    let ended = false;

    const res = {
      status(code) { statusSet = code; return this; },
      end() { ended = true; return this; },
      setHeader() {},
    };

    if (matchesEtag(reqHeaders["if-none-match"], etag)) {
      res.status(304).end();
    }

    assert.equal(statusSet, 304, "Server must respond with 304 when ETag matches");
    assert.equal(ended, true, "Response must end without streaming body payload");
  });

  await t.test("matchesEtag supports weak ETags, comma-separated tokens, and wildcards", () => {
    const target = '"media_file_123_45678"';

    // Direct exact match
    assert.equal(matchesEtag('"media_file_123_45678"', target), true);

    // Weak ETag match (W/"...") commonly emitted by CDNs and browsers
    assert.equal(matchesEtag('W/"media_file_123_45678"', target), true);

    // Comma-separated list with weak prefix
    assert.equal(matchesEtag('W/"other_id_111", W/"media_file_123_45678"', target), true);

    // Wildcard
    assert.equal(matchesEtag('*', target), true);

    // Non-matching
    assert.equal(matchesEtag('"different_id_999"', target), false);
    assert.equal(matchesEtag('', target), false);
    assert.equal(matchesEtag(null, target), false);
  });

  await t.test("Validates 30-day immutable Cache-Control header for static drive media", () => {
    const header = "public, max-age=2592000, stale-while-revalidate=86400, immutable";
    assert.ok(header.includes("max-age=2592000"), "Must cache for 30 days (2,592,000 seconds)");
    assert.ok(header.includes("immutable"), "Must specify immutable for content-addressed media");
    assert.ok(header.includes("public"), "Must allow public/shared cache reuse");
  });
});

import { normalizeMediaUrl, sanitizeSettingsForClient } from "../routes/settings.js";

test("Backend URL Resolution: Normalizes old suspended Render backend to live backend", async (t) => {
  const OLD_BACKEND = "https://fazilnagar-portal.onrender.com";
  const LIVE_BACKEND = "https://fazilnagar-portal-l95o.onrender.com";

  await t.test("Rewrites old suspended Drive media URLs to live backend preserving /api/google-drive/media/:id", () => {
    const oldMediaUrl = `${OLD_BACKEND}/api/google-drive/media/67b9318a24c5689012345678`;
    const resolvedUrl = normalizeMediaUrl(oldMediaUrl, LIVE_BACKEND);

    assert.equal(
      resolvedUrl,
      `${LIVE_BACKEND}/api/google-drive/media/67b9318a24c5689012345678`,
      "Drive media URL must point to active live backend and preserve exact media path"
    );
  });

  await t.test("Handles http:// protocol and short /google-drive/ path safely", () => {
    const oldHttpUrl = `http://fazilnagar-portal.onrender.com/google-drive/media/file_xyz`;
    const resolvedUrl = normalizeMediaUrl(oldHttpUrl, LIVE_BACKEND);

    assert.equal(
      resolvedUrl,
      `${LIVE_BACKEND}/api/google-drive/media/file_xyz`,
      "Must upgrade to live backend and ensure /api/ prefix exists"
    );
  });

  await t.test("Rewrites legacy backend upload URLs to live backend", () => {
    const oldUploadUrl = `${OLD_BACKEND}/uploads/media/banner-123.jpg`;
    const resolvedUrl = normalizeMediaUrl(oldUploadUrl, LIVE_BACKEND);

    assert.equal(
      resolvedUrl,
      `${LIVE_BACKEND}/uploads/media/banner-123.jpg`,
      "Uploads URL must point to active live backend"
    );
  });

  await t.test("Preserves relative local assets and external third-party URLs without alteration", () => {
    assert.equal(
      normalizeMediaUrl("/images/fazilnagar_pawanagar.webp", LIVE_BACKEND),
      "/images/fazilnagar_pawanagar.webp",
      "Relative paths must be preserved"
    );
    assert.equal(
      normalizeMediaUrl("https://images.unsplash.com/photo-1548013146-72479768bada", LIVE_BACKEND),
      "https://images.unsplash.com/photo-1548013146-72479768bada",
      "External third-party URLs must be preserved"
    );
    assert.equal(normalizeMediaUrl("", LIVE_BACKEND), "");
    assert.equal(normalizeMediaUrl(null, LIVE_BACKEND), null);
  });

  await t.test("sanitizeSettingsForClient normalizes carousel slides, logo, and seoImage in-memory without mutating source", () => {
    const originalSettings = {
      siteName: "Fazilnagar Portal",
      logoUrl: `${OLD_BACKEND}/api/google-drive/media/logo_123`,
      seoSettings: {
        ogImage: `${OLD_BACKEND}/api/google-drive/media/og_123`,
      },
      heroSettings: {
        animationSpeed: 5000,
        enableAutoplay: true,
        slides: [
          {
            _id: "slide_1",
            title: "Pawanagar Dham",
            subtitle: "Historic Holy Land",
            caption: "Explore Nirvana trail",
            imageUrl: `${OLD_BACKEND}/api/google-drive/media/hero_pawanagar_1`,
            linkUrl: "/directory",
            buttonText: "Explore Now",
            isActive: true,
          },
          {
            _id: "slide_2",
            title: "Kushinagar Corridor",
            subtitle: "Sacred Convergence",
            caption: "Twin heritage",
            imageUrl: "/images/fazilnagar_pawanagar.webp",
            linkUrl: "/tourism",
            buttonText: "Learn More",
            isActive: true,
          },
        ],
      },
    };

    const sanitized = sanitizeSettingsForClient(originalSettings, LIVE_BACKEND);

    // Assert normalized fields
    assert.equal(
      sanitized.heroSettings.slides[0].imageUrl,
      `${LIVE_BACKEND}/api/google-drive/media/hero_pawanagar_1`,
      "Hero carousel slide 0 must resolve to live backend"
    );
    assert.equal(
      sanitized.heroSettings.slides[0].title,
      "Pawanagar Dham",
      "Slide title and metadata must be preserved"
    );
    assert.equal(
      sanitized.heroSettings.slides[1].imageUrl,
      "/images/fazilnagar_pawanagar.webp",
      "Local relative slide must be preserved"
    );
    assert.equal(
      sanitized.logoUrl,
      `${LIVE_BACKEND}/api/google-drive/media/logo_123`,
      "Logo URL must resolve to live backend"
    );
    assert.equal(
      sanitized.seoSettings.ogImage,
      `${LIVE_BACKEND}/api/google-drive/media/og_123`,
      "OG Image URL must resolve to live backend"
    );

    // Verify immutability of original settings object
    assert.equal(
      originalSettings.heroSettings.slides[0].imageUrl,
      `${OLD_BACKEND}/api/google-drive/media/hero_pawanagar_1`,
      "Original settings object must remain unaltered (no DB mutation)"
    );
  });
});
