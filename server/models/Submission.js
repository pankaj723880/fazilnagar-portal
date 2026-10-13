import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      unique: true,
      index: true,
      default: () => `FZ-SUB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    },
    type: {
      type: String,
      enum: ["business", "community_place", "correction", "event"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    addressFull: {
      type: String,
      default: "",
      trim: true,
    },
    locality: {
      type: String,
      default: "Town Center",
      trim: true,
      index: true,
    },
    streetOrLandmark: {
      type: String,
      default: "",
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    primaryImage: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    ownerName: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },
    alternatePhone: {
      type: String,
      default: "",
      trim: true,
    },
    whatsapp: {
      type: String,
      default: "",
      trim: true,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    openingHours: {
      type: String,
      default: "",
      trim: true,
    },
    services: {
      type: [String],
      default: [],
    },
    consentConfirmed: {
      type: Boolean,
      default: false,
    },
    // Event / correction legacy compatibility fields
    landmark: {
      type: String,
      default: "",
      trim: true,
    },
    venue: {
      type: String,
      default: "",
      trim: true,
    },
    eventDate: {
      type: String,
      default: "",
      trim: true,
    },
    organizer: {
      type: String,
      default: "",
      trim: true,
    },
    details: {
      type: String,
      default: "",
      trim: true,
    },
    submittedBy: {
      name: { type: String, default: "Local Resident" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      ipAddress: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "archived"],
      default: "pending",
      index: true,
    },
    townBoundaryStatus: {
      type: String,
      enum: ["confirmed", "unverified", "outside"],
      default: "unverified",
      index: true,
    },
    duplicateWarning: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    adminNotes: {
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
    placeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Place",
      default: null,
    },
  },
  { timestamps: true }
);

const Submission = mongoose.model("Submission", submissionSchema);
export default Submission;
