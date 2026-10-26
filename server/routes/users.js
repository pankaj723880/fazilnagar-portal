import express from "express";
import User from "../models/User.js";
import Block from "../models/Block.js";
import Submission from "../models/Submission.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { searchLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Strict security cache headers: Never cache user directory or account records in public caches
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization");
  next();
});

// Helper to log administrative audit trail
function logAdminAction(adminUser, action, targetUser, details = "") {
  const timestamp = new Date().toISOString();
  console.log(
    `[ADMIN AUDIT] [${timestamp}] Admin '${adminUser?.email || adminUser?.id}' performed '${action}' on user '${targetUser?.email || targetUser?.id}'. ${details}`
  );
}

// @route   GET /api/users
// @desc    List registered users with search, role/status filters, pagination, and submission counts
// @access  Private (Admin)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;

    const query = {};

    if (role && role !== "all") {
      query.role = role;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      query.$or = [{ name: reg }, { email: reg }, { phone: reg }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const total = await User.countDocuments(query);
    const rawUsers = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Compute submission count for each user
    const usersWithCounts = await Promise.all(
      rawUsers.map(async (u) => {
        const submissionCount = await Submission.countDocuments({
          $or: [
            { "submittedBy.email": u.email },
            { "submittedBy.phone": u.phone && u.phone.trim() ? u.phone.trim() : "__none__" },
            { ownerName: u.name },
          ],
        });

        return {
          id: u._id,
          _id: u._id,
          name: u.name,
          email: u.email,
          phone: u.phone || "",
          role: u.role || "user",
          status: u.status || "active",
          createdAt: u.createdAt,
          lastLogin: u.lastLogin || null,
          submissionCount,
        };
      })
    );

    res.status(200).json({
      users: usersWithCounts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (err) {
    console.error("Fetch Users Error:", err);
    res.status(500).json({ message: "Failed to fetch registered users list." });
  }
});

// Helper to mask email address: ra****@gmail.com
function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}****@${domain}`;
  }
  return `${local.slice(0, 2)}****@${domain}`;
}

// Safely escape regex characters for search queries (supports Hindi/Devanagari characters)
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// @route   GET /api/users/search
// @desc    Search active users by name or username; exact email only if findByEmail is true
// @access  Private (Authenticated Citizen)
router.get("/search", verifyToken, searchLimiter, async (req, res) => {
  try {
    const rawQuery = (req.query.q || req.query.query || "").trim();
    if (!rawQuery || rawQuery.length < 2) {
      return res.status(200).json({
        success: true,
        users: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
        message: "Search query must be at least 2 characters long.",
      });
    }

    const currentUserId = req.user.id;

    // Filter out users involved in blocks (either blocked by caller or blocker of caller)
    const [blockedByMe, blockedMe] = await Promise.all([
      Block.find({ blocker: currentUserId }).distinct("blocked"),
      Block.find({ blocked: currentUserId }).distinct("blocker"),
    ]);

    const excludedIds = [currentUserId, ...blockedByMe, ...blockedMe];

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const escaped = escapeRegex(rawQuery);
    const searchRegex = new RegExp(escaped, "i");

    // Match conditions: name, username, or exact email if opted-in
    const searchConditions = [
      { name: searchRegex },
      { username: searchRegex },
    ];

    if (rawQuery.includes("@")) {
      searchConditions.push({
        email: rawQuery.toLowerCase(),
        findByEmail: true,
      });
    }

    const filter = {
      _id: { $nin: excludedIds },
      status: "active",
      $or: searchConditions,
    };

    const [total, matchedUsers] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("_id name username avatar area bio showEmail email whoCanMessage lastSeenVisible lastSeen")
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const results = matchedUsers.map((u) => ({
      _id: u._id,
      id: u._id,
      name: u.name,
      username: u.username || "",
      avatar: u.avatar || "",
      area: u.area || "",
      bio: u.bio || "",
      whoCanMessage: u.whoCanMessage || "everyone",
      maskedEmail: u.showEmail && u.email ? maskEmail(u.email) : null,
      lastSeen: u.lastSeenVisible ? u.lastSeen : null,
    }));

    res.status(200).json({
      success: true,
      users: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (err) {
    console.error("User Search Error:", err);
    res.status(500).json({ success: false, message: "Failed to search users." });
  }
});

// @route   GET /api/users/:id
// @desc    Get detailed user profile and their submitted community places
// @access  Private (Admin)
router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const submissions = await Submission.find({
      $or: [
        { "submittedBy.email": user.email },
        { "submittedBy.phone": user.phone && user.phone.trim() ? user.phone.trim() : "__none__" },
        { ownerName: user.name },
      ],
    })
      .select("referenceId title category status createdAt townBoundaryStatus")
      .sort({ createdAt: -1 });

    res.status(200).json({
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role || "user",
        status: user.status || "active",
        createdAt: user.createdAt,
        lastLogin: user.lastLogin || null,
      },
      submissions,
    });
  } catch (err) {
    console.error("Get User Detail Error:", err);
    res.status(500).json({ message: "Failed to retrieve user details." });
  }
});

// @route   PUT /api/users/:id
// @desc    Edit permitted profile fields (name, phone, role, status)
// @access  Private (Admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, phone, role, status } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Protect the last active super-admin from deactivation or demotion
    if (
      (role && role !== "admin" && targetUser.role === "admin") ||
      (status && status !== "active" && targetUser.role === "admin")
    ) {
      const activeAdminCount = await User.countDocuments({
        role: "admin",
        status: "active",
        _id: { $ne: targetUser._id },
      });

      if (activeAdminCount < 1) {
        return res.status(400).json({
          message:
            "Operation blocked: Cannot demote or deactivate the last remaining active Administrator account.",
        });
      }
    }

    // Apply allowed modifications
    if (name && name.trim()) targetUser.name = name.trim();
    if (phone !== undefined) targetUser.phone = phone.trim();
    if (role && ["user", "admin"].includes(role)) targetUser.role = role;
    if (status && ["active", "inactive", "suspended"].includes(status)) targetUser.status = status;

    await targetUser.save();

    logAdminAction(req.user, "UPDATE_PROFILE", targetUser, `role=${targetUser.role}, status=${targetUser.status}`);

    res.status(200).json({
      message: "User profile updated successfully.",
      user: {
        id: targetUser._id,
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        phone: targetUser.phone,
        role: targetUser.role,
        status: targetUser.status,
        lastLogin: targetUser.lastLogin,
        createdAt: targetUser.createdAt,
      },
    });
  } catch (err) {
    console.error("Update User Error:", err);
    res.status(500).json({ message: "Failed to update user profile." });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete a registered user account after confirmation
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Safety: Admin cannot delete their own active session
    if (req.user.id === targetUser._id.toString()) {
      return res.status(400).json({
        message: "You cannot delete your own active administrator account from this session.",
      });
    }

    // Protect the last super-admin
    if (targetUser.role === "admin") {
      const activeAdminCount = await User.countDocuments({
        role: "admin",
        _id: { $ne: targetUser._id },
      });

      if (activeAdminCount < 1) {
        return res.status(400).json({
          message: "Operation blocked: Cannot delete the last remaining Administrator account.",
        });
      }
    }

    // Perform deletion of User without cascade-deleting places or news
    await User.findByIdAndDelete(targetUser._id);

    logAdminAction(req.user, "DELETE_USER", targetUser, `Account ${targetUser.email} permanently removed.`);

    res.status(200).json({
      message: `User account '${targetUser.email}' deleted successfully. Associated official directories remain preserved.`,
    });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ message: "Failed to delete user account." });
  }
});

export default router;
