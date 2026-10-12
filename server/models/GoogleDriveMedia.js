import mongoose from "mongoose";

const googleDriveMediaSchema = new mongoose.Schema(
  {
    driveFileId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    owner: {
      type: String,
      required: true,
      trim: true,
    },
    folderId: {
      type: String,
      default: null,
    },
    deliveryUrl: {
      type: String,
      default: "",
    },
    isTest: {
      type: Boolean,
      default: false,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("GoogleDriveMedia", googleDriveMediaSchema);
