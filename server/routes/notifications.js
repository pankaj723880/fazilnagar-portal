import express from "express";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
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

// Helper to extract persistent client/device or user identifier
function extractClientIdentifier(req, user) {
  if (user?.id) {
    return String(user.id);
  }
  const clientHeader = req.headers["x-client-id"] || req.headers["x-anon-id"];
  if (clientHeader && typeof clientHeader === "string" && clientHeader.trim()) {
    return clientHeader.trim();
  }
  const queryParam = req.query.clientId || req.query.anonId || req.body?.clientId || req.body?.anonId;
  if (queryParam && typeof queryParam === "string" && queryParam.trim()) {
    return queryParam.trim();
  }
  return null;
}

// @route   GET /api/notifications
// @desc    Retrieve all relevant notifications (broadcasts + submitter-specific approvals/rejections)
// @access  Public
router.get("/", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const clientId = extractClientIdentifier(req, user);
    const rawDeviceId = req.headers["x-client-id"] || req.headers["x-anon-id"] || null;
    const clientPhone = req.query.phone ? String(req.query.phone).trim() : null;
    const refIdsQuery = req.query.referenceIds ? String(req.query.referenceIds).split(",").map((s) => s.trim()).filter(Boolean) : [];
    const limit = Math.min(60, Math.max(1, parseInt(req.query.limit) || 30));
    const since = req.query.since ? new Date(req.query.since) : null;

    // Build $or query conditions to match both town-wide broadcasts and personal submission updates
    const orConditions = [
      {
        recipient: null,
        recipientPhone: null,
        referenceId: null,
        targetAudience: { $in: ["all", null] },
      },
    ];

    if (user?.id) {
      // Include broadcasts targeted specifically to registered users
      orConditions.push({
        recipient: null,
        recipientPhone: null,
        referenceId: null,
        targetAudience: "registered",
      });
      // Include personal direct notifications
      orConditions.push({ recipient: user.id });
    }

    if (clientPhone) {
      const digits = clientPhone.replace(/\D/g, "");
      const phoneMatches = [clientPhone];
      if (digits.length >= 10) phoneMatches.push(digits.slice(-10));
      orConditions.push({ recipientPhone: { $in: phoneMatches } });
    }

    if (refIdsQuery.length > 0) {
      orConditions.push({ referenceId: { $in: refIdsQuery } });
    }

    const now = new Date();
    const expiryCondition = {
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    const query = {
      $and: [{ $or: orConditions }, expiryCondition],
    };

    if (since && !isNaN(since.getTime())) {
      query.$and.push({ createdAt: { $gt: since } });
    }

    const rawNotifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const isAuthenticated = !!(user && user.id);
    const userIdStr = isAuthenticated ? String(user.id) : null;

    let unreadCount = 0;
    const notifications = rawNotifications.map((notif) => {
      const readByList = Array.isArray(notif.readBy) ? notif.readBy : [];
      let isRead = false;

      if (isAuthenticated) {
        if (readByList.includes(userIdStr)) {
          isRead = true;
        } else if (notif.recipient && String(notif.recipient) === userIdStr && notif.isRead) {
          isRead = true;
        }

        if (!isRead) {
          unreadCount++;
        }
      } else {
        // Unauthenticated guests: unread count is strictly 0. Check client/device ID only for per-device styling
        if (clientId && readByList.includes(clientId)) {
          isRead = true;
        } else if (rawDeviceId && readByList.includes(rawDeviceId)) {
          isRead = true;
        }
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
    res.status(500).json({ success: false, message: "Failed to fetch notifications." });
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Public
router.patch("/:id/read", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const clientId = extractClientIdentifier(req, user);
    const rawDeviceId = req.headers["x-client-id"] || req.headers["x-anon-id"] || req.body?.clientId || null;

    const notifId = req.params.id;
    if (!notifId || !notifId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: "Invalid notification ID." });
    }

    const notification = await Notification.findById(notifId);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    const idsToAdd = [];
    if (user?.id) idsToAdd.push(String(user.id));
    if (clientId && !idsToAdd.includes(clientId)) idsToAdd.push(clientId);
    if (rawDeviceId && !idsToAdd.includes(rawDeviceId)) idsToAdd.push(rawDeviceId);

    if (idsToAdd.length > 0) {
      if (!notification.readBy) notification.readBy = [];
      for (const id of idsToAdd) {
        if (!notification.readBy.includes(id)) {
          notification.readBy.push(id);
        }
      }
    }

    if (notification.recipient && user?.id && String(notification.recipient) === String(user.id)) {
      notification.isRead = true;
    }

    await notification.save();

    res.status(200).json({ success: true, message: "Marked as read." });
  } catch (err) {
    console.error("[Notifications] Read Error:", err);
    res.status(500).json({ success: false, message: "Failed to update notification." });
  }
});

// @route   POST /api/notifications/mark-all-read
// @desc    Mark all visible notifications as read for current user / client
// @access  Public
router.post("/mark-all-read", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const clientId = extractClientIdentifier(req, user);
    const rawDeviceId = req.headers["x-client-id"] || req.headers["x-anon-id"] || req.body?.clientId || null;

    const idsToAdd = [];
    if (user?.id) idsToAdd.push(String(user.id));
    if (clientId && !idsToAdd.includes(clientId)) idsToAdd.push(clientId);
    if (rawDeviceId && !idsToAdd.includes(rawDeviceId)) idsToAdd.push(rawDeviceId);

    if (idsToAdd.length === 0) {
      return res.status(400).json({ success: false, message: "Client or user identifier required." });
    }

    // Mark ALL visible broadcast notifications as read by adding identifiers to readBy
    await Notification.updateMany(
      { readBy: { $nin: idsToAdd } },
      { $addToSet: { readBy: { $each: idsToAdd } } }
    );

    if (user?.id) {
      await Notification.updateMany(
        { recipient: user.id, isRead: false },
        { $set: { isRead: true }, $addToSet: { readBy: String(user.id) } }
      );
    }

    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (err) {
    console.error("[Notifications] Mark All Read Error:", err);
    res.status(500).json({ success: false, message: "Failed to mark all as read." });
  }
});

// @route   POST /api/notifications/admin/broadcast
// @desc    Send customized broadcast notification or prominent alert (Admin only)
// @access  Private (Admin)
router.post("/admin/broadcast", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      message,
      type = "custom_notification",
      severity = "info",
      link = "/",
      targetAudience = "all",
      expiresInHours = null,
    } = req.body;

    // Strict validation
    if (!title || typeof title !== "string" || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Title is required and must be at least 3 characters long.",
      });
    }

    if (title.trim().length > 120) {
      return res.status(400).json({
        success: false,
        message: "Title cannot exceed 120 characters.",
      });
    }

    if (!message || typeof message !== "string" || message.trim().length < 5) {
      return res.status(400).json({
        success: false,
        message: "Message is required and must be at least 5 characters long.",
      });
    }

    if (message.trim().length > 600) {
      return res.status(400).json({
        success: false,
        message: "Message cannot exceed 600 characters.",
      });
    }

    const validTypes = ["custom_notification", "custom_alert", "system"];
    const notifType = validTypes.includes(type) ? type : "custom_notification";

    const validSeverities = ["info", "warning", "urgent"];
    const notifSeverity = validSeverities.includes(severity) ? severity : "info";

    const validAudiences = ["all", "registered"];
    const audience = validAudiences.includes(targetAudience) ? targetAudience : "all";

    // Sanitize link
    let sanitizedLink = "/";
    if (typeof link === "string" && link.trim()) {
      const trimmed = link.trim();
      if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        sanitizedLink = trimmed;
      }
    }

    // Expiry calculation
    let expiresAt = null;
    if (expiresInHours && !isNaN(Number(expiresInHours)) && Number(expiresInHours) > 0) {
      expiresAt = new Date(Date.now() + Math.min(720, Number(expiresInHours)) * 60 * 60 * 1000);
    }

    // Prevent accidental duplicate broadcasts within 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
    const existingDuplicate = await Notification.findOne({
      title: title.trim(),
      message: message.trim(),
      createdAt: { $gte: tenSecondsAgo },
    });

    if (existingDuplicate) {
      return res.status(409).json({
        success: false,
        message: "Duplicate broadcast detected. Please wait 10 seconds before broadcasting identical content.",
      });
    }

    // Determine recipient count for administrative feedback
    let recipientCount = 1;
    if (audience === "registered") {
      recipientCount = await User.countDocuments({ status: "active" });
    }

    const newNotification = new Notification({
      type: notifType,
      severity: notifSeverity,
      targetAudience: audience,
      title: title.trim(),
      message: message.trim(),
      link: sanitizedLink,
      expiresAt,
      icon: notifType === "custom_alert" ? (notifSeverity === "urgent" ? "🚨" : notifSeverity === "warning" ? "⚠️" : "📢") : "🔔",
      data: {
        broadcastBy: req.user?.id || req.user?.email || "admin",
        broadcastAt: new Date().toISOString(),
      },
      readBy: [],
      isRead: false,
    });

    await newNotification.save();

    res.status(201).json({
      success: true,
      message:
        audience === "registered"
          ? `Broadcast delivered to all ${recipientCount} active registered citizen accounts.`
          : "Civic notification broadcasted town-wide to all citizens.",
      recipientCount,
      notification: newNotification,
    });
  } catch (err) {
    console.error("[Notifications] Admin Broadcast Error:", err);
    res.status(500).json({ success: false, message: "Failed to broadcast notification." });
  }
});

// @route   GET /api/notifications/admin/history
// @desc    Get recent admin custom broadcasts and alerts
// @access  Private (Admin)
router.get("/admin/history", verifyToken, requireAdmin, async (req, res) => {
  try {
    const history = await Notification.find({
      type: { $in: ["custom_notification", "custom_alert", "system"] },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.status(200).json({
      success: true,
      count: history.length,
      history,
    });
  } catch (err) {
    console.error("[Notifications] Admin History Error:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve notification history." });
  }
});

// @route   POST /api/notifications/test
// @desc    Trigger a test notification (useful for verifying laptop/phone popups)
// @access  Private (Admin)
router.post("/test", verifyToken, requireAdmin, async (req, res) => {
  try {
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
