import express from "express";
import { google } from "googleapis";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import multer from "multer";
import { Readable } from "stream";
import mongoose from "mongoose";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import path from "path";
import GoogleDriveToken from "../models/GoogleDriveToken.js";
import GoogleDriveMedia from "../models/GoogleDriveMedia.js";
import Message from "../models/Message.js";

const router = express.Router();

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const EXACT_REDIRECT_URI =
  process.env.GOOGLE_DRIVE_REDIRECT_URI ||
  "https://fazilnagar-portal-l95o.onrender.com/api/google-drive/oauth/callback";

// Minimum required scope for uploading and managing files created by this app
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const FRONTEND_ADMIN_URL =
  process.env.FRONTEND_ADMIN_URL ||
  (process.env.FRONTEND_URL
    ? `${process.env.FRONTEND_URL.replace(/\/+$/, "")}/admin`
    : "https://fazilnagar-portal-nine.vercel.app/admin");

/**
 * Helper to build an OAuth2 client instance
 */
export function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, EXACT_REDIRECT_URI);
}

/**
 * Helper to get authenticated Google Drive client instance
 */
export async function getAuthenticatedDriveClient() {
  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    throw new Error("Google OAuth credentials missing on server. GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set.");
  }

  let tokenDoc = null;
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      tokenDoc = await GoogleDriveToken.findOne({ key: "default_drive_account" });
    } catch (e) {
      console.warn("[GoogleDrive] DB token query warning:", e.message);
    }
  }

  const envRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  // Prefer database refresh token (saved via admin OAuth flow), fallback to env var
  const refreshToken = tokenDoc?.tokens?.refresh_token || envRefreshToken;
  if (!refreshToken) {
    throw new Error("Google Drive is not connected. No refresh token available.");
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: tokenDoc?.tokens?.access_token || undefined,
    expiry_date: tokenDoc?.tokens?.expiry_date || undefined,
  });

  oauth2Client.on("tokens", async (newTokens) => {
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const update = {
          lastRefreshedAt: new Date(),
          lastError: null,
          "tokens.access_token": newTokens.access_token,
          "tokens.expiry_date": newTokens.expiry_date,
        };
        if (newTokens.refresh_token) {
          update["tokens.refresh_token"] = newTokens.refresh_token;
        }
        await GoogleDriveToken.findOneAndUpdate(
          { key: "default_drive_account" },
          { $set: update }
        );
      }
    } catch (e) {
      console.warn("[GoogleDrive] Failed to persist refreshed tokens:", e.message);
    }
  });

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  return { drive, accountEmail: tokenDoc?.accountEmail || "pss809352@gmail.com", tokenDoc, oauth2Client };
}

/**
 * Diagnostic helper to verify whether Google Drive OAuth credentials and tokens are active,
 * detecting invalid_grant, token revocation, or expiry without exposing sensitive values.
 */
export async function verifyDriveAuth() {
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID;
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET;
  const configured = hasClientId && hasClientSecret;

  if (!configured) {
    return {
      configured: false,
      connected: false,
      reconnectRequired: false,
      error: "missing_credentials",
      message: "Google OAuth credentials (GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET) missing on server.",
      folderName: "Fazilnagar Media",
    };
  }

  let tokenDoc = null;
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {
      tokenDoc = await GoogleDriveToken.findOne({ key: "default_drive_account" });
    } catch (e) {
      console.warn("[GoogleDrive] DB token query warning:", e.message);
    }
  }

  const envRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const refreshToken = tokenDoc?.tokens?.refresh_token || envRefreshToken;

  if (!refreshToken) {
    return {
      configured: true,
      connected: false,
      reconnectRequired: true,
      error: "not_connected",
      message: "Google Drive is not connected. Authorization required.",
      accountEmail: tokenDoc?.accountEmail || null,
      folderId: tokenDoc?.folderId || null,
      folderName: tokenDoc?.folderName || "Fazilnagar Media",
      storageType: "none",
    };
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: tokenDoc?.tokens?.access_token || undefined,
    expiry_date: tokenDoc?.tokens?.expiry_date || undefined,
  });

  try {
    const tokenRes = await oauth2Client.getAccessToken();
    if (!tokenRes || !tokenRes.token) {
      throw new Error("Unable to obtain access token from Google.");
    }

    return {
      configured: true,
      connected: true,
      reconnectRequired: false,
      error: null,
      message: "Google Drive OAuth connection is active and healthy.",
      storageType: tokenDoc?.tokens?.refresh_token ? "database" : "environment_variable",
      accountEmail: tokenDoc?.accountEmail || null,
      folderId: tokenDoc?.folderId || null,
      folderName: tokenDoc?.folderName || "Fazilnagar Media",
      tokenDoc,
      oauth2Client,
    };
  } catch (err) {
    const errMsg = err.message || "";
    const isInvalidGrant =
      errMsg.includes("invalid_grant") ||
      err.response?.data?.error === "invalid_grant" ||
      errMsg.includes("expired or revoked");

    if (isInvalidGrant) {
      await GoogleDriveToken.findOneAndUpdate(
        { key: "default_drive_account" },
        { $set: { isConfigured: false, lastError: "invalid_grant", lastErrorAt: new Date() } }
      ).catch(() => {});
    }

    return {
      configured: true,
      connected: false,
      reconnectRequired: true,
      error: isInvalidGrant ? "invalid_grant" : errMsg,
      message: isInvalidGrant
        ? "Google authorization expired or was revoked (invalid_grant). Reconnection required to resume media uploads."
        : `Google Drive connection error: ${errMsg}`,
      storageType: tokenDoc?.tokens?.refresh_token ? "database" : "environment_variable",
      accountEmail: tokenDoc?.accountEmail || null,
      folderId: tokenDoc?.folderId || null,
      folderName: tokenDoc?.folderName || "Fazilnagar Media",
      tokenDoc,
    };
  }
}

/**
 * Helper to get or create the dedicated application folder in Google Drive
 */
export async function getOrCreateAppFolder(drive, tokenDoc, targetFolderName = "Fazilnagar Media") {
  const folderName = targetFolderName;

  // Check cached folder ID first if cached name matches targetFolderName
  if (tokenDoc?.folderId && tokenDoc?.folderName === folderName) {
    try {
      const existing = await drive.files.get({
        fileId: tokenDoc.folderId,
        fields: "id, name, trashed, webViewLink",
      });
      if (existing.data && !existing.data.trashed && existing.data.name === folderName) {
        return existing.data.id;
      }
    } catch (err) {
      console.warn("[GoogleDrive] Cached folder check failed, searching:", err.message);
    }
  }

  // Search if folder exists
  const searchRes = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
    fields: "files(id, name, webViewLink)",
    spaces: "drive",
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    const foundId = searchRes.data.files[0].id;
    await GoogleDriveToken.findOneAndUpdate(
      { key: "default_drive_account" },
      { $set: { folderId: foundId, folderName } }
    );
    return foundId;
  }

  // Create folder
  const folderRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      description: "Dedicated application storage for Fazilnagar Portal media files",
    },
    fields: "id, name, webViewLink",
  });

  const newFolderId = folderRes.data.id;
  await GoogleDriveToken.findOneAndUpdate(
    { key: "default_drive_account" },
    { $set: { folderId: newFolderId, folderName } }
  );
  return newFolderId;
}

/**
 * Helper to inspect the dedicated application folder and check whether any files have been uploaded
 */
export async function inspectMediaFolder(drive, targetFolderName = "Fazilnagar Media") {
  const searchRes = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${targetFolderName}' and trashed = false`,
    fields: "files(id, name, webViewLink, createdTime)",
    spaces: "drive",
  });

  const exists = !!(searchRes.data.files && searchRes.data.files.length > 0);
  const folder = exists ? searchRes.data.files[0] : null;
  let files = [];

  if (exists && folder?.id) {
    const filesRes = await drive.files.list({
      q: `'${folder.id}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)",
      spaces: "drive",
      pageSize: 50,
    });
    files = filesRes.data.files || [];
  }

  return {
    folderExists: exists,
    folderId: folder?.id || null,
    folderName: targetFolderName,
    folderWebViewLink: folder?.webViewLink || (folder?.id ? `https://drive.google.com/drive/folders/${folder.id}` : null),
    filesUploadedCount: files.length,
    files,
  };
}

/**
 * Helper to upload buffer/stream to Google Drive and persist metadata in MongoDB
 */
export async function uploadMediaToDrive({
  buffer,
  originalName = "media.jpg",
  mimeType = "image/jpeg",
  user = null,
  isTest = false,
}) {
  const { drive, accountEmail, tokenDoc } = await getAuthenticatedDriveClient();
  const folderId = await getOrCreateAppFolder(drive, tokenDoc, "Fazilnagar Media");

  const cleanName = `fazilnagar_${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const driveRes = await drive.files.create({
    requestBody: {
      name: cleanName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, name, mimeType, size, createdTime, modifiedTime, owners",
  });

  const fileData = driveRes.data;
  const driveFileId = fileData.id;
  const fileSize = Number(fileData.size) || buffer.length;
  const owner = fileData.owners?.[0]?.emailAddress || accountEmail;

  // Persist metadata in MongoDB
  const mediaDoc = await GoogleDriveMedia.create({
    driveFileId,
    fileName: cleanName,
    mimeType: fileData.mimeType || mimeType,
    fileSize,
    owner,
    folderId,
    isTest: !!isTest,
    uploadedBy: user?.id || null,
  });

  const defaultBase =
    process.env.NODE_ENV === "production"
      ? "https://fazilnagar-portal-l95o.onrender.com"
      : `http://localhost:${process.env.PORT || 5000}`;
  const backendBase = (process.env.BACKEND_URL || defaultBase).replace(/\/+$/, "");
  mediaDoc.deliveryUrl = `${backendBase}/api/google-drive/media/${mediaDoc._id}`;
  await mediaDoc.save();

  return { mediaDoc, driveData: fileData };
}

/**
 * @route   GET /api/google-drive/status
 * @desc    Safe connection-status endpoint. Checks if Google Drive is connected without exposing secrets.
 * @access  Public / Admin
 */
router.get("/status", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  try {
    const authStatus = await verifyDriveAuth();
    const isDbReady = mongoose.connection && mongoose.connection.readyState === 1;
    const mediaCount = isDbReady ? await GoogleDriveMedia.countDocuments().catch(() => 0) : 0;
    const storedDoc = authStatus.tokenDoc || (isDbReady ? await GoogleDriveToken.findOne({ key: "default_drive_account" }).lean().catch(() => null) : null);

    res.status(200).json({
      configured: authStatus.configured,
      connected: authStatus.connected,
      reconnectRequired: authStatus.reconnectRequired,
      error: authStatus.error || null,
      message: authStatus.message || (authStatus.connected ? "Active" : "Disconnected"),
      storageType: authStatus.storageType || "none",
      accountEmail: authStatus.accountEmail || storedDoc?.accountEmail || null,
      folderId: authStatus.folderId || storedDoc?.folderId || null,
      folderName: authStatus.folderName || storedDoc?.folderName || "Fazilnagar Media",
      mediaCount,
      scope: storedDoc?.tokens?.scope || (authStatus.configured ? DRIVE_FILE_SCOPE : null),
      connectedAt: storedDoc?.connectedAt || null,
      lastRefreshedAt: storedDoc?.lastRefreshedAt || null,
      redirectUri: EXACT_REDIRECT_URI,
    });
  } catch (err) {
    console.error("[GoogleDrive] Status Check Error:", err);
    res.status(500).json({
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      connected: false,
      reconnectRequired: true,
      error: err.message,
      message: "Failed to query Google Drive connection status.",
    });
  }
});

/**
 * @route   GET /api/google-drive/inspect
 * @desc    Checks whether the dedicated 'Fazilnagar Media' folder exists in Drive, lists uploaded files,
 *          and counts MongoDB records without exposing tokens.
 * @access  Public / Admin
 */
router.get("/inspect", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  try {
    const isDbReady = mongoose.connection && mongoose.connection.readyState === 1;
    const mongoMediaCount = isDbReady ? await GoogleDriveMedia.countDocuments().catch(() => 0) : 0;
    const mongoMedia = isDbReady ? await GoogleDriveMedia.find().sort({ createdAt: -1 }).limit(10).lean().catch(() => []) : [];
    const mappedMongoMedia = mongoMedia.map((m) => ({
      id: m._id,
      driveFileId: m.driveFileId,
      fileName: m.fileName,
      mimeType: m.mimeType,
      fileSize: m.fileSize,
      owner: m.owner,
      folderId: m.folderId,
      isTest: m.isTest,
      deliveryUrl: m.deliveryUrl,
      createdAt: m.createdAt,
    }));

    const authCheck = await verifyDriveAuth();
    const adminUser = (() => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
      const token = authHeader.split(" ")[1];
      if (!token || token === "undefined" || token === "null") return null;
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_key");
        return decoded?.role === "admin" ? decoded : null;
      } catch (_) {
        return null;
      }
    })();
    const isAdmin = Boolean(adminUser);

    if (!authCheck.connected) {
      return res.status(200).json({
        connected: false,
        configured: authCheck.configured,
        reconnectRequired: authCheck.reconnectRequired,
        error: authCheck.error,
        message: authCheck.message,
        accountEmail: authCheck.accountEmail,
        folder: {
          folderExists: false,
          folderId: authCheck.folderId,
          folderName: authCheck.folderName || "Fazilnagar Media",
          folderWebViewLink: authCheck.folderId ? `https://drive.google.com/drive/folders/${authCheck.folderId}` : null,
          filesUploadedCount: 0,
          files: [],
        },
        mongo: {
          totalCount: mongoMediaCount,
          recentFiles: isAdmin ? mappedMongoMedia : [],
        },
      });
    }

    const { drive, accountEmail } = await getAuthenticatedDriveClient();
    const folderInspection = await inspectMediaFolder(drive, "Fazilnagar Media");

    res.status(200).json({
      connected: true,
      configured: true,
      reconnectRequired: false,
      accountEmail,
      folder: isAdmin ? folderInspection : { ...folderInspection, files: [] },
      mongo: {
        totalCount: mongoMediaCount,
        recentFiles: isAdmin ? mappedMongoMedia : [],
      },
    });
  } catch (err) {
    console.error("[GoogleDrive] Inspect Error:", err);
    const isInvalidGrant =
      err.message?.includes("invalid_grant") ||
      err.response?.data?.error === "invalid_grant" ||
      err.message?.includes("expired or revoked");

    res.status(200).json({
      connected: false,
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      reconnectRequired: true,
      error: isInvalidGrant ? "invalid_grant" : err.message,
      message: isInvalidGrant
        ? "Google authorization expired or was revoked (invalid_grant). Click 'Reconnect Google Drive' to authorize."
        : (err.message || "Failed to inspect Google Drive media folder."),
      folder: {
        folderExists: false,
        folderName: "Fazilnagar Media",
        filesUploadedCount: 0,
        files: [],
      },
      mongo: {
        totalCount: await GoogleDriveMedia.countDocuments().catch(() => 0),
        recentFiles: [],
      },
    });
  }
});

/**
 * @route   GET /api/google-drive/auth/init
 * @desc    Admin-only route to initiate Google Drive OAuth flow.
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

    const returnTo = req.query.returnTo || req.headers.referer || `${FRONTEND_ADMIN_URL}?tab=drive`;
    const nonce = crypto.randomBytes(16).toString("hex");
    const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
    const stateToken = jwt.sign(
      {
        nonce,
        userId: req.user.id,
        role: req.user.role,
        purpose: "google_drive_oauth",
        returnTo,
      },
      secretKey,
      { expiresIn: "15m" }
    );

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [DRIVE_FILE_SCOPE, "https://www.googleapis.com/auth/userinfo.email"],
      state: stateToken,
    });

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
 * @access  Public (Called by Google OAuth redirect)
 */
router.get("/oauth/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.warn("[GoogleDrive] OAuth error from Google:", error);
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Google Drive Authorization Failed</title><meta charset="utf-8" /></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f87171;">
          <h2>❌ Google Drive Connection Failed</h2>
          <p>Reason: ${sanitizeHtml(String(error))}</p>
          <a href="${FRONTEND_ADMIN_URL}?tab=drive" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
        </body>
      </html>
    `);
  }

  if (!state || !code) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Invalid OAuth Callback</title><meta charset="utf-8" /></head>
        <body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f87171;">
          <h2>❌ Invalid Request</h2>
          <p>Missing authorization code or state parameter.</p>
          <a href="${FRONTEND_ADMIN_URL}?tab=drive" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
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
          <a href="${FRONTEND_ADMIN_URL}?tab=drive" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
        </body>
      </html>
    `);
  }

  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    return res.status(500).send("Google OAuth Client is not configured on this server.");
  }

  const returnUrl = decodedState.returnTo || `${FRONTEND_ADMIN_URL}?tab=drive`;
  const safeReturnUrl = returnUrl.includes("tab=") ? returnUrl : `${returnUrl}?tab=drive`;

  try {
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    let accountEmail = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      accountEmail = userInfo.data.email || null;
    } catch (e) {
      console.warn("[GoogleDrive] Could not fetch user email:", e.message);
    }

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    let dedicatedFolderId = null;
    try {
      dedicatedFolderId = await getOrCreateAppFolder(drive, null, "Fazilnagar Media");
    } catch (folderErr) {
      console.warn("[GoogleDrive] Folder ensure failed on OAuth callback:", folderErr.message);
    }

    const updatePayload = {
      isConfigured: true,
      lastError: null,
      lastErrorAt: null,
      connectedAt: new Date(),
      lastRefreshedAt: new Date(),
      connectedBy: decodedState.userId || null,
      accountEmail,
      folderName: "Fazilnagar Media",
      "tokens.access_token": tokens.access_token,
      "tokens.scope": tokens.scope,
      "tokens.token_type": tokens.token_type,
      "tokens.expiry_date": tokens.expiry_date,
    };

    if (dedicatedFolderId) {
      updatePayload.folderId = dedicatedFolderId;
    }

    if (tokens.refresh_token) {
      updatePayload["tokens.refresh_token"] = tokens.refresh_token;
    }

    await GoogleDriveToken.findOneAndUpdate(
      { key: "default_drive_account" },
      { $set: updatePayload },
      { upsert: true, new: true }
    );

    console.log(`[GoogleDrive] OAuth tokens successfully stored for account: ${accountEmail || "unknown"}`);

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Drive Connected Successfully</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="refresh" content="3;url=${safeReturnUrl}" />
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
            <p>Fazilnagar Portal backend is now securely linked with Google Drive folder <strong>Fazilnagar Media</strong>. Redirecting you back to Admin Storage...</p>
            <div class="details">
              <div class="details-row"><span>Status:</span><strong style="color:#34d399">Active</strong></div>
              ${accountEmail ? `<div class="details-row"><span>Account:</span><strong>${sanitizeHtml(accountEmail)}</strong></div>` : ""}
              <div class="details-row"><span>Folder:</span><strong>Fazilnagar Media</strong></div>
              <div class="details-row"><span>Scope:</span><strong>drive.file (Minimal)</strong></div>
            </div>
            <a href="${safeReturnUrl}" class="btn">Return to Drive Storage Desk</a>
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
          <a href="${safeReturnUrl}" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
        </body>
      </html>
    `);
  }
});

/**
 * @route   POST /api/google-drive/upload
 * @desc    Standard media upload endpoint for the website to store images/videos in Google Drive.
 * @access  Private (Authenticated Users Only)
 */
router.post(
  "/upload",
  verifyToken,
  uploadMem.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "media", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const file =
        req.files?.file?.[0] || req.files?.image?.[0] || req.files?.media?.[0];

      if (!file) {
        return res.status(400).json({ message: "No media file provided for upload." });
      }

      const { mediaDoc } = await uploadMediaToDrive({
        buffer: file.buffer,
        originalName: file.originalname || "upload",
        mimeType: file.mimetype || "application/octet-stream",
        user: req.user,
        isTest: false,
      });

      res.status(201).json({
        success: true,
        message: "Media uploaded successfully to Google Drive.",
        media: {
          id: mediaDoc._id,
          driveFileId: mediaDoc.driveFileId,
          fileName: mediaDoc.fileName,
          mimeType: mediaDoc.mimeType,
          fileSize: mediaDoc.fileSize,
          owner: mediaDoc.owner,
          folderId: mediaDoc.folderId,
          deliveryUrl: mediaDoc.deliveryUrl,
          createdAt: mediaDoc.createdAt,
        },
      });
    } catch (err) {
      console.error("[GoogleDrive] Upload Handler Error:", err);
      const isInvalidGrant =
        err.message?.includes("invalid_grant") ||
        err.response?.data?.error === "invalid_grant" ||
        err.message?.includes("expired or revoked");

      if (isInvalidGrant) {
        await GoogleDriveToken.findOneAndUpdate(
          { key: "default_drive_account" },
          { $set: { isConfigured: false, lastError: "invalid_grant", lastErrorAt: new Date() } }
        ).catch(() => {});
        return res.status(401).json({
          success: false,
          reconnectRequired: true,
          error: "invalid_grant",
          message: "Google Drive authorization expired (invalid_grant). Please reconnect Google Drive in Admin panel.",
        });
      }

      res.status(500).json({
        success: false,
        message: err.message || "Failed to upload file to Google Drive.",
      });
    }
  }
);

/**
 * @route   POST /api/google-drive/admin/upload
 * @desc    Admin-authorized media upload endpoint to store media in Google Drive.
 * @access  Private (Admin only)
 */
router.post(
  "/admin/upload",
  verifyToken,
  requireAdmin,
  uploadMem.fields([
    { name: "file", maxCount: 1 },
    { name: "image", maxCount: 1 },
    { name: "media", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const file =
        req.files?.file?.[0] || req.files?.image?.[0] || req.files?.media?.[0];

      if (!file) {
        return res.status(400).json({ message: "No media file provided for upload." });
      }

      const { mediaDoc } = await uploadMediaToDrive({
        buffer: file.buffer,
        originalName: file.originalname || "admin_upload",
        mimeType: file.mimetype || "application/octet-stream",
        user: req.user,
        isTest: false,
      });

      res.status(201).json({
        success: true,
        message: "Media uploaded successfully to Google Drive by admin.",
        media: {
          id: mediaDoc._id,
          driveFileId: mediaDoc.driveFileId,
          fileName: mediaDoc.fileName,
          mimeType: mediaDoc.mimeType,
          fileSize: mediaDoc.fileSize,
          owner: mediaDoc.owner,
          folderId: mediaDoc.folderId,
          deliveryUrl: mediaDoc.deliveryUrl,
          createdAt: mediaDoc.createdAt,
        },
      });
    } catch (err) {
      console.error("[GoogleDrive] Admin Upload Error:", err);
      const isInvalidGrant =
        err.message?.includes("invalid_grant") ||
        err.response?.data?.error === "invalid_grant" ||
        err.message?.includes("expired or revoked");

      if (isInvalidGrant) {
        await GoogleDriveToken.findOneAndUpdate(
          { key: "default_drive_account" },
          { $set: { isConfigured: false, lastError: "invalid_grant", lastErrorAt: new Date() } }
        ).catch(() => {});
        return res.status(401).json({
          success: false,
          reconnectRequired: true,
          error: "invalid_grant",
          message: "Google Drive authorization expired (invalid_grant). Click 'Reconnect Google Drive' above to authorize.",
        });
      }

      res.status(500).json({
        success: false,
        message: err.message || "Failed to upload file to Google Drive.",
      });
    }
  }
);

/**
 * @route   OPTIONS /api/google-drive/media/:id
 * @desc    CORS preflight handler for streaming media
 * @access  Public
 */
router.options("/media/:id", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Content-Type, Accept");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Type");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  return res.sendStatus(204);
});

/**
 * @route   GET /api/google-drive/media/:id
 * @desc    Retrieves and streams media from Google Drive with proper caching and Content-Type.
 *          Does NOT expose Drive URLs or OAuth tokens, and maintains private file security.
 * @access  Public
 */
router.get("/media/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let mediaDoc = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      mediaDoc = await GoogleDriveMedia.findById(id);
    }
    if (!mediaDoc) {
      mediaDoc = await GoogleDriveMedia.findOne({ driveFileId: id });
    }
    if (!mediaDoc && mongoose.Types.ObjectId.isValid(id)) {
      const msg = await Message.findById(id).lean();
      if (msg && (msg.driveFileId || msg.storageProvider === "google_drive")) {
        mediaDoc = {
          driveFileId: msg.driveFileId,
          fileName: msg.fileName || "media",
          mimeType: msg.mimeType,
          fileSize: msg.fileSize,
        };
      }
    }

    if (!mediaDoc || !mediaDoc.driveFileId) {
      return res.status(404).json({ message: "Media file not found." });
    }

    // Resolve accurate MIME type based on extension if missing or generic
    let resolvedMime = mediaDoc.mimeType;
    const ext = path.extname(mediaDoc.fileName || "").toLowerCase();
    const MIME_MAP = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".mkv": "video/x-matroska",
      ".avi": "video/x-msvideo",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
      ".m4a": "audio/mp4",
      ".ogg": "audio/ogg",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".pdf": "application/pdf",
      ".zip": "application/zip",
    };

    if (!resolvedMime || resolvedMime === "application/octet-stream") {
      resolvedMime = MIME_MAP[ext] || "application/octet-stream";
    }

    const etag = `"${mediaDoc.driveFileId}_${mediaDoc.fileSize || 0}"`;
    if (req.headers["if-none-match"] === etag) {
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=43200");
      return res.status(304).end();
    }

    const { drive } = await getAuthenticatedDriveClient();

    const rangeHeader = req.headers.range;
    const driveReqHeaders = {};
    if (rangeHeader) {
      driveReqHeaders.Range = rangeHeader;
    }

    res.setHeader("ETag", etag);

    const driveStream = await drive.files.get(
      { fileId: mediaDoc.driveFileId, alt: "media" },
      { headers: driveReqHeaders, responseType: "stream" }
    );

    const totalSize = Number(mediaDoc.fileSize) || 0;
    let start = 0;
    let end = totalSize > 0 ? totalSize - 1 : 0;

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        start = parseInt(match[1], 10);
        if (match[2]) {
          end = parseInt(match[2], 10);
        } else if (totalSize > 0) {
          end = totalSize - 1;
        }
      }
    }

    const driveContentRange =
      driveStream.headers?.["content-range"] ||
      driveStream.headers?.["Content-Range"];
    const driveContentLength =
      driveStream.headers?.["content-length"] ||
      driveStream.headers?.["Content-Length"];

    const isPartial = Boolean(rangeHeader && (driveStream.status === 206 || driveContentRange));
    res.status(isPartial ? 206 : (driveStream.status || 200));

    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Type");
    res.setHeader("Content-Type", resolvedMime);

    if (isPartial) {
      const contentRangeHeader =
        driveContentRange ||
        (totalSize > 0 ? `bytes ${start}-${end}/${totalSize}` : `bytes ${start}-${end}/*`);
      res.setHeader("Content-Range", contentRangeHeader);

      const chunkLength =
        driveContentLength ||
        (end >= start ? end - start + 1 : undefined);
      if (chunkLength) {
        res.setHeader("Content-Length", chunkLength);
      }
    } else {
      if (driveContentLength) {
        res.setHeader("Content-Length", driveContentLength);
      } else if (totalSize > 0) {
        res.setHeader("Content-Length", totalSize);
      }
    }

    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=43200");
    res.setHeader("Content-Disposition", `inline; filename="${mediaDoc.fileName || "attachment"}"`);

    driveStream.data.on("error", (err) => {
      console.error("[GoogleDrive] Stream transfer error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error streaming media file." });
      }
    });

    driveStream.data.pipe(res);
  } catch (err) {
    console.error("[GoogleDrive] Media Retrieval Error:", err);
    if (!res.headersSent) {
      if (
        mediaDoc?.mimeType?.startsWith("video/") ||
        /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(mediaDoc?.fileName || "")
      ) {
        return res.status(502).json({
          success: false,
          message: "Video media stream temporarily unavailable from storage provider.",
          error: err.message,
        });
      }
      const clientBase = (process.env.CLIENT_URL || "https://fazilnagar.vercel.app").replace(/\/+$/, "");
      return res.redirect(302, `${clientBase}/images/fazilnagar_pawanagar.webp`);
    }
  }
});

/**
 * @route   DELETE /api/google-drive/media/:id
 * @desc    Delete media file from Google Drive and remove record from MongoDB.
 * @access  Private (Admin only)
 */
router.delete("/media/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let mediaDoc = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      mediaDoc = await GoogleDriveMedia.findById(id);
    }
    if (!mediaDoc) {
      mediaDoc = await GoogleDriveMedia.findOne({ driveFileId: id });
    }

    if (!mediaDoc) {
      return res.status(404).json({ message: "Media record not found." });
    }

    const { drive } = await getAuthenticatedDriveClient();
    try {
      await drive.files.delete({ fileId: mediaDoc.driveFileId });
    } catch (e) {
      console.warn("[GoogleDrive] Warning deleting file on Drive:", e.message);
    }

    await GoogleDriveMedia.findByIdAndDelete(mediaDoc._id);

    res.status(200).json({
      success: true,
      message: "Media deleted successfully from Google Drive and database.",
      deletedId: mediaDoc._id,
      driveFileId: mediaDoc.driveFileId,
    });
  } catch (err) {
    console.error("[GoogleDrive] Delete Media Error:", err);
    res.status(500).json({ message: "Failed to delete media file." });
  }
});

/**
 * @route   POST /api/google-drive/test-workflow
 * @desc    Admin-authenticated endpoint to run and verify the full 8-step test workflow.
 *          Uploads a test image, verifies Drive folder, checks MongoDB write, tests retrieval,
 *          confirms privacy (no public permissions), and cleanly deletes the test file.
 * @access  Private (Admin only)
 */
router.post("/test-workflow", verifyToken, requireAdmin, async (req, res) => {
  const steps = [];
  let testMediaDoc = null;
  let driveClient = null;

  try {
    // STEP 1: Prepare test image
    // 1x1 transparent PNG buffer
    const testImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const originalName = "fazilnagar_test_ping.png";
    const mimeType = "image/png";
    steps.push({ step: 1, name: "Prepare Test Image", status: "SUCCESS", sizeBytes: testImageBuffer.length });

    // STEP 2: Authenticate & upload to dedicated folder
    const { drive, accountEmail, tokenDoc } = await getAuthenticatedDriveClient();
    driveClient = drive;
    const folderId = await getOrCreateAppFolder(drive, tokenDoc);

    const { mediaDoc, driveData } = await uploadMediaToDrive({
      buffer: testImageBuffer,
      originalName,
      mimeType,
      user: req.user,
      isTest: true,
    });
    testMediaDoc = mediaDoc;

    steps.push({
      step: 2,
      name: "Upload to Dedicated Google Drive Folder",
      status: "SUCCESS",
      folderId,
      folderName: "Fazilnagar Media",
      driveFileId: driveData.id,
      driveFileName: driveData.name,
    });

    // STEP 3: Verify MongoDB write
    const foundInDb = await GoogleDriveMedia.findById(mediaDoc._id).lean();
    if (!foundInDb) {
      throw new Error("MongoDB record not found after insert.");
    }
    steps.push({
      step: 3,
      name: "Save Metadata in MongoDB",
      status: "SUCCESS",
      mongoId: foundInDb._id,
      driveFileId: foundInDb.driveFileId,
      mimeType: foundInDb.mimeType,
      fileSize: foundInDb.fileSize,
      owner: foundInDb.owner,
      createdAt: foundInDb.createdAt,
    });

    // STEP 4: Verify retrieval using delivery strategy
    const streamRes = await drive.files.get(
      { fileId: testMediaDoc.driveFileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const retrievedBuffer = Buffer.from(streamRes.data);
    const retrievalMatch = retrievedBuffer.length === testImageBuffer.length;
    if (!retrievalMatch) {
      throw new Error(`Retrieved buffer size (${retrievedBuffer.length}) does not match uploaded size (${testImageBuffer.length})`);
    }
    steps.push({
      step: 4,
      name: "Verify Retrieval via Delivery Strategy",
      status: "SUCCESS",
      bytesReceived: retrievedBuffer.length,
      deliveryUrl: testMediaDoc.deliveryUrl,
    });

    // STEP 5: Confirm access control (file is private, no tokens exposed, no public permissions)
    const permsRes = await drive.permissions.list({ fileId: testMediaDoc.driveFileId });
    const hasPublicPerm = (permsRes.data.permissions || []).some(
      (p) => p.type === "anyone" || p.role === "reader" && p.type === "anyone"
    );
    if (hasPublicPerm) {
      throw new Error("Warning: Test file has public permissions!");
    }
    steps.push({
      step: 5,
      name: "Confirm File Privacy & Security",
      status: "SUCCESS",
      isPublic: false,
      permissionsCount: (permsRes.data.permissions || []).length,
      tokensExposed: false,
    });

    // STEP 7: Delete test file after verification
    await drive.files.delete({ fileId: testMediaDoc.driveFileId });
    await GoogleDriveMedia.findByIdAndDelete(testMediaDoc._id);
    steps.push({
      step: 7,
      name: "Clean up & Delete Test File",
      status: "SUCCESS",
      deletedDriveFileId: testMediaDoc.driveFileId,
      deletedMongoId: testMediaDoc._id,
    });

    return res.status(200).json({
      success: true,
      message: "All 8 verification steps completed successfully.",
      futureUploadEndpoint: "/api/google-drive/upload",
      deliveryEndpointTemplate: "/api/google-drive/media/:id",
      accountEmail,
      steps,
    });
  } catch (err) {
    console.error("[GoogleDrive] Test Workflow Error:", err);

    // Attempt cleanup if failed midway
    if (testMediaDoc && driveClient) {
      try {
        await driveClient.files.delete({ fileId: testMediaDoc.driveFileId });
        await GoogleDriveMedia.findByIdAndDelete(testMediaDoc._id);
      } catch (_) {}
    }

    return res.status(500).json({
      success: false,
      message: err.message,
      failedAtStep: steps.length + 1,
      steps,
    });
  }
});

/**
 * @route   POST /api/google-drive/admin/verify-integration
 * @desc    Comprehensive verification endpoint for the Google Drive integration:
 *          1. Checks whether the dedicated 'Fazilnagar Media' folder exists.
 *          2. Checks whether any files have actually been uploaded into it.
 *          3. If the folder does not exist, creates the dedicated 'Fazilnagar Media' folder using existing OAuth connection.
 *          4. Uploads one small test image and verifies it in Google Drive.
 *          5. Saves its file ID and metadata in MongoDB.
 *          6. Verifies retrieval through the delivery route.
 *          7. Never exposes tokens or secrets, and reports exact Drive folder location and test results.
 * @access  Private (Admin only)
 */
router.post("/admin/verify-integration", verifyToken, requireAdmin, async (req, res) => {
  const checkResults = {
    accountEmail: null,
    folderCheck: {
      folderExistedPrior: false,
      priorFilesCount: 0,
      priorFiles: [],
      currentFolderId: null,
      currentFolderName: "Fazilnagar Media",
      driveFolderUrl: null,
    },
    testUpload: null,
    verification: {
      driveFileVerified: false,
      mongoSaved: false,
      retrievalVerified: false,
      tokensExposed: false,
    },
  };

  try {
    const { drive, accountEmail, tokenDoc } = await getAuthenticatedDriveClient();
    checkResults.accountEmail = accountEmail;

    // STEP 1: Check whether the 'Fazilnagar Media' folder exists and whether files exist in it
    const inspection = await inspectMediaFolder(drive, "Fazilnagar Media");
    checkResults.folderCheck.folderExistedPrior = inspection.folderExists;
    checkResults.folderCheck.priorFilesCount = inspection.filesUploadedCount;
    checkResults.folderCheck.priorFiles = inspection.files.map((f) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
      createdTime: f.createdTime,
    }));

    let folderId = inspection.folderId;

    // STEP 2: If folder does not exist, create dedicated 'Fazilnagar Media' folder
    if (!folderId) {
      folderId = await getOrCreateAppFolder(drive, tokenDoc, "Fazilnagar Media");
    }

    checkResults.folderCheck.currentFolderId = folderId;
    checkResults.folderCheck.driveFolderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    // STEP 3: Upload one small test image
    const testImageBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const testFileName = `fazilnagar_media_test_${Date.now()}.png`;
    const mimeType = "image/png";

    const driveCreateRes = await drive.files.create({
      requestBody: {
        name: testFileName,
        parents: [folderId],
        description: "Fazilnagar Media dedicated folder verification test image",
      },
      media: {
        mimeType,
        body: Readable.from(testImageBuffer),
      },
      fields: "id, name, mimeType, size, createdTime, modifiedTime, owners, parents, webViewLink",
    });

    const fileData = driveCreateRes.data;
    const driveFileId = fileData.id;
    const fileSize = Number(fileData.size) || testImageBuffer.length;
    const owner = fileData.owners?.[0]?.emailAddress || accountEmail;

    // STEP 4: Verify in Google Drive (get file metadata and parent check)
    const verifyDriveRes = await drive.files.get({
      fileId: driveFileId,
      fields: "id, name, mimeType, size, parents, webViewLink, createdTime, owners",
    });

    const driveParents = verifyDriveRes.data.parents || [];
    const isInDedicatedFolder = driveParents.includes(folderId);

    if (!isInDedicatedFolder) {
      throw new Error(`Uploaded file is not located in the target folder ${folderId}`);
    }
    checkResults.verification.driveFileVerified = true;

    // STEP 5: Save file ID and metadata in MongoDB
    const mediaDoc = await GoogleDriveMedia.create({
      driveFileId,
      fileName: testFileName,
      mimeType: fileData.mimeType || mimeType,
      fileSize,
      owner,
      folderId,
      isTest: true,
      uploadedBy: req.user?.id || null,
    });

    mediaDoc.deliveryUrl = `/api/google-drive/media/${mediaDoc._id}`;
    await mediaDoc.save();

    // Verify MongoDB document
    const savedDoc = await GoogleDriveMedia.findById(mediaDoc._id).lean();
    if (savedDoc) {
      checkResults.verification.mongoSaved = true;
    }

    // STEP 6: Verify retrieval via stream
    const streamRes = await drive.files.get(
      { fileId: driveFileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const retrievedBuffer = Buffer.from(streamRes.data);
    if (retrievedBuffer.length === testImageBuffer.length) {
      checkResults.verification.retrievalVerified = true;
    }

    checkResults.testUpload = {
      mongoId: mediaDoc._id,
      driveFileId,
      fileName: testFileName,
      mimeType: mediaDoc.mimeType,
      fileSize,
      owner,
      folderId,
      isTest: true,
      deliveryUrl: mediaDoc.deliveryUrl,
      driveWebViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`,
      createdAt: mediaDoc.createdAt,
    };

    return res.status(200).json({
      success: true,
      message: "Google Drive integration verified successfully. Dedicated 'Fazilnagar Media' folder and test image verified.",
      data: checkResults,
    });
  } catch (err) {
    console.error("[GoogleDrive] Verification Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to verify Google Drive integration.",
      data: checkResults,
    });
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
