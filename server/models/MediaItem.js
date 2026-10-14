import mongoose from "mongoose";

const mediaItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Uploaded Image",
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      default: "",
    },
    mimeType: {
      type: String,
      default: "image/jpeg",
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
    },
    driveFileId: {
      type: String,
      default: null,
    },
    storageProvider: {
      type: String,
      enum: ["google_drive", "local_storage", "external"],
      default: "google_drive",
    },
    altText: {
      type: String,
      default: "",
      trim: true,
    },
    caption: {
      type: String,
      default: "",
      trim: true,
    },
    tags: {
      type: [String],
      default: ["general"],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

mediaItemSchema.index({ createdAt: -1 });

const MediaItem = mongoose.model("MediaItem", mediaItemSchema);
export default MediaItem;
