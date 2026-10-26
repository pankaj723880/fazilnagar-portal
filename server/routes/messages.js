import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import MessageDeletion from "../models/MessageDeletion.js";
import Block from "../models/Block.js";
import User from "../models/User.js";
import Report from "../models/Report.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimiter.js";
import { getIO, getOnlineUsers } from "../socket.js";

import { getAuthenticatedDriveClient, getOrCreateAppFolder } from "./googleDrive.js";
import GoogleDriveMedia from "../models/GoogleDriveMedia.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const messagesUploadDir = path.join(__dirname, "../uploads/messages");
if (!fs.existsSync(messagesUploadDir)) {
  fs.mkdirSync(messagesUploadDir, { recursive: true });
}

const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".sh", ".php", ".vbs", ".msi", ".jar", ".scr", ".com", ".pif", ".js", ".bin"
];

function getMediaCategory(mimetype, originalname) {
  const mime = (mimetype || "").toLowerCase();
  const ext = path.extname(originalname || "").toLowerCase();

  if (mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
    return "image";
  }
  if (mime.startsWith("video/") || [".mp4", ".webm", ".mov", ".mkv", ".ogg"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".ogg", ".aac", ".flac"].includes(ext)) {
    return "audio";
  }
  return "document";
}

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, messagesUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || "";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `attachment-${req.user?.id || "anon"}-${uniqueSuffix}${ext}`);
  },
});

const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB max direct upload
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Executable or script files are not allowed for security reasons."));
    }
    cb(null, true);
  },
});

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB per chunk
});

// Helper to stream file to Google Drive dedicated folder if configured
async function tryUploadToGoogleDrive({ filePath, originalName, mimeType, user }) {
  try {
    const hasDriveConfig =
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || (await mongoose.model("GoogleDriveToken").findOne({ key: "default_drive_account" })));
    if (!hasDriveConfig) {
      return null;
    }

    const { drive, accountEmail, tokenDoc } = await getAuthenticatedDriveClient();
    const folderId = await getOrCreateAppFolder(drive, tokenDoc, "Fazilnagar Messaging Attachments");

    const cleanName = `chat_${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const fileStream = fs.createReadStream(filePath);

    const driveRes = await drive.files.create({
      requestBody: {
        name: cleanName,
        parents: [folderId],
      },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: fileStream,
      },
      fields: "id, name, mimeType, size, webViewLink, webContentLink",
    });

    const driveFileId = driveRes.data?.id;
    if (!driveFileId) return null;

    const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : { size: 0 };
    const mediaDoc = await GoogleDriveMedia.create({
      driveFileId,
      fileName: cleanName,
      mimeType,
      fileSize: Number(driveRes.data.size) || stats.size,
      owner: accountEmail,
      folderId,
      isTest: false,
      uploadedBy: user?.id || null,
    });

    const backendBase = (process.env.BACKEND_URL || "").replace(/\/+$/, "");
    mediaDoc.deliveryUrl = `${backendBase}/api/google-drive/media/${mediaDoc._id}`;
    await mediaDoc.save();

    return {
      driveFileId,
      mediaDocId: mediaDoc._id,
      deliveryUrl: mediaDoc.deliveryUrl,
      webViewLink: driveRes.data.webViewLink,
      webContentLink: driveRes.data.webContentLink,
    };
  } catch (err) {
    console.warn("[Messages Drive] Google Drive upload failed or not connected, falling back to local storage:", err.message);
    return null;
  }
}

const router = express.Router();

// Strict security cache headers: Never cache private citizen messages or chat history in shared caches
router.use((req, res, next) => {
  res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization");
  next();
});

// Helper to broadcast socket events safely
function broadcastNewMessage(conversationId, message, recipientIds, updatedConv) {
  try {
    const io = getIO();
    // Emit to conversation room (for currently active chat window)
    io.to(`conv:${conversationId}`).emit("new_message", message);

    // Emit to individual user rooms (for conversation list badge updates)
    for (const rid of recipientIds) {
      io.to(`user:${rid}`).emit("conversation_updated", {
        conversationId,
        lastMessage: updatedConv.lastMessage,
        lastMessageAt: updatedConv.lastMessageAt,
      });
    }
  } catch (err) {
    // Socket emit error should not fail the REST request
    console.warn("Socket broadcast warning:", err.message);
  }
}

// @route   GET /api/messages/presence
// @desc    Get list of currently active/online user IDs
// @access  Private
router.get("/presence", verifyToken, (req, res) => {
  try {
    const onlineUserIds = getOnlineUsers();
    res.json({ success: true, onlineUserIds });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch presence: " + err.message });
  }
});

// @route   GET /api/messages/conversations
// @desc    List all conversations for current user with unread counts and partner info
// @access  Private
router.get("/conversations", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Get all conversation memberships for the current user (excluding left/declined)
    const memberships = await ConversationMember.find({
      user: currentUserId,
      status: { $in: ["active", "pending_approval"] },
    }).lean();

    if (!memberships.length) {
      return res.json({ success: true, conversations: [] });
    }

    const convIds = memberships.map((m) => m.conversation);

    // Find conversations
    const conversations = await Conversation.find({ _id: { $in: convIds } })
      .sort({ lastMessageAt: -1 })
      .lean();

    // Fetch all members of these conversations to identify the other participants
    const allMembers = await ConversationMember.find({
      conversation: { $in: convIds },
      user: { $ne: currentUserId },
    })
      .populate("user", "_id name username avatar area lastSeen lastSeenVisible whoCanMessage")
      .lean();

    const memberMap = new Map();
    for (const m of allMembers) {
      if (!memberMap.has(m.conversation.toString())) {
        memberMap.set(m.conversation.toString(), []);
      }
      if (m.user) {
        memberMap.get(m.conversation.toString()).push({
          ...m.user,
          memberStatus: m.status,
        });
      }
    }

    const membershipMap = new Map(memberships.map((m) => [m.conversation.toString(), m]));

    const results = conversations.map((c) => {
      const myMembership = membershipMap.get(c._id.toString()) || {};
      const otherMembers = memberMap.get(c._id.toString()) || [];
      const isInitiator = c.initiator?.toString() === currentUserId;

      return {
        _id: c._id,
        id: c._id,
        type: c.type,
        status: c.status,
        initiator: c.initiator,
        isInitiator,
        groupName: c.groupName || "",
        groupDescription: c.groupDescription || "",
        groupAvatar: c.groupAvatar || "",
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount: myMembership.unreadCount || 0,
        myRole: myMembership.role || "member",
        lastReadAt: myMembership.lastReadAt,
        isPinned: c.pinnedBy?.some((uid) => uid.toString() === currentUserId) || false,
        isArchived: c.archivedBy?.some((uid) => uid.toString() === currentUserId) || false,
        isMuted: c.mutedBy?.some((uid) => uid.toString() === currentUserId) || false,
        otherUser: otherMembers[0] || null,
        otherMembers,
      };
    });

    res.json({ success: true, conversations: results });
  } catch (err) {
    console.error("List Conversations Error:", err);
    res.status(500).json({ success: false, message: "Failed to load conversations." });
  }
});

// @route   POST /api/messages/conversations/direct
// @desc    Start or retrieve a 1-to-1 direct conversation with a citizen
// @access  Private
router.post("/conversations/direct", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const currentUserId = req.user.id;

    if (!recipientId || recipientId === currentUserId) {
      return res.status(400).json({ success: false, message: "Invalid recipient ID." });
    }

    const recipient = await User.findById(recipientId).select("name username avatar status whoCanMessage");
    if (!recipient || recipient.status !== "active") {
      return res.status(404).json({ success: false, message: "Recipient user not found or inactive." });
    }

    // Verify block status (neither user may have blocked the other)
    const isBlocked = await Block.exists({
      $or: [
        { blocker: currentUserId, blocked: recipientId },
        { blocker: recipientId, blocked: currentUserId },
      ],
    });

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Unable to start conversation due to user privacy settings or block status.",
      });
    }

    // Check if a direct conversation already exists between these two users
    const myMemberships = await ConversationMember.find({ user: currentUserId }).distinct("conversation");
    const existing = await ConversationMember.findOne({
      conversation: { $in: myMemberships },
      user: recipientId,
    });

    if (existing) {
      const conv = await Conversation.findOne({ _id: existing.conversation, type: "direct" });
      if (conv) {
        return res.json({
          success: true,
          conversation: {
            _id: conv._id,
            id: conv._id,
            type: conv.type,
            status: conv.status,
            initiator: conv.initiator,
            lastMessage: conv.lastMessage,
            lastMessageAt: conv.lastMessageAt,
            otherUser: recipient,
          },
        });
      }
    }

    // Determine initial conversation status based on recipient's message privacy setting
    // If recipient has whoCanMessage === 'requests', status is 'pending' until accepted
    const initialStatus = recipient.whoCanMessage === "requests" ? "pending" : "active";

    const newConv = await Conversation.create({
      type: "direct",
      status: initialStatus,
      initiator: currentUserId,
      lastMessage: {
        text: "",
        sender: currentUserId,
        createdAt: new Date(),
        type: "system",
      },
      lastMessageAt: new Date(),
    });

    // Create both member records
    await ConversationMember.create([
      {
        conversation: newConv._id,
        user: currentUserId,
        role: "admin",
        status: "active",
      },
      {
        conversation: newConv._id,
        user: recipientId,
        role: "member",
        status: initialStatus === "pending" ? "pending_approval" : "active",
      },
    ]);

    res.status(201).json({
      success: true,
      conversation: {
        _id: newConv._id,
        id: newConv._id,
        type: newConv.type,
        status: newConv.status,
        initiator: newConv.initiator,
        lastMessage: newConv.lastMessage,
        lastMessageAt: newConv.lastMessageAt,
        otherUser: recipient,
      },
    });
  } catch (err) {
    console.error("Create Direct Conversation Error:", err);
    res.status(500).json({ success: false, message: "Failed to start conversation." });
  }
});

// @route   POST /api/messages/conversations/group
// @desc    Create a new group conversation with title, description, and members
// @access  Private
router.post("/conversations/group", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { groupName, groupDescription = "", groupAvatar = "", memberIds = [] } = req.body;
    const currentUserId = req.user.id;

    if (!groupName || !groupName.trim() || groupName.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Group name is required (minimum 2 characters)." });
    }

    // Deduplicate and filter out self
    const candidateIds = Array.from(
      new Set(
        (Array.isArray(memberIds) ? memberIds : [])
          .filter((id) => id && mongoose.Types.ObjectId.isValid(id) && id.toString() !== currentUserId)
      )
    );

    if (candidateIds.length === 0) {
      return res.status(400).json({ success: false, message: "Please select at least 1 other citizen to create a group." });
    }

    // Verify all members exist and are active
    const validUsers = await User.find({ _id: { $in: candidateIds }, status: "active" }).select("_id name username avatar");
    if (validUsers.length !== candidateIds.length) {
      return res.status(400).json({ success: false, message: "One or more selected citizens were not found or are inactive." });
    }

    // Check blocks between creator and candidate members
    const isBlocked = await Block.exists({
      $or: [
        { blocker: currentUserId, blocked: { $in: candidateIds } },
        { blocker: { $in: candidateIds }, blocked: currentUserId },
      ],
    });
    if (isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Cannot add one or more citizens due to privacy or block restrictions.",
      });
    }

    const creatorUser = await User.findById(currentUserId).select("name username");
    const creatorName = creatorUser?.name || "Group Creator";

    const newGroup = await Conversation.create({
      type: "group",
      status: "active",
      initiator: currentUserId,
      groupName: groupName.trim().slice(0, 100),
      groupDescription: groupDescription.trim().slice(0, 500),
      groupAvatar: groupAvatar.trim(),
      lastMessage: {
        text: `Group "${groupName.trim()}" created by ${creatorName}`,
        sender: currentUserId,
        createdAt: new Date(),
        type: "system",
      },
      lastMessageAt: new Date(),
    });

    // Add creator as admin, rest as members
    const memberDocs = [
      {
        conversation: newGroup._id,
        user: currentUserId,
        role: "admin",
        status: "active",
      },
      ...candidateIds.map((uid) => ({
        conversation: newGroup._id,
        user: uid,
        role: "member",
        status: "active",
      })),
    ];
    await ConversationMember.insertMany(memberDocs);

    // Initial system message
    await Message.create({
      conversation: newGroup._id,
      sender: currentUserId,
      body: `Group "${groupName.trim()}" created by ${creatorName}`,
      type: "system",
    });

    // Notify all members via Socket.IO
    try {
      const io = getIO();
      const allUserIds = [currentUserId, ...candidateIds];
      for (const uid of allUserIds) {
        io.to(`user:${uid}`).emit("conversation_created", {
          conversationId: newGroup._id,
          groupName: newGroup.groupName,
          type: "group",
        });
      }
    } catch (sockErr) {
      console.warn("Socket notification warning on group creation:", sockErr.message);
    }

    res.status(201).json({
      success: true,
      conversation: {
        _id: newGroup._id,
        id: newGroup._id,
        type: newGroup.type,
        status: newGroup.status,
        initiator: newGroup.initiator,
        groupName: newGroup.groupName,
        groupDescription: newGroup.groupDescription,
        groupAvatar: newGroup.groupAvatar,
        lastMessage: newGroup.lastMessage,
        lastMessageAt: newGroup.lastMessageAt,
        unreadCount: 0,
        myRole: "admin",
        otherMembers: validUsers,
      },
    });
  } catch (err) {
    console.error("Create Group Conversation Error:", err);
    res.status(500).json({ success: false, message: "Failed to create group." });
  }
});

// @route   GET /api/messages/conversations/:id/members
// @desc    List members of a group conversation
// @access  Private
router.get("/conversations/:id/members", verifyToken, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user.id;

    const myMembership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });
    if (!myMembership) {
      return res.status(403).json({ success: false, message: "Not an active member of this group." });
    }

    const members = await ConversationMember.find({
      conversation: conversationId,
      status: "active",
    })
      .populate("user", "_id name username avatar area status")
      .sort({ role: 1, createdAt: 1 })
      .lean();

    res.json({
      success: true,
      members: members.map((m) => ({
        _id: m._id,
        role: m.role,
        joinedAt: m.createdAt,
        user: m.user,
      })),
    });
  } catch (err) {
    console.error("Get Group Members Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch members." });
  }
});

// @route   POST /api/messages/conversations/:id/members
// @desc    Add one or more members to a group conversation (admin only)
// @access  Private
router.post("/conversations/:id/members", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user.id;
    const { memberIds = [] } = req.body;

    const myMembership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });
    if (!myMembership || myMembership.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only group admins can add members." });
    }

    const conv = await Conversation.findOne({ _id: conversationId, type: "group", status: "active" });
    if (!conv) {
      return res.status(404).json({ success: false, message: "Group not found or inactive." });
    }

    const toAdd = Array.from(
      new Set(
        (Array.isArray(memberIds) ? memberIds : [])
          .filter((uid) => uid && mongoose.Types.ObjectId.isValid(uid) && uid.toString() !== currentUserId)
      )
    );

    if (toAdd.length === 0) {
      return res.status(400).json({ success: false, message: "Please specify valid citizen IDs to add." });
    }

    // Verify citizens exist and are active
    const validUsers = await User.find({ _id: { $in: toAdd }, status: "active" }).select("_id name username");
    if (!validUsers.length) {
      return res.status(400).json({ success: false, message: "No valid active citizens found to add." });
    }

    // Check blocks
    const blocked = await Block.exists({
      $or: [
        { blocker: currentUserId, blocked: { $in: toAdd } },
        { blocker: { $in: toAdd }, blocked: currentUserId },
      ],
    });
    if (blocked) {
      return res.status(403).json({ success: false, message: "Cannot add one or more citizens due to block restrictions." });
    }

    const actor = await User.findById(currentUserId).select("name");
    const addedNames = validUsers.map((u) => u.name).join(", ");

    for (const u of validUsers) {
      const existing = await ConversationMember.findOne({ conversation: conversationId, user: u._id });
      if (existing) {
        existing.status = "active";
        existing.role = "member";
        await existing.save();
      } else {
        await ConversationMember.create({
          conversation: conversationId,
          user: u._id,
          role: "member",
          status: "active",
        });
      }
    }

    // System message
    const sysMsg = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      body: `${actor?.name || "Admin"} added ${addedNames}`,
      type: "system",
    });

    conv.lastMessage = {
      text: sysMsg.body,
      sender: currentUserId,
      createdAt: sysMsg.createdAt,
      type: "system",
    };
    conv.lastMessageAt = sysMsg.createdAt;
    await conv.save();

    // Broadcast
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit("new_message", sysMsg);
      io.to(`conv:${conversationId}`).emit("group_members_updated", { conversationId });
      for (const u of validUsers) {
        io.to(`user:${u._id}`).emit("conversation_created", {
          conversationId,
          groupName: conv.groupName,
          type: "group",
        });
      }
    } catch (e) {
      console.warn("Socket broadcast error:", e.message);
    }

    res.json({
      success: true,
      message: `Added ${validUsers.length} member(s) successfully.`,
      addedCount: validUsers.length,
    });
  } catch (err) {
    console.error("Add Group Members Error:", err);
    res.status(500).json({ success: false, message: "Failed to add members." });
  }
});

// @route   DELETE /api/messages/conversations/:id/members/:memberId
// @desc    Remove a member from group (admin only) or leave group (self)
// @access  Private
router.delete("/conversations/:id/members/:memberId", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id: conversationId, memberId } = req.params;
    const currentUserId = req.user.id;
    const isSelf = memberId === currentUserId;

    const myMembership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });
    if (!myMembership) {
      return res.status(403).json({ success: false, message: "Not an active member of this group." });
    }

    if (!isSelf && myMembership.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only group admins can remove other members." });
    }

    const targetMembership = await ConversationMember.findOne({
      conversation: conversationId,
      user: memberId,
      status: "active",
    });
    if (!targetMembership) {
      return res.status(404).json({ success: false, message: "Target member is not active in this group." });
    }

    const targetUser = await User.findById(memberId).select("name");
    const actorUser = await User.findById(currentUserId).select("name");

    targetMembership.status = "left";
    await targetMembership.save();

    // If target was admin and leaving, ensure at least one admin remains if other members exist
    if (isSelf && targetMembership.role === "admin") {
      const remainingAdmins = await ConversationMember.countDocuments({
        conversation: conversationId,
        role: "admin",
        status: "active",
      });
      if (remainingAdmins === 0) {
        // Promote next active member
        const nextMember = await ConversationMember.findOne({
          conversation: conversationId,
          status: "active",
        }).sort({ createdAt: 1 });
        if (nextMember) {
          nextMember.role = "admin";
          await nextMember.save();
        }
      }
    }

    const actionText = isSelf
      ? `${targetUser?.name || "A citizen"} left the group`
      : `${actorUser?.name || "Admin"} removed ${targetUser?.name || "a member"}`;

    const sysMsg = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      body: actionText,
      type: "system",
    });

    const conv = await Conversation.findById(conversationId);
    if (conv) {
      conv.lastMessage = {
        text: sysMsg.body,
        sender: currentUserId,
        createdAt: sysMsg.createdAt,
        type: "system",
      };
      conv.lastMessageAt = sysMsg.createdAt;
      await conv.save();
    }

    // Broadcast
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit("new_message", sysMsg);
      io.to(`conv:${conversationId}`).emit("group_members_updated", { conversationId });
      io.to(`user:${memberId}`).emit("conversation_left", { conversationId });
    } catch (e) {
      console.warn("Socket broadcast error:", e.message);
    }

    res.json({
      success: true,
      message: isSelf ? "Left group successfully." : "Member removed successfully.",
    });
  } catch (err) {
    console.error("Remove Member / Leave Group Error:", err);
    res.status(500).json({ success: false, message: "Failed to update membership." });
  }
});

// @route   PATCH /api/messages/conversations/:id/group
// @desc    Update group settings (name, description, avatar) - admin only
// @access  Private
router.patch("/conversations/:id/group", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id: conversationId } = req.params;
    const currentUserId = req.user.id;
    const { groupName, groupDescription, groupAvatar } = req.body;

    const myMembership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });
    if (!myMembership || myMembership.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only group admins can update group information." });
    }

    const conv = await Conversation.findOne({ _id: conversationId, type: "group" });
    if (!conv) {
      return res.status(404).json({ success: false, message: "Group not found." });
    }

    if (groupName !== undefined) {
      if (!groupName.trim() || groupName.trim().length < 2) {
        return res.status(400).json({ success: false, message: "Group name must be at least 2 characters." });
      }
      conv.groupName = groupName.trim().slice(0, 100);
    }

    if (groupDescription !== undefined) {
      conv.groupDescription = groupDescription.trim().slice(0, 500);
    }

    if (groupAvatar !== undefined) {
      conv.groupAvatar = groupAvatar.trim();
    }

    await conv.save();

    // Broadcast group update
    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit("group_updated", {
        conversationId,
        groupName: conv.groupName,
        groupDescription: conv.groupDescription,
        groupAvatar: conv.groupAvatar,
      });
    } catch (e) {
      console.warn("Socket broadcast error:", e.message);
    }

    res.json({
      success: true,
      group: {
        _id: conv._id,
        groupName: conv.groupName,
        groupDescription: conv.groupDescription,
        groupAvatar: conv.groupAvatar,
      },
    });
  } catch (err) {
    console.error("Update Group Settings Error:", err);
    res.status(500).json({ success: false, message: "Failed to update group." });
  }
});

// @route   GET /api/messages/conversations/:id/messages
// @desc    Get message history for a conversation (latest 30, with before cursor)
// @access  Private
router.get("/conversations/:id/messages", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;

    // Verify membership
    const membership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
    });

    if (!membership || ["blocked", "declined"].includes(membership.status)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this conversation." });
    }

    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 30));
    const before = req.query.before; // message ObjectId or date

    const query = { conversation: conversationId };

    if (before) {
      if (mongoose.Types.ObjectId.isValid(before)) {
        const pivotMsg = await Message.findById(before);
        if (pivotMsg) {
          query.createdAt = { $lt: pivotMsg.createdAt };
        }
      } else if (!isNaN(Date.parse(before))) {
        query.createdAt = { $lt: new Date(before) };
      }
    }

    // Find messages deleted by this user ("delete for me")
    const deletedForMe = await MessageDeletion.find({ user: currentUserId }).distinct("message");
    if (deletedForMe.length) {
      query._id = { $nin: deletedForMe };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("sender", "_id name username avatar")
      .populate("replyTo", "_id body sender isDeletedForEveryone type")
      .populate("reactions.user", "_id name username avatar")
      .lean();

    // Reverse to chronological order for client display
    const chronological = messages.reverse().map((m) => {
      let bodyText = m.body;
      if (m.isDeletedForEveryone) {
        bodyText = "This message was deleted";
      }

      return {
        _id: m._id,
        id: m._id,
        conversationId: m.conversation,
        sender: m.sender,
        body: bodyText,
        type: m.type,
        mediaUrl: m.isDeletedForEveryone ? "" : m.mediaUrl,
        fileName: m.fileName || "",
        fileSize: m.fileSize || 0,
        mimeType: m.mimeType || "",
        storageProvider: m.storageProvider || "local",
        driveFileId: m.driveFileId || "",
        replyTo: m.replyTo,
        isEdited: m.isEdited,
        editedAt: m.editedAt,
        isDeletedForEveryone: m.isDeletedForEveryone,
        clientMessageId: m.clientMessageId,
        reactions: m.reactions || [],
        createdAt: m.createdAt,
      };
    });

    // Auto mark conversation as read on message fetch
    if (membership.unreadCount > 0) {
      await ConversationMember.updateOne(
        { _id: membership._id },
        { unreadCount: 0, lastReadAt: new Date() }
      );
    }

    res.json({
      success: true,
      messages: chronological,
      hasMore: messages.length === limit,
    });
  } catch (err) {
    console.error("Get Messages Error:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve messages." });
  }
});

// @route   GET /api/messages/conversations/:id/attachments
// @desc    Get all shared media, videos, and files for a conversation
// @access  Private
router.get("/conversations/:id/attachments", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;

    const membership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
    });

    if (!membership || ["blocked", "declined"].includes(membership.status)) {
      return res.status(403).json({ success: false, message: "Unauthorized access to this conversation." });
    }

    const deletedForMe = await MessageDeletion.find({ user: currentUserId }).distinct("message");
    const query = {
      conversation: conversationId,
      isDeletedForEveryone: false,
      mediaUrl: { $exists: true, $ne: "" },
    };
    if (deletedForMe.length) {
      query._id = { $nin: deletedForMe };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .populate("sender", "_id name username avatar")
      .lean();

    const photos = [];
    const videos = [];
    const files = [];

    for (const m of messages) {
      const mime = (m.mimeType || "").toLowerCase();
      const ext = path.extname(m.fileName || "").toLowerCase();
      const isImg = m.type === "image" || mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext);
      const isVid = m.type === "video" || mime.startsWith("video/") || [".mp4", ".webm", ".mov", ".mkv"].includes(ext);

      const item = {
        _id: m._id,
        id: m._id,
        body: m.body,
        type: isImg ? "image" : isVid ? "video" : m.type || "document",
        mediaUrl: m.mediaUrl,
        fileName: m.fileName || (isImg ? "photo.jpg" : isVid ? "video.mp4" : "file"),
        fileSize: m.fileSize || 0,
        mimeType: m.mimeType || "",
        storageProvider: m.storageProvider || "local",
        sender: m.sender,
        createdAt: m.createdAt,
      };

      if (isImg) {
        photos.push(item);
      } else if (isVid) {
        videos.push(item);
      } else {
        files.push(item);
      }
    }

    res.json({
      success: true,
      totalCount: messages.length,
      photos,
      videos,
      files,
    });
  } catch (err) {
    console.error("Get Attachments Error:", err);
    res.status(500).json({ success: false, message: "Failed to retrieve conversation attachments." });
  }
});

// @route   POST /api/messages/conversations/:id/messages
// @desc    Send a message via REST API (with deduplication & validation)
// @access  Private
router.post("/conversations/:id/messages", verifyToken, writeLimiter, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;
    const { body, type = "text", replyTo, clientMessageId } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: "Message content cannot be empty." });
    }

    // Verify membership
    const membership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
    });

    if (!membership || ["blocked", "declined", "left"].includes(membership.status)) {
      return res.status(403).json({ success: false, message: "Cannot send messages to this conversation." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    if (conversation.status === "declined" || conversation.status === "blocked") {
      return res.status(403).json({ success: false, message: "Conversation is no longer active." });
    }

    // Throttling / Deduplication on reconnect
    if (clientMessageId) {
      const existing = await Message.findOne({
        conversation: conversationId,
        clientMessageId,
      }).populate("sender", "_id name username avatar");

      if (existing) {
        return res.json({ success: true, message: existing, duplicate: true });
      }
    }

    // Verify reply target if provided
    let verifiedReplyId = null;
    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      const replyMsg = await Message.findOne({ _id: replyTo, conversation: conversationId });
      if (replyMsg) verifiedReplyId = replyMsg._id;
    }

    const newMsg = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      body: body.trim().slice(0, 4000),
      type,
      replyTo: verifiedReplyId,
      clientMessageId: clientMessageId || null,
    });

    // Update conversation lastMessage
    conversation.lastMessage = {
      text: newMsg.body.slice(0, 150),
      sender: currentUserId,
      createdAt: newMsg.createdAt,
      type: newMsg.type,
    };
    conversation.lastMessageAt = newMsg.createdAt;
    await conversation.save();

    // Increment unread count for other members
    await ConversationMember.updateMany(
      { conversation: conversationId, user: { $ne: currentUserId } },
      { $inc: { unreadCount: 1 } }
    );

    const populated = await Message.findById(newMsg._id)
      .populate("sender", "_id name username avatar")
      .populate("replyTo", "_id body sender isDeletedForEveryone type")
      .lean();

    const otherMemberIds = await ConversationMember.find({
      conversation: conversationId,
      user: { $ne: currentUserId },
    }).distinct("user");

    // Real-time broadcast
    broadcastNewMessage(conversationId, populated, otherMemberIds, conversation);

    res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// @route   POST /api/messages/conversations/:id/media
// @desc    Upload media or document attachment and send message in conversation
// @access  Private
router.post(
  "/conversations/:id/media",
  verifyToken,
  writeLimiter,
  (req, res, next) => {
    const uploadSingle = mediaUpload.fields([
      { name: "file", maxCount: 1 },
      { name: "image", maxCount: 1 },
      { name: "media", maxCount: 1 },
    ]);
    uploadSingle(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message || "File upload failed." });
      }
      if (!req.file) {
        if (req.files?.file?.[0]) req.file = req.files.file[0];
        else if (req.files?.image?.[0]) req.file = req.files.image[0];
        else if (req.files?.media?.[0]) req.file = req.files.media[0];
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const conversationId = req.params.id;
      const currentUserId = req.user.id;
      const caption = (req.body.caption || "").trim().slice(0, 500);
      const replyTo = req.body.replyTo;
      const clientMessageId = req.body.clientMessageId;

      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file provided for upload." });
      }

      // Verify active membership
      const membership = await ConversationMember.findOne({
        conversation: conversationId,
        user: currentUserId,
      });

      if (!membership || ["blocked", "declined", "left"].includes(membership.status)) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.status(403).json({ success: false, message: "Cannot send media to this conversation." });
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.status(404).json({ success: false, message: "Conversation not found." });
      }

      if (conversation.status === "declined" || conversation.status === "blocked") {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return res.status(403).json({ success: false, message: "Conversation is no longer active." });
      }

      // Check reply target
      let verifiedReplyId = null;
      if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
        const replyMsg = await Message.findOne({ _id: replyTo, conversation: conversationId });
        if (replyMsg) verifiedReplyId = replyMsg._id;
      }

      const rawCategory = getMediaCategory(req.file.mimetype, req.file.originalname);
      const mediaType = ["image", "video", "audio", "document"].includes(rawCategory) ? rawCategory : "document";
      const originalName = req.file.originalname || "attachment";
      const fileSize = req.file.size || 0;
      const mimeType = req.file.mimetype || "";
      let mediaUrl = `/uploads/messages/${req.file.filename}`;
      let storageProvider = "local";
      let driveFileId = "";

      // Stream file to Google Drive if connected and available
      const driveResult = await tryUploadToGoogleDrive({
        filePath: req.file.path,
        originalName,
        mimeType,
        user: req.user,
      });

      if (driveResult?.deliveryUrl) {
        mediaUrl = driveResult.deliveryUrl;
        storageProvider = "google_drive";
        driveFileId = driveResult.driveFileId;
      }

      const newMsg = await Message.create({
        conversation: conversationId,
        sender: currentUserId,
        body: caption,
        type: mediaType,
        mediaUrl,
        fileName: originalName,
        fileSize,
        mimeType,
        driveFileId,
        storageProvider,
        replyTo: verifiedReplyId,
        clientMessageId: clientMessageId || null,
      });

      // Update conversation preview with appropriate icon
      let previewText = caption;
      if (!previewText) {
        if (mediaType === "image") previewText = "📷 Photo";
        else if (mediaType === "video") previewText = "🎥 Video";
        else if (mediaType === "audio") previewText = "🎵 Audio Note";
        else previewText = `📄 ${originalName}`;
      } else {
        if (mediaType === "image") previewText = `📷 ${caption}`;
        else if (mediaType === "video") previewText = `🎥 ${caption}`;
        else if (mediaType === "audio") previewText = `🎵 ${caption}`;
        else previewText = `📄 ${caption}`;
      }

      conversation.lastMessage = {
        text: previewText,
        sender: currentUserId,
        createdAt: newMsg.createdAt,
        type: mediaType,
      };
      conversation.lastMessageAt = newMsg.createdAt;
      await conversation.save();

      // Increment unread count for other members
      await ConversationMember.updateMany(
        { conversation: conversationId, user: { $ne: currentUserId }, status: "active" },
        { $inc: { unreadCount: 1 } }
      );

      const populated = await Message.findById(newMsg._id)
        .populate("sender", "_id name username avatar")
        .populate("replyTo", "_id body sender isDeletedForEveryone type")
        .lean();

      const otherMemberIds = await ConversationMember.find({
        conversation: conversationId,
        user: { $ne: currentUserId },
        status: "active",
      }).distinct("user");

      broadcastNewMessage(conversationId, populated, otherMemberIds, conversation);

      res.status(201).json({
        success: true,
        message: populated,
      });
    } catch (err) {
      console.error("Upload Media Error:", err);
      res.status(500).json({ success: false, message: "Failed to upload media message." });
    }
  }
);

// @route   POST /api/messages/conversations/:id/upload/init
// @desc    Initialize chunked upload for large attachments (up to 1 GB)
// @access  Private
router.post("/conversations/:id/upload/init", verifyToken, writeLimiter, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;
    const { fileName, fileSize } = req.body;

    const membership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: "Cannot send files to this conversation." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.status === "declined" || conversation.status === "blocked") {
      return res.status(403).json({ success: false, message: "Conversation is no longer active." });
    }

    const ext = path.extname(fileName || "").toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ success: false, message: "This file type is not allowed for security reasons." });
    }

    if (fileSize > 1024 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "File exceeds the 1 GB maximum limit." });
    }

    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const uploadDir = path.join(messagesUploadDir, "chunks", uploadId);
    fs.mkdirSync(uploadDir, { recursive: true });

    const chunkSize = 5 * 1024 * 1024; // 5 MB recommended chunk
    const totalChunks = fileSize ? Math.ceil(fileSize / chunkSize) : 1;

    res.json({
      success: true,
      uploadId,
      chunkSize,
      totalChunks,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to initialize upload: " + err.message });
  }
});

// @route   POST /api/messages/conversations/:id/upload/chunk
// @desc    Upload an individual binary chunk
// @access  Private
router.post(
  "/conversations/:id/upload/chunk",
  verifyToken,
  (req, res, next) => {
    chunkUpload.single("chunk")(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message });
      next();
    });
  },
  async (req, res) => {
    try {
      const { uploadId, chunkIndex } = req.body;
      if (!uploadId || chunkIndex === undefined || !req.file) {
        return res.status(400).json({ success: false, message: "Missing chunk data or uploadId." });
      }

      const uploadDir = path.join(messagesUploadDir, "chunks", uploadId);
      if (!fs.existsSync(uploadDir)) {
        return res.status(404).json({ success: false, message: "Upload session not found or expired." });
      }

      const chunkPath = path.join(uploadDir, `chunk_${String(chunkIndex).padStart(5, "0")}`);
      fs.writeFileSync(chunkPath, req.file.buffer);

      res.json({ success: true, chunkIndex: Number(chunkIndex) });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to save chunk: " + err.message });
    }
  }
);

// @route   POST /api/messages/conversations/:id/upload/complete
// @desc    Assemble all chunks into final file, stream to Google Drive, and create message
// @access  Private
router.post("/conversations/:id/upload/complete", verifyToken, writeLimiter, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;
    const { uploadId, fileName, totalChunks, caption, replyTo, clientMessageId, mimeType: providedMime } = req.body;

    const membership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });
    if (!membership) {
      return res.status(403).json({ success: false, message: "Cannot send files to this conversation." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.status === "declined" || conversation.status === "blocked") {
      return res.status(403).json({ success: false, message: "Conversation is no longer active." });
    }

    const uploadDir = path.join(messagesUploadDir, "chunks", uploadId);
    if (!fs.existsSync(uploadDir)) {
      return res.status(404).json({ success: false, message: "Upload session not found or already completed." });
    }

    const ext = path.extname(fileName || "").toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch (_) {}
      return res.status(400).json({ success: false, message: "This file type is not allowed for security reasons." });
    }

    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const finalFilename = `attachment-${currentUserId}-${uniqueSuffix}${ext}`;
    const finalFilePath = path.join(messagesUploadDir, finalFilename);

    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(finalFilePath);
      writeStream.on("error", reject);
      writeStream.on("finish", resolve);

      for (let i = 0; i < Number(totalChunks); i++) {
        const chunkPath = path.join(uploadDir, `chunk_${String(i).padStart(5, "0")}`);
        if (!fs.existsSync(chunkPath)) {
          writeStream.destroy();
          try { fs.unlinkSync(finalFilePath); } catch (_) {}
          return reject(new Error(`Missing chunk ${i}. Please retry.`));
        }
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
      }
      writeStream.end();
    });

    // Clean up temporary chunks
    try { fs.rmSync(uploadDir, { recursive: true, force: true }); } catch (_) {}

    const fileStats = fs.statSync(finalFilePath);
    const mimeType = providedMime || "application/octet-stream";
    const rawCategory = getMediaCategory(mimeType, fileName);
    const mediaType = ["image", "video", "audio", "document"].includes(rawCategory) ? rawCategory : "document";

    let mediaUrl = `/uploads/messages/${finalFilename}`;
    let storageProvider = "local";
    let driveFileId = "";

    // Stream file to Google Drive if available
    const driveResult = await tryUploadToGoogleDrive({
      filePath: finalFilePath,
      originalName: fileName,
      mimeType,
      user: req.user,
    });

    if (driveResult?.deliveryUrl) {
      mediaUrl = driveResult.deliveryUrl;
      storageProvider = "google_drive";
      driveFileId = driveResult.driveFileId;
    }

    let verifiedReplyId = null;
    if (replyTo && mongoose.Types.ObjectId.isValid(replyTo)) {
      const replyMsg = await Message.findOne({ _id: replyTo, conversation: conversationId });
      if (replyMsg) verifiedReplyId = replyMsg._id;
    }

    const newMsg = await Message.create({
      conversation: conversationId,
      sender: currentUserId,
      body: (caption || "").trim().slice(0, 500),
      type: mediaType,
      mediaUrl,
      fileName: fileName || "file",
      fileSize: fileStats.size,
      mimeType,
      driveFileId,
      storageProvider,
      replyTo: verifiedReplyId,
      clientMessageId: clientMessageId || null,
    });

    // Update conversation preview with appropriate icon
    let previewText = caption;
    if (!previewText) {
      if (mediaType === "image") previewText = "📷 Photo";
      else if (mediaType === "video") previewText = "🎥 Video";
      else if (mediaType === "audio") previewText = "🎵 Audio Note";
      else previewText = `📄 ${fileName || "Document"}`;
    } else {
      if (mediaType === "image") previewText = `📷 ${caption}`;
      else if (mediaType === "video") previewText = `🎥 ${caption}`;
      else if (mediaType === "audio") previewText = `🎵 ${caption}`;
      else previewText = `📄 ${caption}`;
    }

    conversation.lastMessage = {
      text: previewText,
      sender: currentUserId,
      createdAt: newMsg.createdAt,
      type: mediaType,
    };
    conversation.lastMessageAt = newMsg.createdAt;
    await conversation.save();

    await ConversationMember.updateMany(
      { conversation: conversationId, user: { $ne: currentUserId }, status: "active" },
      { $inc: { unreadCount: 1 } }
    );

    const populated = await Message.findById(newMsg._id)
      .populate("sender", "_id name username avatar")
      .populate("replyTo", "_id body sender isDeletedForEveryone type")
      .lean();

    const otherMemberIds = await ConversationMember.find({
      conversation: conversationId,
      user: { $ne: currentUserId },
      status: "active",
    }).distinct("user");

    broadcastNewMessage(conversationId, populated, otherMemberIds, conversation);

    res.status(201).json({
      success: true,
      message: populated,
    });
  } catch (err) {
    console.error("Complete Upload Error:", err);
    res.status(500).json({ success: false, message: "Failed to assemble and complete upload: " + err.message });
  }
});

// @route   PATCH /api/messages/conversations/:id/messages/:messageId
// @desc    Edit a previously sent message within 15 minutes
// @access  Private
router.patch("/conversations/:id/messages/:messageId", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const currentUserId = req.user.id;
    const { body: newBody } = req.body;

    if (!newBody || !newBody.trim()) {
      return res.status(400).json({ success: false, message: "Message content cannot be empty." });
    }

    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    if (message.sender.toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: "You can only edit your own messages." });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({ success: false, message: "Cannot edit a deleted message." });
    }

    // 15-minute edit window limit
    const EDIT_WINDOW_MS = 15 * 60 * 1000;
    const ageMs = Date.now() - new Date(message.createdAt).getTime();
    if (ageMs > EDIT_WINDOW_MS) {
      return res.status(400).json({
        success: false,
        message: "Edit window has expired. Messages can only be edited within 15 minutes of sending.",
      });
    }

    message.body = newBody.trim().slice(0, 4000);
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // If this was conversation lastMessage, update preview
    const conv = await Conversation.findById(conversationId);
    if (
      conv &&
      conv.lastMessage &&
      conv.lastMessage.createdAt &&
      new Date(conv.lastMessage.createdAt).getTime() === new Date(message.createdAt).getTime()
    ) {
      conv.lastMessage.text = message.body;
      await conv.save();
    }

    const populated = await Message.findById(message._id)
      .populate("sender", "_id name username avatar")
      .populate("replyTo", "_id body sender isDeletedForEveryone type")
      .lean();

    const formatted = {
      ...populated,
      conversationId,
    };

    // Socket.IO broadcast to room
    try {
      const io = getIO();
      if (io) {
        io.to(`conv:${conversationId}`).emit("message_edited", {
          conversationId,
          message: formatted,
        });
      }
    } catch {
      // Ignore if socket offline
    }

    res.json({
      success: true,
      message: formatted,
    });
  } catch (err) {
    console.error("Edit Message Error:", err);
    res.status(500).json({ success: false, message: "Failed to edit message." });
  }
});

// @route   DELETE /api/messages/conversations/:id/messages/:messageId
// @desc    Delete message ("everyone" within 1 hour or "me" anytime)
// @access  Private
router.delete("/conversations/:id/messages/:messageId", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const currentUserId = req.user.id;
    const deleteType = req.body?.deleteType || req.query?.deleteType || "everyone"; // "everyone" | "me"

    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    if (deleteType === "me") {
      // Record "Delete for me"
      await MessageDeletion.findOneAndUpdate(
        { message: messageId, user: currentUserId },
        { message: messageId, user: currentUserId, deletedAt: new Date() },
        { upsert: true, new: true }
      );

      return res.json({
        success: true,
        deleteType: "me",
        messageId,
      });
    }

    // Delete for everyone
    const isSender = message.sender.toString() === currentUserId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isSender && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages for everyone.",
      });
    }

    // 1-hour time window for non-admin sender
    if (!isAdmin) {
      const DELETE_WINDOW_MS = 60 * 60 * 1000;
      const ageMs = Date.now() - new Date(message.createdAt).getTime();
      if (ageMs > DELETE_WINDOW_MS) {
        return res.status(400).json({
          success: false,
          message: "Delete for everyone window has expired (1 hour limit). You can still delete for yourself.",
        });
      }
    }

    message.isDeletedForEveryone = true;
    message.deletedForEveryoneAt = new Date();
    message.body = "This message was deleted";
    message.mediaUrl = "";
    await message.save();

    // If conversation lastMessage was this message, update preview
    const conv = await Conversation.findById(conversationId);
    if (
      conv &&
      conv.lastMessage &&
      conv.lastMessage.createdAt &&
      new Date(conv.lastMessage.createdAt).getTime() === new Date(message.createdAt).getTime()
    ) {
      conv.lastMessage.text = "This message was deleted";
      await conv.save();
    }

    // Socket.IO broadcast to room
    try {
      const io = getIO();
      if (io) {
        io.to(`conv:${conversationId}`).emit("message_deleted", {
          conversationId,
          messageId,
          deleteType: "everyone",
          deletedForEveryoneAt: message.deletedForEveryoneAt,
        });
      }
    } catch {
      // Ignore if socket offline
    }

    res.json({
      success: true,
      deleteType: "everyone",
      messageId,
    });
  } catch (err) {
    console.error("Delete Message Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete message." });
  }
});

// @route   POST /api/messages/conversations/:id/messages/:messageId/react
// @desc    Add, toggle, or change an emoji reaction on a message
// @access  Private
router.post("/conversations/:id/messages/:messageId/react", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const currentUserId = req.user.id;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string" || !emoji.trim()) {
      return res.status(400).json({ success: false, message: "Valid emoji string is required." });
    }

    const cleanEmoji = emoji.trim();

    // Verify conversation membership
    const membership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: "Cannot react to messages in this conversation." });
    }

    const message = await Message.findOne({ _id: messageId, conversation: conversationId });
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    if (message.isDeletedForEveryone) {
      return res.status(400).json({ success: false, message: "Cannot react to a deleted message." });
    }

    if (!Array.isArray(message.reactions)) {
      message.reactions = [];
    }

    // Check if user already reacted
    const existingIndex = message.reactions.findIndex(
      (r) => r.user && r.user.toString() === currentUserId.toString()
    );

    if (existingIndex > -1) {
      const existingReaction = message.reactions[existingIndex];
      if (existingReaction.emoji === cleanEmoji) {
        // Toggle off / remove reaction
        message.reactions.splice(existingIndex, 1);
      } else {
        // Change reaction to new emoji
        message.reactions[existingIndex].emoji = cleanEmoji;
        message.reactions[existingIndex].createdAt = new Date();
      }
    } else {
      // Add new reaction
      message.reactions.push({
        emoji: cleanEmoji,
        user: currentUserId,
        createdAt: new Date(),
      });
    }

    await message.save();

    // Populate user info on reactions
    const updated = await Message.findById(messageId)
      .populate("reactions.user", "_id name username avatar")
      .lean();

    const io = getIO();
    try {
      io.to(`conv:${conversationId}`).emit("message_reaction_updated", {
        conversationId,
        messageId,
        reactions: updated.reactions || [],
      });
    } catch (e) {
      console.warn("Socket reaction emit error:", e.message);
    }

    res.json({
      success: true,
      messageId,
      reactions: updated.reactions || [],
    });
  } catch (err) {
    console.error("React to message error:", err);
    res.status(500).json({ success: false, message: "Failed to update reaction." });
  }
});

// @route   PATCH /api/messages/conversations/:id/preferences
// @desc    Update conversation preferences (pin, mute, archive) for the caller
// @access  Private
router.patch("/conversations/:id/preferences", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;
    const { isPinned, isMuted, isArchived } = req.body;

    const membership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
      status: "active",
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: "You are not a member of this conversation." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    if (!Array.isArray(conversation.pinnedBy)) conversation.pinnedBy = [];
    if (!Array.isArray(conversation.mutedBy)) conversation.mutedBy = [];
    if (!Array.isArray(conversation.archivedBy)) conversation.archivedBy = [];

    // Update pinnedBy
    if (typeof isPinned === "boolean") {
      if (isPinned) {
        if (!conversation.pinnedBy.some((uid) => uid.toString() === currentUserId)) {
          conversation.pinnedBy.push(currentUserId);
        }
      } else {
        conversation.pinnedBy = conversation.pinnedBy.filter((uid) => uid.toString() !== currentUserId);
      }
    }

    // Update mutedBy
    if (typeof isMuted === "boolean") {
      if (isMuted) {
        if (!conversation.mutedBy.some((uid) => uid.toString() === currentUserId)) {
          conversation.mutedBy.push(currentUserId);
        }
      } else {
        conversation.mutedBy = conversation.mutedBy.filter((uid) => uid.toString() !== currentUserId);
      }
    }

    // Update archivedBy
    if (typeof isArchived === "boolean") {
      if (isArchived) {
        if (!conversation.archivedBy.some((uid) => uid.toString() === currentUserId)) {
          conversation.archivedBy.push(currentUserId);
        }
      } else {
        conversation.archivedBy = conversation.archivedBy.filter((uid) => uid.toString() !== currentUserId);
      }
    }

    await conversation.save();

    res.json({
      success: true,
      preferences: {
        isPinned: conversation.pinnedBy.some((uid) => uid.toString() === currentUserId),
        isMuted: conversation.mutedBy.some((uid) => uid.toString() === currentUserId),
        isArchived: conversation.archivedBy.some((uid) => uid.toString() === currentUserId),
      },
    });
  } catch (err) {
    console.error("Preferences Update Error:", err);
    res.status(500).json({ success: false, message: "Failed to update conversation preferences." });
  }
});

// @route   POST /api/messages/conversations/:id/respond
// @desc    Accept, Decline, or Block a pending message request
// @access  Private
router.post("/conversations/:id/respond", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;
    const { action } = req.body; // 'accept' | 'decline' | 'block'

    if (!["accept", "decline", "block"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid response action." });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const myMembership = await ConversationMember.findOne({
      conversation: conversationId,
      user: currentUserId,
    });

    if (!myMembership) {
      return res.status(403).json({ success: false, message: "You are not a member of this conversation." });
    }

    const otherMember = await ConversationMember.findOne({
      conversation: conversationId,
      user: { $ne: currentUserId },
    });

    if (action === "accept") {
      conversation.status = "active";
      await conversation.save();

      myMembership.status = "active";
      await myMembership.save();

      return res.json({ success: true, message: "Message request accepted." });
    }

    if (action === "decline") {
      conversation.status = "declined";
      await conversation.save();

      myMembership.status = "declined";
      await myMembership.save();

      return res.json({ success: true, message: "Message request declined." });
    }

    if (action === "block") {
      conversation.status = "blocked";
      await conversation.save();

      myMembership.status = "blocked";
      await myMembership.save();

      if (otherMember) {
        await Block.findOneAndUpdate(
          { blocker: currentUserId, blocked: otherMember.user },
          { blocker: currentUserId, blocked: otherMember.user },
          { upsert: true }
        );
      }

      return res.json({ success: true, message: "User blocked and request dismissed." });
    }
  } catch (err) {
    console.error("Respond Request Error:", err);
    res.status(500).json({ success: false, message: "Failed to process request." });
  }
});

// @route   POST /api/messages/conversations/:id/read
// @desc    Mark conversation as read by current user
// @access  Private
router.post("/conversations/:id/read", verifyToken, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user.id;

    await ConversationMember.updateOne(
      { conversation: conversationId, user: currentUserId },
      { unreadCount: 0, lastReadAt: new Date() }
    );

    try {
      const io = getIO();
      io.to(`conv:${conversationId}`).emit("conversation_read", {
        conversationId,
        readerId: currentUserId,
        readAt: new Date(),
      });
    } catch {
      // Ignore socket error
    }

    res.json({ success: true, message: "Marked as read." });
  } catch (err) {
    console.error("Mark Read Error:", err);
    res.status(500).json({ success: false, message: "Failed to mark as read." });
  }
});

// ==========================================
// PHASE 4: BLOCKING & REPORTING ENDPOINTS
// ==========================================

// @route   POST /api/messages/block
// @desc    Block a user
// @access  Private
router.post("/block", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    if (!targetUserId || targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: "Invalid target user." });
    }

    await Block.findOneAndUpdate(
      { blocker: currentUserId, blocked: targetUserId },
      { blocker: currentUserId, blocked: targetUserId },
      { upsert: true, new: true }
    );

    // Update any direct conversation status
    const myMemberships = await ConversationMember.find({ user: currentUserId }).distinct("conversation");
    const otherMember = await ConversationMember.findOne({
      conversation: { $in: myMemberships },
      user: targetUserId,
    });

    if (otherMember) {
      await Conversation.updateOne({ _id: otherMember.conversation, type: "direct" }, { status: "blocked" });
    } else {
      await Conversation.updateMany(
        {
          type: "direct",
          $or: [
            { directUserA: currentUserId, directUserB: targetUserId },
            { directUserA: targetUserId, directUserB: currentUserId },
          ],
        },
        { status: "blocked" }
      );
    }

    res.json({ success: true, message: "User blocked successfully." });
  } catch (err) {
    console.error("Block User Error:", err);
    res.status(500).json({ success: false, message: "Failed to block user." });
  }
});

// @route   POST /api/messages/unblock
// @desc    Unblock a previously blocked user
// @access  Private
router.post("/unblock", verifyToken, writeLimiter, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "Target user ID required." });
    }

    await Block.deleteOne({ blocker: currentUserId, blocked: targetUserId });

    // If other user has not blocked caller, restore direct conversation to active
    const reverseBlocked = await Block.exists({ blocker: targetUserId, blocked: currentUserId });
    if (!reverseBlocked) {
      const myMemberships = await ConversationMember.find({ user: currentUserId }).distinct("conversation");
      const otherMember = await ConversationMember.findOne({
        conversation: { $in: myMemberships },
        user: targetUserId,
      });

      if (otherMember) {
        await Conversation.updateOne({ _id: otherMember.conversation, type: "direct" }, { status: "active" });
      } else {
        await Conversation.updateMany(
          {
            type: "direct",
            $or: [
              { directUserA: currentUserId, directUserB: targetUserId },
              { directUserA: targetUserId, directUserB: currentUserId },
            ],
          },
          { status: "active" }
        );
      }
    }

    res.json({ success: true, message: "User unblocked successfully." });
  } catch (err) {
    console.error("Unblock User Error:", err);
    res.status(500).json({ success: false, message: "Failed to unblock user." });
  }
});

// @route   GET /api/messages/blocked
// @desc    Get list of users blocked by caller
// @access  Private
router.get("/blocked", verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const blockedRecords = await Block.find({ blocker: currentUserId })
      .populate("blocked", "_id name username avatar")
      .lean();

    const users = blockedRecords.map((b) => b.blocked).filter(Boolean);
    res.json({ success: true, users, blockedUsers: users });
  } catch (err) {
    console.error("Get Blocked Users Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch blocked users." });
  }
});

// @route   POST /api/messages/report
// @desc    Report a citizen or a specific message
// @access  Private
router.post("/report", verifyToken, writeLimiter, async (req, res) => {
  try {
    const targetUserId = req.body.targetUserId || req.body.reportedUserId;
    const targetMessageId = req.body.targetMessageId || req.body.messageId;
    const targetConversationId = req.body.targetConversationId || req.body.conversationId;
    const reason = req.body.reason;
    const details = req.body.details || req.body.description || "";
    const currentUserId = req.user.id;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: "Target user ID is required." });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: "You cannot report your own account." });
    }

    const validReasons = ["spam", "harassment", "inappropriate", "fraud", "other"];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: `Invalid reason. Must be one of: ${validReasons.join(", ")}`,
      });
    }

    const report = await Report.create({
      reporter: currentUserId,
      targetUser: targetUserId,
      targetMessage: targetMessageId || null,
      targetConversation: targetConversationId || null,
      reason,
      details: (details || "").trim().slice(0, 1000),
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message: "Report submitted successfully to the portal moderation desk.",
      reportId: report._id,
      report,
    });
  } catch (err) {
    console.error("Report Error:", err);
    res.status(500).json({ success: false, message: "Failed to submit report." });
  }
});

// ==========================================
// ADMIN MODERATION ENDPOINTS (Admin Only)
// ==========================================

// @route   GET /api/messages/moderation/reports
// @desc    List all reports for portal administrators
// @access  Private (Admin Only)
router.get("/moderation/reports", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status = "all", page = 1, limit = 20 } = req.query;

    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [total, reports] = await Promise.all([
      Report.countDocuments(query),
      Report.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate("reporter", "_id name username email")
        .populate("targetUser", "_id name username email status")
        .populate("targetMessage", "_id body createdAt type")
        .populate("moderatedBy", "_id name email")
        .lean(),
    ]);

    res.json({
      success: true,
      reports,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 0,
      },
    });
  } catch (err) {
    console.error("Fetch Moderation Reports Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch reports." });
  }
});

// @route   PATCH /api/messages/moderation/reports/:id
// @desc    Update report status and optionally take action (e.g. suspend user)
// @access  Private (Admin Only)
router.patch("/moderation/reports/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { status, moderatorNotes, suspendUser } = req.body;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found." });
    }

    if (status && ["pending", "reviewed", "dismissed", "action_taken"].includes(status)) {
      report.status = status;
    }
    if (moderatorNotes !== undefined) {
      report.moderatorNotes = String(moderatorNotes).trim().slice(0, 1000);
    }

    report.moderatedBy = req.user.id;
    report.moderatedAt = new Date();

    if (suspendUser) {
      await User.updateOne({ _id: report.targetUser }, { status: "suspended" });
      report.status = "action_taken";
    }

    await report.save();

    res.json({
      success: true,
      message: "Report updated successfully.",
      report,
    });
  } catch (err) {
    console.error("Update Report Error:", err);
    res.status(500).json({ success: false, message: "Failed to update report." });
  }
});

export default router;
