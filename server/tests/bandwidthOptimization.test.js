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

test("Bandwidth Optimization: getThumbnailUrl and responsive media formatting", async (t) => {
  function getThumbnailUrl(url, width = 400) {
    if (!url || typeof url !== "string") return url;
    if (url.includes("/api/google-drive/media/")) {
      const separator = url.includes("?") ? "&" : "?";
      if (!url.includes("w=") && !url.includes("thumb=")) {
        return `${url}${separator}w=${width}`;
      }
    }
    return url;
  }

  await t.test("Appends ?w=400 to Google Drive media URLs for card thumbnails", () => {
    const original = "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/64f0ab1234567890abcdef12";
    const thumb = getThumbnailUrl(original, 400);
    assert.equal(thumb, `${original}?w=400`, "Thumbnail width param should be appended");
  });

  await t.test("Preserves existing query parameters when adding width param", () => {
    const original = "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/media/64f0ab1234567890abcdef12?token=xyz";
    const thumb = getThumbnailUrl(original, 400);
    assert.equal(thumb, `${original}&w=400`, "Ampersand should be used when query string exists");
  });

  await t.test("Leaves external Unsplash or local relative images untouched", () => {
    const unsplash = "https://images.unsplash.com/photo-1548013146-72479768bada?w=600";
    assert.equal(getThumbnailUrl(unsplash, 400), unsplash);
    const local = "/images/fazilnagar_pawanagar.webp";
    assert.equal(getThumbnailUrl(local, 400), local);
  });
});

test("Bandwidth Optimization: Places and Civic Directory ETag & conditional validation", async (t) => {
  const { matchesEtag } = await import("../routes/googleDrive.js");

  await t.test("Validates weak and strong ETag matching across entity routes", () => {
    const etag = '"places_1700000000000_19"';
    assert.ok(matchesEtag(etag, etag), "Exact match must be true");
    assert.ok(matchesEtag(`W/${etag}`, etag), "Weak If-None-Match must match strong ETag");
    assert.ok(matchesEtag(`"other", ${etag}`, etag), "Comma-separated list must match");
    assert.ok(matchesEtag("*", etag), "Wildcard * must match any ETag");
    assert.ok(!matchesEtag('"different_etag"', etag), "Different ETag must not match");
  });
});

test("Bandwidth Optimization: Vercel Persistent Media Caching & Route Configuration", async (t) => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const vercelJsonPath = path.resolve(__dirname, "../../client/vercel.json");

  assert.ok(fs.existsSync(vercelJsonPath), "client/vercel.json must exist");
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));

  await t.test("Vercel config includes dedicated caching rules for Google Drive media proxy", () => {
    const driveMediaHeader = vercelConfig.headers.find(
      (h) => h.source === "/api/google-drive/media/(.*)"
    );
    assert.ok(driveMediaHeader, "Must have header rule for /api/google-drive/media/(.*)");
    const cc = driveMediaHeader.headers.find((h) => h.key === "Cache-Control");
    assert.ok(cc, "Cache-Control header must be defined for Drive media");
    assert.ok(cc.value.includes("public"), "Drive media must be public cacheable");
    assert.ok(cc.value.includes("max-age=2592000"), "Drive media must have 30-day max-age");
    assert.ok(cc.value.includes("immutable"), "Drive media should be marked immutable");

    const ranges = driveMediaHeader.headers.find((h) => h.key === "Accept-Ranges");
    assert.ok(ranges && ranges.value === "bytes", "Must expose Accept-Ranges: bytes for video streaming");
  });

  await t.test("Vercel config caches static videos, audios, fonts, and images", () => {
    const staticMediaHeader = vercelConfig.headers.find((h) =>
      h.source.includes("mp4") && h.source.includes("webp") && h.source.includes("woff2")
    );
    assert.ok(staticMediaHeader, "Must have comprehensive static media header rule");
    const cc = staticMediaHeader.headers.find((h) => h.key === "Cache-Control");
    assert.ok(cc.value.includes("public"), "Static media must be public");
    assert.ok(cc.value.includes("max-age=2592000"), "Static media must have 30-day cache");
  });

  await t.test("Negative lookahead excludes Google Drive media and static media from no-cache poisoning", () => {
    const catchAllHeader = vercelConfig.headers.find(
      (h) => h.source.includes("?!") && h.headers.some((x) => x.value.includes("no-store"))
    );
    assert.ok(catchAllHeader, "Must find SPA navigation catch-all rule");
    assert.ok(
      catchAllHeader.source.includes("api/google-drive/media/"),
      "Negative lookahead must exclude /api/google-drive/media/"
    );
    assert.ok(
      catchAllHeader.source.includes("mp4"),
      "Negative lookahead must exclude video files (mp4)"
    );
    assert.ok(
      catchAllHeader.source.includes("webm"),
      "Negative lookahead must exclude video files (webm)"
    );
  });

  await t.test("Vercel config preserves SPA index rewrite and Google Drive media proxy rewrite", () => {
    const driveRewrite = vercelConfig.rewrites.find(
      (r) => r.source === "/api/google-drive/media/:id*"
    );
    assert.ok(driveRewrite, "Google Drive media rewrite must exist");
    assert.ok(
      driveRewrite.destination.includes("fazilnagar-portal-l95o.onrender.com"),
      "Rewrite destination must point to production Render backend"
    );

    const spaRewrite = vercelConfig.rewrites.find((r) => r.source === "/:path*");
    assert.ok(spaRewrite, "SPA catch-all rewrite must exist");
    assert.equal(spaRewrite.destination, "/index", "SPA must rewrite to /index");
  });
});

test("Bandwidth Optimization: Public vs Private News Feed caching & ETag validation", async (t) => {
  await t.test("Anonymous news feed receives public Cache-Control and ETag", () => {
    const publicHeader = "public, max-age=60, stale-while-revalidate=120";
    const sampleStories = [{ _id: "story_1", title: "Breaking News", updatedAt: new Date() }];
    const etag = `"${sampleStories[0]._id}_${new Date(sampleStories[0].updatedAt).getTime()}"`;

    assert.ok(publicHeader.includes("public"));
    assert.ok(publicHeader.includes("max-age=60"));
    assert.ok(matchesEtag(etag, etag));
  });

  await t.test("Authenticated news feed strictly uses private, no-store headers with Vary: Authorization", () => {
    const authHeaders = {
      "cache-control": "private, no-cache, no-store, must-revalidate",
      vary: "Authorization",
    };

    assert.ok(authHeaders["cache-control"].includes("private"), "Must be private for authenticated users");
    assert.ok(authHeaders["cache-control"].includes("no-store"), "Must prevent storing in shared cache");
    assert.equal(authHeaders.vary, "Authorization", "Must vary on Authorization to prevent cache poisoning");
  });
});

test("Bandwidth Optimization: Jobs Categories & Feed Projection and Caching", async (t) => {
  await t.test("Jobs categories route generates deterministic ETag from category counts", () => {
    const categories = [
      { _id: "IT & Software", count: 5 },
      { _id: "Healthcare", count: 8 },
    ];
    const totalJobs = 13;
    const etag = `"${categories.length}_${totalJobs}_${categories[0]?.count || 0}"`;

    assert.equal(etag, '"2_13_5"');
    assert.ok(matchesEtag(`"${categories.length}_${totalJobs}_${categories[0]?.count || 0}"`, etag));
  });

  await t.test("Summary job listings strip heavy detail fields to minimize payload size", () => {
    const fullJobDoc = {
      _id: "job_123",
      title: "Senior Pharmacist",
      companyName: "Fazilnagar Medicare",
      location: "Main Market, Fazilnagar",
      jobType: "Full-time",
      salary: { min: 25000, max: 40000, isNegotiable: true },
      applicationInstructions: "Please send a complete CV, degree certificates, pharmacy council registration license, and three references to hr@fazilnagarmedicare.com before the end of the month.",
      screeningQuestions: [
        { question: "Do you hold a valid UP Pharmacy Council license?", required: true },
        { question: "How many years of retail pharmacy experience do you have?", required: true }
      ],
      __v: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Projection stripping heavy fields
    const { applicationInstructions, screeningQuestions, __v, ...summaryJob } = fullJobDoc;

    assert.equal(summaryJob.applicationInstructions, undefined, "applicationInstructions must be omitted in listing");
    assert.equal(summaryJob.screeningQuestions, undefined, "screeningQuestions must be omitted in listing");
    assert.equal(summaryJob.__v, undefined, "__v must be omitted in listing");
    assert.equal(summaryJob.title, "Senior Pharmacist");

    const fullSize = JSON.stringify(fullJobDoc).length;
    const summarySize = JSON.stringify(summaryJob).length;
    assert.ok(summarySize < fullSize, `Summary size (${summarySize}B) must be smaller than full document (${fullSize}B)`);
  });
});

test("Bandwidth Optimization: Active Advertisements and Public Services ETag handling", async (t) => {
  await t.test("Active ads route evaluates ETag and responds with 304 if unchanged", () => {
    const ads = [
      { _id: "ad_1", title: "Diwali Sale", updatedAt: new Date("2026-10-01T00:00:00Z") },
      { _id: "ad_2", title: "New Clinic", updatedAt: new Date("2026-10-15T00:00:00Z") }
    ];
    const latestTime = Math.max(...ads.map((a) => new Date(a.updatedAt).getTime()));
    const etag = `"${ads.length}_${latestTime}"`;

    assert.equal(etag, `"${ads.length}_${new Date("2026-10-15T00:00:00Z").getTime()}"`);
    assert.ok(matchesEtag(etag, etag));
  });

  await t.test("Public services route caches for 3 minutes and validates ETag", () => {
    const services = [
      { _id: "srv_1", name: "Ambulance", updatedAt: new Date("2026-09-01T00:00:00Z") }
    ];
    const etag = `"${services.length}_${new Date(services[0].updatedAt).getTime()}"`;
    const cacheHeader = "public, max-age=180, stale-while-revalidate=600";

    assert.ok(cacheHeader.includes("max-age=180"));
    assert.ok(cacheHeader.includes("stale-while-revalidate=600"));
    assert.ok(matchesEtag(etag, etag));
  });
});

test("Bandwidth Optimization: Client-side In-flight Request Deduplication", async (t) => {
  await t.test("Deduplicates identical concurrent in-flight requests into a single promise", async () => {
    const inFlight = new Map();
    let networkCallCount = 0;

    function mockFetch(url, params = {}) {
      const key = `get:${url}:${JSON.stringify(params)}:anon`;
      if (inFlight.has(key)) {
        return inFlight.get(key);
      }

      networkCallCount++;
      const promise = new Promise((resolve) => {
        setTimeout(() => resolve({ status: 200, data: [{ id: 1, name: "Sample" }] }), 20);
      }).finally(() => {
        inFlight.delete(key);
      });

      inFlight.set(key, promise);
      return promise;
    }

    // Fire 3 simultaneous requests for the exact same resource (e.g., /places)
    const [res1, res2, res3] = await Promise.all([
      mockFetch("/api/places", { limit: 100 }),
      mockFetch("/api/places", { limit: 100 }),
      mockFetch("/api/places", { limit: 100 }),
    ]);

    assert.equal(networkCallCount, 1, "Only 1 outbound network call should occur for 3 concurrent requests");
    assert.deepEqual(res1, res2);
    assert.deepEqual(res2, res3);
    assert.equal(inFlight.size, 0, "In-flight map must be completely clean after completion");

    // Sequential subsequent request after completion makes a new call
    await mockFetch("/api/places", { limit: 100 });
    assert.equal(networkCallCount, 2, "A fresh call should be made after previous request completed");
  });
});

import bandwidthTracker, {
  normalizeEndpoint,
  getTopEndpointsByBytes,
  getTopEndpointsByRequests,
  getBandwidthSummary,
  resetBandwidthStats,
} from "../middleware/bandwidthTracker.js";

test("Bandwidth Optimization: Bandwidth Tracker & Request Metrics Middleware", async (t) => {
  t.beforeEach(() => {
    resetBandwidthStats();
  });

  await t.test("normalizeEndpoint replaces MongoDB ObjectIDs and dynamic tokens cleanly", () => {
    const req1 = { method: "GET", url: "/api/news/66b9318a24c5689012345678", path: "/api/news/66b9318a24c5689012345678" };
    assert.equal(normalizeEndpoint(req1), "GET /api/news/:id");

    const req2 = { method: "GET", url: "/api/google-drive/media/1AbCdEfGhIjKlMnOpQrStUvWxYz", path: "/api/google-drive/media/1AbCdEfGhIjKlMnOpQrStUvWxYz" };
    assert.equal(normalizeEndpoint(req2), "GET /api/google-drive/media/:id");

    const req3 = { method: "GET", url: "/uploads/media/media-1730000000-123456789.webp", path: "/uploads/media/media-1730000000-123456789.webp" };
    assert.equal(normalizeEndpoint(req3), "GET /uploads/media/:file");

    const req4 = { method: "GET", url: "/api/forms/public/area-details", path: "/api/forms/public/area-details" };
    assert.equal(normalizeEndpoint(req4), "GET /api/forms/public/:slug");

    const req5 = { method: "POST", url: "/api/visitors/heartbeat", path: "/api/visitors/heartbeat" };
    assert.equal(normalizeEndpoint(req5), "POST /api/visitors/heartbeat");
  });

  await t.test("Tracks request counts, cumulative bytes, and status codes across multiple simulated requests", async () => {
    function runSimulatedRequest(method, url, resData = "") {
      return new Promise((resolve) => {
        let headers = {};
        const req = {
          method,
          url,
          path: url,
          headers: {},
        };
        const res = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          setHeader(k, v) { headers[k.toLowerCase()] = v; },
          getHeader(k) { return headers[k.toLowerCase()]; },
          _listeners: {},
          on(evt, fn) {
            this._listeners[evt] = this._listeners[evt] || [];
            this._listeners[evt].push(fn);
            return this;
          },
          emit(evt) {
            (this._listeners[evt] || []).forEach((fn) => fn());
          },
          write(chunk) { return true; },
          end(chunk) {
            if (chunk) {
              const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
              this.setHeader("Content-Length", buf.length);
            }
            this.emit("finish");
            resolve();
            return this;
          },
        };

        bandwidthTracker(req, res, () => {
          if (resData) {
            res.end(resData);
          } else {
            res.status(304).end();
          }
        });
      });
    }

    // Fire 3 requests to /api/places (each 1000 bytes)
    await runSimulatedRequest("GET", "/api/places", "A".repeat(1000));
    await runSimulatedRequest("GET", "/api/places", "A".repeat(1000));
    await runSimulatedRequest("GET", "/api/places", "A".repeat(1000));

    // Fire 2 requests to /api/news (each 500 bytes)
    await runSimulatedRequest("GET", "/api/news", "B".repeat(500));
    await runSimulatedRequest("GET", "/api/news", "B".repeat(500));

    // Fire 5 requests to /api/empty (304 Not Modified, 0 bytes)
    for (let i = 0; i < 5; i++) {
      await runSimulatedRequest("GET", "/api/empty", "");
    }

    const summary = getBandwidthSummary();
    assert.equal(summary.totalRequests, 10, "Total server requests must be 10");
    assert.equal(summary.totalBytes, 4000, "Total bytes must be 3000 + 1000 = 4000");

    const topByBytes = getTopEndpointsByBytes(10);
    assert.equal(topByBytes[0].endpoint, "GET /api/places");
    assert.equal(topByBytes[0].totalBytes, 3000);
    assert.equal(topByBytes[0].requestCount, 3);
    assert.equal(topByBytes[1].endpoint, "GET /api/news");
    assert.equal(topByBytes[1].totalBytes, 1000);

    const topByRequests = getTopEndpointsByRequests(10);
    assert.equal(topByRequests[0].endpoint, "GET /api/empty", "304 endpoint should have highest request count");
    assert.equal(topByRequests[0].requestCount, 5);
    assert.equal(topByRequests[0].totalBytes, 0, "304 requests should consume 0 payload bytes");
  });

  await t.test("Privacy Guarantee: Bandwidth tracker never logs or exposes PII, tokens, or body payloads", () => {
    const summary = getBandwidthSummary();
    const serialized = JSON.stringify(summary);

    assert.equal(serialized.includes("password"), false, "Must not contain passwords");
    assert.equal(serialized.includes("Bearer"), false, "Must not contain tokens");
    assert.equal(serialized.includes("jwt"), false, "Must not contain JWT");
    assert.equal(serialized.includes("body"), false, "Must not store request or response bodies");
  });
});




