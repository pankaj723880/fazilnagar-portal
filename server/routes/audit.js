import express from "express";
import AuditLog from "../models/AuditLog.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { getBandwidthSummary, resetBandwidthStats } from "../middleware/bandwidthTracker.js";

const router = express.Router();

// Strict security cache headers: Never cache admin audit logs in public or shared caches
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization");
  next();
});

// @route   GET /api/audit/bandwidth
// @desc    Get request bandwidth accounting metrics, cumulative bytes, and top 10 endpoints
// @access  Private (Admin)
router.get("/bandwidth", verifyToken, requireAdmin, (req, res) => {
  try {
    const summary = getBandwidthSummary();
    res.status(200).json({
      success: true,
      summary,
    });
  } catch (err) {
    console.error("[Audit] Bandwidth metric error:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve bandwidth metrics." });
  }
});

// @route   POST /api/audit/bandwidth/reset
// @desc    Reset bandwidth stats counter
// @access  Private (Admin)
router.post("/bandwidth/reset", verifyToken, requireAdmin, (req, res) => {
  try {
    resetBandwidthStats();
    res.status(200).json({ success: true, message: "Bandwidth counters reset successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to reset bandwidth counters." });
  }
});

// @route   GET /api/audit
// @desc    Get audit trail of administrator content modifications
// @access  Private (Admin)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
    const skip = (page - 1) * limit;
    const { action, entityType } = req.query;

    const query = {};
    if (action && action !== "all") query.action = action;
    if (entityType && entityType !== "all") query.entityType = entityType;

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate("adminUser", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      logs,
    });
  } catch (err) {
    console.error("[Audit] Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch audit log history." });
  }
});

export default router;

