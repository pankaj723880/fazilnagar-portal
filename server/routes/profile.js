import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import verifyToken from "../middleware/auth.js";

const router = express.Router();
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
  limits: { fileSize: 500 * 1024 }, // 500 KB limit as required
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, or WebP images under 500 KB are allowed."));
    }
  },
});

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
    if (phone !== undefined) user.phone = String(phone).trim().slice(0, 20);
    if (area !== undefined) user.area = String(area).trim().slice(0, 60);
    if (bio !== undefined) user.bio = String(bio).trim().slice(0, 250);
    if (showEmail !== undefined) user.showEmail = Boolean(showEmail);
    if (findByEmail !== undefined) user.findByEmail = Boolean(findByEmail);
    if (whoCanMessage && ["everyone", "requests"].includes(whoCanMessage)) {
      user.whoCanMessage = whoCanMessage;
    }
    if (lastSeenVisible !== undefined) user.lastSeenVisible = Boolean(lastSeenVisible);

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
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ success: false, message: "Failed to update profile." });
  }
});

// @route   POST /api/profile/avatar
// @desc    Upload avatar image (max 500 KB WebP/JPEG/PNG)
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

    // Remove old avatar file if local
    if (user.avatar && user.avatar.startsWith("/uploads/avatars/")) {
      const oldPath = path.join(__dirname, "..", user.avatar);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch {}
      }
    }

    user.avatar = relativeUrl;
    await user.save();

    res.json({
      success: true,
      message: "Avatar uploaded successfully.",
      avatar: relativeUrl,
    });
  } catch (err) {
    console.error("Avatar Upload Error:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to upload avatar." });
  }
});

export default router;
