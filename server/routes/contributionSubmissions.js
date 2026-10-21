import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import ContributionSubmission from "../models/ContributionSubmission.js";
import ContributionForm from "../models/ContributionForm.js";
import Place from "../models/Place.js";
import AuditLog from "../models/AuditLog.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { invalidatePlacesCache, syncJsonPlaces } from "./places.js";
import {
  buildGoogleMapsCoordinateUrl,
  calculateHaversineDistanceKm,
  extractCoordinatesFromMapsUrl,
  extractCoordinatesAsync,
} from "../utils/googleMapsValidator.js";
import { emitPlacesUpdated } from "../socket.js";
import { uploadMediaToDrive } from "./googleDrive.js";
import { writeLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Safely reparses location data on a submission if map link exists or coordinates exist in aliases.
 * Does NOT fabricate coordinates. Updates MongoDB document if valid coordinates extracted.
 */
async function ensureSubmissionLocationParsed(sub) {
  if (!sub) return sub;

  let mapUrl =
    sub.googleMapsUrl ||
    sub.appleMapsUrl ||
    sub.mapUrl ||
    sub.proposedValues?.googleMapsUrl ||
    sub.proposedValues?.appleMapsUrl ||
    sub.proposedValues?.mapUrl ||
    sub.proposedValues?.locationUrl ||
    sub.proposedValues?.mapsLink ||
    sub.proposedValues?.mapLink ||
    "";

  if (!mapUrl && sub.proposedValues && typeof sub.proposedValues === "object") {
    for (const val of Object.values(sub.proposedValues)) {
      if (
        typeof val === "string" &&
        (val.includes("google.com/maps") ||
          val.includes("maps.google.") ||
          val.includes("maps.app.goo.gl") ||
          val.includes("goo.gl/maps") ||
          val.includes("maps.apple.com") ||
          val.includes("apple.co"))
      ) {
        mapUrl = val.trim();
        break;
      }
    }
  }

  let needsDbUpdate = false;
  const updateFields = {};

  if (!sub.googleMapsUrl && mapUrl) {
    sub.googleMapsUrl = mapUrl;
    updateFields.googleMapsUrl = mapUrl;
    needsDbUpdate = true;
  }

  const isValidNumber = (n) =>
    n !== null && n !== undefined && n !== "" && !isNaN(Number(n));

  // Check if valid coordinates already exist across any alias
  let existingLat = null;
  let existingLng = null;

  if (isValidNumber(sub.latitude) && isValidNumber(sub.longitude)) {
    existingLat = Number(sub.latitude);
    existingLng = Number(sub.longitude);
  } else if (isValidNumber(sub.proposedValues?.latitude) && isValidNumber(sub.proposedValues?.longitude)) {
    existingLat = Number(sub.proposedValues.latitude);
    existingLng = Number(sub.proposedValues.longitude);
  } else if (isValidNumber(sub.proposedValues?.lat) && isValidNumber(sub.proposedValues?.lng)) {
    existingLat = Number(sub.proposedValues.lat);
    existingLng = Number(sub.proposedValues.lng);
  } else if (isValidNumber(sub.locationComparison?.urlLat) && isValidNumber(sub.locationComparison?.urlLng)) {
    existingLat = Number(sub.locationComparison.urlLat);
    existingLng = Number(sub.locationComparison.urlLng);
  } else if (isValidNumber(sub.locationComparison?.submittedLat) && isValidNumber(sub.locationComparison?.submittedLng)) {
    existingLat = Number(sub.locationComparison.submittedLat);
    existingLng = Number(sub.locationComparison.submittedLng);
  }

  if (existingLat !== null && existingLng !== null) {
    // Validate range bounds
    if (existingLat >= -90 && existingLat <= 90 && existingLng >= -180 && existingLng <= 180) {
      if (sub.latitude === null || sub.latitude === undefined || isNaN(Number(sub.latitude))) {
        sub.latitude = existingLat;
        sub.longitude = existingLng;
        updateFields.latitude = existingLat;
        updateFields.longitude = existingLng;
        needsDbUpdate = true;
      }
      if (!sub.proposedValues) sub.proposedValues = {};
      if (sub.proposedValues.latitude === undefined || sub.proposedValues.latitude === null) {
        sub.proposedValues.latitude = existingLat;
        sub.proposedValues.longitude = existingLng;
        updateFields["proposedValues.latitude"] = existingLat;
        updateFields["proposedValues.longitude"] = existingLng;
        needsDbUpdate = true;
      }
      if (!sub.locationComparison || sub.locationComparison.status === "none" || sub.locationComparison.status === "shortened_requires_admin_pin_check") {
        sub.locationComparison = {
          submittedLat: existingLat,
          submittedLng: existingLng,
          urlLat: existingLat,
          urlLng: existingLng,
          distanceKm: 0,
          status: "consistent",
          warningMessage: "",
        };
        updateFields.locationComparison = sub.locationComparison;
        needsDbUpdate = true;
      }
    }
  } else if (mapUrl) {
    // Missing coordinates and we have a map URL: attempt safe extraction
    let coords = extractCoordinatesFromMapsUrl(mapUrl);
    if (!coords && (mapUrl.includes("goo.gl") || mapUrl.includes("apple.co"))) {
      coords = await extractCoordinatesAsync(mapUrl);
    }

    if (coords && coords.lat !== null && coords.lng !== null) {
      sub.latitude = coords.lat;
      sub.longitude = coords.lng;
      if (!sub.proposedValues) sub.proposedValues = {};
      sub.proposedValues.latitude = coords.lat;
      sub.proposedValues.longitude = coords.lng;

      sub.locationComparison = {
        submittedLat: coords.lat,
        submittedLng: coords.lng,
        urlLat: coords.lat,
        urlLng: coords.lng,
        distanceKm: 0,
        status: "consistent",
        warningMessage: "",
      };

      updateFields.latitude = coords.lat;
      updateFields.longitude = coords.lng;
      updateFields["proposedValues.latitude"] = coords.lat;
      updateFields["proposedValues.longitude"] = coords.lng;
      updateFields.locationComparison = sub.locationComparison;
      needsDbUpdate = true;
    }
  }

  if (needsDbUpdate && sub._id) {
    ContributionSubmission.updateOne({ _id: sub._id }, { $set: updateFields }).catch((e) =>
      console.warn("Backfill coordinate update warning:", e?.message)
    );
  }

  return sub;
}

// Configure Uploads Directory for Contribution Attachments
const uploadDir = path.join(__dirname, "../uploads/contributions");
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
    cb(null, `contrib-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP images up to 5MB are permitted."));
    }
  },
});

// @route   POST /api/contributions/upload
// @desc    Upload attachments for public contributions
// @access  Public
router.post(
  "/upload",
  writeLimiter,
  (req, res, next) => {
    upload.array("attachments", 5)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Attachment upload error: ${err.message}` });
      } else if (err) {
        return res.status(400).json({ message: err.message || "Failed to process attachment." });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files received." });
      }

      const backendBase = (process.env.BACKEND_URL || "https://fazilnagar-portal-l95o.onrender.com").replace(/\/+$/, "");
      const uploadedUrls = [];

      for (const file of files) {
        try {
          if (file.path && fs.existsSync(file.path)) {
            const buffer = fs.readFileSync(file.path);
            const driveResult = await uploadMediaToDrive({
              buffer,
              originalName: file.originalname,
              mimeType: file.mimetype,
            });
            if (driveResult?.mediaDoc?.deliveryUrl) {
              uploadedUrls.push(driveResult.mediaDoc.deliveryUrl);
              continue;
            }
          }
        } catch (_) {}

        uploadedUrls.push(`${backendBase}/uploads/contributions/${file.filename}`);
      }

      res.status(200).json({
        message: "Attachments uploaded successfully.",
        urls: uploadedUrls,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Upload failed." });
    }
  }
);

// ==========================================
// ADMIN SUBMISSION REVIEW & APPROVAL WORKFLOW
// ==========================================

// @route   GET /api/contributions
// @desc    List contribution submissions with comprehensive filtering and search
// @access  Admin Only
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      module: targetModule,
      formId,
      status,
      entityType,
      search,
      page = 1,
      limit = 30,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};

    if (targetModule && targetModule !== "all") {
      query.targetModule = targetModule;
    }

    if (formId && formId !== "all") {
      query.formId = formId;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (entityType && entityType !== "all") {
      query.entityType = entityType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      query.$or = [
        { referenceId: { $regex: q, $options: "i" } },
        { targetEntityName: { $regex: q, $options: "i" } },
        { "submitterInfo.name": { $regex: q, $options: "i" } },
        { "submitterInfo.contact": { $regex: q, $options: "i" } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [submissions, total, countsByStatus] = await Promise.all([
      ContributionSubmission.find(query)
        .populate("formId", "title slug targetModule")
        .populate("reviewedBy", "name email")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      ContributionSubmission.countDocuments(query),

      ContributionSubmission.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCounts = {
      all: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      changes_requested: 0,
    };

    countsByStatus.forEach((sc) => {
      if (statusCounts[sc._id] !== undefined) {
        statusCounts[sc._id] = sc.count;
      }
      statusCounts.all += sc.count;
    });

    await Promise.all(submissions.map(ensureSubmissionLocationParsed));

    res.status(200).json({
      submissions,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      statusCounts,
    });
  } catch (err) {
    console.error("List Contributions Error:", err);
    res.status(500).json({ message: "Failed to retrieve contribution submissions." });
  }
});

// @route   POST /api/contributions/backfill-coordinates
// @desc    Backfill coordinates for existing submissions with map links but missing coordinates
// @access  Admin Only
router.post("/backfill-coordinates", verifyToken, requireAdmin, async (req, res) => {
  try {
    const candidates = await ContributionSubmission.find({
      $and: [
        {
          $or: [
            { latitude: null },
            { latitude: { $exists: false } },
            { latitude: "" },
          ],
        },
        {
          $or: [
            { googleMapsUrl: { $exists: true, $ne: "" } },
            { appleMapsUrl: { $exists: true, $ne: "" } },
            { mapUrl: { $exists: true, $ne: "" } },
            { "proposedValues.googleMapsUrl": { $exists: true, $ne: "" } },
            { "proposedValues.appleMapsUrl": { $exists: true, $ne: "" } },
            { "proposedValues.mapUrl": { $exists: true, $ne: "" } },
            { "proposedValues.locationUrl": { $exists: true, $ne: "" } },
            { "proposedValues.mapsLink": { $exists: true, $ne: "" } },
            { "proposedValues.latitude": { $exists: true, $ne: null } },
            { "proposedValues.lat": { $exists: true, $ne: null } },
            { "locationComparison.urlLat": { $exists: true, $ne: null } },
          ],
        },
      ],
    });

    let updatedCount = 0;
    for (const sub of candidates) {
      let mapUrl =
        sub.googleMapsUrl ||
        sub.appleMapsUrl ||
        sub.mapUrl ||
        sub.proposedValues?.googleMapsUrl ||
        sub.proposedValues?.appleMapsUrl ||
        sub.proposedValues?.mapUrl ||
        sub.proposedValues?.locationUrl ||
        sub.proposedValues?.mapsLink ||
        sub.proposedValues?.mapLink ||
        "";

      if (!mapUrl && sub.proposedValues && typeof sub.proposedValues === "object") {
        for (const val of Object.values(sub.proposedValues)) {
          if (
            typeof val === "string" &&
            (val.includes("google.com/maps") ||
              val.includes("maps.google.") ||
              val.includes("maps.app.goo.gl") ||
              val.includes("goo.gl/maps") ||
              val.includes("maps.apple.com") ||
              val.includes("apple.co"))
          ) {
            mapUrl = val.trim();
            break;
          }
        }
      }

      const isValidNumber = (n) =>
        n !== null && n !== undefined && n !== "" && !isNaN(Number(n));

      // Check if coordinates exist in proposedValues or locationComparison
      let coords = null;
      if (isValidNumber(sub.proposedValues?.latitude) && isValidNumber(sub.proposedValues?.longitude)) {
        coords = { lat: Number(sub.proposedValues.latitude), lng: Number(sub.proposedValues.longitude) };
      } else if (isValidNumber(sub.proposedValues?.lat) && isValidNumber(sub.proposedValues?.lng)) {
        coords = { lat: Number(sub.proposedValues.lat), lng: Number(sub.proposedValues.lng) };
      } else if (isValidNumber(sub.locationComparison?.urlLat) && isValidNumber(sub.locationComparison?.urlLng)) {
        coords = { lat: Number(sub.locationComparison.urlLat), lng: Number(sub.locationComparison.urlLng) };
      } else if (isValidNumber(sub.locationComparison?.submittedLat) && isValidNumber(sub.locationComparison?.submittedLng)) {
        coords = { lat: Number(sub.locationComparison.submittedLat), lng: Number(sub.locationComparison.submittedLng) };
      } else if (mapUrl) {
        coords = extractCoordinatesFromMapsUrl(mapUrl);
        if (!coords && (mapUrl.includes("goo.gl") || mapUrl.includes("apple.co"))) {
          coords = await extractCoordinatesAsync(mapUrl);
        }
      }

      let modified = false;
      if (coords && coords.lat !== null && coords.lng !== null && coords.lat >= -90 && coords.lat <= 90 && coords.lng >= -180 && coords.lng <= 180) {
        sub.latitude = coords.lat;
        sub.longitude = coords.lng;
        if (!sub.proposedValues) sub.proposedValues = {};
        sub.proposedValues.latitude = coords.lat;
        sub.proposedValues.longitude = coords.lng;
        if (mapUrl) sub.googleMapsUrl = mapUrl;
        sub.locationComparison = {
          submittedLat: coords.lat,
          submittedLng: coords.lng,
          urlLat: coords.lat,
          urlLng: coords.lng,
          distanceKm: 0,
          status: "consistent",
          warningMessage: "",
        };
        modified = true;
        updatedCount++;
      } else if (!sub.googleMapsUrl && mapUrl) {
        sub.googleMapsUrl = mapUrl;
        modified = true;
      }

      if (modified) {
        sub.markModified("proposedValues");
        await sub.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: `Backfilled coordinates for ${updatedCount} submissions.`,
      totalCandidates: candidates.length,
      updatedCount,
    });
  } catch (err) {
    console.error("Backfill coordinates error:", err);
    return res.status(500).json({ message: "Failed to backfill coordinates." });
  }
});

// @route   GET /api/contributions/:id
// @desc    Detailed view of a single submission with side-by-side diff
// @access  Admin Only
router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const submission = await ContributionSubmission.findById(req.params.id)
      .populate("formId")
      .populate("reviewedBy", "name email")
      .populate("appliedPlaceId")
      .lean();

    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    await ensureSubmissionLocationParsed(submission);

    // Load current live record if correction or applied
    let liveEntity = null;
    let isStale = false;
    let changedFields = [];

    if (submission.appliedPlaceId && typeof submission.appliedPlaceId === "object" && submission.appliedPlaceId.name) {
      liveEntity = submission.appliedPlaceId;
    } else {
      const entityLookupId =
        submission.targetEntityId ||
        (submission.appliedPlaceId?._id
          ? String(submission.appliedPlaceId._id)
          : submission.appliedPlaceId
          ? String(submission.appliedPlaceId)
          : null);

      if (entityLookupId) {
        const lookupStr = String(entityLookupId).trim();
        const isOid = mongoose.isValidObjectId(lookupStr);
        liveEntity = await Place.findOne({
          $or: [
            { id: lookupStr },
            ...(isOid ? [{ _id: lookupStr }] : []),
          ],
        }).lean();
      }
    }

    // Determine field-level differences
    const proposed = submission.proposedValues || {};
    const original = submission.originalValues || {};
    const diffs = [];

    for (const [key, propVal] of Object.entries(proposed)) {
      const origVal = original[key] ?? liveEntity?.[key] ?? null;
      const currentLiveVal = liveEntity ? liveEntity[key] ?? null : null;

      const isChanged = String(origVal ?? "") !== String(propVal ?? "");
      if (isChanged) {
        changedFields.push(key);
      }

      // Check if live value was modified by someone else since submission
      const liveDifferFromOriginal =
        liveEntity && String(origVal ?? "") !== String(currentLiveVal ?? "");
      if (liveDifferFromOriginal) {
        isStale = true;
      }

      diffs.push({
        field: key,
        originalValue: origVal,
        proposedValue: propVal,
        currentLiveValue: currentLiveVal,
        isChanged,
        isStaleConflict: liveDifferFromOriginal,
      });
    }

    // Duplicate detection helper for review
    let proximityEntities = [];
    if (submission.proposedValues?.latitude && submission.proposedValues?.longitude) {
      const lat = Number(submission.proposedValues.latitude);
      const lng = Number(submission.proposedValues.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        const nearbyPlaces = await Place.find({
          latitude: { $ne: null, $gte: lat - 0.03, $lte: lat + 0.03 },
          longitude: { $ne: null, $gte: lng - 0.03, $lte: lng + 0.03 },
          isArchived: { $ne: true },
        })
          .select("id name hindiName category entityType latitude longitude")
          .limit(6)
          .lean();

        proximityEntities = nearbyPlaces
          .map((p) => ({
            id: p.id || String(p._id),
            name: p.name,
            hindiName: p.hindiName || "",
            category: p.category,
            distanceKm: calculateHaversineDistanceKm(lat, lng, p.latitude, p.longitude),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }

    res.status(200).json({
      submission,
      liveEntity,
      diffs,
      changedFields,
      isStale,
      proximityEntities,
    });
  } catch (err) {
    console.error("Fetch Submission Detail Error:", err);
    res.status(500).json({ message: "Failed to retrieve submission details." });
  }
});

// @route   PATCH /api/contributions/:id/review
// @desc    Execute Safe Approval / Rejection / Changes-Requested Workflow
// @access  Admin Only
router.patch("/:id/review", verifyToken, requireAdmin, async (req, res) => {
  try {
    let action = req.body.action || req.body.decision || req.body.status;
    if (action === "approved") action = "approve";
    if (action === "rejected") action = "reject";
    const { approvedFields = [], reviewerComments = "" } = req.body;

    if (!["approve", "reject", "changes_requested"].includes(action)) {
      return res.status(400).json({
        message: "Invalid action. Must be 'approve', 'reject', or 'changes_requested'.",
      });
    }

    const submission = await ContributionSubmission.findById(req.params.id);
    if (!submission) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Prevent duplicate approvals
    if (submission.status === "approved" && action === "approve") {
      return res.status(400).json({
        message: "This contribution submission has already been approved and applied.",
      });
    }

    const adminUser = req.user;
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";

    let appliedPlace = null;
    const beforeSnapshot = {};
    const afterSnapshot = {};

    if (action === "approve") {
      let fieldsToApprove = approvedFields;
      if (!Array.isArray(fieldsToApprove) || fieldsToApprove.length === 0) {
        fieldsToApprove = Object.keys({ ...(submission.submittedValues || {}), ...(submission.proposedValues || {}) });
      }
      if (fieldsToApprove.length === 0) {
        return res.status(400).json({
          message: "Please select at least one proposed field to approve.",
        });
      }

      // Filter proposed values to only the approved fields
      const patchData = {};
      const rejectedList = [];
      const sourceValues = { ...(submission.submittedValues || {}), ...(submission.proposedValues || {}) };

      for (const [key, val] of Object.entries(sourceValues)) {
        if (fieldsToApprove.includes(key)) {
          patchData[key] = val;
        } else {
          rejectedList.push(key);
        }
      }

      if (submission.submissionType === "correction") {
        // Find existing record
        const entityId = submission.targetEntityId;
        if (!entityId) {
          return res.status(400).json({ message: "No target entity ID associated with this correction." });
        }

        const queryOr = [
          { id: entityId },
          { slug: entityId },
        ];
        if (typeof entityId === "string" && entityId.match(/^[0-9a-fA-F]{24}$/)) {
          queryOr.push({ _id: entityId });
        }
        if (submission.targetEntityName) {
          queryOr.push({ name: submission.targetEntityName });
        }

        const existingPlace = await Place.findOne({ $or: queryOr });

        if (!existingPlace) {
          return res.status(404).json({ message: "Target entity record not found in database." });
        }

        // Record before snapshot for audit trail
        for (const k of Object.keys(patchData)) {
          beforeSnapshot[k] = existingPlace[k] ?? null;
        }

        // Apply only approved fields to existingPlace
        for (const [k, v] of Object.entries(patchData)) {
          // Do not overwrite existing valid coordinates with null, empty, or NaN
          if (
            (k === "latitude" || k === "longitude") &&
            (v === null || v === undefined || v === "" || isNaN(Number(v)))
          ) {
            continue;
          }
          existingPlace[k] = v;
          afterSnapshot[k] = v;
        }

        // If existing place coordinates are missing, try extracting from approved googleMapsUrl
        if ((existingPlace.latitude == null || existingPlace.longitude == null) && existingPlace.googleMapsUrl) {
          const extracted = extractCoordinatesFromMapsUrl(existingPlace.googleMapsUrl);
          if (extracted) {
            existingPlace.latitude = extracted.lat;
            existingPlace.longitude = extracted.lng;
            afterSnapshot.latitude = extracted.lat;
            afterSnapshot.longitude = extracted.lng;
          }
        }

        // Synchronize Google Maps search URL & distance if valid coordinates exist
        const curLat = Number(existingPlace.latitude);
        const curLng = Number(existingPlace.longitude);
        if (!isNaN(curLat) && !isNaN(curLng) && curLat >= -90 && curLat <= 90 && curLng >= -180 && curLng <= 180) {
          existingPlace.mapsUrl = buildGoogleMapsCoordinateUrl(curLat, curLng);
          existingPlace.googleMapsUrl = existingPlace.googleMapsUrl || existingPlace.mapsUrl;
          existingPlace.calculatedDistanceKm = calculateHaversineDistanceKm(curLat, curLng, 26.6804068, 84.046655);
          afterSnapshot.mapsUrl = existingPlace.mapsUrl;
          afterSnapshot.googleMapsUrl = existingPlace.googleMapsUrl;
          afterSnapshot.calculatedDistanceKm = existingPlace.calculatedDistanceKm;
        } else if (patchData.googleMapsUrl) {
          existingPlace.mapsUrl = patchData.googleMapsUrl;
          existingPlace.googleMapsUrl = patchData.googleMapsUrl;
          afterSnapshot.mapsUrl = existingPlace.mapsUrl;
          afterSnapshot.googleMapsUrl = existingPlace.googleMapsUrl;
        }

        existingPlace.isPublished = true;
        existingPlace.isArchived = false;
        existingPlace.verificationStatus = "verified";
        existingPlace.townBoundaryStatus = "confirmed";
        existingPlace.lastVerifiedAt = new Date();
        existingPlace.reviewNotes = `Approved contribution: ${submission.referenceId} by admin ${adminUser.email}`;

        await existingPlace.save();
        appliedPlace = existingPlace;

        // Keep local JSON files in sync if matching canonical place
        syncJsonPlaces((list) => {
          const targetId = existingPlace.id || String(existingPlace._id);
          const idx = list.findIndex(
            (p) =>
              String(p.id) === String(targetId) ||
              String(p._id) === String(targetId) ||
              p.slug === existingPlace.slug ||
              p.name === existingPlace.name
          );
          if (idx >= 0) {
            list[idx] = {
              ...list[idx],
              ...existingPlace.toObject(),
            };
          }
          return list;
        });
      } else {
        // Create brand new entity record from approved proposal
        let lat = parseFloat(patchData.latitude);
        let lng = parseFloat(patchData.longitude);
        let validCoords = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

        // If coordinates were not in patchData, try extracting from googleMapsUrl
        if (!validCoords && (patchData.googleMapsUrl || submission.googleMapsUrl)) {
          const urlToParse = patchData.googleMapsUrl || submission.googleMapsUrl;
          const extracted = extractCoordinatesFromMapsUrl(urlToParse);
          if (extracted) {
            lat = extracted.lat;
            lng = extracted.lng;
            validCoords = true;
          }
        }

        const newDoc = {
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          name: patchData.name || submission.targetEntityName || "New Contributed Place",
          hindiName: patchData.hindiName || "",
          category: patchData.category || submission.entityType || "general",
          entityType: patchData.entityType || (submission.targetModule === "map" ? (submission.entityType || "village") : "place"),
          subcategory: patchData.subcategory || "",
          locality: patchData.locality || "Fazilnagar",
          district: patchData.district || "Kushinagar",
          state: patchData.state || "Uttar Pradesh",
          country: "India",
          addressFull: patchData.addressFull || "",
          streetOrLandmark: patchData.streetOrLandmark || "",
          phone: patchData.phone || "",
          alternatePhone: patchData.alternatePhone || "",
          whatsapp: patchData.whatsapp || "",
          website: patchData.website || "",
          openingHours: patchData.openingHours || "",
          services: patchData.services ? (Array.isArray(patchData.services) ? patchData.services : [patchData.services]) : [],
          description: patchData.description || "",
          imageUrl: patchData.imageUrl || (submission.attachments?.[0] || ""),
          galleryUrls: submission.attachments || [],
          latitude: validCoords ? lat : null,
          longitude: validCoords ? lng : null,
          calculatedDistanceKm: validCoords ? calculateHaversineDistanceKm(lat, lng, 26.6804068, 84.046655) : null,
          mapsUrl: validCoords ? buildGoogleMapsCoordinateUrl(lat, lng) : (patchData.googleMapsUrl || ""),
          googleMapsUrl: patchData.googleMapsUrl || (validCoords ? buildGoogleMapsCoordinateUrl(lat, lng) : ""),
          verificationStatus: "verified",
          townBoundaryStatus: "confirmed",
          isPublished: true,
          isArchived: false,
          submissionSource: "community",
          reviewNotes: `Created via public contribution ${submission.referenceId} approved by ${adminUser.email}`,
        };

        appliedPlace = await Place.create(newDoc);
        Object.assign(afterSnapshot, newDoc);

        // Keep local JSON files in sync if matching
        syncJsonPlaces((list) => {
          const idx = list.findIndex(
            (p) =>
              String(p.id) === String(appliedPlace.id) ||
              String(p._id) === String(appliedPlace._id) ||
              p.slug === appliedPlace.slug
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...appliedPlace.toObject() };
          }
          return list;
        });
      }

      // Invalidate relevant in-memory caches so map and directory display updated data immediately
      invalidatePlacesCache();

      // Broadcast realtime update event to all connected sessions
      emitPlacesUpdated({
        placeId: appliedPlace._id,
        place: appliedPlace,
        action: submission.submissionType === "correction" ? "updated" : "created",
        submissionId: submission._id,
      });

      submission.status = "approved";
      submission.approvedFields = approvedFields;
      submission.rejectedFields = rejectedList;
      submission.reviewedBy = adminUser.id;
      submission.reviewedAt = new Date();
      submission.reviewerComments = reviewerComments.trim();
      submission.appliedPlaceId = appliedPlace._id;

      submission.auditTrail.push({
        action: "APPROVED",
        actor: adminUser.email || "Admin",
        timestamp: new Date(),
        details: `Approved fields: [${approvedFields.join(", ")}]. Applied to place: ${appliedPlace.name} (${appliedPlace.id || appliedPlace._id}).`,
      });

      // Write to persistent audit log
      await AuditLog.create({
        adminUser: adminUser.id,
        adminEmail: adminUser.email,
        action: submission.submissionType === "correction" ? "UPDATE" : "CREATE",
        entityType: "Place",
        entityId: appliedPlace.id || String(appliedPlace._id),
        entityTitle: appliedPlace.name,
        changesSummary: `Approved public contribution ${submission.referenceId}. Fields updated: ${approvedFields.join(", ")}.`,
        ipAddress: clientIp,
      });
    } else if (action === "reject") {
      submission.status = "rejected";
      submission.reviewedBy = adminUser.id;
      submission.reviewedAt = new Date();
      submission.reviewerComments = reviewerComments.trim() || "Rejected: Does not meet verification guidelines.";

      submission.auditTrail.push({
        action: "REJECTED",
        actor: adminUser.email || "Admin",
        timestamp: new Date(),
        details: `Submission rejected: ${submission.reviewerComments}`,
      });

      await AuditLog.create({
        adminUser: adminUser.id,
        adminEmail: adminUser.email,
        action: "SETTINGS_UPDATE",
        entityType: "Submission",
        entityId: String(submission._id),
        entityTitle: submission.referenceId,
        changesSummary: `Rejected contribution ${submission.referenceId}. Reason: ${submission.reviewerComments}`,
        ipAddress: clientIp,
      });
    } else if (action === "changes_requested") {
      submission.status = "changes_requested";
      submission.reviewedBy = adminUser.id;
      submission.reviewedAt = new Date();
      submission.reviewerComments = reviewerComments.trim();

      submission.auditTrail.push({
        action: "CHANGES_REQUESTED",
        actor: adminUser.email || "Admin",
        timestamp: new Date(),
        details: `Admin requested changes: ${reviewerComments}`,
      });
    }

    await submission.save();

    res.status(200).json({
      success: true,
      message: `Submission marked as ${submission.status}.`,
      submission,
      place: appliedPlace,
      appliedPlace,
    });
  } catch (err) {
    console.error("Review Contribution Error:", err);
    res.status(500).json({ message: err.message || "Failed to execute review action." });
  }
});

export default router;
