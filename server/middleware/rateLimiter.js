/**
 * Lightweight, zero-dependency in-memory rate limiter for Express APIs.
 * Supports sliding window tracking with automatic expiration and cleanup.
 */

import { logSecurityEvent, SecurityEventType } from "../utils/securityLogger.js";

class InMemoryRateLimiter {
  constructor(windowMs = 60 * 1000, maxRequests = 60, message = "Too many requests. Please slow down and try again later.") {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    this.hits = new Map();

    // Periodically clean up expired entries every 2 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of this.hits.entries()) {
        if (now - record.startTime > this.windowMs) {
          this.hits.delete(key);
        }
      }
    }, 2 * 60 * 1000);

    // Allow node process to terminate cleanly
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  middleware() {
    return (req, res, next) => {
      // In automated test environments (e.g. node --test), bypass rate limits so fast suites don't get 429
      if (process.env.NODE_ENV === "test") {
        return next();
      }

      const ip = req.ip || req.socket?.remoteAddress || "127.0.0.1";

      const key = `${ip}:${req.baseUrl || ""}${req.path}`;
      const now = Date.now();

      let record = this.hits.get(key);
      if (!record || now - record.startTime > this.windowMs) {
        record = { count: 1, startTime: now };
        this.hits.set(key, record);
      } else {
        record.count += 1;
      }

      const remaining = Math.max(0, this.maxRequests - record.count);
      const resetTime = Math.ceil((record.startTime + this.windowMs - now) / 1000);

      res.setHeader("X-RateLimit-Limit", this.maxRequests);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetTime);

      if (record.count > this.maxRequests) {
        res.setHeader("Retry-After", resetTime);
        logSecurityEvent(SecurityEventType.RATE_LIMIT_EXCEEDED, {
          req,
          details: `Rate limit of ${this.maxRequests} req / ${Math.round(this.windowMs / 1000)}s exceeded on ${req.baseUrl || ""}${req.path}`,
          severity: "WARN",
        });
        return res.status(429).json({
          success: false,
          message: this.message,
          retryAfterSeconds: resetTime,
        });
      }

      next();
    };
  }
}

// 1. General search rate limit: 60 requests per minute
export const searchLimiter = new InMemoryRateLimiter(60 * 1000, 60, "Too many search queries. Please slow down.").middleware();

// 2. Form submission and write endpoints: 20 submissions per minute
export const writeLimiter = new InMemoryRateLimiter(60 * 1000, 20, "Too many submission attempts. Please wait a moment before trying again.").middleware();

// 3. Sensitive auth endpoints (login / register): 15 attempts per minute
export const authLimiter = new InMemoryRateLimiter(60 * 1000, 15, "Too many login attempts. Please wait 1 minute before retrying.").middleware();

// 4. OTP generation and resend rate limit: 6 requests per 5 minutes
export const otpRequestLimiter = new InMemoryRateLimiter(5 * 60 * 1000, 6, "Too many verification code requests. Please wait before requesting another code.").middleware();

// 5. OTP verification rate limit: 12 attempts per minute
export const otpVerifyLimiter = new InMemoryRateLimiter(60 * 1000, 12, "Too many verification attempts. Please wait 1 minute before trying again.").middleware();

// 6. Password reset operations: 6 attempts per 5 minutes
export const passwordResetLimiter = new InMemoryRateLimiter(5 * 60 * 1000, 6, "Too many password reset attempts. Please wait a few minutes.").middleware();

// 7. Public analytics events (ad impressions, clicks, dismissals): 60 requests per minute
export const analyticsLimiter = new InMemoryRateLimiter(60 * 1000, 60, "Too many tracking events. Please slow down.").middleware();

// 8. Upload endpoints limiter: 30 uploads per 5 minutes
export const uploadLimiter = new InMemoryRateLimiter(5 * 60 * 1000, 30, "Upload rate limit reached. Please wait a few minutes before uploading more media.").middleware();

// In-memory account login failure tracker to protect against distributed credential stuffing
const accountFailureTracker = new Map();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function checkAccountLockout(email) {
  if (!email || process.env.NODE_ENV === "test") return { locked: false };
  const key = String(email).trim().toLowerCase();
  const record = accountFailureTracker.get(key);
  if (!record) return { locked: false };

  const now = Date.now();
  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    if (now - record.lastAttempt < LOCKOUT_DURATION_MS) {
      const waitSeconds = Math.ceil((record.lastAttempt + LOCKOUT_DURATION_MS - now) / 1000);
      return { locked: true, waitSeconds };
    } else {
      // Cooldown passed, reset
      accountFailureTracker.delete(key);
      return { locked: false };
    }
  }
  return { locked: false };
}

export function recordFailedLogin(email) {
  if (!email || process.env.NODE_ENV === "test") return;
  const key = String(email).trim().toLowerCase();
  const now = Date.now();
  const record = accountFailureTracker.get(key) || { attempts: 0, lastAttempt: now };
  record.attempts += 1;
  record.lastAttempt = now;
  accountFailureTracker.set(key, record);
}

export function recordSuccessfulLogin(email) {
  if (!email) return;
  const key = String(email).trim().toLowerCase();
  accountFailureTracker.delete(key);
}

