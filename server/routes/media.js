import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import MediaItem from "../models/MediaItem.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { uploadMediaToDrive } from "./googleDrive.js";
import { logAdminAction } from "../models/AuditLog.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads/media");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `media-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/gif",
    ];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, GIF, and SVG images under 10MB are allowed."));
    }
  },
});

// @route   GET /api/media
// @desc    Get media library items with pagination and tag filter
// @access  Private (Admin)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 24));
    const skip = (page - 1) * limit;
    const { search, tag } = req.query;

    const query = {};
    if (tag && tag !== "all") {
      query.tags = tag;
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ title: reg }, { originalName: reg }, { caption: reg }, { altText: reg }];
    }

    const total = await MediaItem.countDocuments(query);
    const items = await MediaItem.find(query)
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const backendBase = (process.env.BACKEND_URL || "https://fazilnagar-portal-l95o.onrender.com").replace(/\/+$/, "");
    const sanitizedItems = items.map((doc) => {
      const item = doc.toObject ? doc.toObject() : { ...doc };
      if (item.url && typeof item.url === "string" && item.url.includes("fazilnagar-portal.onrender.com")) {
        const driveIdx = item.url.indexOf("/api/google-drive/");
        if (driveIdx !== -1) {
          item.url = `${backendBase}${item.url.substring(driveIdx)}`;
        } else {
          const uploadsIdx = item.url.indexOf("/uploads/");
          if (uploadsIdx !== -1) {
            item.url = `${backendBase}${item.url.substring(uploadsIdx)}`;
          } else {
            item.url = item.url
              .replace("https://fazilnagar-portal.onrender.com", backendBase)
              .replace("http://fazilnagar-portal.onrender.com", backendBase);
          }
        }
      }
      return item;
    });

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      items: sanitizedItems,
      media: sanitizedItems, // Alias for frontend compatibility
    });
  } catch (err) {
    console.error("[Media] Fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch media library items." });
  }
});

// @route   POST /api/media/upload
// @desc    Upload media file to library (with Google Drive backup & local fallback)
// @access  Private (Admin)
router.post(
  "/upload",
  verifyToken,
  requireAdmin,
  (req, res, next) => {
    // upload.any() accepts any multipart field name ('image', 'file', 'photo', etc.) without "Unexpected field" errors
    upload.any()(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("[Media] Multer error:", err.code, err.field, err.message);
        return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
      } else if (err) {
        console.error("[Media] Upload filter error:", err.message);
        return res.status(400).json({ success: false, message: err.message || "Failed to process photo upload." });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const file = req.file || (req.files && req.files[0]);
      if (!file) {
        return res.status(400).json({ success: false, message: "No image file received. Please select a valid photo." });
      }

      const { title, altText, caption, tags } = req.body;
      const backendBase = (process.env.BACKEND_URL || "https://fazilnagar-portal-l95o.onrender.com").replace(/\/+$/, "");

      let finalUrl = `${backendBase}/uploads/media/${file.filename}`;
      let driveFileId = null;
      let storageProvider = "local_storage";

      // Attempt upload to Google Drive vault
      try {
        if (file.path && fs.existsSync(file.path)) {
          const fileBuffer = fs.readFileSync(file.path);
          const driveResult = await uploadMediaToDrive({
            buffer: fileBuffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
            user: req.user,
          });

          if (driveResult?.mediaDoc?.deliveryUrl) {
            finalUrl = driveResult.mediaDoc.deliveryUrl;
            driveFileId = driveResult.mediaDoc.driveFileId || null;
            storageProvider = "google_drive";

            // Clean up local temp file after successful Drive upload (optional, saves disk on Render)
            try {
              fs.unlinkSync(file.path);
            } catch (_) {}
          }
        }
      } catch (driveErr) {
        console.warn("[Media] Drive upload fallback to local:", driveErr.message);
        // Local storage URL is already set above as fallback
      }

      const parsedTags = tags
        ? typeof tags === "string"
          ? tags.split(",").map((t) => t.trim()).filter(Boolean)
          : Array.isArray(tags)
          ? tags
          : ["general"]
        : ["general"];

      const mediaItem = await MediaItem.create({
        title: (title || file.originalname.split(".")[0]).trim(),
        url: finalUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSizeBytes: file.size,
        driveFileId,
        storageProvider,
        altText: (altText || title || file.originalname).trim(),
        caption: (caption || "").trim(),
        tags: parsedTags,
        uploadedBy: req.user.id,
      });

      await logAdminAction({
        adminUser: req.user.id,
        adminEmail: req.user.email,
        action: "CREATE",
        entityType: "MediaItem",
        entityId: mediaItem._id,
        entityTitle: mediaItem.title,
        changesSummary: `Uploaded media "${mediaItem.originalName}" (${storageProvider})`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        success: true,
        message: "Image uploaded and catalogued in Media Library.",
        media: mediaItem,
        url: mediaItem.url,
      });
    } catch (err) {
      console.error("[Media] Upload error:", err);
      res.status(500).json({ success: false, message: "Failed to process image upload." });
    }
  }
);


// @route   PUT /api/media/:id
// @desc    Update media metadata (title, alt text, caption, tags)
// @access  Private (Admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const item = await MediaItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Media item not found." });
    }

    const { title, altText, caption, tags } = req.body;
    if (title !== undefined) item.title = title.trim();
    if (altText !== undefined) item.altText = altText.trim();
    if (caption !== undefined) item.caption = caption.trim();
    if (tags !== undefined) {
      item.tags = Array.isArray(tags)
        ? tags
        : typeof tags === "string"
        ? tags.split(",").map((t) => t.trim()).filter(Boolean)
        : item.tags;
    }

    await item.save();

    res.status(200).json({ success: true, message: "Media metadata updated.", media: item });
  } catch (err) {
    console.error("[Media] Update error:", err);
    res.status(500).json({ message: "Failed to update media item." });
  }
});

// @route   DELETE /api/media/:id
// @desc    Delete media item from library
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const item = await MediaItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Media item not found." });
    }

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "DELETE",
      entityType: "MediaItem",
      entityId: req.params.id,
      entityTitle: item.title,
      changesSummary: `Deleted media "${item.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Media item removed from library." });
  } catch (err) {
    console.error("[Media] Delete error:", err);
    res.status(500).json({ message: "Failed to delete media item." });
  }
});

export default router;
