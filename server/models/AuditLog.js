import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    adminUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminEmail: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "UPDATE", "DELETE", "PUBLISH", "UNPUBLISH", "ARCHIVE", "RESTORE", "SETTINGS_UPDATE"],
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        "Place",
        "News",
        "PublicService",
        "Event",
        "HeritageSite",
        "SiteSettings",
        "Advertisement",
        "Submission",
        "MediaItem",
        "CivicDirectoryItem",
        "User",
      ],
    },
    entityId: {
      type: String,
      default: "",
    },
    entityTitle: {
      type: String,
      default: "",
    },
    changesSummary: {
      type: String,
      default: "",
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;

export async function logAdminAction({
  adminUser,
  adminEmail,
  action,
  entityType,
  entityId,
  entityTitle,
  changesSummary,
  ipAddress,
}) {
  try {
    await AuditLog.create({
      adminUser,
      adminEmail: adminEmail || "",
      action,
      entityType,
      entityId: entityId ? String(entityId) : "",
      entityTitle: entityTitle || "",
      changesSummary: changesSummary || "",
      ipAddress: ipAddress || "",
    });
  } catch (err) {
    console.warn("[AuditLog] Failed to record audit log:", err.message);
  }
}
