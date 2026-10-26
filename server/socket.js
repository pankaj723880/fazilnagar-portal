import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import RevokedToken from "./models/RevokedToken.js";
import User from "./models/User.js";
import Conversation from "./models/Conversation.js";
import ConversationMember from "./models/ConversationMember.js";
import Message from "./models/Message.js";
import { isOriginAllowed } from "./utils/corsConfig.js";

let io = null;
const onlineUsers = new Map(); // userId -> Set of socket IDs

export function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

export function isUserOnline(userId) {
  return onlineUsers.has(String(userId));
}

export function initSocket(httpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          return callback(null, true);
        }
        return callback(new Error("Socket CORS violation: Access denied"), false);
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  // Socket.IO authentication middleware using existing JWT verification
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const isRevoked = await RevokedToken.exists({ token });
      if (isRevoked) {
        return next(new Error("Session expired or token revoked"));
      }

      const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
      const decoded = jwt.verify(token, secretKey);

      // Verify user in MongoDB
      const user = await User.findById(decoded.id).select("role status");
      if (!user || user.status === "inactive" || user.status === "suspended") {
        return next(new Error("Account inactive or unauthorized"));
      }

      socket.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || user.role,
      };

      next();
    } catch (err) {
      next(new Error("Authentication failed: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.id;
    if (userId) {
      // Join personal room for private notifications, requests, and badge updates
      socket.join(`user:${userId}`);

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      const userSockets = onlineUsers.get(userId);
      userSockets.add(socket.id);

      if (userSockets.size === 1) {
        io.emit("user_online", { userId });
      }

      // Update lastSeen in background
      User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(() => {});
    }

    // Client requests list of all active online citizens
    socket.on("get_online_users", (callback) => {
      const activeIds = Array.from(onlineUsers.keys());
      if (typeof callback === "function") {
        callback({ success: true, onlineUserIds: activeIds });
      } else {
        socket.emit("online_users_list", { onlineUserIds: activeIds });
      }
    });

    // 1. Join Conversation Room (Server validates membership)
    socket.on("join_conversation", async (data, callback) => {
      try {
        const conversationId = data?.conversationId;
        if (!conversationId) {
          if (callback) callback({ success: false, message: "Conversation ID required" });
          return;
        }

        const isMember = await ConversationMember.exists({
          conversation: conversationId,
          user: userId,
          status: { $in: ["active", "pending_approval"] },
        });

        if (!isMember) {
          socket.emit("socket_error", { message: "Unauthorized: not a member of this conversation." });
          if (callback) callback({ success: false, message: "Unauthorized" });
          return;
        }

        socket.join(`conv:${conversationId}`);
        if (callback) callback({ success: true, joined: conversationId });
      } catch (err) {
        console.warn("Socket join_conversation error:", err.message);
        if (callback) callback({ success: false, message: err.message });
      }
    });

    // 2. Leave Conversation Room
    socket.on("leave_conversation", (data) => {
      const conversationId = data?.conversationId;
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    // 3. Real-time Send Message over Socket
    socket.on("send_message", async (data, callback) => {
      try {
        const { conversationId, body, type = "text", replyTo, clientMessageId } = data || {};
        if (!conversationId || !body || !body.trim()) {
          if (callback) callback({ success: false, message: "Invalid message data" });
          return;
        }

        // Verify membership & status
        const membership = await ConversationMember.findOne({
          conversation: conversationId,
          user: userId,
        });

        if (!membership || ["blocked", "declined", "left"].includes(membership.status)) {
          if (callback) callback({ success: false, message: "Unauthorized or blocked" });
          return;
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || conversation.status === "declined" || conversation.status === "blocked") {
          if (callback) callback({ success: false, message: "Conversation is inactive" });
          return;
        }

        // Throttling / Deduplication
        if (clientMessageId) {
          const existing = await Message.findOne({
            conversation: conversationId,
            clientMessageId,
          }).populate("sender", "_id name username avatar");

          if (existing) {
            if (callback) callback({ success: true, message: existing, duplicate: true });
            return;
          }
        }

        const newMsg = await Message.create({
          conversation: conversationId,
          sender: userId,
          body: body.trim().slice(0, 4000),
          type,
          replyTo: replyTo || null,
          clientMessageId: clientMessageId || null,
        });

        conversation.lastMessage = {
          text: newMsg.body.slice(0, 150),
          sender: userId,
          createdAt: newMsg.createdAt,
          type: newMsg.type,
        };
        conversation.lastMessageAt = newMsg.createdAt;
        await conversation.save();

        await ConversationMember.updateMany(
          { conversation: conversationId, user: { $ne: userId } },
          { $inc: { unreadCount: 1 } }
        );

        const populated = await Message.findById(newMsg._id)
          .populate("sender", "_id name username avatar")
          .populate("replyTo", "_id body sender isDeletedForEveryone type")
          .lean();

        // Broadcast to conversation room
        io.to(`conv:${conversationId}`).emit("new_message", populated);

        // Notify other members' personal rooms for unread badge updates
        const otherMemberIds = await ConversationMember.find({
          conversation: conversationId,
          user: { $ne: userId },
        }).distinct("user");

        for (const rid of otherMemberIds) {
          io.to(`user:${rid}`).emit("conversation_updated", {
            conversationId,
            lastMessage: conversation.lastMessage,
            lastMessageAt: conversation.lastMessageAt,
          });
        }

        if (callback) callback({ success: true, message: populated });
      } catch (err) {
        console.error("Socket send_message error:", err);
        if (callback) callback({ success: false, message: "Failed to send message" });
      }
    });

    // 4. Typing indicator
    socket.on("typing", (data) => {
      const conversationId = data?.conversationId;
      if (conversationId) {
        socket.to(`conv:${conversationId}`).emit("user_typing", {
          conversationId,
          userId,
          username: socket.user?.username || "",
        });
      }
    });

    socket.on("stop_typing", (data) => {
      const conversationId = data?.conversationId;
      if (conversationId) {
        socket.to(`conv:${conversationId}`).emit("user_stop_typing", {
          conversationId,
          userId,
        });
      }
    });

    // 5. Mark read event
    socket.on("mark_read", async (data) => {
      const conversationId = data?.conversationId;
      if (conversationId) {
        await ConversationMember.updateOne(
          { conversation: conversationId, user: userId },
          { unreadCount: 0, lastReadAt: new Date() }
        );
        socket.to(`conv:${conversationId}`).emit("conversation_read", {
          conversationId,
          readerId: userId,
          readAt: new Date(),
        });
        socket.emit("conversation_marked_read", {
          conversationId,
          readerId: userId,
          readAt: new Date(),
        });
      }
    });

    // 6. Message Reaction
    socket.on("message_react", async (data, callback) => {
      try {
        const { conversationId, messageId, emoji } = data || {};
        if (!conversationId || !messageId || !emoji) return;

        const membership = await ConversationMember.findOne({
          conversation: conversationId,
          user: userId,
          status: "active",
        });
        if (!membership) return;

        const message = await Message.findOne({ _id: messageId, conversation: conversationId });
        if (!message || message.isDeletedForEveryone) return;

        if (!Array.isArray(message.reactions)) message.reactions = [];

        const cleanEmoji = emoji.trim();
        const existingIndex = message.reactions.findIndex(
          (r) => r.user && r.user.toString() === userId.toString()
        );

        if (existingIndex > -1) {
          if (message.reactions[existingIndex].emoji === cleanEmoji) {
            message.reactions.splice(existingIndex, 1);
          } else {
            message.reactions[existingIndex].emoji = cleanEmoji;
            message.reactions[existingIndex].createdAt = new Date();
          }
        } else {
          message.reactions.push({
            emoji: cleanEmoji,
            user: userId,
            createdAt: new Date(),
          });
        }

        await message.save();

        const updated = await Message.findById(messageId)
          .populate("reactions.user", "_id name username avatar")
          .lean();

        io.to(`conv:${conversationId}`).emit("message_reaction_updated", {
          conversationId,
          messageId,
          reactions: updated.reactions || [],
        });

        if (callback) callback({ success: true, reactions: updated.reactions || [] });
      } catch (err) {
        console.error("Socket message_react error:", err);
      }
    });

    socket.on("disconnect", () => {
      if (userId && onlineUsers.has(userId)) {
        const userSockets = onlineUsers.get(userId);
        userSockets.delete(socket.id);

        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          const now = new Date();
          io.emit("user_offline", { userId, lastSeen: now });
          User.findByIdAndUpdate(userId, { lastSeen: now }).catch(() => {});
        }
      }
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
}

export function emitPlacesUpdated(data) {
  if (io) {
    try {
      const minimalPayload = {
        action: data?.action || "update",
        placeId: data?.placeId || (data?.place?._id ? String(data.place._id) : undefined),
        timestamp: Date.now(),
      };
      io.emit("places_updated", minimalPayload);
    } catch (e) {
      console.warn("[Socket.IO] Broadcast places_updated error:", e.message);
    }
  }
}

