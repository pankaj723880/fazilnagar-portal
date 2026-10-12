import mongoose from "mongoose";

const googleDriveTokenSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default_drive_account",
    },
    tokens: {
      access_token: { type: String, default: null },
      refresh_token: { type: String, default: null },
      scope: { type: String, default: null },
      token_type: { type: String, default: null },
      expiry_date: { type: Number, default: null },
    },
    accountEmail: {
      type: String,
      default: null,
    },
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    connectedAt: {
      type: Date,
      default: null,
    },
    lastRefreshedAt: {
      type: Date,
      default: null,
    },
    isConfigured: {
      type: Boolean,
      default: false,
    },
    folderId: {
      type: String,
      default: null,
    },
    folderName: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("GoogleDriveToken", googleDriveTokenSchema);
