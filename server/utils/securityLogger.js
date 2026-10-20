/**
 * Structured Security Audit Logger
 * Logs security-relevant events without exposing sensitive payloads, credentials, or tokens.
 */

export const SecurityEventType = {
  AUTH_SUCCESS: "AUTH_SUCCESS",
  AUTH_FAILURE: "AUTH_FAILURE",
  FORBIDDEN_ACCESS: "FORBIDDEN_ACCESS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  NOSQL_INJECTION_BLOCKED: "NOSQL_INJECTION_BLOCKED",
  UNSUPPORTED_METHOD: "UNSUPPORTED_METHOD",
  FILE_VALIDATION_REJECTED: "FILE_VALIDATION_REJECTED",
  ADMIN_ACTION: "ADMIN_ACTION",
  SUSPICIOUS_REQUEST: "SUSPICIOUS_REQUEST",
};

export function logSecurityEvent(eventType, { req, userId, email, details = "", severity = "WARN" } = {}) {
  // In automated test environments, suppress non-critical noise unless explicitly debugged
  if (process.env.NODE_ENV === "test" && severity !== "CRITICAL") {
    return;
  }

  const timestamp = new Date().toISOString();
  const clientIp = req?.ip || req?.socket?.remoteAddress || "unknown";
  const method = req?.method || "INTERNAL";
  const path = req?.originalUrl || req?.url || "unknown";
  const userIdentifier = email || userId || req?.user?.email || req?.user?.id || "anonymous";

  const logPayload = {
    timestamp,
    level: severity,
    eventType,
    clientIp,
    method,
    path,
    user: userIdentifier,
    details: typeof details === "string" ? details.slice(0, 300) : "",
  };

  const formattedMsg = `[SECURITY ${severity}] [${timestamp}] [${eventType}] [IP: ${clientIp}] [User: ${userIdentifier}] ${method} ${path}${details ? ` - ${details}` : ""}`;

  if (severity === "CRITICAL" || severity === "ALERT") {
    console.error(formattedMsg);
  } else if (severity === "WARN") {
    console.warn(formattedMsg);
  } else {
    console.log(formattedMsg);
  }

  return logPayload;
}
