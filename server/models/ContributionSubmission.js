import mongoose from "mongoose";

const duplicateWarningSchema = new mongoose.Schema(
  {
    entityId: { type: String, default: "" },
    name: { type: String, default: "" },
    category: { type: String, default: "" },
    proximityKm: { type: Number, default: null },
    similarity: { type: String, default: "" },
  },
  { _id: false }
);

const auditTrailSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actor: { type: String, default: "System" },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: "" },
  },
  { _id: false }
);

const contributionSubmissionSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      unique: true,
      required: true,
      index: true,
      default: () => `FZ-CONTRIB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    },
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ContributionForm",
      required: true,
      index: true,
    },
    formSlug: {
      type: String,
      required: true,
      index: true,
    },
    targetModule: {
      type: String,
      enum: ["map", "directory"],
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    submissionType: {
      type: String,
      enum: ["correction", "new_entity"],
      required: true,
      index: true,
    },
    targetEntityId: {
      type: String,
      default: null,
      index: true,
    },
    targetEntityName: {
      type: String,
      default: "",
    },
    proposedValues: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    originalValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    googleMapsUrl: {
      type: String,
      default: "",
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
      index: true,
    },
    longitude: {
      type: Number,
      default: null,
      index: true,
    },
    locationComparison: {
      submittedLat: { type: Number, default: null },
      submittedLng: { type: Number, default: null },
      urlLat: { type: Number, default: null },
      urlLng: { type: Number, default: null },
      distanceKm: { type: Number, default: null },
      status: {
        type: String,
        enum: [
          "none",
          "consistent",
          "mismatch",
          "shortened_requires_admin_pin_check",
          "invalid_url",
          "invalid_coords",
        ],
        default: "none",
      },
      warningMessage: { type: String, default: "" },
    },
    evidenceNotes: {
      type: String,
      default: "",
      trim: true,
    },
    evidenceUrls: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [String],
      default: [],
    },
    submitterInfo: {
      name: { type: String, default: "Anonymous Contributor" },
      contact: { type: String, default: "" },
      ipAddress: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "changes_requested"],
      default: "pending",
      index: true,
    },
    approvedFields: {
      type: [String],
      default: [],
    },
    rejectedFields: {
      type: [String],
      default: [],
    },
    reviewerComments: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    appliedPlaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      default: null,
    },
    duplicateWarnings: [duplicateWarningSchema],
    auditTrail: [auditTrailSchema],
  },
  {
    timestamps: true,
  }
);

contributionSubmissionSchema.index({ targetModule: 1, status: 1 });
contributionSubmissionSchema.index({ formId: 1, status: 1 });
contributionSubmissionSchema.index({ createdAt: -1 });

const ContributionSubmission = mongoose.model("ContributionSubmission", contributionSubmissionSchema);
export default ContributionSubmission;
