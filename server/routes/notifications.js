import express from "express";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import { createBroadcastNotification, createSubmissionNotification } from "../utils/notify.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

// Helper to extract authenticated user token if present
function getOptionalUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  if (!token || token === "undefined" || token === "null") return null;
  try {
    const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
    return jwt.verify(token, secretKey);
  } catch (_) {
    return null;
  }
}

// @route   GET /api/notifications
// @desc    Retrieve all relevant notifications (broadcasts + submitter-specific approvals/rejections)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const anonId = req.headers["x-anon-id"] || req.query.anonId || null;
    const clientPhone = req.query.phone ? String(req.query.phone).trim() : null;
    const refIdsQuery = req.query.referenceIds ? String(req.query.referenceIds).split(",").map((s) => s.trim()).filter(Boolean) : [];
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 30));
    const since = req.query.since ? new Date(req.query.since) : null;

    // Build $or query conditions to match both town-wide broadcasts and personal submission updates
    const orConditions = [
      { recipient: null, recipientPhone: null, referenceId: null }, // Global broadcasts
    ];

    if (user?.id) {
      orConditions.push({ recipient: user.id });
    }

    if (clientPhone) {
      // Also match normalized variants of the phone number
      const digits = clientPhone.replace(/\D/g, "");
      const phoneMatches = [clientPhone];
      if (digits.length >= 10) phoneMatches.push(digits.slice(-10));
      orConditions.push({ recipientPhone: { $in: phoneMatches } });
    }

    if (refIdsQuery.length > 0) {
      orConditions.push({ referenceId: { $in: refIdsQuery } });
    }

    const query = { $or: orConditions };

    if (since && !isNaN(since.getTime())) {
      query.createdAt = { $gt: since };
    }

    const rawNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const clientId = user?.id ? String(user.id) : (anonId ? String(anonId).trim() : null);

    let unreadCount = 0;
    const notifications = rawNotifications.map((notif) => {
      const readByList = Array.isArray(notif.readBy) ? notif.readBy : [];
      let isRead = false;

      if (clientId && readByList.includes(clientId)) {
        isRead = true;
      } else if (notif.recipient && notif.isRead) {
        isRead = true;
      }

      if (!isRead) {
        unreadCount++;
      }

      return {
        ...notif,
        isRead,
      };
    });

    res.status(200).json({
      success: true,
      unreadCount,
      total: notifications.length,
      notifications,
    });
  } catch (err) {
    console.error("[Notifications] Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Public
router.patch("/:id/read", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const anonId = req.headers["x-anon-id"] || req.body.anonId || null;
    const clientId = user?.id ? String(user.id) : (anonId ? String(anonId).trim() : "anonymous");

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    if (!notification.readBy) notification.readBy = [];
    if (!notification.readBy.includes(clientId)) {
      notification.readBy.push(clientId);
    }
    if (notification.recipient && user?.id && String(notification.recipient) === String(user.id)) {
      notification.isRead = true;
    }

    await notification.save();

    res.status(200).json({ success: true, message: "Marked as read." });
  } catch (err) {
    console.error("[Notifications] Read Error:", err);
    res.status(500).json({ message: "Failed to update notification." });
  }
});

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all visible notifications as read for current user / client
// @access  Public
router.post("/mark-all-read", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const anonId = req.headers["x-anon-id"] || req.body.anonId || null;
    const clientId = user?.id ? String(user.id) : (anonId ? String(anonId).trim() : "anonymous");

    // Add clientId to readBy for all notifications within last 14 days
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    await Notification.updateMany(
      { createdAt: { $gte: fourteenDaysAgo }, readBy: { $ne: clientId } },
      { $addToSet: { readBy: clientId } }
    );

    if (user?.id) {
      await Notification.updateMany(
        { recipient: user.id, isRead: false },
        { $set: { isRead: true } }
      );
    }

    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    console.error("[Notifications] Mark All Read Error:", err);
    res.status(500).json({ message: "Failed to mark all as read." });
  }
});

// @route   POST /api/notifications/test
// @desc    Trigger a test notification (useful for verifying laptop/phone popups)
// @access  Public
router.post("/test", verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const { deviceType } = req.body;

    const notif = await createBroadcastNotification({
      type: "system",
      title: "🔔 Fazilnagar Notification Test",
      message: `Test alert received successfully on your ${deviceType || "device"}! You will now receive live alerts for all posts, stories, news, and submission reviews.`,
      link: "/news",
    });

    res.status(201).json({
      success: true,
      message: "Test notification dispatched.",
      notification: notif,
    });
  } catch (err) {
    console.error("[Notifications] Test Notification Error:", err);
    res.status(500).json({ message: "Failed to trigger test notification." });
  }
});

export default router;
