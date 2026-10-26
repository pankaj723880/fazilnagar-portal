/**
 * Bandwidth & Request Metrics Tracker for Fazilnagar Portal Backend
 *
 * Provides lightweight, privacy-safe request logging and bandwidth accounting.
 * Records:
 *   - Endpoint route pattern (normalized to avoid PII / high-cardinality IDs)
 *   - HTTP method and status code
 *   - Outbound response size in bytes (headers + payload)
 *   - Total request count and cumulative bandwidth
 *
 * Privacy Guarantees:
 *   - Never logs passwords, tokens, Authorization headers, or cookies.
 *   - Never logs request or response bodies.
 *   - Query parameters with PII are stripped.
 */

// In-memory stats accumulator: endpointKey -> EndpointMetric
const endpointStats = new Map();
let totalServerRequests = 0;
let totalServerBytes = 0;
const serverStartTime = Date.now();

/**
 * Normalizes an incoming request path into a stable endpoint pattern.
 * Replaces MongoDB ObjectIDs, Drive file hashes, and specific filenames with tokens
 * to aggregate metrics cleanly without high cardinality or PII leakage.
 */
export function normalizeEndpoint(req) {
  const method = req.method ? req.method.toUpperCase() : "GET";
  let pathname = (req.baseUrl || "") + (req.path || req.url || "").split("?")[0];
  if (!pathname.startsWith("/")) pathname = "/" + pathname;

  // Normalize MongoDB ObjectIDs (24 hex characters)
  pathname = pathname.replace(/\/[0-9a-fA-F]{24}(\b|\/|$)/g, "/:id$1");

  // Normalize Google Drive IDs or file tokens (/media/1A2B3C4D...)
  pathname = pathname.replace(/\/media\/[a-zA-Z0-9_-]{10,}(\b|\/|$)/g, "/media/:id$1");

  // Normalize static uploads paths: /uploads/media/file.jpg -> /uploads/media/:file
  pathname = pathname.replace(/\/uploads\/([a-zA-Z0-9_-]+)\/[^/]+/g, "/uploads/$1/:file");

  // Normalize public forms slugs: /api/forms/public/area-details -> /api/forms/public/:slug
  pathname = pathname.replace(/\/api\/forms\/public\/[a-zA-Z0-9_-]+/g, "/api/forms/public/:slug");

  return `${method} ${pathname}`;
}

/**
 * Lightweight privacy-safe request logger and bandwidth tracker middleware.
 */
export default function bandwidthTracker(req, res, next) {
  const startTime = Date.now();
  let bytesWritten = 0;

  // Intercept chunked stream writes (works seamlessly with compression & streaming media)
  const origWrite = res.write;
  const origEnd = res.end;

  res.write = function (chunk, encoding, cb) {
    if (chunk) {
      bytesWritten += Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk, typeof encoding === "string" ? encoding : "utf8");
    }
    return origWrite.apply(this, arguments);
  };

  res.end = function (chunk, encoding, cb) {
    if (chunk) {
      bytesWritten += Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk, typeof encoding === "string" ? encoding : "utf8");
    }
    return origEnd.apply(this, arguments);
  };

  res.on("finish", () => {
    // If chunked write was not used, fall back to Content-Length header
    if (bytesWritten === 0) {
      const cl = res.getHeader("content-length") || res.getHeader("Content-Length");
      if (cl) {
        const parsed = parseInt(cl, 10);
        if (!isNaN(parsed) && parsed > 0) {
          bytesWritten = parsed;
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode || 200;
    const endpointKey = normalizeEndpoint(req);

    // Update global counters
    totalServerRequests++;
    totalServerBytes += bytesWritten;

    // Update endpoint-specific metrics
    let stat = endpointStats.get(endpointKey);
    if (!stat) {
      stat = {
        endpoint: endpointKey,
        method: req.method || "GET",
        requestCount: 0,
        totalBytes: 0,
        avgBytes: 0,
        minBytes: bytesWritten,
        maxBytes: bytesWritten,
        statusCodes: {},
        lastSeen: new Date(),
      };
      endpointStats.set(endpointKey, stat);
    }

    stat.requestCount++;
    stat.totalBytes += bytesWritten;
    stat.avgBytes = Math.round(stat.totalBytes / stat.requestCount);
    stat.minBytes = Math.min(stat.minBytes, bytesWritten);
    stat.maxBytes = Math.max(stat.maxBytes, bytesWritten);
    stat.statusCodes[statusCode] = (stat.statusCodes[statusCode] || 0) + 1;
    stat.lastSeen = new Date();

    // Privacy-Safe Log Output
    // Only logs method, sanitized endpoint pattern, status code, response size, and latency.
    // Suppresses test runs unless explicitly forced with ENABLE_BW_LOGGING=true
    if (process.env.NODE_ENV !== "test" || process.env.ENABLE_BW_LOGGING === "true") {
      const sizeStr = bytesWritten >= 1048576
        ? `${(bytesWritten / 1048576).toFixed(2)} MB`
        : bytesWritten >= 1024
        ? `${(bytesWritten / 1024).toFixed(1)} KB`
        : `${bytesWritten} B`;
      console.log(`[HTTP BW] ${endpointKey} ${statusCode} ${sizeStr} (${durationMs}ms)`);
    }

  });

  next();
}

/**
 * Returns the top N endpoints sorted by cumulative response bytes sent.
 */
export function getTopEndpointsByBytes(limit = 10) {
  const all = Array.from(endpointStats.values());
  all.sort((a, b) => b.totalBytes - a.totalBytes);
  return all.slice(0, limit);
}

/**
 * Returns the top N endpoints sorted by total request count.
 */
export function getTopEndpointsByRequests(limit = 10) {
  const all = Array.from(endpointStats.values());
  all.sort((a, b) => b.requestCount - a.requestCount);
  return all.slice(0, limit);
}

/**
 * Returns complete bandwidth accounting summary.
 */
export function getBandwidthSummary() {
  const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
  return {
    uptimeSeconds,
    totalRequests: totalServerRequests,
    totalBytes: totalServerBytes,
    totalMegabytes: parseFloat((totalServerBytes / (1024 * 1024)).toFixed(3)),
    topEndpointsByBytes: getTopEndpointsByBytes(10),
    topEndpointsByRequests: getTopEndpointsByRequests(10),
    activeEndpointCount: endpointStats.size,
  };
}

/**
 * Resets accumulator stats (useful for tests and fresh benchmarking).
 */
export function resetBandwidthStats() {
  endpointStats.clear();
  totalServerRequests = 0;
  totalServerBytes = 0;
}
