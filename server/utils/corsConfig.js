/**
 * CORS Configuration and Origin Whitelist Validation
 * 
 * Supports:
 * - Local development environments (localhost, 127.0.0.1 on any port)
 * - Vercel deployments (*.vercel.app including preview branches)
 * - Custom production domains (fazilnagar.me and www.fazilnagar.me)
 * - Comma-separated environment variables (CLIENT_URL and ALLOWED_ORIGINS)
 * - Server-to-server, curl, Postman, and mobile clients with no Origin header
 */

export const parseCommaSeparatedUrls = (val) => {
  if (!val || typeof val !== "string") return [];
  return val
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
};

export const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://fazilnagar.vercel.app",
  "https://fazilnagar-portal-nine.vercel.app",
  "https://fazilnagar.me",
  "https://www.fazilnagar.me",
  "http://localhost:5000",
  "http://127.0.0.1:5173",
];

export const getAllowedOrigins = () => {
  return Array.from(
    new Set([
      ...defaultAllowedOrigins,
      ...parseCommaSeparatedUrls(process.env.CLIENT_URL),
      ...parseCommaSeparatedUrls(process.env.ALLOWED_ORIGINS),
    ])
  );
};

export const isOriginAllowed = (origin) => {
  // Allow server-to-server or tools without an origin header (e.g., Postman, mobile, curl)
  if (!origin) return true;

  const normalized = origin.trim().replace(/\/$/, "");
  const allowed = getAllowedOrigins();

  return (
    allowed.includes(normalized) ||
    normalized.endsWith(".vercel.app") ||
    /^https?:\/\/localhost(:\d+)?$/.test(normalized) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized) ||
    normalized === "https://fazilnagar.me" ||
    normalized === "https://www.fazilnagar.me"
  );
};
