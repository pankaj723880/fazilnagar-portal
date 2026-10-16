import { useState, useEffect, useRef } from "react";
import API from "../api";
import { getSocket } from "../socket";
import ReportModal from "./ReportModal";
import GroupDetailsModal from "./GroupDetailsModal";
import {
  Send,
  Loader2,
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
  Reply,
  X,
  Shield,
  ShieldAlert,
  UserX,
  CheckCircle2,
  MoreVertical,
  Flag,
  Ban,
  Pencil,
  Trash2,
  Users,
  Info,
  LogOut,
  Image as ImageIcon,
  Download,
} from "lucide-react";

export default function ChatWindow({
  conversation,
  currentUserId,
  onBack,
  onConversationUpdated,
  onlineUserIds = new Set(),
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [inputText, setInputText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestActionMsg, setRequestActionMsg] = useState("");
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBlocked, setIsBlocked] = useState(conversation?.status === "blocked");
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isNetworkOnline, setIsNetworkOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const conversationId = conversation?._id || conversation?.id;
  const isGroup = conversation?.type === "group";
  const otherUser = conversation?.otherUser || {};
  const isPendingRequest = !isGroup && conversation?.status === "pending" && !conversation?.isInitiator;
  const partnerId = String(otherUser?._id || otherUser?.id || "");
  const isPartnerOnline = !isGroup && partnerId && onlineUserIds?.has?.(partnerId);

  // Flush queued messages when connection is restored
  const flushQueuedMessages = async () => {
    setMessages((prev) => {
      const queuedList = prev.filter((m) => m.status === "queued" || m.status === "failed");
      if (queuedList.length === 0) return prev;

      // Asynchronously flush queued messages in order
      (async () => {
        for (const msg of queuedList) {
          try {
            const res = await API.post(`/messages/conversations/${conversationId}/messages`, {
              body: msg.body,
              type: msg.type || "text",
              replyTo: msg.replyTo?._id,
              clientMessageId: msg.clientMessageId,
            });
            if (res.data?.success) {
              setMessages((cur) =>
                cur.map((m) =>
                  m.clientMessageId === msg.clientMessageId
                    ? { ...res.data.message, status: "sent" }
                    : m
                )
              );
            }
          } catch {
            // Keep status if still unreachable
          }
        }
      })();

      return prev;
    });
  };

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
      flushQueuedMessages();
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [conversationId]);

  // Scroll to bottom helper
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch initial message history
  useEffect(() => {
    let isCancelled = false;
    if (!conversationId) return;

    async function fetchMessages() {
      setLoading(true);
      try {
        const res = await API.get(`/messages/conversations/${conversationId}/messages`, {
          params: { limit: 30 },
        });
        if (!isCancelled && res.data?.success) {
          setMessages(res.data.messages || []);
          setHasMore(Boolean(res.data.hasMore));
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setTimeout(() => scrollToBottom("auto"), 100);
        }
      }
    }

    fetchMessages();

    return () => {
      isCancelled = true;
    };
  }, [conversationId]);

  // Socket.IO Room & Realtime Listener
  useEffect(() => {
    if (!conversationId) return;

    let socket;
    try {
      socket = getSocket();
    } catch {
      return;
    }

    if (!socket) return;

    // Join conversation room
    socket.emit("join_conversation", { conversationId });

    // Mark as read immediately
    socket.emit("mark_read", { conversationId });

    const handleNewMessage = (msg) => {
      if (msg.conversationId === conversationId || msg.conversation === conversationId) {
        setMessages((prev) => {
          // If already in list by clientMessageId or _id, update status
          const idx = prev.findIndex(
            (m) =>
              (msg.clientMessageId && m.clientMessageId === msg.clientMessageId) ||
              m._id === msg._id
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = { ...msg, status: "sent" };
            return next;
          }
          return [...prev, { ...msg, status: "sent" }];
        });

        // Mark read
        socket.emit("mark_read", { conversationId });
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    };

    const handleUserTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = (data) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setIsTyping(false);
      }
    };

    const handleMessageEdited = (data) => {
      if (data?.conversationId === conversationId && data?.message) {
        setMessages((prev) =>
          prev.map((m) => (m._id === data.message._id ? { ...m, ...data.message } : m))
        );
      }
    };

    const handleMessageDeleted = (data) => {
      if (data?.conversationId === conversationId && data?.messageId) {
        if (data.deleteType === "everyone") {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === data.messageId
                ? { ...m, isDeletedForEveryone: true, body: "This message was deleted", mediaUrl: "" }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
        }
      }
    };

    const handleGroupUpdated = (data) => {
      if (data?.conversationId === conversationId && onConversationUpdated) {
        onConversationUpdated({
          ...conversation,
          groupName: data.groupName,
          groupDescription: data.groupDescription,
          groupAvatar: data.groupAvatar,
        });
      }
    };

    const handleConversationLeft = (data) => {
      if (data?.conversationId === conversationId) {
        if (onBack) onBack();
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("group_updated", handleGroupUpdated);
    socket.on("conversation_left", handleConversationLeft);

    return () => {
      socket.emit("leave_conversation", { conversationId });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("group_updated", handleGroupUpdated);
      socket.off("conversation_left", handleConversationLeft);
    };
  }, [conversationId, currentUserId, conversation, onConversationUpdated, onBack]);

  // Load older messages (pagination)
  const handleLoadOlder = async () => {
    if (!hasMore || loadingMore || !messages.length) return;
    setLoadingMore(true);

    try {
      const oldestMsg = messages[0];
      const res = await API.get(`/messages/conversations/${conversationId}/messages`, {
        params: { limit: 30, before: oldestMsg._id },
      });

      if (res.data?.success) {
        const older = res.data.messages || [];
        setMessages((prev) => [...older, ...prev]);
        setHasMore(Boolean(res.data.hasMore));
      }
    } catch (err) {
      console.error("Load older messages error:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle typing debounce
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    try {
      const socket = getSocket();
      if (socket && conversationId) {
        socket.emit("typing", { conversationId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit("stop_typing", { conversationId });
        }, 1500);
      }
    } catch {
      // Ignore socket errors
    }
  };

  // Start editing a message
  const handleStartEdit = (msg) => {
    setEditingMessage(msg);
    setInputText(msg.body);
    setReplyTarget(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText("");
  };

  // Save edited message
  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !editingMessage) return;

    try {
      const res = await API.patch(
        `/messages/conversations/${conversationId}/messages/${editingMessage._id}`,
        { body: text }
      );

      if (res.data?.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === editingMessage._id
              ? { ...m, body: text, isEdited: true, editedAt: new Date().toISOString() }
              : m
          )
        );
        setEditingMessage(null);
        setInputText("");
      }
    } catch (err) {
      alert("Failed to edit message: " + (err.response?.data?.message || err.message));
    }
  };

  // Delete message ("everyone" or "me")
  const handleDeleteMessage = async (deleteType) => {
    if (!deleteTarget) return;
    const msgId = deleteTarget._id;
    setDeleteTarget(null);

    try {
      const res = await API.delete(
        `/messages/conversations/${conversationId}/messages/${msgId}`,
        { data: { deleteType } }
      );

      if (res.data?.success) {
        if (deleteType === "everyone") {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === msgId
                ? { ...m, isDeletedForEveryone: true, body: "This message was deleted", mediaUrl: "" }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== msgId));
        }
      }
    } catch (err) {
      alert("Failed to delete message: " + (err.response?.data?.message || err.message));
    }
  };

  // Resolve full URL for media attachments
  const getFullMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const origin = (API.defaults.baseURL || "").replace(/\/api\/?$/, "");
    return `${origin}${url}`;
  };

  // Handle file selection from file input
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type.toLowerCase())) {
      alert("Only JPEG, PNG, or WebP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image size must be under 5 MB.");
      return;
    }

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  // Clear selected file
  const handleClearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send photo attachment
  const handleSendMedia = async () => {
    if (!selectedFile || !conversationId || uploadingMedia) return;

    setUploadingMedia(true);
    const formData = new FormData();
    formData.append("image", selectedFile);
    if (inputText.trim()) {
      formData.append("caption", inputText.trim());
    }
    if (replyTarget) {
      formData.append("replyTo", replyTarget._id);
    }
    const tempId = `temp-media-${Date.now()}`;
    formData.append("clientMessageId", tempId);

    try {
      const res = await API.post(`/messages/conversations/${conversationId}/media`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data.message) {
        setMessages((prev) => [...prev, res.data.message]);
        handleClearFile();
        setInputText("");
        setReplyTarget(null);
        setTimeout(() => scrollToBottom("smooth"), 50);
      }
    } catch (err) {
      alert("Failed to send image: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingMedia(false);
    }
  };

  // Send Message (Optimistic delivery)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (editingMessage) {
      return handleSaveEdit(e);
    }
    if (selectedFile) {
      return handleSendMedia();
    }
    const text = inputText.trim();
    if (!text || !conversationId) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const optimisticMsg = {
      _id: tempId,
      id: tempId,
      clientMessageId: tempId,
      conversationId,
      body: text,
      type: "text",
      replyTo: replyTarget,
      sender: {
        _id: currentUserId,
        name: "You",
      },
      createdAt: new Date().toISOString(),
      status: "sending",
    };

    // If offline, queue message immediately without failing
    if (!isNetworkOnline) {
      setMessages((prev) => [...prev, { ...optimisticMsg, status: "queued" }]);
      setInputText("");
      setReplyTarget(null);
      setTimeout(() => scrollToBottom("smooth"), 50);
      return;
    }

    // Immediate optimistic update
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");
    setReplyTarget(null);
    setTimeout(() => scrollToBottom("smooth"), 50);

    // Stop typing emit
    try {
      const socket = getSocket();
      if (socket) socket.emit("stop_typing", { conversationId });
    } catch {
      // Ignore
    }

    // Deliver via REST API
    try {
      const res = await API.post(`/messages/conversations/${conversationId}/messages`, {
        body: text,
        type: "text",
        replyTo: replyTarget?._id,
        clientMessageId: tempId,
      });

      if (res.data?.success) {
        const savedMsg = res.data.message;
        setMessages((prev) =>
          prev.map((m) => (m.clientMessageId === tempId ? { ...savedMsg, status: "sent" } : m))
        );
        if (onConversationUpdated) {
          onConversationUpdated({
            conversationId,
            lastMessage: { text, sender: currentUserId, createdAt: new Date() },
          });
        }
      }
    } catch (err) {
      console.error("Message send failed:", err);
      const isOffline = (typeof navigator !== "undefined" && !navigator.onLine) || !err.response;
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === tempId ? { ...m, status: isOffline ? "queued" : "failed" } : m
        )
      );
    }
  };

  // Retry sending failed message
  const handleRetry = async (msg) => {
    setMessages((prev) =>
      prev.map((m) => (m.clientMessageId === msg.clientMessageId ? { ...m, status: "sending" } : m))
    );

    try {
      const res = await API.post(`/messages/conversations/${conversationId}/messages`, {
        body: msg.body,
        type: msg.type || "text",
        replyTo: msg.replyTo?._id,
        clientMessageId: msg.clientMessageId,
      });

      if (res.data?.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === msg.clientMessageId ? { ...res.data.message, status: "sent" } : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === msg.clientMessageId ? { ...m, status: "failed" } : m))
      );
    }
  };

  // Handle Request Response (Accept, Decline, Block)
  const handleRequestResponse = async (action) => {
    setSendingRequest(true);
    setRequestActionMsg("");
    try {
      const res = await API.post(`/messages/conversations/${conversationId}/respond`, { action });
      if (res.data?.success) {
        setRequestActionMsg(res.data.message);
        if (onConversationUpdated) {
          onConversationUpdated({ conversationId, status: action === "accept" ? "active" : action });
        }
      }
    } catch (err) {
      console.error("Respond error:", err);
    } finally {
      setSendingRequest(false);
    }
  };

  // Handle Block / Unblock User
  const handleToggleBlock = async () => {
    setShowActionsDropdown(false);
    const otherId = otherUser._id || otherUser.id;
    if (!otherId) return;

    if (!isBlocked) {
      const ok = window.confirm(
        `Are you sure you want to block ${otherUser.name || "this user"}? You won't receive messages from them, and they cannot discover your profile.`
      );
      if (!ok) return;

      try {
        const res = await API.post("/messages/block", { targetUserId: otherId });
        if (res.data?.success) {
          setIsBlocked(true);
          if (onConversationUpdated) {
            onConversationUpdated({ conversationId, status: "blocked" });
          }
        }
      } catch (err) {
        alert("Failed to block user: " + (err.response?.data?.message || err.message));
      }
    } else {
      try {
        const res = await API.post("/messages/unblock", { targetUserId: otherId });
        if (res.data?.success) {
          setIsBlocked(false);
          if (onConversationUpdated) {
            onConversationUpdated({ conversationId, status: "active" });
          }
        }
      } catch (err) {
        alert("Failed to unblock user: " + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[650px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition md:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
            {isGroup ? (
              conversation.groupAvatar ? (
                <img src={conversation.groupAvatar} alt={conversation.groupName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[#B8323C] bg-red-50">
                  <Users className="w-5 h-5" />
                </div>
              )
            ) : otherUser.avatar ? (
              <img src={otherUser.avatar} alt={otherUser.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-100">
                {(otherUser.name || "C")[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div
            className={`min-w-0 ${isGroup ? "cursor-pointer" : ""}`}
            onClick={() => {
              if (isGroup) setShowGroupDetails(true);
            }}
          >
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-slate-900 truncate">
                {isGroup ? conversation.groupName || "Town Group" : otherUser.name || "Citizen"}
              </h3>
              {isGroup && (
                <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold text-[9px] shrink-0">
                  Group
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
              {isGroup ? (
                <span className="text-[#B8323C] hover:underline font-semibold">
                  Tap for group info & members
                </span>
              ) : (
                <>
                  {isPartnerOnline ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  ) : (
                    <span className="text-slate-400">Offline</span>
                  )}
                  {otherUser.username && <span className="font-mono">• @{otherUser.username}</span>}
                  {otherUser.area && <span>• {otherUser.area}</span>}
                  {isBlocked && <span className="text-red-500 font-bold">• Blocked</span>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Status indicator and actions menu */}
        <div className="flex items-center gap-2">
          {isTyping && (
            <span className="text-[11px] text-[#B8323C] font-semibold animate-pulse">
              typing...
            </span>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowActionsDropdown((prev) => !prev)}
              className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition cursor-pointer"
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionsDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20 text-xs">
                {isGroup ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsDropdown(false);
                        setShowGroupDetails(true);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 text-slate-500" />
                      <span>Group Info & Members</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsDropdown(false);
                        setShowGroupDetails(true);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 transition cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Leave Group</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionsDropdown(false);
                        setReportTarget({ user: otherUser });
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Report Citizen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleBlock}
                      className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 transition cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>{isBlocked ? "Unblock Citizen" : "Block Citizen"}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Request Action Banner */}
      {isPendingRequest && (
        <div className="bg-amber-50 p-3.5 border-b border-amber-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Message Request:</strong> {otherUser.name} wants to message you. Accept to allow replies.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleRequestResponse("accept")}
              disabled={sendingRequest}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-xs shadow-2xs"
            >
              Accept
            </button>
            <button
              onClick={() => handleRequestResponse("decline")}
              disabled={sendingRequest}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition text-xs"
            >
              Decline
            </button>
            <button
              onClick={() => handleRequestResponse("block")}
              disabled={sendingRequest}
              className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-xl font-bold transition text-xs border border-red-200"
              title="Block citizen"
            >
              Block
            </button>
          </div>
        </div>
      )}

      {requestActionMsg && (
        <div className="bg-slate-50 p-2 text-center text-xs text-slate-600 border-b border-slate-100">
          {requestActionMsg}
        </div>
      )}

      {/* Offline Alert Banner */}
      {!isNetworkOnline && (
        <div className="bg-amber-500/10 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800 flex items-center justify-center gap-2">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>You are currently offline. Outgoing messages will queue and send automatically when you reconnect.</span>
        </div>
      )}

      {/* Message Thread List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasMore && (
          <div className="text-center pt-1 pb-2">
            <button
              onClick={handleLoadOlder}
              disabled={loadingMore}
              className="text-[11px] text-[#B8323C] hover:underline font-bold py-1 px-3 rounded-xl bg-slate-50 border border-slate-200"
            >
              {loadingMore ? "Loading history..." : "Load older messages / पुराने संदेश"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#B8323C]" />
            <span>Loading message history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2 p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-700">No messages in this chat yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Say hello to {otherUser.name || "citizen"}! All messages are authenticated and private.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = (m.sender?._id || m.sender?.id || m.sender) === currentUserId;
            const isSystem = m.type === "system";

            if (isSystem) {
              return (
                <div key={m._id || m.id} className="text-center my-2">
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                    {m.body}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={m._id || m.id}
                className={`flex flex-col group ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Group sender name tag */}
                {isGroup && !isMe && m.sender?.name && (
                  <span className="text-[10px] font-bold text-slate-500 mb-0.5 ml-1 select-none">
                    {m.sender.name}
                  </span>
                )}

                {/* Reply quote reference */}
                {m.replyTo && (
                  <div
                    className={`text-[10px] px-2.5 py-1 mb-1 rounded-lg border max-w-xs truncate ${
                      isMe
                        ? "bg-red-50 text-red-900 border-red-200/60 mr-1"
                        : "bg-slate-100 text-slate-700 border-slate-200 ml-1"
                    }`}
                  >
                    <span className="font-bold">Reply: </span>
                    <span>{m.replyTo.body}</span>
                  </div>
                )}

                {(() => {
                  const canEdit =
                    isMe &&
                    !m.isDeletedForEveryone &&
                    Date.now() - new Date(m.createdAt).getTime() < 15 * 60 * 1000;

                  return (
                    <div className="flex items-end gap-1.5 max-w-[80%]">
                      {/* Action buttons on hover for incoming messages */}
                      {!isMe && !m.isDeletedForEveryone && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => setReplyTarget(m)}
                            className="text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportTarget({ user: otherUser, message: m })}
                            className="text-slate-400 hover:text-amber-600 p-1 transition cursor-pointer"
                            title="Report message"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                            title="Delete for me"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-xs break-words shadow-2xs leading-relaxed ${
                          isMe
                            ? "bg-[#B8323C] text-white rounded-br-xs"
                            : "bg-slate-100 text-slate-900 rounded-bl-xs"
                        }`}
                      >
                        {m.isDeletedForEveryone ? (
                          <span className="italic flex items-center gap-1.5 opacity-80 py-0.5">
                            <Ban className="w-3.5 h-3.5 shrink-0" />
                            <span>This message was deleted</span>
                          </span>
                        ) : (
                          <>
                            {m.type === "image" && m.mediaUrl && (
                              <div
                                className="mb-1.5 cursor-pointer overflow-hidden rounded-xl"
                                onClick={() => setLightboxImage(getFullMediaUrl(m.mediaUrl))}
                                title="Click to view full photo / बड़ी तस्वीर देखें"
                              >
                                <img
                                  src={getFullMediaUrl(m.mediaUrl)}
                                  alt={m.body || "Chat attachment"}
                                  className="rounded-xl max-h-60 max-w-full sm:max-w-xs object-cover hover:opacity-95 transition"
                                  loading="lazy"
                                />
                              </div>
                            )}
                            {m.body && <p>{m.body}</p>}
                          </>
                        )}

                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] mt-1 select-none ${
                            isMe ? "text-white/80" : "text-slate-400"
                          }`}
                        >
                          {m.isEdited && !m.isDeletedForEveryone && (
                            <span className="italic font-medium opacity-80">(edited)</span>
                          )}
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          {/* Delivery Status Indicator */}
                          {isMe && (
                            <span>
                              {m.status === "sending" ? (
                                <Clock className="w-2.5 h-2.5 inline animate-spin" />
                              ) : m.status === "queued" ? (
                                <span className="text-amber-200 inline-flex items-center gap-0.5" title="Queued (Offline)">
                                  <Clock className="w-2.5 h-2.5 inline" /> Queued
                                </span>
                              ) : m.status === "failed" ? (
                                <button
                                  onClick={() => handleRetry(m)}
                                  className="text-amber-200 hover:underline flex items-center gap-0.5"
                                >
                                  <AlertCircle className="w-2.5 h-2.5 inline" /> Retry
                                </button>
                              ) : (
                                <CheckCheck className="w-3 h-3 inline text-white/90" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons on hover for outgoing messages */}
                      {isMe && !m.isDeletedForEveryone && (
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(m)}
                              className="text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
                              title="Edit message (within 15m)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(m)}
                            className="text-slate-400 hover:text-red-600 p-1 transition cursor-pointer"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReplyTarget(m)}
                            className="text-slate-400 hover:text-slate-600 p-1 transition cursor-pointer"
                            title="Reply"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Quote Banner */}
      {replyTarget && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-[#B8323C] shrink-0" />
            <span className="truncate">
              <strong>Replying to:</strong> {replyTarget.body}
            </span>
          </div>
          <button
            onClick={() => setReplyTarget(null)}
            className="p-1 hover:text-slate-900 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editing Message Banner */}
      {editingMessage && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200/80 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2 truncate">
            <Pencil className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">
              <strong>Editing message:</strong> {editingMessage.body}
            </span>
          </div>
          <button
            onClick={handleCancelEdit}
            className="p-1 hover:text-amber-950 transition cursor-pointer"
            title="Cancel edit"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Media Attachment Preview Tray */}
      {selectedFile && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {filePreview && (
              <img
                src={filePreview}
                alt="Upload preview"
                className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
              />
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                {(selectedFile.size / 1024).toFixed(1)} KB • Add optional caption below
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-full transition cursor-pointer"
            title="Remove photo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Blocked Notice or Message Input Box */}
      {isBlocked ? (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-500 shrink-0" />
            <span>You have blocked this citizen. You cannot send or receive messages.</span>
          </div>
          <button
            type="button"
            onClick={handleToggleBlock}
            className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-800 transition shrink-0"
          >
            Unblock
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t border-slate-100 bg-white flex items-center gap-2"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
          />

          {/* Attach Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={Boolean(editingMessage) || uploadingMedia}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer disabled:opacity-40"
            title="Attach Photo / फोटो भेजें"
          >
            <ImageIcon className="w-4 h-4 text-slate-600" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              editingMessage
                ? "Edit your message... / संदेश संपादित करें..."
                : selectedFile
                ? "Add a caption for this photo (optional)..."
                : "Type a message... / संदेश लिखें..."
            }
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8323C]/20 focus:border-[#B8323C] transition"
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedFile) || uploadingMedia}
            className="p-2.5 rounded-2xl bg-[#B8323C] hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-[#B8323C] text-white transition shadow-2xs cursor-pointer flex items-center justify-center"
            title={editingMessage ? "Save edit" : selectedFile ? "Send photo" : "Send message"}
          >
            {uploadingMedia ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : editingMessage ? (
              <Check className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportModal
          targetUser={reportTarget.user}
          targetMessage={reportTarget.message}
          onClose={() => setReportTarget(null)}
          onReportSubmitted={() => {
            // Optional notification or toast
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 relative shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Delete Message</h3>
                <p className="text-xs text-slate-500">How would you like to delete this message?</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl text-xs text-slate-700 italic border border-slate-100 line-clamp-3">
              "{deleteTarget.body}"
            </div>

            <div className="space-y-2 pt-1">
              {(deleteTarget.sender?._id === currentUserId ||
                deleteTarget.sender === currentUserId) &&
                Date.now() - new Date(deleteTarget.createdAt).getTime() < 60 * 60 * 1000 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage("everyone")}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    Delete for everyone
                  </button>
                )}

              <button
                type="button"
                onClick={() => handleDeleteMessage("me")}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Delete for me
              </button>

              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {isGroup && (
        <GroupDetailsModal
          isOpen={showGroupDetails}
          onClose={() => setShowGroupDetails(false)}
          conversation={conversation}
          currentUserId={currentUserId}
          onGroupUpdated={(updated) => {
            if (onConversationUpdated) onConversationUpdated(updated);
          }}
          onLeftGroup={() => {
            if (onBack) onBack();
          }}
        />
      )}

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                download
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition shadow-lg"
                title="Download full image"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition shadow-lg cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Full view"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
