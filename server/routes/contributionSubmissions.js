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
} from "../utils/googleMapsValidator.js";
import { emitPlacesUpdated } from "../socket.js";
import { uploadMediaToDrive } from "./googleDrive.js";
import { writeLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

      const backendBase = (process.env.BACKEND_URL || "https://fazilnagar-portal.onrender.com").replace(/\/+$/, "");
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

    // Load current live record if correction or applied
    let liveEntity = null;
    let isStale = false;
    let changedFields = [];

    const entityLookupId = submission.targetEntityId || submission.appliedPlaceId?._id;
    if (entityLookupId) {
      liveEntity = await Place.findOne({
        $or: [
          { id: entityLookupId },
          { _id: entityLookupId.match(/^[0-9a-fA-F]{24}$/) ? entityLookupId : null },
        ],
      }).lean();
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
          existingPlace[k] = v;
          afterSnapshot[k] = v;
        }

        // Synchronize Google Maps search URL & distance if coordinates updated
        if (patchData.latitude !== undefined || patchData.longitude !== undefined) {
          const newLat = Number(existingPlace.latitude);
          const newLng = Number(existingPlace.longitude);
          if (!isNaN(newLat) && !isNaN(newLng) && newLat >= -90 && newLat <= 90 && newLng >= -180 && newLng <= 180) {
            existingPlace.mapsUrl = buildGoogleMapsCoordinateUrl(newLat, newLng);
            existingPlace.googleMapsUrl = existingPlace.mapsUrl;
            existingPlace.calculatedDistanceKm = calculateHaversineDistanceKm(newLat, newLng, 26.6804068, 84.046655);
            afterSnapshot.mapsUrl = existingPlace.mapsUrl;
            afterSnapshot.googleMapsUrl = existingPlace.googleMapsUrl;
            afterSnapshot.calculatedDistanceKm = existingPlace.calculatedDistanceKm;
          }
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
        const lat = parseFloat(patchData.latitude);
        const lng = parseFloat(patchData.longitude);
        const validCoords = !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

        const newDoc = {
          id: `p-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          name: patchData.name || submission.targetEntityName || "New Contributed Place",
          hindiName: patchData.hindiName || "",
          category: patchData.category || submission.entityType || "general",
          entityType: patchData.entityType || (submission.targetModule === "map" ? "village" : "place"),
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
