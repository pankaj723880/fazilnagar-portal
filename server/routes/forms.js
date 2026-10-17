import express from "express";
import ContributionForm from "../models/ContributionForm.js";
import ContributionSubmission from "../models/ContributionSubmission.js";
import Place from "../models/Place.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import {
  VALID_MODULES,
  VALID_ENTITY_TYPES,
  ALLOWED_FIELDS_BY_MODULE,
  sanitizeAndValidateFormFields,
} from "../config/formFieldCatalog.js";
import {
  validateGoogleMapsUrl,
  compareLocationCoordinates,
  buildGoogleMapsCoordinateUrl,
} from "../utils/googleMapsValidator.js";
import { writeLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

/**
 * Generate a clean, URL-safe slug
 */
function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ==========================================
// 1. PUBLIC ENDPOINTS
// ==========================================

// @route   GET /api/forms/public/:slug
// @desc    Get published public form details and configured fields
// @access  Public
router.get("/public/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const form = await ContributionForm.findOne({ slug: slug.toLowerCase() }).lean();

    if (!form) {
      return res.status(404).json({ message: "Form not found or URL is incorrect." });
    }

    if (form.status === "draft") {
      return res.status(403).json({
        message: "This contribution form is currently in draft mode and not accepting public submissions.",
        status: "draft",
      });
    }

    if (form.status === "disabled" || form.status === "closed") {
      return res.status(410).json({
        message: "Submissions for this form are currently closed or disabled by the town administrator.",
        status: form.status,
      });
    }

    // If correction form with linked entity, load safe public context of that entity
    let targetEntity = null;
    if (form.targetEntityId) {
      const entity = await Place.findOne({
        $or: [{ id: form.targetEntityId }, { _id: form.targetEntityId.match(/^[0-9a-fA-F]{24}$/) ? form.targetEntityId : null }],
      }).lean();

      if (entity) {
        targetEntity = {
          id: entity.id || String(entity._id),
          name: entity.name,
          hindiName: entity.hindiName || "",
          category: entity.category,
          locality: entity.locality,
          addressFull: entity.addressFull || entity.streetOrLandmark || "",
          latitude: entity.latitude,
          longitude: entity.longitude,
          phone: entity.phone || "",
          mapsUrl: entity.mapsUrl || "",
        };
      }
    }

    // Public sanitized form view (never expose internal creator or administrative details)
    const publicForm = {
      title: form.title,
      slug: form.slug,
      description: form.description,
      instructions: form.instructions,
      targetModule: form.targetModule,
      entityType: form.entityType,
      purpose: form.purpose,
      targetEntity,
      fields: form.fields.sort((a, b) => a.order - b.order),
      attachmentsConfig: form.attachmentsConfig,
      status: form.status,
    };

    res.status(200).json(publicForm);
  } catch (err) {
    console.error("Fetch Public Form Error:", err);
    res.status(500).json({ message: "Failed to load public contribution form." });
  }
});

// @route   POST /api/forms/public/:slug/submit
// @desc    Public citizen submission for a contribution form
// @access  Public
router.post("/public/:slug/submit", writeLimiter, async (req, res) => {
  try {
    const { slug } = req.params;
    const form = await ContributionForm.findOne({ slug: slug.toLowerCase() });

    if (!form) {
      return res.status(404).json({ message: "Contribution form not found." });
    }

    if (form.status !== "published") {
      return res.status(403).json({
        message: "This contribution form is not currently open for submissions.",
      });
    }

    const {
      submissionType = form.purpose === "correction" ? "correction" : "new_entity",
      targetEntityId = null,
      evidenceNotes = "",
      evidenceUrls = [],
      attachments = [],
      submitterName = "",
      submitterContact = "",
    } = req.body;

    const submittedData = req.body.submittedData || req.body.proposedValues || {};

    // Validate submissionType against form purpose
    if (form.purpose === "correction" && submissionType !== "correction") {
      return res.status(400).json({ message: "This form only accepts corrections to existing records." });
    }
    if (form.purpose === "new_entity" && submissionType !== "new_entity") {
      return res.status(400).json({ message: "This form only accepts proposals for new entities." });
    }

    // Check target entity for corrections
    let originalValues = {};
    let resolvedEntity = null;
    const effectiveEntityId = form.targetEntityId || targetEntityId;

    if (submissionType === "correction") {
      if (!effectiveEntityId) {
        return res.status(400).json({ message: "Please specify the record you wish to propose a correction for." });
      }

      resolvedEntity = await Place.findOne({
        $or: [
          { id: effectiveEntityId },
          { _id: effectiveEntityId.match(/^[0-9a-fA-F]{24}$/) ? effectiveEntityId : null },
        ],
      }).lean();

      if (!resolvedEntity) {
        return res.status(404).json({ message: "Target entity record not found." });
      }

      // Snapshot original values of the configured fields
      form.fields.forEach((field) => {
        originalValues[field.name] = resolvedEntity[field.name] ?? null;
      });
    }

    // Validate submitted fields against form configuration
    const proposedValues = {};
    const validationErrors = {};

    for (const field of form.fields) {
      const val = submittedData[field.name];

      // Required check
      if (field.required) {
        if (val === undefined || val === null || String(val).trim() === "") {
          validationErrors[field.name] = `${field.label} is required.`;
          continue;
        }
      }

      if (val === undefined || val === null || String(val).trim() === "") {
        continue;
      }

      // Type-specific validations
      if (field.type === "latitude" || field.name === "latitude") {
        const num = parseFloat(val);
        if (isNaN(num) || num < -90 || num > 90) {
          validationErrors[field.name] = "Latitude must be a valid decimal coordinate between -90 and 90.";
        } else {
          proposedValues[field.name] = num;
        }
      } else if (field.type === "longitude" || field.name === "longitude") {
        const num = parseFloat(val);
        if (isNaN(num) || num < -180 || num > 180) {
          validationErrors[field.name] = "Longitude must be a valid decimal coordinate between -180 and 180.";
        } else {
          proposedValues[field.name] = num;
        }
      } else if (field.type === "number") {
        const num = parseFloat(val);
        if (isNaN(num)) {
          validationErrors[field.name] = `${field.label} must be a valid number.`;
        } else {
          proposedValues[field.name] = num;
        }
      } else if (field.name === "googleMapsUrl" || field.type === "googleMapsUrl") {
        const trimmedUrl = String(val).trim();
        const check = validateGoogleMapsUrl(trimmedUrl);
        if (!check.isValid) {
          validationErrors[field.name] = check.error || "Must be an authentic Google Maps location link.";
        } else {
          proposedValues[field.name] = trimmedUrl;
          if (!proposedValues.googleMapsUrl) {
            proposedValues.googleMapsUrl = trimmedUrl;
          }
        }
      } else if (field.type === "url") {
        const trimmedUrl = String(val).trim();
        if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
          validationErrors[field.name] = "URL must start with http:// or https://";
        } else {
          proposedValues[field.name] = trimmedUrl;
        }
      } else {
        proposedValues[field.name] = typeof val === "string" ? val.trim() : val;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: "Please correct the errors in the form.",
        errors: validationErrors,
      });
    }

    // Google Maps Location Verification Check
    let locationComparison = {
      submittedLat: null,
      submittedLng: null,
      urlLat: null,
      urlLng: null,
      distanceKm: null,
      status: "none",
      warningMessage: "",
    };

    const hasLat = proposedValues.latitude !== undefined;
    const hasLng = proposedValues.longitude !== undefined;
    const mapsLink =
      proposedValues.googleMapsUrl ||
      Object.entries(proposedValues).find(([k]) => {
        const fDef = form.fields.find((f) => f.name === k);
        return fDef?.type === "googleMapsUrl";
      })?.[1] ||
      "";

    if (mapsLink) {
      locationComparison = compareLocationCoordinates(
        hasLat ? proposedValues.latitude : null,
        hasLng ? proposedValues.longitude : null,
        mapsLink
      );
    } else if (hasLat || hasLng) {
      // Latitude or longitude provided without a Google Maps link
      return res.status(400).json({
        message: "A Google Maps location link is required whenever geographic coordinates are submitted.",
        errors: { googleMapsUrl: "Google Maps URL is required for location submissions." },
      });
    }

    // Check potential duplicates for new entity proposals
    const duplicateWarnings = [];
    if (submissionType === "new_entity" && proposedValues.name) {
      const cleanName = proposedValues.name.trim();
      const regexName = new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

      const existingMatches = await Place.find({
        $or: [
          { name: regexName },
          { hindiName: proposedValues.hindiName || "" },
        ],
        isArchived: { $ne: true },
      }).lean();

      existingMatches.forEach((em) => {
        duplicateWarnings.push({
          entityId: em.id || String(em._id),
          name: em.name,
          category: em.category,
          proximityKm: null,
          similarity: "Identical or matching name in directory/map records",
        });
      });
    }

    // Clean IP address
    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "";

    // Detect likely duplicate submissions within 10 minutes from same IP or contact
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentDuplicate = await ContributionSubmission.findOne({
      formSlug: form.slug,
      createdAt: { $gte: tenMinutesAgo },
      $or: [
        { "submitterInfo.ipAddress": clientIp },
        ...(submitterContact ? [{ "submitterInfo.contact": String(submitterContact).trim() }] : []),
      ],
      "proposedValues.name": proposedValues.name || { $exists: false },
      status: "pending",
    }).lean();

    if (recentDuplicate && proposedValues.name && recentDuplicate.proposedValues?.name === proposedValues.name) {
      duplicateWarnings.push({
        entityId: recentDuplicate._id.toString(),
        name: proposedValues.name,
        category: form.entityType,
        proximityKm: null,
        similarity: "Recent duplicate submission detected from this device/contact within the last 10 minutes",
      });
    }

    // Create pending submission record (never updates live Place directly!)
    const submission = new ContributionSubmission({
      formId: form._id,
      formSlug: form.slug,
      targetModule: form.targetModule,
      entityType: form.entityType,
      submissionType,
      targetEntityId: effectiveEntityId || null,
      targetEntityName: resolvedEntity?.name || form.targetEntityName || proposedValues.name || "",
      proposedValues,
      originalValues,
      googleMapsUrl: mapsLink,
      locationComparison,
      evidenceNotes: String(evidenceNotes || "").trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls : [],
      attachments: Array.isArray(attachments) ? attachments : [],
      submitterInfo: {
        name: String(submitterName || "Anonymous Resident").trim(),
        contact: String(submitterContact || "").trim(),
        ipAddress: clientIp,
      },
      status: "pending",
      duplicateWarnings,
      auditTrail: [
        {
          action: "SUBMITTED",
          actor: "Public Contributor",
          timestamp: new Date(),
          details: `Public proposal submitted via form "${form.title}" (${form.slug}).`,
        },
      ],
    });

    await submission.save();

    // Increment submission count on form
    await ContributionForm.findByIdAndUpdate(form._id, { $inc: { submissionCount: 1 } });

    res.status(201).json({
      message: "Thank you! Your submission has been received and is pending administrator verification.",
      referenceId: submission.referenceId,
      status: "pending",
    });
  } catch (err) {
    console.error("Public Form Submission Error:", err);
    res.status(500).json({ message: err.message || "Failed to process contribution." });
  }
});

// ==========================================
// 2. ADMIN ENDPOINTS (PROTECTED)
// ==========================================

// @route   GET /api/forms/catalog
// @desc    Get allowed modules, entity types, and schema fields
// @access  Admin Only
router.get("/catalog", verifyToken, requireAdmin, (req, res) => {
  res.status(200).json({
    modules: VALID_MODULES,
    entityTypes: VALID_ENTITY_TYPES,
    allowedFields: ALLOWED_FIELDS_BY_MODULE,
  });
});

// @route   GET /api/forms/entities/:module
// @desc    Get existing places for a module to link as correction target
// @access  Admin Only
router.get("/entities/:module", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { module } = req.params;
    const { search = "", entityType = "" } = req.query;

    const query = { isArchived: { $ne: true } };

    if (module === "map") {
      query.entityType = { $in: ["village", "locality", "town", "city", "landmark", "hub", "place"] };
    } else if (module === "directory") {
      if (entityType && entityType !== "all") {
        query.category = entityType;
      }
    }

    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: "i" } },
        { hindiName: { $regex: search.trim(), $options: "i" } },
        { id: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const items = await Place.find(query)
      .select("id name hindiName category entityType locality latitude longitude mapsUrl")
      .sort({ name: 1 })
      .limit(100)
      .lean();

    const mapped = items.map((i) => ({
      id: i.id || String(i._id),
      _id: String(i._id),
      name: i.name,
      hindiName: i.hindiName || "",
      category: i.category,
      entityType: i.entityType || i.category,
      locality: i.locality || "",
      latitude: i.latitude,
      longitude: i.longitude,
      mapsUrl: i.mapsUrl || "",
    }));

    res.status(200).json(mapped);
  } catch (err) {
    console.error("Fetch Entities Error:", err);
    res.status(500).json({ message: "Failed to fetch entity list." });
  }
});

// @route   GET /api/forms
// @desc    Admin list of all contribution forms
// @access  Admin Only
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const forms = await ContributionForm.find()
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 })
      .lean();

    // Attach current pending count for each form
    const formIds = forms.map((f) => f._id);
    const pendingCounts = await ContributionSubmission.aggregate([
      { $match: { formId: { $in: formIds }, status: "pending" } },
      { $group: { _id: "$formId", count: { $sum: 1 } } },
    ]);

    const pendingMap = new Map();
    pendingCounts.forEach((pc) => pendingMap.set(String(pc._id), pc.count));

    const enriched = forms.map((f) => ({
      ...f,
      pendingCount: pendingMap.get(String(f._id)) || 0,
    }));

    res.status(200).json(enriched);
  } catch (err) {
    console.error("Fetch Forms Error:", err);
    res.status(500).json({ message: "Failed to fetch contribution forms." });
  }
});

// @route   POST /api/forms
// @desc    Create a new dynamic contribution form
// @access  Admin Only
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      slug: customSlug,
      description = "",
      instructions = "",
      targetModule,
      entityType,
      purpose = "both",
      targetEntityId = null,
      targetEntityName = "",
      fields = [],
      attachmentsConfig = {},
      status = "published",
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Form title is required." });
    }

    if (!targetModule || !VALID_MODULES.includes(targetModule)) {
      return res.status(400).json({
        message: `targetModule must be one of: ${VALID_MODULES.join(", ")}`,
      });
    }

    if (!entityType || !entityType.trim()) {
      return res.status(400).json({ message: "Entity type or category is required." });
    }

    // Slug generation and uniqueness
    let baseSlug = slugify(customSlug || title);
    if (!baseSlug) baseSlug = `form-${Date.now()}`;

    let finalSlug = baseSlug;
    let counter = 1;
    while (await ContributionForm.findOne({ slug: finalSlug })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    // Validate fields against schema whitelist
    const sanitizedFields = sanitizeAndValidateFormFields(targetModule, fields);

    const form = new ContributionForm({
      title: title.trim(),
      slug: finalSlug,
      description: description.trim(),
      instructions: instructions.trim(),
      targetModule,
      entityType: entityType.trim(),
      purpose,
      targetEntityId: targetEntityId || null,
      targetEntityName: targetEntityName ? targetEntityName.trim() : "",
      fields: sanitizedFields,
      attachmentsConfig: {
        enabled: Boolean(attachmentsConfig?.enabled),
        maxFiles: Math.min(Math.max(1, attachmentsConfig?.maxFiles || 3), 10),
        maxSizeMb: Math.min(Math.max(1, attachmentsConfig?.maxSizeMb || 5), 15),
        allowedTypes: Array.isArray(attachmentsConfig?.allowedTypes)
          ? attachmentsConfig.allowedTypes
          : ["image/jpeg", "image/png", "image/webp"],
      },
      status: ["draft", "published", "disabled", "closed"].includes(status) ? status : "published",
      createdBy: req.user.id,
    });

    await form.save();

    res.status(201).json({
      message: "Contribution form created successfully.",
      form,
    });
  } catch (err) {
    console.error("Create Form Error:", err);
    res.status(400).json({ message: err.message || "Failed to create contribution form." });
  }
});

// @route   GET /api/forms/:id
// @desc    Get form details for editing
// @access  Admin Only
router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const form = await ContributionForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }
    res.status(200).json(form);
  } catch (err) {
    res.status(500).json({ message: "Failed to retrieve form." });
  }
});

// @route   PUT /api/forms/:id
// @desc    Update existing contribution form
// @access  Admin Only
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const form = await ContributionForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    const {
      title,
      description,
      instructions,
      entityType,
      purpose,
      targetEntityId,
      targetEntityName,
      fields,
      attachmentsConfig,
      status,
    } = req.body;

    if (title && title.trim()) form.title = title.trim();
    if (description !== undefined) form.description = description.trim();
    if (instructions !== undefined) form.instructions = instructions.trim();
    if (entityType && entityType.trim()) form.entityType = entityType.trim();
    if (purpose) form.purpose = purpose;
    if (targetEntityId !== undefined) form.targetEntityId = targetEntityId || null;
    if (targetEntityName !== undefined) form.targetEntityName = targetEntityName.trim();
    if (status && ["draft", "published", "disabled", "closed"].includes(status)) {
      form.status = status;
    }

    if (Array.isArray(fields) && fields.length > 0) {
      form.fields = sanitizeAndValidateFormFields(form.targetModule, fields);
    }

    if (attachmentsConfig) {
      form.attachmentsConfig = {
        enabled: Boolean(attachmentsConfig.enabled),
        maxFiles: Math.min(Math.max(1, attachmentsConfig.maxFiles || 3), 10),
        maxSizeMb: Math.min(Math.max(1, attachmentsConfig.maxSizeMb || 5), 15),
        allowedTypes: Array.isArray(attachmentsConfig.allowedTypes)
          ? attachmentsConfig.allowedTypes
          : form.attachmentsConfig.allowedTypes,
      };
    }

    await form.save();

    res.status(200).json({
      message: "Form configuration updated successfully.",
      form,
    });
  } catch (err) {
    console.error("Update Form Error:", err);
    res.status(400).json({ message: err.message || "Failed to update form." });
  }
});

// @route   PATCH /api/forms/:id/status
// @desc    Toggle form status (publish, disable, reopen, close)
// @access  Admin Only
router.patch("/:id/status", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["draft", "published", "disabled", "closed"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const form = await ContributionForm.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    res.status(200).json({
      message: `Form status updated to ${status}.`,
      form,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to update form status." });
  }
});

// @route   DELETE /api/forms/:id
// @desc    Delete contribution form
// @access  Admin Only
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const form = await ContributionForm.findById(req.params.id);
    if (!form) {
      return res.status(404).json({ message: "Form not found." });
    }

    await ContributionForm.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Contribution form deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete form." });
  }
});

export default router;
