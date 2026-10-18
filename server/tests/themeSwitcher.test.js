import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

test("Theme System — Graphite Royale CSS Palette Integrity", () => {
  const cssPath = path.join(rootDir, "client/src/index.css");
  assert.ok(fs.existsSync(cssPath), "index.css must exist");
  const css = fs.readFileSync(cssPath, "utf8");

  // Verify Light Mode Graphite Royale Palette
  assert.ok(css.includes("--gr-bg-main: #F7F6F2;"), "Light mode background must be #F7F6F2");
  assert.ok(css.includes("--gr-navbar-bg: #FFFFFF;"), "Light mode navbar must be #FFFFFF");
  assert.ok(css.includes("--gr-section-secondary: #EFEEE9;"), "Light mode secondary sections must be #EFEEE9");
  assert.ok(css.includes("--gr-card-bg: #FFFFFF;"), "Light mode cards must be #FFFFFF");
  assert.ok(css.includes("--gr-text-primary: #202124;"), "Light mode primary text must be #202124");
  assert.ok(css.includes("--gr-text-secondary: #626262;"), "Light mode secondary text must be #626262");
  assert.ok(css.includes("--gr-border: #E4E0D8;"), "Light mode borders must be #E4E0D8");
  assert.ok(css.includes("--gr-accent: #A78650;"), "Light mode accent must be #A78650");
  assert.ok(css.includes("--gr-accent-hover: #8E7042;"), "Light mode accent hover must be #8E7042");
  assert.ok(css.includes("--gr-highlight: #F1E8D8;"), "Light mode highlight must be #F1E8D8");

  // Verify Dark Mode Graphite Royale Palette
  assert.ok(css.includes("html[data-public-theme=\"dark\"]"), "Must define html[data-public-theme='dark'] selector");
  assert.ok(css.includes("--gr-bg-main: #101114;"), "Dark mode background must be #101114");
  assert.ok(css.includes("--gr-navbar-bg: #101114;"), "Dark mode navbar must be #101114");
  assert.ok(css.includes("--gr-section-secondary: #19191E;"), "Dark mode secondary sections must be #19191E");
  assert.ok(css.includes("--gr-card-bg: #24242A;"), "Dark mode cards must be #24242A");
  assert.ok(css.includes("--gr-input-bg: #1C1C22;"), "Dark mode inputs must be #1C1C22");
  assert.ok(css.includes("--gr-text-primary: #F5F1E9;"), "Dark mode primary text must be #F5F1E9");
  assert.ok(css.includes("--gr-text-secondary: #B6B4B0;"), "Dark mode secondary text must be #B6B4B0");
  assert.ok(css.includes("--gr-border: #38383E;"), "Dark mode borders must be #38383E");
  assert.ok(css.includes("--gr-accent: #C5A46D;"), "Dark mode accent must be #C5A46D");
  assert.ok(css.includes("--gr-accent-hover: #D8BA85;"), "Dark mode accent hover must be #D8BA85");
  assert.ok(css.includes("--gr-highlight: #30291F;"), "Dark mode highlight must be #30291F");

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
