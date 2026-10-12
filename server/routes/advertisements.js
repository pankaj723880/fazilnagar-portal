import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Advertisement from "../models/Advertisement.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `ad-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const mime = file.mimetype.toLowerCase();

  if (allowed.test(ext) && (mime.startsWith("image/") || allowed.test(mime))) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WebP, GIF) up to 5MB are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Helper URL validator
const isValidUrl = (string) => {
  if (!string || string.trim() === "") return true; // Optional
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

// ====================================================================
// PUBLIC ENDPOINTS
// ====================================================================

// @route   GET /api/advertisements/active
// @desc    Get currently active & published advertisement(s) within schedule for homepage
// @access  Public
router.get("/active", async (req, res) => {
  try {
    const now = new Date();

    // Query for advertisements that are:
    // 1. isPublished === true
    // 2. isActive === true
    // 3. startDate is null OR startDate <= now
    // 4. endDate is null OR endDate >= now
    const query = {
      isPublished: true,
      isActive: true,
      $and: [
        {
          $or: [{ startDate: null }, { startDate: { $lte: now } }],
        },
        {
          $or: [{ endDate: null }, { endDate: { $gte: now } }],
        },
      ],
    };

    const activeAds = await Advertisement.find(query).sort({ updatedAt: -1 });

    if (!activeAds || activeAds.length === 0) {
      return res.status(200).json({ ad: null, ads: [] });
    }

    // Return the latest active ad (and the full active list)
    res.status(200).json({
      ad: activeAds[0],
      ads: activeAds,
    });
  } catch (err) {
    console.error("Fetch Active Ad Error:", err);
    res.status(500).json({ message: "Failed to retrieve active advertisements." });
  }
});

// @route   POST /api/advertisements/:id/impression
// @desc    Increment genuine impression count
// @access  Public
router.post("/:id/impression", async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { $inc: { impressions: 1 } },
      { new: true }
    );
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }
    res.status(200).json({ success: true, impressions: ad.impressions });
  } catch (err) {
    console.error("Ad Impression Error:", err);
    res.status(500).json({ message: "Failed to track impression." });
  }
});

// @route   POST /api/advertisements/:id/click
// @desc    Increment genuine click count
// @access  Public
router.post("/:id/click", async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { $inc: { clicks: 1 } },
      { new: true }
    );
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }
    res.status(200).json({ success: true, clicks: ad.clicks });
  } catch (err) {
    console.error("Ad Click Error:", err);
    res.status(500).json({ message: "Failed to track click." });
  }
});

// ====================================================================
// ADMIN ONLY ENDPOINTS (Strictly protected by verifyToken + requireAdmin)
// ====================================================================

// @route   GET /api/advertisements/admin
// @desc    List all advertisements for admin dashboard with analytics
// @access  Private (Admin)
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const ads = await Advertisement.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(ads);
  } catch (err) {
    console.error("Fetch Admin Ads Error:", err);
    res.status(500).json({ message: "Failed to fetch advertisement records." });
  }
});

// @route   POST /api/advertisements
// @desc    Create advertisement
// @access  Private (Admin)
router.post(
  "/",
  verifyToken,
  requireAdmin,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const {
        title,
        description,
        imageUrl: providedImageUrl,
        destinationUrl,
        startDate,
        endDate,
        isActive,
        isPublished,
      } = req.body;

      if (!title || title.trim() === "") {
        return res.status(400).json({ message: "Advertisement title is required." });
      }

      let finalImageUrl = (providedImageUrl || "").trim();

      if (req.file) {
        const host = req.get("host") || "localhost:5000";
        const protocol =
          req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https"
            ? "https"
            : "http";
        finalImageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      }

      if (!finalImageUrl) {
        return res.status(400).json({ message: "Advertisement banner image or image URL is required." });
      }

      // Validate destination URL if provided
      if (destinationUrl && !isValidUrl(destinationUrl.trim())) {
        return res
          .status(400)
          .json({ message: "Destination URL must be a valid web link starting with http:// or https://" });
      }

      // Validate dates
      let parsedStart = startDate ? new Date(startDate) : null;
      let parsedEnd = endDate ? new Date(endDate) : null;

      if (parsedStart && isNaN(parsedStart.getTime())) {
        parsedStart = null;
      }
      if (parsedEnd && isNaN(parsedEnd.getTime())) {
        parsedEnd = null;
      }

      if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
        return res.status(400).json({ message: "Start date cannot be after end date." });
      }

      const ad = await Advertisement.create({
        title: title.trim(),
        description: (description || "").trim(),
        imageUrl: finalImageUrl,
        destinationUrl: (destinationUrl || "").trim(),
        startDate: parsedStart,
        endDate: parsedEnd,
        isActive: isActive === "true" || isActive === true,
        isPublished: isPublished === "true" || isPublished === true,
        createdBy: req.user.id,
      });

      res.status(201).json({
        message: "Advertisement created successfully.",
        ad,
      });
    } catch (err) {
      console.error("Create Ad Error:", err);
      res.status(500).json({ message: "Failed to create advertisement." });
    }
  }
);

// @route   PUT /api/advertisements/:id
// @desc    Update advertisement details
// @access  Private (Admin)
router.put(
  "/:id",
  verifyToken,
  requireAdmin,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const ad = await Advertisement.findById(req.params.id);
      if (!ad) {
        return res.status(404).json({ message: "Advertisement not found." });
      }

      const {
        title,
        description,
        imageUrl: providedImageUrl,
        destinationUrl,
        startDate,
        endDate,
        isActive,
        isPublished,
      } = req.body;

      if (title) ad.title = title.trim();
      if (description !== undefined) ad.description = description.trim();

      if (req.file) {
        const host = req.get("host") || "localhost:5000";
        const protocol =
          req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https"
            ? "https"
            : "http";
        ad.imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
      } else if (providedImageUrl && providedImageUrl.trim() !== "") {
        ad.imageUrl = providedImageUrl.trim();
      }

      if (destinationUrl !== undefined) {
        const trimmed = destinationUrl.trim();
        if (trimmed && !isValidUrl(trimmed)) {
          return res
            .status(400)
            .json({ message: "Destination URL must start with http:// or https://" });
        }
        ad.destinationUrl = trimmed;
      }

      if (startDate !== undefined) {
        ad.startDate = startDate ? new Date(startDate) : null;
      }
      if (endDate !== undefined) {
        ad.endDate = endDate ? new Date(endDate) : null;
      }

      if (ad.startDate && ad.endDate && ad.startDate > ad.endDate) {
        return res.status(400).json({ message: "Start date cannot be after end date." });
      }

      if (isActive !== undefined) {
        ad.isActive = isActive === "true" || isActive === true;
      }
      if (isPublished !== undefined) {
        ad.isPublished = isPublished === "true" || isPublished === true;
      }

      await ad.save();

      res.status(200).json({
        message: "Advertisement updated successfully.",
        ad,
      });
    } catch (err) {
      console.error("Update Ad Error:", err);
      res.status(500).json({ message: "Failed to update advertisement." });
    }
  }
);

// @route   PATCH /api/advertisements/:id/publish
// @desc    Toggle publication status
// @access  Private (Admin)
router.patch("/:id/publish", verifyToken, requireAdmin, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }

    ad.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : !ad.isPublished;
    await ad.save();

    res.status(200).json({
      message: `Advertisement ${ad.isPublished ? "published" : "unpublished"}.`,
      isPublished: ad.isPublished,
      ad,
    });
  } catch (err) {
    console.error("Toggle Publish Ad Error:", err);
    res.status(500).json({ message: "Server error changing publication status." });
  }
});

// @route   PATCH /api/advertisements/:id/toggle
// @desc    Toggle active status (enable/disable)
// @access  Private (Admin)
router.patch("/:id/toggle", verifyToken, requireAdmin, async (req, res) => {
  try {
    const ad = await Advertisement.findById(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }

    ad.isActive = req.body.isActive !== undefined ? req.body.isActive : !ad.isActive;
    await ad.save();

    res.status(200).json({
      message: `Advertisement ${ad.isActive ? "enabled" : "disabled"}.`,
      isActive: ad.isActive,
      ad,
    });
  } catch (err) {
    console.error("Toggle Active Ad Error:", err);
    res.status(500).json({ message: "Server error toggling active status." });
  }
});

// @route   DELETE /api/advertisements/:id
// @desc    Delete advertisement
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const ad = await Advertisement.findByIdAndDelete(req.params.id);
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }

    res.status(200).json({ message: "Advertisement deleted successfully." });
  } catch (err) {
    console.error("Delete Ad Error:", err);
    res.status(500).json({ message: "Failed to delete advertisement." });
  }
});

export default router;
