import mongoose from "mongoose";

const advertisementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 300,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    destinationUrl: {
      type: String,
      default: "",
      trim: true,
    },
    ctaText: {
      type: String,
      default: "Learn More",
      trim: true,
      maxlength: 30,
    },
    format: {
      type: String,
      enum: ["floating", "banner", "sticky-bottom", "sticky-top"],
      default: "floating",
      index: true,
    },
    placement: {
      type: String,
      enum: ["bottom-right", "bottom-left"],
      default: "bottom-right",
    },
    frequency: {
      type: String,
      enum: ["once-per-session", "interval", "always", "permanent"],
      default: "always",
    },
    isPermanent: {
      type: Boolean,
      default: false,
      index: true,
    },
    redisplayIntervalMinutes: {
      type: Number,
      default: 60, // Minutes after which dismissed ad can reappear if frequency is 'interval'
      min: 1,
      max: 10080,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    impressions: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    dismissals: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Helper method to check if ad is currently active and within schedule
advertisementSchema.methods.isCurrentlyVisible = function () {
  if (!this.isActive || !this.isPublished) return false;
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  return true;
};

const Advertisement = mongoose.model("Advertisement", advertisementSchema);
export default Advertisement;
