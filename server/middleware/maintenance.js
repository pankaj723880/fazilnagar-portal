import jwt from "jsonwebtoken";
import RevokedToken from "../models/RevokedToken.js";
import User from "../models/User.js";
import { getOrCreateSettings } from "../routes/settings.js";
import { isMaintenanceActive } from "../models/SiteSettings.js";

/**
 * Global Maintenance Middleware
 * Intercepts incoming requests before route handlers execute.
 * When maintenance mode is active:
 * - Public data APIs and public mutation routes are blocked with HTTP 503.
 * - Exempt endpoints (health checks, auth endpoints, settings fetch) remain accessible.
 * - Authenticated administrators with valid JWT tokens bypass maintenance mode and are never blocked.
 */
export async function maintenanceMiddleware(req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    if (!isMaintenanceActive(settings)) {
      return next();
    }

    const path = req.path || "";

    // 1. Unconditionally exempt health check endpoints
    if (path === "/" || path === "/health" || path === "/api/health") {
      return next();
    }

    // 2. Unconditionally exempt auth endpoints so administrators and users can authenticate / log in
    if (path.startsWith("/api/auth") || path.startsWith("/auth")) {
      return next();
    }

    // 3. Exempt public settings GET routes so client can obtain maintenance info, theme, and logo
    if (
      req.method === "GET" &&
      (path === "/api/settings" ||
        path === "/settings" ||
        path === "/api/settings/live-version" ||
        path === "/settings/live-version" ||
        path === "/api/settings/maintenance" ||
        path === "/settings/maintenance")
    ) {
      return next();
    }

    // 4. Check for authenticated administrator bypass
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      if (token && token !== "undefined" && token !== "null") {
        try {
          const isRevoked = await RevokedToken.exists({ token });
          if (!isRevoked) {
            const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
            const verified = jwt.verify(token, secretKey);

            if (verified && verified.id && verified.role === "admin") {
              // Cross-verify with database to ensure role has not been revoked or account suspended
              const dbUser = await User.findById(verified.id).select("role status");
              if (
                dbUser &&
                dbUser.role === "admin" &&
                dbUser.status !== "inactive" &&
                dbUser.status !== "suspended"
              ) {
                req.user = verified;
                req.token = token;
                return next(); // Authenticated admin allowed through
              }
            }
          }
        } catch {
          // Token verification failed; fall through to maintenance block
        }
      }
    }

    // 5. Block all other requests with consistent HTTP 503
    const m = settings.maintenance || {};
    res.setHeader("Retry-After", "300");
    return res.status(503).json({
      success: false,
      maintenance: true,
      maintenanceActive: true,
      code: "MAINTENANCE_MODE_ACTIVE",
      message:
        m.message ||
        "We are temporarily unavailable due to scheduled maintenance. Please check back soon.",
      reopeningText: m.reopeningText || "Coming back soon",
      expectedReopeningTime: m.expectedReopeningTime || null,
      scheduledStartTime: m.scheduledStartTime || null,
      scheduledEndTime: m.scheduledEndTime || null,
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[MaintenanceMiddleware] Error:", err);
    // In case of error checking maintenance, fail open to avoid catastrophic outage
    next();
  }
}

export default maintenanceMiddleware;
