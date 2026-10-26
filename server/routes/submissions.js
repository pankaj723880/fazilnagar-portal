import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import Submission from "../models/Submission.js";
import Place from "../models/Place.js";
import News from "../models/News.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { FAZILNAGAR_AREAS, isWithinTownBoundary } from "../config/areas.js";
import { detectDuplicates, determineBoundaryStatus, normalizePhone } from "../utils/submissionUtils.js";
import { uploadMediaToDrive } from "./googleDrive.js";
import { createBroadcastNotification, createSubmissionNotification } from "../utils/notify.js";
import { invalidatePlacesCache, syncJsonPlaces } from "./places.js";
import { buildMapsUrl } from "../utils/coordinates.js";
import { calculateHaversineDistanceKm } from "../utils/googleMapsValidator.js";
import { emitPlacesUpdated } from "../socket.js";

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
// @access  Private (Authenticated Users Only)
router.post(
  "/upload-images",
  verifyToken,
  (req, res, next) => {
    upload.any()(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message || "Failed to process photo upload." });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No photos were received. Please select an image." });
      }

      const backendBase = (process.env.BACKEND_URL || "https://fazilnagar-portal-l95o.onrender.com").replace(/\/+$/, "");

      const getFileUrl = async (file) => {
        try {
          if (file?.path && fs.existsSync(file.path)) {
            const fileBuffer = fs.readFileSync(file.path);
            const driveResult = await uploadMediaToDrive({
              buffer: fileBuffer,
              originalName: file.originalname,
              mimeType: file.mimetype,
            });
            if (driveResult?.mediaDoc?.deliveryUrl) {
              return driveResult.mediaDoc.deliveryUrl;
            }
          }
        } catch (driveErr) {
          console.warn("[Upload] Drive upload fallback to local:", driveErr.message);
        }
        return `${backendBase}/uploads/community/${file.filename}`;
      };

      // Identify primary image: by field name or first file
      let primaryFile = files.find(
        (f) => f.fieldname === "primaryImage" || f.fieldname === "primary"
      );
      if (!primaryFile) {
        primaryFile = files[0];
      }

      const primaryImageUrl = await getFileUrl(primaryFile);

      // Remaining files are gallery / additional images
      const additionalFiles = files.filter((f) => f !== primaryFile);
      const additionalImageUrls = [];
      for (const f of additionalFiles) {
        const url = await getFileUrl(f);
        additionalImageUrls.push(url);
      }

      res.status(200).json({
        success: true,
        primaryImage: primaryImageUrl,
        primaryImageUrl,
        images: additionalImageUrls,
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
// @access  Private (Authenticated Users Only)
router.post("/place", verifyToken, async (req, res) => {
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
        userId: req.user.id,
        name: req.user.name || (ownerName ? ownerName.trim() : "Community Submitter"),
        email: req.user.email || "",
        phone: phone.trim(),
        ipAddress: req.ip || "",
      },
    });

    // Notify submitter of receipt
    createSubmissionNotification({
      recipientPhone: phone.trim(),
      referenceId: submission.referenceId,
      type: "submission_received",
      title: "Place Submission Received 📝",
      message: `Your establishment "${name.trim()}" has been received and queued for review. Reference ID: ${submission.referenceId}`,
      link: "/directory",
      data: { submissionId: submission._id, referenceId: submission.referenceId },
    }).catch(() => {});

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

// @route   PATCH /api/submissions/places/:id/review or /api/submissions/places/admin/:id/review
// @desc    Admin action on community place submission (approve, reject, edit, archive, restore)
// @access  Private (Admin)
const handlePlaceReview = async (req, res) => {
  try {
    const { action, rejectionReason, adminNotes, editedFields } = req.body;
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Prevent duplicate approvals
    if (submission.status === "approved" && action === "approve") {
      const existingPlace = submission.placeId ? await Place.findById(submission.placeId) : null;
      return res.status(400).json({
        message: "This submission has already been approved and published.",
        submission,
        place: existingPlace,
      });
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
        if (!isNaN(nLat) && !isNaN(nLng) && nLat >= -90 && nLat <= 90 && nLng >= -180 && nLng <= 180) {
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

      const lat = parseFloat(submission.latitude ?? submission.placeDetails?.latitude);
      const lng = parseFloat(submission.longitude ?? submission.placeDetails?.longitude);
      const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

      let existingPlace = null;
      if (submission.placeId) {
        existingPlace = await Place.findById(submission.placeId);
      }

      if (existingPlace) {
        // Update existing linked place while preserving unmodified/unrelated fields
        existingPlace.name = submission.title || submission.placeDetails?.name || existingPlace.name;
        if (submission.category || submission.placeDetails?.category) existingPlace.category = submission.category || submission.placeDetails?.category;
        if (submission.subcategory) existingPlace.subcategory = submission.subcategory;
        if (submission.description || submission.placeDetails?.description) existingPlace.description = submission.description || submission.placeDetails?.description;
        if (submission.addressFull) existingPlace.addressFull = submission.addressFull;
        if (submission.locality || submission.placeDetails?.locality) existingPlace.locality = submission.locality || submission.placeDetails?.locality;
        if (submission.streetOrLandmark) existingPlace.streetOrLandmark = submission.streetOrLandmark;
        if (submission.phone || submission.placeDetails?.phone) existingPlace.phone = submission.phone || submission.placeDetails?.phone;
        if (submission.alternatePhone !== undefined) existingPlace.alternatePhone = submission.alternatePhone;
        if (submission.whatsapp !== undefined) existingPlace.whatsapp = submission.whatsapp;
        if (submission.website !== undefined) existingPlace.website = submission.website;
        if (submission.openingHours !== undefined) existingPlace.openingHours = submission.openingHours;
        if (submission.services && submission.services.length > 0) existingPlace.services = submission.services;
        if (submission.primaryImage) existingPlace.imageUrl = submission.primaryImage;
        if (submission.images && submission.images.length > 0) existingPlace.galleryUrls = submission.images;
        if (submission.ownerName) existingPlace.ownerName = submission.ownerName;

        // Preserve verified coordinates if submitted ones are invalid or missing
        if (hasValidCoords) {
          existingPlace.latitude = lat;
          existingPlace.longitude = lng;
          existingPlace.mapsUrl = buildMapsUrl(lat, lng);
          existingPlace.calculatedDistanceKm = calculateHaversineDistanceKm(lat, lng, 26.6804068, 84.046655);
        }

        existingPlace.isPublished = true;
        existingPlace.isArchived = false;
        existingPlace.verificationStatus = "verified";
        existingPlace.townBoundaryStatus = "confirmed";
        existingPlace.lastVerifiedAt = new Date();
        existingPlace.reviewNotes = `Approved by admin from community submission ID: ${submission.referenceId}`;

        await existingPlace.save();
        placeResult = existingPlace;
      } else {
        // Create new published Place
        const newPlacePayload = {
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          name: submission.title || submission.placeDetails?.name,
          category: submission.category || submission.placeDetails?.category || "General",
          type: submission.placeDetails?.type || (submission.type === "community_place" ? "village" : "place"),
          subcategory: submission.subcategory || "Community Listed",
          description: submission.description || submission.placeDetails?.description || "",
          addressFull: submission.addressFull || `${submission.title || submission.placeDetails?.name}, Fazilnagar`,
          locality: submission.locality || submission.placeDetails?.locality || "Fazilnagar",
          streetOrLandmark: submission.streetOrLandmark || submission.locality || "Fazilnagar",
          latitude: hasValidCoords ? lat : null,
          longitude: hasValidCoords ? lng : null,
          mapsUrl: hasValidCoords ? buildMapsUrl(lat, lng) : "",
          phone: submission.phone || submission.placeDetails?.phone || "",
          alternatePhone: submission.alternatePhone || "",
          whatsapp: submission.whatsapp || "",
          website: submission.website || "",
          openingHours: submission.openingHours || "",
          services: submission.services || [],
          imageUrl: submission.primaryImage || "",
          galleryUrls: submission.images || [],
          ownerName: submission.ownerName || "",
          submissionSource: "community",
          submissionId: submission._id,
          verificationStatus: "verified",
          townBoundaryStatus: "confirmed",
          isPublished: true,
          isArchived: false,
          calculatedDistanceKm: hasValidCoords ? calculateHaversineDistanceKm(lat, lng, 26.6804068, 84.046655) : null,
          reviewNotes: `Approved by admin from community submission ID: ${submission.referenceId}`,
        };

        placeResult = await Place.create(newPlacePayload);
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

    // Invalidate in-memory caches so public map & directory update immediately
    invalidatePlacesCache();

    // Safely sync JSON if matching record exists
    if (placeResult) {
      syncJsonPlaces((list) => {
        const targetId = placeResult.id || String(placeResult._id);
        const idx = list.findIndex(
          (p) =>
            String(p.id) === String(targetId) ||
            String(p._id) === String(targetId) ||
            p.slug === placeResult.slug
        );
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...placeResult.toObject() };
        }
        return list;
      });
    }

    // Emit realtime socket event for live map & directory synchronization
    emitPlacesUpdated({
      placeId: placeResult?._id,
      place: placeResult,
      action,
      submissionId: submission._id,
    });

    // Trigger user notification and optional town broadcast
    if (action === "approve") {
      createSubmissionNotification({
        recipientPhone: submission.phone,
        referenceId: submission.referenceId,
        type: "submission_approved",
        title: "Place Approved! 🎉",
        message: `Great news! "${submission.title}" has been approved and is now live on the town directory.`,
        link: "/directory",
        data: { submissionId: submission._id, placeId: placeResult?._id },
      }).catch(() => {});

      createBroadcastNotification({
        type: "broadcast_place",
        title: `📍 New Place: ${submission.title}`,
        message: `${submission.title} (${submission.category}) has been added to Fazilnagar Directory.`,
        link: "/directory",
        data: { placeId: placeResult?._id },
      }).catch(() => {});
    } else if (action === "reject") {
      createSubmissionNotification({
        recipientPhone: submission.phone,
        referenceId: submission.referenceId,
        type: "submission_rejected",
        title: "Place Verification Update",
        message: `Your place submission "${submission.title}" was rejected: ${submission.rejectionReason || "Verification criteria not met."}`,
        link: "/directory",
        data: { submissionId: submission._id },
      }).catch(() => {});
    }

    res.status(200).json({
      success: true,
      message: `Submission marked as ${submission.status}.`,
      submission,
      place: placeResult,
    });
  } catch (err) {
    console.error("Review Submission Error:", err);
    res.status(500).json({ message: err.message || "Failed to process review action." });
  }
};

router.patch("/places/admin/:id/review", verifyToken, requireAdmin, handlePlaceReview);
router.patch("/places/:id/review", verifyToken, requireAdmin, handlePlaceReview);

// @route   POST /api/submissions (Legacy Citizen Corner compatibility)
// @access  Private (Authenticated Users Only)
router.post("/", verifyToken, async (req, res) => {
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
      submittedBy: {
        userId: req.user.id,
        name: req.user.name || submittedBy?.name || "Local Citizen",
        email: req.user.email || "",
      },
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

// @route   GET /api/submissions/:id/status or /api/submissions/status/:id
// @desc    Retrieve submission status by ID or Reference ID
// @access  Public
const handleGetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const query = mongoose.Types.ObjectId.isValid(id)
      ? { _id: id }
      : { referenceId: id };

    const submission = await Submission.findOne(query).select(
      "title type category status referenceId createdAt townBoundaryStatus rejectionReason duplicateWarning"
    );

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    res.status(200).json({
      success: true,
      status: submission.status,
      referenceId: submission.referenceId,
      submission,
    });
  } catch (err) {
    console.error("Get Submission Status Error:", err);
    res.status(500).json({ message: "Failed to retrieve submission status." });
  }
};

router.get("/status/:id", handleGetStatus);
router.get("/:id/status", handleGetStatus);

// @route   GET /api/submissions/:id
// @desc    Admin fetches single submission details
// @access  Private (Admin)
router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("reviewedBy", "name email")
      .populate("placeId");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    res.status(200).json(submission);
  } catch (err) {
    console.error("Fetch Single Submission Error:", err);
    res.status(500).json({ message: "Failed to fetch submission details." });
  }
});

// @route   PATCH or PUT /api/submissions/:id/status or /api/submissions/:id
// @desc    Admin updates submission status (approve, reject, resolve, archive)
// @access  Private (Admin)
const handleStatusUpdate = async (req, res) => {
  try {
    const { status, adminNotes, rejectionReason } = req.body;

    const allowed = ["approved", "rejected", "pending", "archived", "resolved"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const submission = await Submission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const nextStatus = status === "resolved" ? "approved" : status;

    // Prevent duplicate approvals
    if (submission.status === "approved" && nextStatus === "approved") {
      const existingPlace = submission.placeId ? await Place.findById(submission.placeId) : null;
      return res.status(400).json({
        message: "This submission has already been approved and published.",
        submission,
        place: existingPlace,
      });
    }

    submission.status = nextStatus;
    if (adminNotes !== undefined) submission.adminNotes = adminNotes;
    if (rejectionReason !== undefined) submission.rejectionReason = rejectionReason;
    submission.reviewedBy = req.user?.id || null;
    submission.reviewedAt = new Date();

    // If approving a community business or place, ensure Place record is published
    let placeResult = null;
    if (nextStatus === "approved" && (submission.type === "business" || submission.type === "community_place")) {
      const lat = parseFloat(submission.latitude);
      const lng = parseFloat(submission.longitude);
      const hasValidCoords = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

      let existingPlace = null;
      if (submission.placeId) {
        existingPlace = await Place.findById(submission.placeId);
      }

      if (existingPlace) {
        existingPlace.name = submission.title || existingPlace.name;
        if (submission.category) existingPlace.category = submission.category;
        if (submission.subcategory) existingPlace.subcategory = submission.subcategory;
        if (submission.description || submission.details) existingPlace.description = submission.description || submission.details;
        if (submission.addressFull) existingPlace.addressFull = submission.addressFull;
        if (submission.locality) existingPlace.locality = submission.locality;
        if (submission.streetOrLandmark) existingPlace.streetOrLandmark = submission.streetOrLandmark;
        if (submission.phone) existingPlace.phone = submission.phone;
        if (submission.alternatePhone !== undefined) existingPlace.alternatePhone = submission.alternatePhone;
        if (submission.whatsapp !== undefined) existingPlace.whatsapp = submission.whatsapp;
        if (submission.website !== undefined) existingPlace.website = submission.website;
        if (submission.openingHours !== undefined) existingPlace.openingHours = submission.openingHours;
        if (submission.services && submission.services.length > 0) existingPlace.services = submission.services;
        if (submission.primaryImage) existingPlace.imageUrl = submission.primaryImage;
        if (submission.images && submission.images.length > 0) existingPlace.galleryUrls = submission.images;
        if (submission.ownerName) existingPlace.ownerName = submission.ownerName;

        // Preserve coordinates if missing/invalid
        if (hasValidCoords) {
          existingPlace.latitude = lat;
          existingPlace.longitude = lng;
          existingPlace.mapsUrl = buildMapsUrl(lat, lng);
          existingPlace.calculatedDistanceKm = calculateHaversineDistanceKm(lat, lng, 26.6804068, 84.046655);
        }

        existingPlace.isPublished = true;
        existingPlace.isArchived = false;
        existingPlace.verificationStatus = "verified";
        existingPlace.townBoundaryStatus = "confirmed";
        existingPlace.lastVerifiedAt = new Date();
        existingPlace.reviewNotes = `Approved by admin from submission ID: ${submission.referenceId || submission._id}`;

        await existingPlace.save();
        placeResult = existingPlace;
      } else {
        const newPlacePayload = {
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          name: submission.title,
          category: submission.category || "General",
          subcategory: submission.subcategory || "Community Listed",
          description: submission.description || submission.details || "",
          addressFull: submission.addressFull || submission.landmark || `${submission.title}, Fazilnagar`,
          locality: submission.locality || "Fazilnagar",
          streetOrLandmark: submission.streetOrLandmark || submission.landmark || submission.locality || "Fazilnagar",
          latitude: hasValidCoords ? lat : null,
          longitude: hasValidCoords ? lng : null,
          mapsUrl: hasValidCoords ? buildMapsUrl(lat, lng) : "",
          phone: submission.phone || "",
          alternatePhone: submission.alternatePhone || "",
          whatsapp: submission.whatsapp || "",
          website: submission.website || "",
          openingHours: submission.openingHours || "",
          services: submission.services || [],
          imageUrl: submission.primaryImage || "",
          galleryUrls: submission.images || [],
          ownerName: submission.ownerName || submission.submittedBy?.name || "",
          submissionSource: "community",
          submissionId: submission._id,
          verificationStatus: "verified",
          townBoundaryStatus: "confirmed",
          isPublished: true,
          isArchived: false,
          calculatedDistanceKm: hasValidCoords ? calculateHaversineDistanceKm(lat, lng, 26.6804068, 84.046655) : null,
          reviewNotes: `Approved by admin from submission ID: ${submission.referenceId || submission._id}`,
        };

        placeResult = await Place.create(newPlacePayload);
        submission.placeId = placeResult._id;
      }
    } else if (nextStatus === "rejected" && submission.placeId) {
      await Place.findByIdAndUpdate(submission.placeId, {
        isPublished: false,
        reviewNotes: `Rejected by admin: ${submission.rejectionReason || "Criteria not met"}`,
      });
    }

    await submission.save();

    // Invalidate in-memory caches
    invalidatePlacesCache();

    // Safely sync JSON if matching
    if (placeResult) {
      syncJsonPlaces((list) => {
        const targetId = placeResult.id || String(placeResult._id);
        const idx = list.findIndex(
          (p) =>
            String(p.id) === String(targetId) ||
            String(p._id) === String(targetId) ||
            p.slug === placeResult.slug
        );
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...placeResult.toObject() };
        }
        return list;
      });
    }

    // Emit realtime socket event
    emitPlacesUpdated({
      placeId: placeResult?._id,
      place: placeResult,
      action: nextStatus,
      submissionId: submission._id,
    });

    // Trigger submitter notification and broadcast if approved
    if (nextStatus === "approved") {
      createSubmissionNotification({
        recipientPhone: submission.phone,
        referenceId: submission.referenceId,
        type: "submission_approved",
        title: "Submission Approved! 🎉",
        message: `Your submission "${submission.title}" (${submission.type}) has been approved by town administration!`,
        link: submission.type === "business" || submission.type === "community_place" ? "/directory" : "/news",
        data: { submissionId: submission._id, placeId: placeResult?._id },
      }).catch(() => {});

      if (submission.type === "business" || submission.type === "community_place") {
        createBroadcastNotification({
          type: "broadcast_place",
          title: `📍 New Place: ${submission.title}`,
          message: `${submission.title} (${submission.category}) has been added to Fazilnagar Directory.`,
          link: "/directory",
          data: { placeId: placeResult?._id },
        }).catch(() => {});
      }
    } else if (nextStatus === "rejected") {
      createSubmissionNotification({
        recipientPhone: submission.phone,
        referenceId: submission.referenceId,
        type: "submission_rejected",
        title: "Submission Status Update",
        message: `Your submission "${submission.title}" was rejected: ${submission.rejectionReason || "Verification criteria not met."}`,
        link: "/directory",
        data: { submissionId: submission._id },
      }).catch(() => {});
    }

    res.status(200).json({
      message: `Submission marked as ${nextStatus}.`,
      submission,
      place: placeResult,
    });
  } catch (err) {
    console.error("Update Submission Error:", err);
    res.status(500).json({ message: "Failed to update submission status." });
  }
};

router.patch("/:id/status", verifyToken, requireAdmin, handleStatusUpdate);
router.patch("/:id", verifyToken, requireAdmin, handleStatusUpdate);
router.put("/:id/status", verifyToken, requireAdmin, handleStatusUpdate);
router.put("/:id", verifyToken, requireAdmin, handleStatusUpdate);

// @route   POST /api/submissions/correction
// @desc    Submit a verified listing correction or civic inquiry from Contact/Report page
// @access  Public (Subject to writeLimiter)
router.post("/correction", async (req, res) => {
  try {
    const {
      name,
      emailOrPhone,
      subject,
      listingName,
      incorrectInfo,
      correctionDetails,
      formType = "report",
    } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Your name is required." });
    }
    if (!emailOrPhone || typeof emailOrPhone !== "string" || !emailOrPhone.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid phone number or email is required for editorial follow-up.",
      });
    }
    if (formType === "report" && (!listingName || !listingName.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please specify the business or listing name that requires correction.",
      });
    }
    const details = (correctionDetails || incorrectInfo || subject || "").trim();
    if (!details) {
      return res.status(400).json({
        success: false,
        message: "Please provide details regarding the inquiry or incorrect information.",
      });
    }

    const title =
      formType === "report"
        ? `Correction: ${listingName.trim()}`
        : `Civic Inquiry: ${(subject || "General Inquiry").trim()}`;

    const submission = await Submission.create({
      type: "correction",
      title,
      category: "Directory Correction",
      description: details,
      details,
      ownerName: name.trim(),
      phone: emailOrPhone.trim(),
      status: "pending",
      consentConfirmed: true,
      townBoundaryStatus: "confirmed",
      submittedBy: {
        name: name.trim(),
        email: emailOrPhone.includes("@") ? emailOrPhone.trim() : "",
        phone: !emailOrPhone.includes("@") ? emailOrPhone.trim() : "",
        ipAddress: req.ip || "",
      },
    });

    createBroadcastNotification({
      title: "New Civic Report / Correction Received",
      message: `${name.trim()} submitted a report: "${title}". Reference ID: ${submission.referenceId}`,
      link: "/admin/review?tab=community-places",
      targetAudience: "admin",
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      referenceId: submission.referenceId,
      message: `Thank you! Your report has been submitted to the Fazilnagar editorial volunteer desk. Reference ID: ${submission.referenceId}`,
    });
  } catch (err) {
    console.error("Correction Submission Error:", err);
    return res.status(500).json({ success: false, message: "Failed to submit correction. Please try again." });
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
