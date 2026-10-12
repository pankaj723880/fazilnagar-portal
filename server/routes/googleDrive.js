import express from "express";
import { google } from "googleapis";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import GoogleDriveToken from "../models/GoogleDriveToken.js";

const router = express.Router();

const EXACT_REDIRECT_URI =
  process.env.GOOGLE_DRIVE_REDIRECT_URI ||
  "https://fazilnagar-portal.onrender.com/api/google-drive/oauth/callback";

// Minimum required scope for uploading and managing files created by this app
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

/**
 * Helper to build an OAuth2 client instance
 */
function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, EXACT_REDIRECT_URI);
}

/**
 * @route   GET /api/google-drive/status
 * @desc    Safe connection-status endpoint. Checks if Google Drive is connected without exposing secrets.
 * @access  Public / Admin
 */
router.get("/status", async (req, res) => {
  try {
    const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
    const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
    const hasEnvRefreshToken = !!process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    // Check DB record
    const storedDoc = await GoogleDriveToken.findOne({ key: "default_drive_account" }).lean();
    const hasDbRefreshToken = !!storedDoc?.tokens?.refresh_token;

    const isConnected = hasEnvRefreshToken || hasDbRefreshToken;

    res.status(200).json({
      configured: hasClientId && hasClientSecret,
      connected: isConnected,
      storageType: hasEnvRefreshToken ? "environment_variable" : hasDbRefreshToken ? "database" : "none",
      accountEmail: storedDoc?.accountEmail || null,
      scope: storedDoc?.tokens?.scope || (isConnected ? DRIVE_FILE_SCOPE : null),
      connectedAt: storedDoc?.connectedAt || null,
      lastRefreshedAt: storedDoc?.lastRefreshedAt || null,
      redirectUri: EXACT_REDIRECT_URI,
    });
  } catch (err) {
    console.error("[GoogleDrive] Status Check Error:", err);
    res.status(500).json({ message: "Failed to query Google Drive connection status." });
  }
});

/**
 * @route   GET /api/google-drive/auth/init
 * @desc    Admin-only route to initiate Google Drive OAuth flow.
 *          Generates signed state token and redirects to Google Consent screen.
 * @access  Private (Admin only)
 */
router.get("/auth/init", verifyToken, requireAdmin, async (req, res) => {
  try {
    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      return res.status(500).json({
        message: "Google OAuth credentials missing on server. Ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in environment variables.",
      });
    }

    // Generate secure state with random nonce + signed JWT
    const nonce = crypto.randomBytes(16).toString("hex");
    const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
    const stateToken = jwt.sign(
      {
        nonce,
        userId: req.user.id,
        role: req.user.role,
        purpose: "google_drive_oauth",
      },
      secretKey,
      { expiresIn: "15m" }
    );

    // Request offline access with consent prompt to ensure refresh token is returned
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [DRIVE_FILE_SCOPE, "https://www.googleapis.com/auth/userinfo.email"],
      state: stateToken,
    });

    // If client requested JSON (API call), return the URL; otherwise redirect directly
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(200).json({ authUrl, state: stateToken });
    }

    res.redirect(authUrl);
  } catch (err) {
    console.error("[GoogleDrive] OAuth Init Error:", err);
    res.status(500).json({ message: "Failed to initiate Google Drive authorization." });
  }
});

/**
 * @route   GET /api/google-drive/oauth/callback
 * @desc    Google OAuth Callback handler.
 *          Validates state, exchanges code for tokens, and securely saves refresh token in DB.
 * @access  Public (Called by Google OAuth redirect)
 */
router.get("/oauth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  // 1. Check if user cancelled or error returned from Google
  if (error) {
    console.warn("[GoogleDrive] OAuth error from Google:", error);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Drive Authorization Failed</title><meta charset="utf-8" /></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f87171;">
          <h2>❌ Google Drive Connection Failed</h2>
          <p>Reason: ${sanitizeHtml(String(error))}</p>
          <a href="/admin" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
        </body>
      </html>
    `);
  }

  // 2. Validate OAuth state
  if (!state || !code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Invalid OAuth Callback</title><meta charset="utf-8" /></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f87171;">
          <h2>❌ Invalid Request</h2>
          <p>Missing authorization code or state parameter.</p>
          <a href="/admin" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
        </body>
      </html>
    `);
  }

  let decodedState;
  try {
    const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
    decodedState = jwt.verify(state, secretKey);
    if (decodedState.purpose !== "google_drive_oauth") {
      throw new Error("Invalid state purpose");
    }
  } catch (err) {
    console.warn("[GoogleDrive] State validation failed:", err.message);
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Security Error</title><meta charset="utf-8" /></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f87171;">
          <h2>⚠️ Security Validation Error</h2>
          <p>OAuth state verification failed or session expired. Please re-initiate authorization from the admin panel.</p>
          <a href="/admin" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
        </body>
      </html>
    `);
  }

  // 3. Exchange code for tokens
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    return res.status(500).send("Google OAuth Client is not configured on this server.");
  }

  try {
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    // Fetch user email for administrative verification
    let accountEmail = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      accountEmail = userInfo.data.email || null;
    } catch (e) {
      console.warn("[GoogleDrive] Could not fetch user email:", e.message);
    }

    // 4. Securely store in MongoDB persistent storage
    const updatePayload = {
      isConfigured: true,
      connectedAt: new Date(),
      lastRefreshedAt: new Date(),
      connectedBy: decodedState.userId || null,
      accountEmail,
      "tokens.access_token": tokens.access_token,
      "tokens.scope": tokens.scope,
      "tokens.token_type": tokens.token_type,
      "tokens.expiry_date": tokens.expiry_date,
    };

    // Only update refresh_token if Google returned a new one (sometimes omitted if re-authed without prompt=consent)
    if (tokens.refresh_token) {
      updatePayload["tokens.refresh_token"] = tokens.refresh_token;
    }

    await GoogleDriveToken.findOneAndUpdate(
      { key: "default_drive_account" },
      { $set: updatePayload },
      { upsert: true, new: true }
    );

    console.log(`[GoogleDrive] OAuth tokens successfully stored for account: ${accountEmail || "unknown"}`);

    // Return friendly, secure success page without exposing tokens
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Drive Connected Successfully</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { background: #0B1118; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #18232E; border: 1px solid #334155; border-radius: 20px; padding: 36px 28px; max-width: 460px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
            .badge { display: inline-flex; align-items: center; background: #064e3b; color: #34d399; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; rounded-full: 9999px; border-radius: 9999px; margin-bottom: 16px; }
            h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #fff; }
            p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
            .details { background: #0b1118; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 16px; font-size: 12px; color: #cbd5e1; text-align: left; margin-bottom: 24px; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
            .details-row:last-child { margin-bottom: 0; }
            .btn { display: inline-block; background: #B8323C; color: #fff; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 12px; transition: background 0.2s; }
            .btn:hover { background: #991b1b; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✓ Connected</div>
            <h1>Google Drive Connected</h1>
            <p>Fazilnagar Portal backend is now securely linked with Google Drive. Tokens have been safely stored in persistent server storage.</p>
            <div class="details">
              <div class="details-row"><span>Status:</span><strong style="color:#34d399">Active</strong></div>
              ${accountEmail ? `<div class="details-row"><span>Account:</span><strong>${sanitizeHtml(accountEmail)}</strong></div>` : ""}
              <div class="details-row"><span>Scope:</span><strong>drive.file (Minimal)</strong></div>
            </div>
            <a href="/admin" class="btn">Return to Admin Dashboard</a>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("[GoogleDrive] Token Exchange Error:", err);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Token Exchange Failed</title><meta charset="utf-8" /></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f87171;">
          <h2>❌ Token Exchange Failed</h2>
          <p>Failed to exchange authorization code for Google tokens. Please try again.</p>
          <a href="/admin" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
        </body>
      </html>
    `);
  }
});

function sanitizeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m]));
}

export default router;
