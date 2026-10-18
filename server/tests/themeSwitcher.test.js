import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

test("Theme System — Midnight Civic CSS Palette Integrity", () => {
  const cssPath = path.join(rootDir, "client/src/index.css");
  assert.ok(fs.existsSync(cssPath), "index.css must exist");
  const css = fs.readFileSync(cssPath, "utf8");

  // Verify Light Mode Palette
  assert.ok(css.includes("--civic-bg: #F8FAFC;"), "Light mode background must be #F8FAFC");
  assert.ok(css.includes("--civic-surface: #FFFFFF;"), "Light mode cards/surfaces must be #FFFFFF");
  assert.ok(css.includes("--civic-text-primary: #111827;"), "Light mode primary text must be #111827");
  assert.ok(css.includes("--civic-text-secondary: #64748B;"), "Light mode secondary text must be #64748B");
  assert.ok(css.includes("--civic-border: #E5E7EB;"), "Light mode borders must be #E5E7EB");
  assert.ok(css.includes("--civic-accent: #B8323C;"), "Brand accent must be #B8323C");

  // Verify Dark Mode Palette
  assert.ok(css.includes("html[data-public-theme=\"dark\"]"), "Must define html[data-public-theme='dark'] selector");
  assert.ok(css.includes("--civic-bg: #0B1120;"), "Dark mode background must be #0B1120");
  assert.ok(css.includes("--civic-surface: #111827;"), "Dark mode cards/surfaces must be #111827");
  assert.ok(css.includes("--civic-surface-secondary: #1E293B;"), "Dark mode secondary surfaces must be #1E293B");
  assert.ok(css.includes("--civic-text-primary: #F8FAFC;"), "Dark mode primary text must be #F8FAFC");
  assert.ok(css.includes("--civic-text-secondary: #CBD5E1;"), "Dark mode secondary text must be #CBD5E1");
  assert.ok(css.includes("--civic-border: #334155;"), "Dark mode borders must be #334155");

  // Verify Admin Isolation in CSS
  assert.ok(css.includes(".admin-workspace"), "Must include .admin-workspace isolation safeguard");
});

test("Theme System — ThemeContext & LocalStorage Persistence", () => {
  const contextPath = path.join(rootDir, "client/src/context/ThemeContext.jsx");
  assert.ok(fs.existsSync(contextPath), "ThemeContext.jsx must exist");
  const code = fs.readFileSync(contextPath, "utf8");

  assert.ok(code.includes("fazilnagar_theme"), "Must use localStorage key fazilnagar_theme");
  assert.ok(code.includes("stored === \"dark\" ? \"dark\" : \"light\""), "Must default to light mode for first-time visitors");
  assert.ok(code.includes("root.removeAttribute(\"data-public-theme\")"), "Must strip data-public-theme on admin routes");
  assert.ok(code.includes("isAdminPage"), "Must inspect route to determine admin isolation");
});

test("Theme System — ThemeToggle Component & Admin Exclusion", () => {
  const togglePath = path.join(rootDir, "client/src/components/ThemeToggle.jsx");
  assert.ok(fs.existsSync(togglePath), "ThemeToggle.jsx must exist");
  const code = fs.readFileSync(togglePath, "utf8");

  assert.ok(code.includes("if (isAdminPage)"), "Must check if inside admin section");
  assert.ok(code.includes("return null;"), "Must return null in admin section so toggle never renders there");
  assert.ok(code.includes("aria-label"), "Must have accessible aria-label");
  assert.ok(code.includes("Sun") && code.includes("Moon"), "Must render Sun/Moon icons from lucide-react");
});

test("Theme System — Public Header Mounting & Index.html Pre-paint Gate", () => {
  const appPath = path.join(rootDir, "client/src/App.jsx");
  const appCode = fs.readFileSync(appPath, "utf8");
  assert.ok(appCode.includes("<ThemeToggle />"), "App.jsx header must mount ThemeToggle");
  assert.ok(appCode.includes("data-public-theme"), "App.jsx root container must set data-public-theme");

  const indexPath = path.join(rootDir, "client/index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  assert.ok(html.includes("!p.startsWith('/admin')"), "index.html must check route before applying pre-paint theme");
  assert.ok(html.includes("data-public-theme"), "index.html must restore data-public-theme without flash");
});
