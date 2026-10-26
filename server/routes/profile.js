import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import verifyToken from "../middleware/auth.js";
import { normalizePhone } from "../utils/submissionUtils.js";
import GoogleDriveMedia from "../models/GoogleDriveMedia.js";
import GoogleDriveToken from "../models/GoogleDriveToken.js";
import { getAuthenticatedDriveClient, getOrCreateAppFolder } from "./googleDrive.js";

const router = express.Router();

// Strict security cache headers: Never cache private user profiles in shared caches
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization");
  next();
});
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const avatarsDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".webp";
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit for high-resolution avatars
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, or GIF images are allowed."));
    }
  },
});

// Helper to stream avatar image directly to Google Drive
async function tryUploadAvatarToGoogleDrive({ filePath, originalName, mimeType, userId }) {
  try {
    const hasDriveConfig =
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || (await GoogleDriveToken.findOne({ key: "default_drive_account" })));
    if (!hasDriveConfig) {
      return null;
    }

    const { drive, accountEmail, tokenDoc } = await getAuthenticatedDriveClient();
    const folderId = await getOrCreateAppFolder(drive, tokenDoc, "Fazilnagar Avatars");

    const cleanName = `avatar_${Date.now()}_${(originalName || "profile.webp").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileStream = fs.createReadStream(filePath);

    const driveRes = await drive.files.create({
      requestBody: {
        name: cleanName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType || "image/webp",
        body: fileStream,
      },
      fields: "id, name, mimeType, size, webViewLink, webContentLink",
    });

    const driveFileId = driveRes.data?.id;
    if (!driveFileId) return null;

    const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 0 };
    const mediaDoc = await GoogleDriveMedia.create({
      driveFileId,
      fileName: cleanName,
      mimeType: mimeType || "image/webp",
      fileSize: Number(driveRes.data.size) || stats.size,
      owner: accountEmail,
      folderId,
      isTest: false,
      uploadedBy: userId || null,
    });

    const backendBase = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
    mediaDoc.deliveryUrl = backendBase
      ? `${backendBase}/api/google-drive/media/${mediaDoc._id}`
      : `/api/google-drive/media/${mediaDoc._id}`;
    await mediaDoc.save();

    return {
      driveFileId,
      mediaDocId: mediaDoc._id,
      deliveryUrl: mediaDoc.deliveryUrl,
      webViewLink: driveRes.data.webViewLink,
      webContentLink: driveRes.data.webContentLink,
    };
  } catch (err) {
    console.warn("[Avatar Drive] Upload to Google Drive failed or not configured, using local storage:", err.message);
    return null;
  }
}

// @route   GET /api/profile/me
// @desc    Get current user's profile and privacy preferences
// @access  Private (Authenticated)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({
      success: true,
      profile: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username || "",
        avatar: user.avatar || "",
        phone: user.phone || "",
        area: user.area || "",
        bio: user.bio || "",
        showEmail: user.showEmail ?? false,
        findByEmail: user.findByEmail ?? false,
        whoCanMessage: user.whoCanMessage || "everyone",
        lastSeenVisible: user.lastSeenVisible ?? true,
        lastSeen: user.lastSeen,
        themePreference: user.themePreference || null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve profile." });
  }
});

// @route   PATCH /api/profile/me
// @desc    Update current user's profile and privacy preferences
// @access  Private (Authenticated)
router.patch("/me", verifyToken, async (req, res) => {
  try {
    const {
      name,
      username,
      phone,
      area,
      bio,
      showEmail,
      findByEmail,
      whoCanMessage,
      lastSeenVisible,
    } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Validate and check username uniqueness if changed
    if (username !== undefined) {
      const cleanUsername = username.toLowerCase().trim();
      if (cleanUsername) {
        if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
          return res.status(400).json({
            success: false,
            message: "Username must be 3-20 characters long and contain only lowercase letters, numbers, and underscores.",
          });
        }

        const existing = await User.findOne({
          username: cleanUsername,
          _id: { $ne: user._id },
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            message: "This username is already taken. Please choose another.",
          });
        }

        user.username = cleanUsername;
      }
    }

    if (name && typeof name === "string") user.name = name.trim().slice(0, 100);
    if (phone !== undefined) {
      const rawPhone = String(phone).trim();
      if (rawPhone) {
        const cleanPhone = normalizePhone(rawPhone);
        if (cleanPhone.length < 10) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid 10-digit mobile number.",
          });
        }
        const existingPhone = await User.findOne({
          phone: cleanPhone,
          _id: { $ne: user._id },
        });
        if (existingPhone) {
          return res.status(400).json({
            success: false,
            message: "This mobile number is already registered with another account.",
          });
        }
        user.phone = cleanPhone;
      } else {
        user.phone = "";
      }
    }
    if (area !== undefined) user.area = String(area).trim().slice(0, 60);
    if (bio !== undefined) user.bio = String(bio).trim().slice(0, 250);
    if (showEmail !== undefined) user.showEmail = Boolean(showEmail);
    if (findByEmail !== undefined) user.findByEmail = Boolean(findByEmail);
    if (whoCanMessage && ["everyone", "requests"].includes(whoCanMessage)) {
      user.whoCanMessage = whoCanMessage;
    }
    if (lastSeenVisible !== undefined) user.lastSeenVisible = Boolean(lastSeenVisible);
    if (req.body.themePreference !== undefined) {
      if (["light", "dark", null].includes(req.body.themePreference)) {
        user.themePreference = req.body.themePreference;
      }
    }

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully.",
      profile: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        phone: user.phone || "",
        area: user.area,
        bio: user.bio,
        showEmail: user.showEmail,
        findByEmail: user.findByEmail,
        whoCanMessage: user.whoCanMessage,
        lastSeenVisible: user.lastSeenVisible,
        themePreference: user.themePreference || null,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    if (err.code === 11000) {
      if (err.keyPattern?.username || String(err.message).includes("username")) {
        return res.status(400).json({ success: false, message: "This username is already taken. Please choose another." });
      }
      if (err.keyPattern?.phone || String(err.message).includes("phone")) {
        return res.status(400).json({ success: false, message: "This mobile number is already registered with another account." });
      }
    }
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// @route   POST /api/profile/avatar
// @desc    Upload avatar image to Google Drive with local fallback
// @access  Private (Authenticated)
router.post("/avatar", verifyToken, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No avatar image provided." });
    }

    const relativeUrl = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Attempt to upload to Google Drive under "Fazilnagar Avatars"
    let finalAvatarUrl = relativeUrl;
    const driveResult = await tryUploadAvatarToGoogleDrive({
      filePath: req.file.path,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      userId: req.user.id,
    });

    if (driveResult && driveResult.deliveryUrl) {
      finalAvatarUrl = driveResult.deliveryUrl;
    }

    // Remove old local avatar file if it was a local path
    if (user.avatar && user.avatar.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(__dirname, "..", user.avatar);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {}
      }
    }

    user.avatar = finalAvatarUrl;
    await user.save();

    res.json({
      success: true,
      message: driveResult ? "Avatar uploaded to Google Drive successfully." : "Avatar uploaded successfully.",
      avatar: finalAvatarUrl,
      driveFileId: driveResult?.driveFileId || null,
      storageType: driveResult ? "google_drive" : "local",
    });
  } catch (err) {
    console.error("Avatar Upload Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to upload avatar." });
  }
});

export default router;
