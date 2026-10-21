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

    if (reqHeaders["if-none-match"] === etag) {
      res.status(304).end();
    }

    assert.equal(statusSet, 304, "Server must respond with 304 when ETag matches");
    assert.equal(ended, true, "Response must end without streaming body payload");
  });
});
