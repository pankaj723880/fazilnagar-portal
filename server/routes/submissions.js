import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Submission from "../models/Submission.js";
import Place from "../models/Place.js";
import News from "../models/News.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { FAZILNAGAR_AREAS, isWithinTownBoundary } from "../config/areas.js";
import { detectDuplicates, determineBoundaryStatus, normalizePhone } from "../utils/submissionUtils.js";
import { uploadMediaToDrive } from "./googleDrive.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, "../uploads/community");
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
    cb(null, `place-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images under 5MB are allowed."));
    }
  },
});

// Official protected categories that cannot be submitted through public community form
const PROTECTED_CATEGORIES = [
  "Schools & Colleges",
  "Hospitals & Clinics",
  "Medical Stores & Pharmacies",
  "Hospitals",
  "Schools",
  "Pharmacies",
];

// @route   POST /api/submissions/upload-images
// @desc    Upload entity primary and gallery photos
// @access  Public
router.post(
  "/upload-images",
  upload.fields([
    { name: "primaryImage", maxCount: 1 },
    { name: "additionalImages", maxCount: 4 },
  ]),
  async (req, res) => {
    try {
      if (!req.files || !req.files.primaryImage || req.files.primaryImage.length === 0) {
        return res.status(400).json({ message: "Primary photo is required." });
      }

      const backendBase = (process.env.BACKEND_URL || "").replace(/\/+$/, "");

      const getFileUrl = async (file) => {
        try {
          const fileBuffer = fs.readFileSync(file.path);
          const driveResult = await uploadMediaToDrive({
            buffer: fileBuffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
          });
          if (driveResult?.mediaDoc?.deliveryUrl) {
            return driveResult.mediaDoc.deliveryUrl;
          }
        } catch (_) {
          // Google Drive offline or unauthenticated; fallback to local URL
        }
        return `${backendBase}/uploads/community/${file.filename}`;
      };

      const primaryFile = req.files.primaryImage[0];
      const primaryImageUrl = await getFileUrl(primaryFile);

      const additionalImageUrls = [];
      if (req.files.additionalImages && req.files.additionalImages.length > 0) {
        for (const f of req.files.additionalImages) {
          const url = await getFileUrl(f);
          additionalImageUrls.push(url);
        }
      }

      res.status(200).json({
        primaryImageUrl,
        additionalImageUrls,
        message: "Images uploaded successfully.",
      });
    } catch (err) {
      console.error("Image Upload Error:", err);
      res.status(500).json({ message: err.message || "Failed to process photo upload." });
    }
  }
);

// @route   POST /api/submissions/place
// @desc    Submit a new community business / place with exact map coordinates
// @access  Public
router.post("/place", async (req, res) => {
  try {
    const {
      name,
      category,
      subcategory,
      description,
      addressFull,
      locality,
      streetOrLandmark,
      latitude,
      longitude,
      primaryImage,
      images,
      ownerName,
      phone,
      alternatePhone,
      whatsapp,
      website,
      openingHours,
      services,
      consentConfirmed,
    } = req.body;

    // 1. Mandatory Field Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Entity or business name is required." });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ message: "Category is required." });
    }
    if (!addressFull || !addressFull.trim()) {
      return res.status(400).json({ message: "Full address is required." });
    }
    if (!locality || !locality.trim()) {
      return res.status(400).json({ message: "Area / locality selection is required." });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: "Mobile number is required." });
    }
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      return res.status(400).json({ message: "Exact map coordinates are required. Please pin your location on the map." });
    }
    if (!consentConfirmed) {
      return res.status(400).json({ message: "You must confirm that the information and location are accurate." });
    }

    // 2. Strict Protection of Official Institutional Categories
    const normalizedCategory = category.trim();
    if (
      PROTECTED_CATEGORIES.some(
        (pc) =>
          normalizedCategory.toLowerCase() === pc.toLowerCase() ||
          normalizedCategory.toLowerCase().includes("hospital") ||
          normalizedCategory.toLowerCase().includes("school") ||
          normalizedCategory.toLowerCase().includes("pharmacy")
      )
    ) {
      return res.status(400).json({
        message:
          "Hospitals, educational institutions, and pharmacies are official civic entities managed directly by town administration and cannot be submitted via this community form.",
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "Invalid numeric coordinates received from map." });
    }

    // 3. Boundary & Locality Verification Check
    const townBoundaryStatus = determineBoundaryStatus(lat, lng, locality);

    // 4. Duplicate Detection Check
    const dupCheck = await detectDuplicates({
      name: name.trim(),
      phone: phone.trim(),
      category: normalizedCategory,
      latitude: lat,
      longitude: lng,
    });

    // 5. Create Submission Record with Pending Status
    const submission = await Submission.create({
      type: "community_place",
      title: name.trim(),
      category: normalizedCategory,
      subcategory: subcategory ? subcategory.trim() : "",
      description: description ? description.trim() : "",
      addressFull: addressFull.trim(),
      locality: locality.trim(),
      streetOrLandmark: streetOrLandmark ? streetOrLandmark.trim() : locality.trim(),
      latitude: lat,
      longitude: lng,
      primaryImage: primaryImage || "",
      images: Array.isArray(images) ? images : [],
      ownerName: ownerName ? ownerName.trim() : "",
      phone: phone.trim(),
      alternatePhone: alternatePhone ? alternatePhone.trim() : "",
      whatsapp: whatsapp ? whatsapp.trim() : "",
      website: website ? website.trim() : "",
      openingHours: openingHours ? openingHours.trim() : "",
      services: Array.isArray(services) ? services : typeof services === "string" ? services.split(",").map((s) => s.trim()).filter(Boolean) : [],
      consentConfirmed: true,
      townBoundaryStatus,
      duplicateWarning: dupCheck.warningMessage || "",
      status: "pending",
      submittedBy: {
        name: ownerName ? ownerName.trim() : "Community Submitter",
        phone: phone.trim(),
        ipAddress: req.ip || "",
      },
    });

    res.status(201).json({
      success: true,
      message: "Your place has been submitted for verification. It will appear publicly on the map and directory once approved by town administration.",
      referenceId: submission.referenceId,
      submissionId: submission._id,
      submission,
      duplicateWarning: dupCheck.warningMessage || null,
      townBoundaryStatus,
    });
  } catch (err) {
    console.error("Submit Place Error:", err);
    res.status(500).json({ message: err.message || "Failed to submit establishment." });
  }
});

// @route   GET /api/submissions/places/admin
// @desc    Admin review list for community place submissions
// @access  Private (Admin)
router.get("/places/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = { type: { $in: ["community_place", "business"] } };

    if (status && status !== "all") {
      filter.status = status;
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: reg },
        { phone: reg },
        { addressFull: reg },
        { locality: reg },
        { referenceId: reg },
      ];
    }

    const items = await Submission.find(filter)
      .populate("reviewedBy", "name email")
      .populate("placeId", "name slug isPublished isArchived")
      .sort({ createdAt: -1 });

    res.status(200).json(items);
  } catch (err) {
    console.error("Admin Fetch Place Submissions Error:", err);
    res.status(500).json({ message: "Failed to fetch community submissions." });
  }
});

// @route   PATCH /api/submissions/places/:id/review
// @desc    Admin action on community place submission (approve, reject, edit, archive, restore)
// @access  Private (Admin)
router.patch("/places/:id/review", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { action, rejectionReason, adminNotes, editedFields } = req.body;
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Apply any edits supplied by admin (e.g. corrected pin or corrected category/name)
    if (editedFields && typeof editedFields === "object") {
      if (editedFields.title) submission.title = editedFields.title.trim();
      if (editedFields.category) submission.category = editedFields.category.trim();
      if (editedFields.subcategory !== undefined) submission.subcategory = editedFields.subcategory.trim();
      if (editedFields.description !== undefined) submission.description = editedFields.description.trim();
      if (editedFields.addressFull) submission.addressFull = editedFields.addressFull.trim();
      if (editedFields.locality) submission.locality = editedFields.locality.trim();
      if (editedFields.streetOrLandmark !== undefined) submission.streetOrLandmark = editedFields.streetOrLandmark.trim();
      if (editedFields.phone) submission.phone = editedFields.phone.trim();
      if (editedFields.alternatePhone !== undefined) submission.alternatePhone = editedFields.alternatePhone.trim();
      if (editedFields.whatsapp !== undefined) submission.whatsapp = editedFields.whatsapp.trim();
      if (editedFields.website !== undefined) submission.website = editedFields.website.trim();
      if (editedFields.openingHours !== undefined) submission.openingHours = editedFields.openingHours.trim();

      if (editedFields.latitude !== undefined && editedFields.longitude !== undefined) {
        const nLat = parseFloat(editedFields.latitude);
        const nLng = parseFloat(editedFields.longitude);
        if (!isNaN(nLat) && !isNaN(nLng)) {
          submission.latitude = nLat;
          submission.longitude = nLng;
          submission.townBoundaryStatus = determineBoundaryStatus(nLat, nLng, submission.locality);
        }
      }
    }

    if (adminNotes !== undefined) submission.adminNotes = adminNotes;
    submission.reviewedBy = req.user.id;
    submission.reviewedAt = new Date();

    let placeResult = null;

    if (action === "approve") {
      submission.status = "approved";
      submission.rejectionReason = "";

      // Ensure numeric coordinates
      const lat = parseFloat(submission.latitude);
      const lng = parseFloat(submission.longitude);

      const placePayload = {
        name: submission.title,
        category: submission.category,
        subcategory: submission.subcategory || "Community Listed",
        description: submission.description,
        addressFull: submission.addressFull,
        locality: submission.locality,
        streetOrLandmark: submission.streetOrLandmark || submission.locality,
        latitude: !isNaN(lat) ? lat : 26.6827,
        longitude: !isNaN(lng) ? lng : 84.0498,
        mapsUrl: !isNaN(lat) && !isNaN(lng) ? `https://www.google.com/maps?q=${lat},${lng}` : "",
        phone: submission.phone,
        alternatePhone: submission.alternatePhone,
        whatsapp: submission.whatsapp,
        website: submission.website,
        openingHours: submission.openingHours,
        services: submission.services,
        imageUrl: submission.primaryImage || "",
        galleryUrls: submission.images || [],
        ownerName: submission.ownerName,
        submissionSource: "community",
        submissionId: submission._id,
        verificationStatus: "verified",
        townBoundaryStatus: submission.townBoundaryStatus || "confirmed",
        isPublished: true,
        isArchived: false,
        reviewNotes: `Approved by admin from community submission ID: ${submission.referenceId}`,
      };

      if (submission.placeId) {
        // Update existing linked place
        placeResult = await Place.findByIdAndUpdate(submission.placeId, placePayload, { new: true });
      } else {
        // Create new published Place
        placeResult = await Place.create(placePayload);
        submission.placeId = placeResult._id;
      }
    } else if (action === "reject") {
      submission.status = "rejected";
      submission.rejectionReason = rejectionReason || "Submission did not meet verification criteria.";

      if (submission.placeId) {
        // Unpublish linked place
        await Place.findByIdAndUpdate(submission.placeId, {
          isPublished: false,
          reviewNotes: `Rejected by admin: ${submission.rejectionReason}`,
        });
      }
    } else if (action === "archive") {
      submission.status = "archived";
      if (submission.placeId) {
        await Place.findByIdAndUpdate(submission.placeId, {
          isArchived: true,
          isPublished: false,
          archivedAt: new Date(),
          archiveReason: rejectionReason || "Archived by admin",
        });
      }
    } else if (action === "restore") {
      submission.status = "approved";
      if (submission.placeId) {
        await Place.findByIdAndUpdate(submission.placeId, {
          isArchived: false,
          isPublished: true,
          archiveReason: "",
        });
      }
    } else {
      return res.status(400).json({ message: "Invalid review action." });
    }

    await submission.save();

    res.status(200).json({
      message: `Submission marked as ${submission.status}.`,
      submission,
      place: placeResult,
    });
  } catch (err) {
    console.error("Review Submission Error:", err);
    res.status(500).json({ message: err.message || "Failed to process review action." });
  }
});

// @route   POST /api/submissions (Legacy Citizen Corner compatibility)
// @access  Public
router.post("/", async (req, res) => {
  try {
    const { type, title, category, phone, landmark, venue, eventDate, organizer, details, submittedBy } = req.body;

    if (!type || !title) {
      return res.status(400).json({ message: "Submission type and title are required." });
    }

    if (!["business", "correction", "event", "community_place"].includes(type)) {
      return res.status(400).json({ message: "Invalid submission type." });
    }

    const submission = await Submission.create({
      type,
      title: title.trim(),
      category: category ? category.trim() : "",
      phone: phone ? phone.trim() : "",
      landmark: landmark ? landmark.trim() : "",
      venue: venue ? venue.trim() : "",
      eventDate: eventDate ? eventDate.trim() : "",
      organizer: organizer ? organizer.trim() : "",
      details: details ? details.trim() : "",
      submittedBy: submittedBy || { name: "Local Citizen" },
      status: "pending",
    });

    res.status(201).json({
      message: "Submission received successfully and queued for admin review.",
      submission,
      referenceId: submission.referenceId,
    });
  } catch (err) {
    console.error("Create Submission Error:", err);
    res.status(500).json({ message: "Failed to process citizen submission." });
  }
});

// @route   GET /api/submissions
// @desc    Admin review list for all citizen submissions
// @access  Private (Admin)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = {};

    if (type && type !== "all") query.type = type;
    if (status && status !== "all") query.status = status;

    const submissions = await Submission.find(query).sort({ createdAt: -1 });
    res.status(200).json(submissions);
  } catch (err) {
    console.error("Fetch Submissions Error:", err);
    res.status(500).json({ message: "Failed to fetch submissions." });
  }
});

// @route   PATCH /api/submissions/:id
// @desc    Admin legacy patch
// @access  Private (Admin)
router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    if (!["approved", "rejected", "pending", "archived"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    submission.status = status;
    if (adminNotes !== undefined) submission.adminNotes = adminNotes;
    await submission.save();

    res.status(200).json({
      message: `Submission marked as ${status}.`,
      submission,
    });
  } catch (err) {
    console.error("Update Submission Error:", err);
    res.status(500).json({ message: "Failed to update submission status." });
  }
});

// @route   DELETE /api/submissions/:id
// @desc    Admin deletes a submission
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const deleted = await Submission.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Submission not found." });
    }
    res.status(200).json({ message: "Submission deleted successfully." });
  } catch (err) {
    console.error("Delete Submission Error:", err);
    res.status(500).json({ message: "Failed to delete submission." });
  }
});

export default router;
