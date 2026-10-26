import express from "express";
import AuditLog from "../models/AuditLog.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

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
