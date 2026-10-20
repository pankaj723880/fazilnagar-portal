import { logSecurityEvent, SecurityEventType } from "../utils/securityLogger.js";

/**
 * Zero-dependency NoSQL Injection Prevention Middleware
 * Recursively scans and cleanses query objects, route parameters, and request bodies
 * to prevent MongoDB query operator injection (keys starting with '$' or containing '.').
 */

function sanitizePayload(target, req, location = "body") {
  if (
    !target ||
    typeof target !== "object" ||
    target instanceof Date ||
    target instanceof RegExp ||
    Buffer.isBuffer(target) ||
    Object.isFrozen(target)
  ) {
    return false;
  }

  let hasProhibitedKeys = false;

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      if (typeof target[i] === "object" && target[i] !== null) {
        if (sanitizePayload(target[i], req, location)) {
          hasProhibitedKeys = true;
        }
      }
    }
    return hasProhibitedKeys;
  }

  const keys = Object.keys(target);
  for (const key of keys) {
    if (key.startsWith("$") || key.includes(".")) {
      hasProhibitedKeys = true;
      try {
        delete target[key];
      } catch (_) {
        // Safe catch if property is non-configurable or read-only
      }
    } else if (typeof target[key] === "object" && target[key] !== null) {
      if (sanitizePayload(target[key], req, location)) {
        hasProhibitedKeys = true;
      }
    }
  }

  return hasProhibitedKeys;
}

export const mongoSanitize = (req, res, next) => {
  let detected = false;

  if (req.body && typeof req.body === "object") {
    if (sanitizePayload(req.body, req, "body")) {
      detected = true;
    }
  }

  if (req.query && typeof req.query === "object") {
    if (sanitizePayload(req.query, req, "query")) {
      detected = true;
    }
  }

  if (req.params && typeof req.params === "object") {
    if (sanitizePayload(req.params, req, "params")) {
      detected = true;
    }
  }

  if (detected) {
    logSecurityEvent(SecurityEventType.NOSQL_INJECTION_BLOCKED, {
      req,
      details: "NoSQL operator injection characters ($ or .) detected and sanitized from request payload.",
      severity: "WARN",
    });
  }

  next();
};

export default mongoSanitize;
