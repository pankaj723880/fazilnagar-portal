import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Advertisement from "../models/Advertisement.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { analyticsLimiter } from "../middleware/rateLimiter.js";
import { matchesEtag } from "./googleDrive.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage setup for image uploads
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
// PUBLIC ENDPOINTS WITH HTTP CACHING
// ====================================================================

let cachedActiveAds = null;
let cachedActiveAdsTime = 0;
const ADS_CACHE_TTL_MS = 60 * 1000;

export function invalidateAdsCache() {
  cachedActiveAds = null;
  cachedActiveAdsTime = 0;
}

// @route   GET /api/advertisements/active
// @desc    Get currently active & published advertisement(s) within schedule.
//          Returns ONLY public display fields. Private admin data is strictly excluded.
// @access  Public
router.get("/active", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");

    if (cachedActiveAds && Date.now() - cachedActiveAdsTime < ADS_CACHE_TTL_MS) {
      const etag = `"ads_active_${cachedActiveAdsTime}_${cachedActiveAds.ads?.length || 0}"`;
      res.setHeader("ETag", etag);
      if (matchesEtag(req.headers["if-none-match"], etag)) {
        return res.status(304).end();
      }
      return res.status(200).json(cachedActiveAds);
    }

    const now = new Date();

    // Query for advertisements that are published & active.
    // Permanent ads are ALWAYS active regardless of dates.
    // Scheduled ads check valid date window.
    const query = {
      isPublished: true,
      isActive: true,
      $or: [
        { isPermanent: true },
        { frequency: "permanent" },
        {
          $and: [
            {
              $or: [
                { startDate: null },
                { startDate: { $exists: false } },
                { startDate: { $lte: now } },
              ],
            },
            {
              $or: [
                { endDate: null },
                { endDate: { $exists: false } },
                { endDate: { $gte: now } },
              ],
            },
          ],
        },
      ],
    };

    // Public read-only projection: returns only display-necessary fields
    const publicProjection =
      "_id title description imageUrl destinationUrl ctaText format placement frequency isPermanent redisplayIntervalMinutes startDate endDate updatedAt";

    const activeAds = await Advertisement.find(query)
      .select(publicProjection)
      .sort({ isPermanent: -1, updatedAt: -1 })
      .lean();

    const payload = (!activeAds || activeAds.length === 0)
      ? { ad: null, ads: [] }
      : { ad: activeAds[0], ads: activeAds };

    cachedActiveAds = payload;
    cachedActiveAdsTime = Date.now();
    const etag = `"ads_active_${cachedActiveAdsTime}_${payload.ads.length}"`;
    res.setHeader("ETag", etag);

    if (matchesEtag(req.headers["if-none-match"], etag)) {
      return res.status(304).end();
    }

    res.status(200).json(payload);
  } catch (err) {
    console.error("Fetch Active Ad Error:", err);
    res.status(500).json({ message: "Failed to retrieve active advertisements." });
  }
});

// @route   POST /api/advertisements/:id/impression
// @desc    Increment genuine impression count
// @access  Public
router.post("/:id/impression", analyticsLimiter, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid advertisement ID." });
    }
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
router.post("/:id/click", analyticsLimiter, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid advertisement ID." });
    }
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

// @route   POST /api/advertisements/:id/dismiss
// @desc    Increment genuine dismissal count
// @access  Public
router.post("/:id/dismiss", analyticsLimiter, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid advertisement ID." });
    }
    const ad = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { $inc: { dismissals: 1 } },
      { new: true }
    );
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found." });
    }
    res.status(200).json({ success: true, dismissals: ad.dismissals });
  } catch (err) {
    console.error("Ad Dismissal Track Error:", err);
    res.status(500).json({ message: "Failed to track dismissal." });
  }
});

// ====================================================================
// ADMIN ONLY ENDPOINTS (Strictly protected by verifyToken + requireAdmin)
// ====================================================================

// @route   GET /api/advertisements/admin
// @desc    List all advertisements for admin dashboard with full analytics
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
        ctaText,
        format,
        placement,
        frequency,
        isPermanent,
        redisplayIntervalMinutes,
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

      const validFormat = ["floating", "banner", "sticky-bottom", "sticky-top"].includes(format)
        ? format
        : "floating";

      const validPlacement = ["bottom-right", "bottom-left"].includes(placement)
        ? placement
        : "bottom-right";

      const validFrequency = ["once-per-session", "interval", "always", "permanent"].includes(frequency)
        ? frequency
        : "always";

      const adIsPermanent =
        isPermanent === "true" ||
        isPermanent === true ||
        validFrequency === "permanent";

      const parsedInterval = parseInt(redisplayIntervalMinutes, 10);
      const validInterval = isNaN(parsedInterval) || parsedInterval < 1 ? 60 : parsedInterval;

      const ad = await Advertisement.create({
        title: title.trim(),
        description: (description || "").trim(),
        imageUrl: finalImageUrl,
        destinationUrl: (destinationUrl || "").trim(),
        ctaText: (ctaText || "Learn More").trim(),
        format: validFormat,
        placement: validPlacement,
        frequency: validFrequency,
        isPermanent: adIsPermanent,
        redisplayIntervalMinutes: validInterval,
        startDate: adIsPermanent ? null : parsedStart,
        endDate: adIsPermanent ? null : parsedEnd,
        isActive: isActive === "true" || isActive === true,
        isPublished: isPublished === "true" || isPublished === true,
        createdBy: req.user.id,
      });

      invalidateAdsCache();

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
// @desc    Update advertisement
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
        ctaText,
        format,
        placement,
        frequency,
        isPermanent,
        redisplayIntervalMinutes,
        startDate,
        endDate,
        isActive,
        isPublished,
      } = req.body;

      if (title) ad.title = title.trim();
      if (description !== undefined) ad.description = description.trim();
      if (ctaText !== undefined) ad.ctaText = (ctaText || "Learn More").trim();

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

      if (format !== undefined && ["floating", "banner", "sticky-bottom", "sticky-top"].includes(format)) {
        ad.format = format;
      }

      if (placement !== undefined && ["bottom-right", "bottom-left"].includes(placement)) {
        ad.placement = placement;
      }

      if (frequency !== undefined && ["once-per-session", "interval", "always", "permanent"].includes(frequency)) {
        ad.frequency = frequency;
      }

      if (isPermanent !== undefined) {
        ad.isPermanent = isPermanent === "true" || isPermanent === true;
      } else if (frequency === "permanent") {
        ad.isPermanent = true;
      }

      if (redisplayIntervalMinutes !== undefined) {
        const num = parseInt(redisplayIntervalMinutes, 10);
        if (!isNaN(num) && num >= 1) {
          ad.redisplayIntervalMinutes = num;
        }
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
      invalidateAdsCache();

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
    invalidateAdsCache();

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
    invalidateAdsCache();

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

    invalidateAdsCache();

    res.status(200).json({ message: "Advertisement deleted successfully." });
  } catch (err) {
    console.error("Delete Ad Error:", err);
    res.status(500).json({ message: "Failed to delete advertisement." });
  }
});

export default router;
