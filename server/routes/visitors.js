import express from "express";
import VisitorSession from "../models/VisitorSession.js";
import SiteSettings from "../models/SiteSettings.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { logAdminAction } from "../models/AuditLog.js";
import { invalidateServerSettingsCache } from "./settings.js";

const router = express.Router();

// Active visitor session window (45 seconds). Inactive sessions older than this are expired.
const VISITOR_TIMEOUT_MS = 45 * 1000;

// Shared in-memory active presence map for fast concurrent lookups: visitorId -> lastSeenTimestamp
const inMemoryActiveVisitors = new Map();

/**
 * Remove stale in-memory visitor presence entries.
 */
function pruneStaleMemoryVisitors() {
  const cutoff = Date.now() - VISITOR_TIMEOUT_MS;
  for (const [id, lastSeen] of inMemoryActiveVisitors.entries()) {
    if (lastSeen < cutoff) {
      inMemoryActiveVisitors.delete(id);
    }
  }
}

/**
 * Returns current real active visitor count across MongoDB shared storage and in-memory tracker.
 * Multi-tab presence is deduplicated by unique visitorId.
 */
export async function getRealActiveVisitorCount() {
  pruneStaleMemoryVisitors();
  try {
    const cutoffDate = new Date(Date.now() - VISITOR_TIMEOUT_MS);
    const dbActiveCount = await VisitorSession.countDocuments({ lastSeen: { $gt: cutoffDate } });
    return Math.max(inMemoryActiveVisitors.size, dbActiveCount);
  } catch (err) {
    return inMemoryActiveVisitors.size;
  }
}

/**
 * Deterministically computes shared public simulated visitor count based on admin configuration.
 * When randomVariance is true, uses a synchronized 30-second epoch window so ALL visitors see the
 * EXACT same simulated figure at any moment in time.
 * Enforces 0–1500 bounds strictly.
 */
export function calculateSimulatedCount(config = {}) {
  let base = Math.min(1500, Math.max(0, parseInt(config.simulatedCount, 10) || 0));
  if (!config.randomVariance) {
    return base;
  }

  let min = Math.min(1500, Math.max(0, parseInt(config.varianceMin, 10) || 0));
  let max = Math.min(1500, Math.max(0, parseInt(config.varianceMax, 10) || 1500));
  if (min > max) {
    const temp = min;
    min = max;
    max = temp;
  }
  if (min === max) return min;

  // Synchronized 30-second epoch ensures identical pseudo-random number for all visitors
  const timeSlice = Math.floor(Date.now() / 30000);
  const hash = Math.abs(Math.sin(timeSlice * 7919 + 1013)) * 10000 % 1;
  const count = Math.round(min + hash * (max - min));
  return Math.min(1500, Math.max(0, count));
}

/**
 * Retrieves the live visitor counter settings from MongoDB SiteSettings.
 */
async function getVisitorCounterConfig() {
  try {
    const settings = await SiteSettings.findOne({ key: "primary_settings" }).select("liveVisitorCounter").lean();
    return settings?.liveVisitorCounter || {
      mode: "real",
      simulatedCount: 120,
      randomVariance: false,
      varianceMin: 100,
      varianceMax: 150,
    };
  } catch (_) {
    return {
      mode: "real",
      simulatedCount: 120,
      randomVariance: false,
      varianceMin: 100,
      varianceMax: 150,
    };
  }
}

// @route   POST /api/visitors/heartbeat
// @desc    Record visitor presence and return current active count (Real or Simulated)
// @access  Public
router.post("/heartbeat", async (req, res) => {
  try {
    const rawVisitorId = req.body?.visitorId || req.headers["x-client-id"] || req.headers["x-anon-id"];
    if (!rawVisitorId || typeof rawVisitorId !== "string" || !rawVisitorId.trim()) {
      return res.status(400).json({ success: false, message: "Valid visitorId is required." });
    }

    const visitorId = rawVisitorId.trim().slice(0, 100);
    const now = Date.now();

    // 1. Record in-memory
    inMemoryActiveVisitors.set(visitorId, now);

    // 2. Persist in MongoDB shared storage (upsert with current timestamp)
    VisitorSession.updateOne(
      { visitorId },
      { $set: { lastSeen: new Date(now) } },
      { upsert: true }
    ).catch(() => {});

    // 3. Determine display count based on admin mode
    const config = await getVisitorCounterConfig();
    const realCount = await getRealActiveVisitorCount();
    const displayCount = config.mode === "simulated" ? calculateSimulatedCount(config) : realCount;

    res.status(200).json({
      success: true,
      count: displayCount,
      mode: config.mode,
      realCount,
    });
  } catch (err) {
    console.error("[Visitors] Heartbeat Error:", err);
    res.status(500).json({ success: false, message: "Failed to process visitor heartbeat." });
  }
});

// @route   GET /api/visitors/count
// @desc    Retrieve public active visitor count (Real or Simulated)
// @access  Public
router.get("/count", async (req, res) => {
  try {
    const config = await getVisitorCounterConfig();
    const realCount = await getRealActiveVisitorCount();
    const displayCount = config.mode === "simulated" ? calculateSimulatedCount(config) : realCount;

    res.status(200).json({
      success: true,
      count: displayCount,
      mode: config.mode,
    });
  } catch (err) {
    console.error("[Visitors] Count Fetch Error:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve visitor count." });
  }
});

// @route   POST /api/visitors/leave
// @desc    Optional client cleanup on tab close / beacon unload
// @access  Public
router.post("/leave", async (req, res) => {
  try {
    const rawVisitorId = req.body?.visitorId || req.headers["x-client-id"];
    if (rawVisitorId && typeof rawVisitorId === "string") {
      const visitorId = rawVisitorId.trim().slice(0, 100);
      inMemoryActiveVisitors.delete(visitorId);
      VisitorSession.deleteOne({ visitorId }).catch(() => {});
    }
    res.status(200).json({ success: true });
  } catch (_) {
    res.status(200).json({ success: true });
  }
});

// @route   GET /api/visitors/settings
// @desc    Get visitor counter configuration and actual analytics (Admin only)
// @access  Private (Admin)
router.get("/settings", verifyToken, requireAdmin, async (req, res) => {
  try {
    const config = await getVisitorCounterConfig();
    const realActiveCount = await getRealActiveVisitorCount();
    const currentDisplayCount = config.mode === "simulated" ? calculateSimulatedCount(config) : realActiveCount;

    res.status(200).json({
      success: true,
      settings: config,
      realActiveCount,
      currentDisplayCount,
    });
  } catch (err) {
    console.error("[Visitors] Get Settings Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch visitor counter settings." });
  }
});

// @route   PUT /api/visitors/settings
// @desc    Update visitor counter settings (Mode A: Real, Mode B: Simulated) (Admin only)
// @access  Private (Admin)
router.put("/settings", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { mode, simulatedCount, randomVariance, varianceMin, varianceMax } = req.body;

    // Strict validation
    if (mode !== undefined && mode !== "real" && mode !== "simulated") {
      return res.status(400).json({
        success: false,
        message: "Mode must be either 'real' or 'simulated'.",
      });
    }

    const parsedSimulated = parseInt(simulatedCount, 10);
    if (simulatedCount !== undefined) {
      if (isNaN(parsedSimulated) || parsedSimulated < 0 || parsedSimulated > 1500) {
        return res.status(400).json({
          success: false,
          message: "Simulated count must be an integer between 0 and 1500.",
        });
      }
    }

    const parsedMin = parseInt(varianceMin, 10);
    if (varianceMin !== undefined) {
      if (isNaN(parsedMin) || parsedMin < 0 || parsedMin > 1500) {
        return res.status(400).json({
          success: false,
          message: "Minimum variance must be an integer between 0 and 1500.",
        });
      }
    }

    const parsedMax = parseInt(varianceMax, 10);
    if (varianceMax !== undefined) {
      if (isNaN(parsedMax) || parsedMax < 0 || parsedMax > 1500) {
        return res.status(400).json({
          success: false,
          message: "Maximum variance must be an integer between 0 and 1500.",
        });
      }
    }

    if (!isNaN(parsedMin) && !isNaN(parsedMax) && parsedMin > parsedMax) {
      return res.status(400).json({
        success: false,
        message: "Minimum variance cannot exceed maximum variance.",
      });
    }

    let settingsDoc = await SiteSettings.findOne({ key: "primary_settings" });
    if (!settingsDoc) {
      settingsDoc = new SiteSettings({ key: "primary_settings" });
    }

    const currentConfig = settingsDoc.liveVisitorCounter || {};

    const updatedConfig = {
      mode: mode !== undefined ? mode : currentConfig.mode || "real",
      simulatedCount: !isNaN(parsedSimulated) ? parsedSimulated : (currentConfig.simulatedCount ?? 120),
      randomVariance: randomVariance !== undefined ? Boolean(randomVariance) : Boolean(currentConfig.randomVariance),
      varianceMin: !isNaN(parsedMin) ? parsedMin : (currentConfig.varianceMin ?? 100),
      varianceMax: !isNaN(parsedMax) ? parsedMax : (currentConfig.varianceMax ?? 150),
    };

    settingsDoc.liveVisitorCounter = updatedConfig;
    settingsDoc.markModified("liveVisitorCounter");
    await settingsDoc.save();

    invalidateServerSettingsCache();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "SETTINGS_UPDATE",
      entityType: "LiveVisitorCounter",
      entityId: settingsDoc._id,
      entityTitle: "Live Visitor Counter Settings",
      changesSummary: `Updated visitor counter mode to '${updatedConfig.mode}' (Simulated: ${updatedConfig.simulatedCount}, Min: ${updatedConfig.varianceMin}, Max: ${updatedConfig.varianceMax})`,
      ipAddress: req.ip,
    });

    const realActiveCount = await getRealActiveVisitorCount();
    const currentDisplayCount = updatedConfig.mode === "simulated" ? calculateSimulatedCount(updatedConfig) : realActiveCount;

    res.status(200).json({
      success: true,
      message: "Live visitor counter settings updated successfully.",
      settings: updatedConfig,
      realActiveCount,
      currentDisplayCount,
    });
  } catch (err) {
    console.error("[Visitors] Update Settings Error:", err);
    res.status(500).json({ success: false, message: "Failed to update visitor counter settings." });
  }
});

export default router;
