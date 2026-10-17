import mongoose from "mongoose";

const placeSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
      index: true,
    },
    alternateNames: {
      type: [String],
      default: [],
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subcategory: {
      type: String,
      trim: true,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    addressFull: {
      type: String,
      required: true,
      trim: true,
    },
    locality: {
      type: String,
      default: "Fazilnagar Town",
      trim: true,
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
    mapsUrl: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    openingHours: {
      type: String,
      default: "",
    },
    services: {
      type: [String],
      default: [],
    },
    imageUrl: {
      type: String,
      default: "",
    },
    sourceUrls: {
      type: [String],
      default: [],
    },
    lastVerifiedAt: {
      type: Date,
      default: Date.now,
    },
    verificationStatus: {
      type: String,
      enum: [
        "verified",
        "needs_address_verification",
        "needs_boundary_verification",
        "discovered",
        "rejected",
        "temporarily_closed",
        "permanently_closed",
      ],
      default: "discovered",
      index: true,
    },
    townBoundaryStatus: {
      type: String,
      enum: ["confirmed", "unverified", "outside"],
      default: "unverified",
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    archiveReason: {
      type: String,
      default: "",
    },
    archivedAt: {
      type: Date,
      default: null,
    },
    submissionSource: {
      type: String,
      enum: ["official", "community"],
      default: "official",
      index: true,
    },
    ownerName: {
      type: String,
      default: "",
    },
    alternatePhone: {
      type: String,
      default: "",
    },
    whatsapp: {
      type: String,
      default: "",
    },
    galleryUrls: {
      type: [String],
      default: [],
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Submission",
      default: null,
    },
    reviewNotes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// High performance compound indexes for public directory searches and filters
placeSchema.index({ isPublished: 1, isArchived: 1, townBoundaryStatus: 1 });
placeSchema.index({ category: 1, isPublished: 1, isArchived: 1 });

// Helper method or pre-save hook for slug
placeSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  next();
});

const Place = mongoose.model("Place", placeSchema);
export default Place;
