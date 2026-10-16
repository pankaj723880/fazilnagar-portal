import express from "express";
import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import MessageDeletion from "../models/MessageDeletion.js";
import Block from "../models/Block.js";
import User from "../models/User.js";
import Report from "../models/Report.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { writeLimiter } from "../middleware/rateLimiter.js";
import { getIO } from "../socket.js";

const router = express.Router();

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
        groupAvatar: c.groupAvatar || "",
        lastMessage: c.lastMessage,
        lastMessageAt: c.lastMessageAt,
        unreadCount: myMembership.unreadCount || 0,
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
        replyTo: m.replyTo,
        isEdited: m.isEdited,
        editedAt: m.editedAt,
        isDeletedForEveryone: m.isDeletedForEveryone,
        clientMessageId: m.clientMessageId,
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
    const { targetUserId, targetMessageId, targetConversationId, reason, details } = req.body;
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
