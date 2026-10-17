import test from "node:test";
import assert from "node:assert/strict";
import {
  isOriginAllowed,
  getAllowedOrigins,
  defaultAllowedOrigins,
  parseCommaSeparatedUrls,
} from "../utils/corsConfig.js";

test("CORS origin validation - required domains are whitelisted", async (t) => {
  const requiredDomains = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://fazilnagar.vercel.app",
    "https://fazilnagar-portal-nine.vercel.app",
    "https://fazilnagar.me",
    "https://www.fazilnagar.me",
  ];

  for (const domain of requiredDomains) {
    assert.strictEqual(
      isOriginAllowed(domain),
      true,
      `Expected ${domain} to be allowed`
    );
  }
});

test("CORS origin validation - handles requests without Origin header", () => {
  assert.strictEqual(isOriginAllowed(undefined), true);
  assert.strictEqual(isOriginAllowed(null), true);
  assert.strictEqual(isOriginAllowed(""), true);
});

test("CORS origin validation - supports trailing slashes gracefully", () => {
  assert.strictEqual(isOriginAllowed("https://fazilnagar.me/"), true);
  assert.strictEqual(isOriginAllowed("https://www.fazilnagar.me/"), true);
  assert.strictEqual(isOriginAllowed("http://localhost:5173/"), true);
});

test("CORS origin validation - supports localhost and 127.0.0.1 on various ports", () => {
  assert.strictEqual(isOriginAllowed("http://localhost:8080"), true);
  assert.strictEqual(isOriginAllowed("http://127.0.0.1:4173"), true);
  assert.strictEqual(isOriginAllowed("http://localhost:5000"), true);
});

test("CORS origin validation - supports Vercel preview deployments", () => {
  assert.strictEqual(
    isOriginAllowed("https://fazilnagar-git-feat-custom-domain.vercel.app"),
    true
  );
  assert.strictEqual(
    isOriginAllowed("https://preview-123.vercel.app"),
    true
  );
});

test("CORS origin validation - parses comma-separated environment variables", () => {
  const originalClientUrl = process.env.CLIENT_URL;
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

  try {
    process.env.CLIENT_URL =
      "https://custom-app.com, https://portal.external.org/ ,http://localhost:9999";
    process.env.ALLOWED_ORIGINS =
      "https://partner.com, https://api-client.fazilnagar.me";

    const parsed = parseCommaSeparatedUrls(process.env.CLIENT_URL);
    assert.deepStrictEqual(parsed, [
      "https://custom-app.com",
      "https://portal.external.org",
      "http://localhost:9999",
    ]);

    assert.strictEqual(isOriginAllowed("https://custom-app.com"), true);
    assert.strictEqual(isOriginAllowed("https://portal.external.org"), true);
    assert.strictEqual(isOriginAllowed("http://localhost:9999"), true);
    assert.strictEqual(isOriginAllowed("https://partner.com"), true);
    assert.strictEqual(isOriginAllowed("https://api-client.fazilnagar.me"), true);
  } finally {
    process.env.CLIENT_URL = originalClientUrl;
    process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
  }
});

test("CORS origin validation - rejects unauthorized domains", () => {
  assert.strictEqual(isOriginAllowed("https://malicious-site.com"), false);
  assert.strictEqual(isOriginAllowed("https://phishing-fazilnagar.me"), false);
  assert.strictEqual(isOriginAllowed("https://not-fazilnagar.vercel.app.evil.com"), false);
  assert.strictEqual(isOriginAllowed("http://attacker.localhost.com"), false);
});
