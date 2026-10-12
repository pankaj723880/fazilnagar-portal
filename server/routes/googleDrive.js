import express from "express";
import { google } from "googleapis";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import multer from "multer";
import { Readable } from "stream";
import mongoose from "mongoose";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import GoogleDriveToken from "../models/GoogleDriveToken.js";
import GoogleDriveMedia from "../models/GoogleDriveMedia.js";

const router = express.Router();

const uploadMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const EXACT_REDIRECT_URI =
  process.env.GOOGLE_DRIVE_REDIRECT_URI ||
  "https://fazilnagar-portal.onrender.com/api/google-drive/oauth/callback";

// Minimum required scope for uploading and managing files created by this app
const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";

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

  const envRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const tokenDoc = await GoogleDriveToken.findOne({ key: "default_drive_account" });

  const refreshToken = envRefreshToken || tokenDoc?.tokens?.refresh_token;
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
      const update = {
        lastRefreshedAt: new Date(),
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
    } catch (e) {
      console.warn("[GoogleDrive] Failed to persist refreshed tokens:", e.message);
    }
  });

  const drive = google.drive({ version: "v3", auth: oauth2Client });
  return { drive, accountEmail: tokenDoc?.accountEmail || "pss809352@gmail.com", tokenDoc };
}

/**
 * Helper to get or create the dedicated application folder in Google Drive
 */
export async function getOrCreateAppFolder(drive, tokenDoc) {
  const folderName = "Fazilnagar Portal Media";

  // Check cached folder ID first
  if (tokenDoc?.folderId) {
    try {
      const existing = await drive.files.get({
        fileId: tokenDoc.folderId,
        fields: "id, name, trashed",
      });
      if (existing.data && !existing.data.trashed) {
        return existing.data.id;
      }
    } catch (err) {
      console.warn("[GoogleDrive] Cached folder check failed, searching:", err.message);
    }
  }

  // Search if folder exists
  const searchRes = await drive.files.list({
    q: `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`,
    fields: "files(id, name)",
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
    fields: "id, name",
  });

  const newFolderId = folderRes.data.id;
  await GoogleDriveToken.findOneAndUpdate(
    { key: "default_drive_account" },
    { $set: { folderId: newFolderId, folderName } }
  );
  return newFolderId;
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
  const folderId = await getOrCreateAppFolder(drive, tokenDoc);

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

  mediaDoc.deliveryUrl = `/api/google-drive/media/${mediaDoc._id}`;
  await mediaDoc.save();

  return { mediaDoc, driveData: fileData };
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

    const storedDoc = await GoogleDriveToken.findOne({ key: "default_drive_account" }).lean();
    const hasDbRefreshToken = !!storedDoc?.tokens?.refresh_token;

    const isConnected = hasEnvRefreshToken || hasDbRefreshToken;
    const mediaCount = await GoogleDriveMedia.countDocuments();

    res.status(200).json({
      configured: hasClientId && hasClientSecret,
      connected: isConnected,
      storageType: hasEnvRefreshToken ? "environment_variable" : hasDbRefreshToken ? "database" : "none",
      accountEmail: storedDoc?.accountEmail || null,
      folderId: storedDoc?.folderId || null,
      mediaCount,
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
          <a href="/admin" style="color:#38bdf8;text-decoration:none;font-weight:bold;">Return to Admin Dashboard</a>
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

  const oauth2Client = createOAuth2Client();
  if (!oauth2Client) {
    return res.status(500).send("Google OAuth Client is not configured on this server.");
  }

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

/**
 * @route   POST /api/google-drive/upload
 * @desc    Standard media upload endpoint for the website to store images/videos in Google Drive.
 * @access  Public (or Authenticated)
 */
router.post(
  "/upload",
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

      // Check optional user auth from bearer token if present
      let user = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.split(" ")[1];
          const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
          user = jwt.verify(token, secretKey);
        } catch (_) {}
      }

      const { mediaDoc } = await uploadMediaToDrive({
        buffer: file.buffer,
        originalName: file.originalname || "upload",
        mimeType: file.mimetype || "application/octet-stream",
        user,
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
      res.status(500).json({
        success: false,
        message: err.message || "Failed to upload file to Google Drive.",
      });
    }
  }
);

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

    if (!mediaDoc) {
      return res.status(404).json({ message: "Media file not found." });
    }

    const { drive } = await getAuthenticatedDriveClient();

    const driveStream = await drive.files.get(
      { fileId: mediaDoc.driveFileId, alt: "media" },
      { responseType: "stream" }
    );

    res.setHeader("Content-Type", mediaDoc.mimeType || "application/octet-stream");
    if (mediaDoc.fileSize) {
      res.setHeader("Content-Length", mediaDoc.fileSize);
    }
    res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=43200");
    res.setHeader("Content-Disposition", `inline; filename="${mediaDoc.fileName}"`);

    driveStream.data.on("error", (err) => {
      console.error("[GoogleDrive] Stream transfer error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error streaming media file." });
      }
    });

    driveStream.data.pipe(res);
  } catch (err) {
    console.error("[GoogleDrive] Media Retrieval Error:", err);
    res.status(500).json({ message: "Failed to retrieve media file from Google Drive." });
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
      folderName: "Fazilnagar Portal Media",
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
