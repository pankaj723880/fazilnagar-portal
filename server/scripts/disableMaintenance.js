import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import connectDB from "../config/db.js";
import SiteSettings from "../models/SiteSettings.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";

async function run() {
  console.log("[Emergency Recovery] Connecting to database...");
  await connectDB();

  const settings = await SiteSettings.findOne({ key: "primary_settings" });
  if (!settings) {
    console.error("[Emergency Recovery] Error: primary_settings document not found in DB.");
    process.exit(1);
  }

  const prevStatus = settings.maintenance?.enabled;
  settings.maintenance = {
    ...(settings.maintenance?.toObject ? settings.maintenance.toObject() : settings.maintenance || {}),
    enabled: false,
    scheduledStartTime: null,
    scheduledEndTime: null,
    lastUpdatedBy: "EMERGENCY_CLI_RECOVERY",
    lastUpdatedAt: new Date(),
  };
  settings.markModified("maintenance");
  await settings.save();

  try {
    const adminUser = await User.findOne({ role: "admin" }).select("_id email");
    if (adminUser) {
      await AuditLog.create({
        adminUser: adminUser._id,
        adminEmail: adminUser.email || "cli-recovery@fazilnagar.in",
        action: "SETTINGS_UPDATE",
        entityType: "SiteSettings",
        entityId: String(settings._id),
        entityTitle: "Maintenance Mode",
        changesSummary: `EMERGENCY CLI RECOVERY: Disabled maintenance mode (previous enabled status: ${prevStatus})`,
        ipAddress: "127.0.0.1",
      });
    }
  } catch (e) {
    console.warn("[Emergency Recovery] Failed to record audit log:", e.message);
  }

  console.log("[Emergency Recovery] SUCCESS: Maintenance mode has been disabled. Portal is now LIVE.");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("[Emergency Recovery] Unexpected error:", err);
  process.exit(1);
});
