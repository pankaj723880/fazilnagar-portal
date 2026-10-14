import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleHindi: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Religious Festival",
        "Aarti & Puja",
        "Mela & Fair",
        "Jagran & Kirtan",
        "Civic & Cultural",
        "Public Notice",
        "Sports & Youth",
        "Other Community Event",
      ],
      default: "Religious Festival",
      index: true,
    },
    summary: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: "Fazilnagar, Kushinagar, UP - 274401",
    },
    latitude: {
      type: Number,
      default: 26.6827,
    },
    longitude: {
      type: Number,
      default: 84.0498,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      default: null,
    },
    timeString: {
      type: String,
      default: "Morning / Evening",
    },
    organizer: {
      type: String,
      default: "Town Organizing Committee",
    },
    organizerContact: {
      type: String,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    galleryImages: {
      type: [String],
      default: [],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "cancelled"],
      default: "published",
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

eventSchema.index({ isPublished: 1, startDate: 1 });

const Event = mongoose.model("Event", eventSchema);
export default Event;
