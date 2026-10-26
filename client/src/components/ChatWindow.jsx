import { useState, useEffect, useRef } from "react";
import API from "../api";
import { getSocket, playMessageChime } from "../socket";
import { resolveMediaUrl } from "../utils/mediaUtils";
import ReportModal from "./ReportModal";
import GroupDetailsModal from "./GroupDetailsModal";
import CameraModal from "./CameraModal";
import {
  getCachedMessages,
  setCachedMessages,
  getQueuedMessages,
  enqueueOutgoingMessage,
  removeQueuedMessage,
} from "../utils/offlineChatStorage";
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
  Menu,
  Search,
  Smile,
  Paperclip,
  Camera,
  Mic,
  FileText,
  Video,
  Cloud,
  RotateCw,
} from "lucide-react";

const POPULAR_EMOJIS = [
  "😊", "😂", "🙏", "👍", "❤️", "🔥", "🎉", "👏",
  "🤝", "🇮🇳", "💐", "🚩", "☕", "✨", "💯", "🤲",
  "😍", "🥰", "😎", "🥺", "🤔", "😴", "🥳", "✌️",
  "💪", "👋", "👌", "⭐", "🌹", "🌞", "😇", "🙌"
];

export default function ChatWindow({
  conversation,
  currentUserId,
  onBack,
  onConversationUpdated,
  onlineUserIds = new Set(),
  onOpenMobileMenu,
  onToggleInfoPanel,
  showInfoPanel = false,
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
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [videoErrors, setVideoErrors] = useState({});
  const [reportTarget, setReportTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isBlocked, setIsBlocked] = useState(conversation?.status === "blocked");
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("image");
  const [filePreview, setFilePreview] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isNetworkOnline, setIsNetworkOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const abortControllerRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const docInputRef = useRef(null);
  const actionsDropdownRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const attachMenuRef = useRef(null);
  const attachButtonRef = useRef(null);

  const conversationId = conversation?._id || conversation?.id;
  const isGroup = conversation?.type === "group";
  const otherUser = conversation?.otherUser || {};
  const isPendingRequest = !isGroup && conversation?.status === "pending" && !conversation?.isInitiator;
  const partnerId = String(otherUser?._id || otherUser?.id || "");
  const isPartnerOnline = !isGroup && partnerId && onlineUserIds?.has?.(partnerId);

  // Keep track of scroll position to prevent message list jitter
  const handleScroll = (e) => {
    if (!e?.target) return;
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  // Flush queued messages when connection is restored
  const flushQueuedMessages = async () => {
    if (!conversationId) return;
    const queuedFromStorage = getQueuedMessages(conversationId);
    if (!queuedFromStorage || queuedFromStorage.length === 0) return;

    let anySent = false;
    for (const msg of queuedFromStorage) {
      try {
        const res = await API.post(`/messages/conversations/${conversationId}/messages`, {
          body: msg.body,
          type: msg.type || "text",
          replyTo: msg.replyTo?._id,
          clientMessageId: msg.clientMessageId,
        });
        if (res.data?.success && res.data.message) {
          removeQueuedMessage(conversationId, msg.clientMessageId);
          anySent = true;
          setMessages((cur) => {
            const updated = cur.map((m) =>
              m.clientMessageId === msg.clientMessageId
                ? { ...res.data.message, status: "sent" }
                : m
            );
            setCachedMessages(conversationId, updated);
            return updated;
          });
        }
      } catch (err) {
        console.warn("[Offline Sync] Failed to flush queued message:", msg.clientMessageId, err.message);
      }
    }
    if (anySent) {
      playMessageChime();
    }
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

  // Click-outside and Escape key listener for actions menu, emoji picker, attach menu, and modals
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showActionsDropdown && actionsDropdownRef.current && !actionsDropdownRef.current.contains(e.target)) {
        setShowActionsDropdown(false);
      }
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        !emojiButtonRef.current?.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
      if (
        showAttachMenu &&
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target) &&
        !attachButtonRef.current?.contains(e.target)
      ) {
        setShowAttachMenu(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showActionsDropdown) setShowActionsDropdown(false);
        if (showEmojiPicker) setShowEmojiPicker(false);
        if (showAttachMenu) setShowAttachMenu(false);
        if (showBlockModal) setShowBlockModal(false);
        if (lightboxImage) setLightboxImage(null);
        if (reportTarget) setReportTarget(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside, { passive: true });
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showActionsDropdown, showEmojiPicker, showAttachMenu, showBlockModal, lightboxImage, reportTarget]);

  // Scroll to bottom helper with jitter prevention
  const scrollToBottom = (behavior = "smooth", force = false) => {
    if (force || isAtBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    }
  };

  // Fetch initial message history with instant local cache hydration
  useEffect(() => {
    let isCancelled = false;
    if (!conversationId) return;

    // 1. Immediately hydrate from local cache to avoid empty screen
    const cached = getCachedMessages(conversationId);
    const queued = getQueuedMessages(conversationId);
    if (cached.length > 0 || queued.length > 0) {
      setMessages([...cached, ...queued]);
      setLoading(false);
      setTimeout(() => scrollToBottom("auto", true), 20);
    } else {
      setLoading(true);
    }

    async function fetchMessages() {
      try {
        const res = await API.get(`/messages/conversations/${conversationId}/messages`, {
          params: { limit: 30 },
        });
        if (!isCancelled && res.data?.success) {
          const fresh = res.data.messages || [];
          setCachedMessages(conversationId, fresh);

          // Merge fresh messages with local pending queue
          const currentQueue = getQueuedMessages(conversationId);
          setMessages([...fresh, ...currentQueue]);
          setHasMore(Boolean(res.data.hasMore));
        }
      } catch (err) {
        console.warn("Retained cached messages due to network fetch error:", err.message);
      } finally {
        if (!isCancelled) {
          setLoading(false);
          setTimeout(() => scrollToBottom("auto", false), 50);
        }
      }
    }

    fetchMessages();

    if (typeof navigator !== "undefined" && navigator.onLine) {
      flushQueuedMessages();
    }

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

    const handleReactionUpdated = (data) => {
      if (data?.conversationId === conversationId && data?.messageId) {
        setMessages((prev) =>
          prev.map((m) =>
            (m._id || m.id) === data.messageId ? { ...m, reactions: data.reactions } : m
          )
        );
      }
    };

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);
    socket.on("message_edited", handleMessageEdited);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("group_updated", handleGroupUpdated);
    socket.on("conversation_left", handleConversationLeft);
    socket.on("message_reaction_updated", handleReactionUpdated);

    return () => {
      socket.emit("leave_conversation", { conversationId });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
      socket.off("message_edited", handleMessageEdited);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("group_updated", handleGroupUpdated);
      socket.off("conversation_left", handleConversationLeft);
      socket.off("message_reaction_updated", handleReactionUpdated);
    };
  }, [conversationId, currentUserId, conversation, onConversationUpdated, onBack]);

  // Toggle emoji reaction on message
  const handleToggleReaction = async (messageId, emoji) => {
    setActiveReactionMsgId(null);
    try {
      // Optimistic reaction update
      setMessages((prev) =>
        prev.map((m) => {
          if ((m._id || m.id) !== messageId) return m;
          const currentReactions = [...(m.reactions || [])];
          const myIndex = currentReactions.findIndex(
            (r) => (r.user?._id || r.user?.id || r.user) === currentUserId
          );
          if (myIndex > -1) {
            if (currentReactions[myIndex].emoji === emoji) {
              currentReactions.splice(myIndex, 1);
            } else {
              currentReactions[myIndex] = {
                ...currentReactions[myIndex],
                emoji,
                createdAt: new Date().toISOString(),
              };
            }
          } else {
            currentReactions.push({
              emoji,
              user: { _id: currentUserId, name: "You" },
              createdAt: new Date().toISOString(),
            });
          }
          return { ...m, reactions: currentReactions };
        })
      );

      const res = await API.post(
        `/messages/conversations/${conversationId}/messages/${messageId}/react`,
        { emoji }
      );
      if (res.data?.success && res.data.reactions) {
        setMessages((prev) =>
          prev.map((m) =>
            (m._id || m.id) === messageId ? { ...m, reactions: res.data.reactions } : m
          )
        );
      }
    } catch (err) {
      console.error("Reaction failed:", err);
    }
  };

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

  // Resolve full URL for media attachments using robust mediaUtils resolver
  const getFullMediaUrl = (url) => {
    return resolveMediaUrl(url);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes <= 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle file selection from file input (up to 1 GB)
  const handleFileSelect = (e, explicitCategory = null) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blocked = [".exe", ".bat", ".cmd", ".sh", ".php", ".vbs", ".msi", ".jar", ".scr", ".com", ".pif", ".js", ".bin"];
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (blocked.includes(ext)) {
      alert("Executable and script files cannot be sent for security reasons.");
      return;
    }

    if (file.size > 1024 * 1024 * 1024) {
      alert("File size exceeds 1 GB limit. Please select a file under 1 GB.");
      return;
    }

    let category = explicitCategory;
    if (!category) {
      if (file.type.startsWith("image/") || [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"].includes(ext)) {
        category = "image";
      } else if (file.type.startsWith("video/") || [".mp4", ".webm", ".mov", ".mkv"].includes(ext)) {
        category = "video";
      } else if (file.type.startsWith("audio/") || [".mp3", ".wav", ".m4a", ".ogg"].includes(ext)) {
        category = "audio";
      } else {
        category = "document";
      }
    }

    setSelectedFile(file);
    setSelectedCategory(category);
    if (category === "image") {
      setFilePreview(URL.createObjectURL(file));
    } else {
      setFilePreview(null);
    }
  };

  // Clear selected file
  const handleClearFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setSelectedCategory("image");
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
    if (docInputRef.current) docInputRef.current.value = "";
  };

  // Cancel ongoing upload
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setUploadingMedia(false);
    setUploadProgress(0);
    setUploadStatusText("");
  };

  // Send attachment (photo, video, audio, or document) supporting up to 1 GB with chunking & progress
  const handleSendMedia = async () => {
    if (!selectedFile || !conversationId || uploadingMedia) return;

    setUploadingMedia(true);
    setUploadProgress(0);
    setUploadStatusText("Preparing attachment...");

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const tempId = `temp-media-${Date.now()}`;
    const fileSize = selectedFile.size;
    const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10 MB threshold for chunking

    try {
      if (fileSize > CHUNK_THRESHOLD) {
        // --- CHUNKED UPLOAD PIPELINE FOR LARGE FILES UP TO 1 GB ---
        setUploadStatusText("Initializing large file session...");
        const initRes = await API.post(
          `/messages/conversations/${conversationId}/upload/init`,
          {
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type,
          },
          { signal: controller.signal }
        );

        if (!initRes.data?.success || !initRes.data.uploadId) {
          throw new Error(initRes.data?.message || "Failed to initialize upload session.");
        }

        const { uploadId } = initRes.data;
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
          if (controller.signal.aborted) throw new Error("Upload cancelled by user.");

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, fileSize);
          const chunkBlob = selectedFile.slice(start, end);

          const chunkFormData = new FormData();
          chunkFormData.append("uploadId", uploadId);
          chunkFormData.append("chunkIndex", i);
          chunkFormData.append("totalChunks", totalChunks);
          chunkFormData.append("chunk", chunkBlob, `chunk_${i}`);

          setUploadStatusText(
            `Uploading chunk ${i + 1} of ${totalChunks} (${formatFileSize(start)} / ${formatFileSize(fileSize)})...`
          );

          await API.post(`/messages/conversations/${conversationId}/upload/chunk`, chunkFormData, {
            headers: { "Content-Type": "multipart/form-data" },
            signal: controller.signal,
          });

          const pct = Math.round(((i + 1) / totalChunks) * 100);
          setUploadProgress(pct);
        }

        // Finalize and assemble
        setUploadStatusText("Securing & storing file in Google Drive...");
        const completeRes = await API.post(
          `/messages/conversations/${conversationId}/upload/complete`,
          {
            uploadId,
            fileName: selectedFile.name,
            totalChunks,
            caption: inputText.trim(),
            replyTo: replyTarget?._id,
            clientMessageId: tempId,
            mimeType: selectedFile.type,
          },
          { signal: controller.signal }
        );

        if (completeRes.data?.success && completeRes.data.message) {
          setMessages((prev) => [...prev, completeRes.data.message]);
          handleClearFile();
          setInputText("");
          setReplyTarget(null);
          setTimeout(() => scrollToBottom("smooth"), 50);
        }
      } else {
        // --- DIRECT UPLOAD WITH PROGRESS (< 10 MB) ---
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("image", selectedFile); // backwards compatibility
        if (inputText.trim()) {
          formData.append("caption", inputText.trim());
        }
        if (replyTarget) {
          formData.append("replyTo", replyTarget._id);
        }
        formData.append("clientMessageId", tempId);

        const res = await API.post(`/messages/conversations/${conversationId}/media`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(pct);
              setUploadStatusText(
                `Uploading ${formatFileSize(progressEvent.loaded)} of ${formatFileSize(progressEvent.total)} (${pct}%)...`
              );
            }
          },
        });

        if (res.data?.success && res.data.message) {
          setMessages((prev) => [...prev, res.data.message]);
          handleClearFile();
          setInputText("");
          setReplyTarget(null);
          setTimeout(() => scrollToBottom("smooth"), 50);
        }
      }
    } catch (err) {
      if (err.name === "CanceledError" || err.message?.includes("cancelled")) {
        // User aborted upload intentionally
      } else {
        alert("Failed to send attachment: " + (err.response?.data?.message || err.message));
      }
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
      setUploadStatusText("");
      abortControllerRef.current = null;
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
      const queuedMsg = { ...optimisticMsg, status: "queued" };
      enqueueOutgoingMessage(conversationId, queuedMsg);
      setMessages((prev) => {
        const nextList = [...prev, queuedMsg];
        setCachedMessages(conversationId, nextList);
        return nextList;
      });
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
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.clientMessageId === tempId ? { ...savedMsg, status: "sent" } : m
          );
          setCachedMessages(conversationId, updated);
          return updated;
        });
        if (onConversationUpdated) {
          onConversationUpdated({
            conversationId,
            lastMessage: { text, sender: currentUserId, createdAt: new Date() },
          });
        }
      }
    } catch (err) {
      console.warn("Message send failed, persisting locally in offline queue:", err.message);
      const isOffline = (typeof navigator !== "undefined" && !navigator.onLine) || !err.response;
      const status = isOffline ? "queued" : "failed";
      const failedMsg = { ...optimisticMsg, status };
      enqueueOutgoingMessage(conversationId, failedMsg);
      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.clientMessageId === tempId ? failedMsg : m
        );
        setCachedMessages(conversationId, updated);
        return updated;
      });
    }
  };

  // Retry sending failed message
  const handleRetry = async (msg) => {
    if (!msg || !conversationId) return;

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

      if (res.data?.success && res.data.message) {
        removeQueuedMessage(conversationId, msg.clientMessageId);
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.clientMessageId === msg.clientMessageId
              ? { ...res.data.message, status: "sent" }
              : m
          );
          setCachedMessages(conversationId, updated);
          return updated;
        });
        playMessageChime();
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === msg.clientMessageId ? { ...m, status: "failed" } : m))
      );
    }
  };

  // Discard a queued or failed message
  const handleDiscardQueued = (msg) => {
    if (!msg || !conversationId) return;
    removeQueuedMessage(conversationId, msg.clientMessageId);
    setMessages((prev) => {
      const remaining = prev.filter((m) => m.clientMessageId !== msg.clientMessageId);
      setCachedMessages(conversationId, remaining);
      return remaining;
    });
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
  const handleToggleBlock = async (confirmed = false) => {
    setShowActionsDropdown(false);
    const otherId = otherUser._id || otherUser.id;
    if (!otherId) return;

    if (!confirmed) {
      setShowBlockModal(true);
      return;
    }

    if (!isBlocked) {
      try {
        const res = await API.post("/messages/block", { targetUserId: otherId });
        if (res.data?.success) {
          setIsBlocked(true);
          setShowBlockModal(false);
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
          setShowBlockModal(false);
          if (onConversationUpdated) {
            onConversationUpdated({ conversationId, status: "active" });
          }
        }
      } catch (err) {
        alert("Failed to unblock user: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const displayedMessages = chatSearchQuery.trim()
    ? messages.filter((m) =>
        (m.body || "").toLowerCase().includes(chatSearchQuery.trim().toLowerCase())
      )
    : messages;

  const getMessageDateLabel = (dateStr) => {
    if (!dateStr) return "";
    const msgDate = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return "Today / आज";
    }
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday / कल";
    }
    return msgDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: msgDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const renderHighlightedBody = (bodyText) => {
    if (!chatSearchQuery.trim() || !bodyText) {
      return bodyText;
    }
    const q = chatSearchQuery.trim();
    const parts = bodyText.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 text-slate-900 rounded-xs px-0.5 font-bold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-full min-h-0 overflow-hidden relative">
      {/* Fixed Stable Chat Header - Permanently at top of chat panel */}
      <div className="shrink-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-3.5 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition md:hidden cursor-pointer shrink-0"
              title="Back to conversations / वापस जाएं"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div
            className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 cursor-pointer relative border border-slate-200/80 shadow-2xs group flex items-center justify-center"
            onClick={onToggleInfoPanel || (() => { if (isGroup) setShowGroupDetails(true); })}
          >
            <div
              className={`absolute inset-0 flex items-center justify-center font-bold text-xs ${
                isGroup
                  ? "text-[#B8323C] bg-red-50"
                  : "text-slate-700 bg-gradient-to-br from-slate-100 to-slate-200"
              }`}
            >
              {isGroup ? (
                <Users className="w-5 h-5" />
              ) : (
                (otherUser.name || "C")[0]?.toUpperCase()
              )}
            </div>
            {isGroup ? (
              conversation.groupAvatar ? (
                <img
                  src={resolveMediaUrl(conversation.groupAvatar)}
                  alt={conversation.groupName}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : null
            ) : otherUser.avatar ? (
              <img
                src={resolveMediaUrl(otherUser.avatar)}
                alt={otherUser.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            {isPartnerOnline && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-emerald-500/20 z-10"
                title="Online"
              />
            )}
          </div>

          <div
            className="min-w-0 cursor-pointer"
            onClick={onToggleInfoPanel || (() => { if (isGroup) setShowGroupDetails(true); })}
          >
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-black text-slate-900 truncate tracking-tight hover:text-[#B8323C] transition">
                {isGroup ? conversation.groupName || "Town Group" : otherUser.name || "Citizen"}
              </h3>
              {isGroup && (
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[9px] shrink-0">
                  Group
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              {isGroup ? (
                <span className="text-[#B8323C] hover:underline font-semibold">
                  Tap for group info &amp; members
                </span>
              ) : (
                <>
                  {isPartnerOnline ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      Offline
                    </span>
                  )}
                  {otherUser.username && <span className="font-mono text-slate-400 hidden xs:inline">• @{otherUser.username}</span>}
                  {otherUser.area && <span className="hidden sm:inline text-slate-400">• {otherUser.area}</span>}
                  {isBlocked && <span className="text-red-500 font-bold">• Blocked</span>}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions bar: typing indicator, in-chat search, info toggle, options */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {isTyping && (
            <span className="text-xs text-[#B8323C] font-semibold animate-pulse mr-1.5 hidden sm:inline">
              typing...
            </span>
          )}

          {/* Search within conversation */}
          <button
            type="button"
            onClick={() => setShowChatSearch((prev) => !prev)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
              showChatSearch
                ? "bg-red-50 text-[#B8323C] ring-1 ring-red-200"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            }`}
            title="Search in conversation / बातचीत में खोजें"
            aria-label="Search within conversation"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Toggle Info Panel */}
          {onToggleInfoPanel && (
            <button
              type="button"
              onClick={onToggleInfoPanel}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                showInfoPanel
                  ? "bg-red-50 text-[#B8323C] ring-1 ring-red-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title="Conversation details & Shared Photos / विवरण"
              aria-label="Conversation details"
            >
              <Info className="w-4 h-4" />
            </button>
          )}

          <div className="relative" ref={actionsDropdownRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowActionsDropdown((prev) => !prev);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Options"
              aria-label="Chat options"
              aria-expanded={showActionsDropdown}
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionsDropdown && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                {isGroup ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActionsDropdown(false);
                        setReportTarget({ user: otherUser, conversationId });
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5 text-amber-600" />
                      <span>Report Citizen</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowActionsDropdown(false);
                        setShowBlockModal(true);
                      }}
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
        <div className="bg-amber-500/10 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-800 flex items-center justify-center gap-2 shrink-0">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>You are currently offline. Outgoing messages will queue and send automatically when you reconnect.</span>
        </div>
      )}

      {/* In-Chat Search Bar */}
      {showChatSearch && (
        <div className="bg-slate-50 border-b border-slate-200/80 px-3.5 py-2 flex items-center gap-2 shrink-0 animate-in fade-in">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={chatSearchQuery}
            onChange={(e) => setChatSearchQuery(e.target.value)}
            placeholder="Search messages in this conversation... / संदेश खोजें"
            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#B8323C]"
            autoFocus
          />
          {chatSearchQuery && (
            <span className="text-[11px] text-slate-500 font-bold shrink-0">
              {displayedMessages.length} {displayedMessages.length === 1 ? "match" : "matches"}
            </span>
          )}
          {chatSearchQuery && (
            <button
              type="button"
              onClick={() => setChatSearchQuery("")}
              className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer font-medium"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowChatSearch(false);
              setChatSearchQuery("");
            }}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Thread List with smooth scrolling and jitter prevention */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 space-y-3 scroll-smooth"
      >
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
        ) : displayedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center space-y-2 p-6">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              {chatSearchQuery ? "No matching messages found" : "No messages in this chat yet"}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              {chatSearchQuery
                ? `No messages in this conversation match "${chatSearchQuery}".`
                : `Say hello to ${otherUser.name || "citizen"}! All messages are authenticated and private.`}
            </p>
          </div>
        ) : (
          displayedMessages.map((m, index) => {
            const prevMsg = displayedMessages[index - 1];
            const prevDateLabel = prevMsg ? getMessageDateLabel(prevMsg.createdAt) : null;
            const currentDateLabel = getMessageDateLabel(m.createdAt);
            const isNewDay = !prevDateLabel || prevDateLabel !== currentDateLabel;

            const isMe = (m.sender?._id || m.sender?.id || m.sender) === currentUserId;
            const isSystem = m.type === "system";

            // Unread divider marker before first unread incoming message
            const unreadCount = conversation?.unreadCount || 0;
            const isFirstUnread =
              unreadCount > 0 &&
              !isMe &&
              index === displayedMessages.length - unreadCount;

            if (isSystem) {
              return (
                <div key={m._id || m.id || m.clientMessageId || index}>
                  {isNewDay && (
                    <div className="flex justify-center my-3 select-none">
                      <span className="px-3 py-1 bg-slate-100/90 text-slate-600 text-[10px] font-bold rounded-full shadow-2xs border border-slate-200/80">
                        {currentDateLabel}
                      </span>
                    </div>
                  )}
                  <div className="text-center my-2">
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      {m.body}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={m._id || m.id || m.clientMessageId || index} className="space-y-2">
                {isNewDay && (
                  <div className="flex justify-center my-3 select-none">
                    <span className="px-3 py-1 bg-slate-100/90 text-slate-600 text-[10px] font-bold rounded-full shadow-2xs border border-slate-200/80">
                      {currentDateLabel}
                    </span>
                  </div>
                )}
                {isFirstUnread && (
                  <div className="flex items-center gap-2 my-3 select-none animate-in fade-in">
                    <div className="flex-1 h-px bg-red-200"></div>
                    <span className="text-[10px] font-bold text-[#B8323C] bg-red-50 border border-red-200/80 px-2.5 py-0.5 rounded-full shadow-2xs">
                      New Messages / नए संदेश
                    </span>
                    <div className="flex-1 h-px bg-red-200"></div>
                  </div>
                )}
                <div className={`flex group ${isMe ? "justify-end" : "justify-start items-start gap-2.5"}`}>
                  {/* Sender Avatar Circle for Incoming Messages */}
                  {!isMe && (
                    <div
                      className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 mt-1 border border-slate-200/90 shadow-2xs relative select-none flex items-center justify-center"
                      title={m.sender?.name || otherUser.name || "Citizen"}
                    >
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-slate-700 bg-gradient-to-br from-slate-100 to-slate-200">
                        {((m.sender?.name || otherUser.name || "C")[0] || "C").toUpperCase()}
                      </div>
                      {(m.sender?.avatar || (!isGroup && otherUser.avatar)) ? (
                        <img
                          src={resolveMediaUrl(m.sender?.avatar || (!isGroup && otherUser.avatar))}
                          alt={m.sender?.name || otherUser.name || "Citizen"}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                    </div>
                  )}

                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {/* Group / user sender name tag */}
                    {!isMe && (
                      <span className="text-[11px] font-bold text-slate-700 mb-0.5 ml-1 select-none flex items-center gap-1">
                        <span>{isGroup ? m.sender?.name || "Citizen" : otherUser.name || "Citizen"}</span>
                        {((isGroup ? m.sender?.username : otherUser.username)) && (
                          <span className="text-[9px] font-mono text-slate-400 font-normal">
                            @{isGroup ? m.sender?.username : otherUser.username}
                          </span>
                        )}
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
                    <div className="flex flex-col">
                      <div className="flex items-end gap-1.5 max-w-[80%]">
                        {/* Action buttons on hover for incoming messages */}
                        {!isMe && !m.isDeletedForEveryone && (
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReactionMsgId(
                                  activeReactionMsgId === (m._id || m.id) ? null : (m._id || m.id)
                                )
                              }
                              className="text-slate-400 hover:text-amber-500 p-1 transition cursor-pointer"
                              title="React / प्रतिक्रिया दें"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
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

                        <div className="relative">
                          {/* Floating Reaction Bar */}
                          {activeReactionMsgId === (m._id || m.id) && (
                            <div
                              className={`absolute bottom-full mb-1.5 bg-white rounded-full shadow-lg border border-slate-200 px-2 py-1 flex items-center gap-1.5 z-30 animate-in fade-in zoom-in-95 ${
                                isMe ? "right-0" : "left-0"
                              }`}
                            >
                              {["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(m._id || m.id, emoji)}
                                  className="p-1 hover:scale-130 transition text-base cursor-pointer transform active:scale-90"
                                >
                                  {emoji}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() => setActiveReactionMsgId(null)}
                                className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer ml-0.5"
                                title="Close"
                              >
                                <X className="w-3 h-3" />
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
                                {/* Photo / Image attachment */}
                                {m.type === "image" && m.mediaUrl && (
                                  <div
                                    className="mb-1.5 cursor-pointer overflow-hidden rounded-xl relative group bg-black/5 min-h-[140px] max-w-xs flex items-center justify-center transition-all duration-200"
                                    onClick={() => setLightboxImage(getFullMediaUrl(m.mediaUrl))}
                                    title="Click to view full photo / बड़ी तस्वीर देखें"
                                  >
                                    <img
                                      src={getFullMediaUrl(m.mediaUrl)}
                                      alt={m.body || m.fileName || "Chat attachment"}
                                      className="rounded-xl max-h-60 max-w-full sm:max-w-xs object-cover hover:opacity-95 transition-opacity duration-200"
                                      loading="lazy"
                                      onLoad={() => {
                                        if (isAtBottomRef.current) scrollToBottom("auto");
                                      }}
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        const fallback = e.currentTarget.parentElement?.querySelector(".img-fallback");
                                        if (fallback) fallback.classList.remove("hidden");
                                      }}
                                    />
                                    <div className="img-fallback hidden p-4 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                                      <ImageIcon className="w-6 h-6 text-slate-400" />
                                      <span>Image unavailable / छवि अनुपलब्ध</span>
                                    </div>
                                    <a
                                      href={getFullMediaUrl(m.mediaUrl)}
                                      download={m.fileName || "photo.jpg"}
                                      onClick={(e) => e.stopPropagation()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition shadow hover:bg-black/80"
                                      title="Download photo / डाउनलोड करें"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                )}

                                {/* Video attachment */}
                                {m.type === "video" && m.mediaUrl && (
                                  <div className="mb-1.5 rounded-xl overflow-hidden bg-black/10">
                                    {videoErrors[m._id || m.id] ? (
                                      <div className="p-3 bg-slate-900/90 text-white rounded-xl flex flex-col gap-2 max-w-xs text-xs">
                                        <div className="flex items-center gap-2 text-amber-400">
                                          <AlertCircle className="w-4 h-4 shrink-0" />
                                          <span className="font-semibold">Unable to play video inline</span>
                                        </div>
                                        <p className="text-[11px] text-slate-300">
                                          Format may not be supported for inline streaming or connection timed out.
                                        </p>
                                        <div className="flex items-center gap-2 pt-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setVideoErrors((prev) => {
                                                const next = { ...prev };
                                                delete next[m._id || m.id];
                                                return next;
                                              });
                                            }}
                                            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                                          >
                                            <RotateCw className="w-3 h-3" />
                                            <span>Retry / पुनः प्रयास</span>
                                          </button>
                                          <a
                                            href={getFullMediaUrl(m.mediaUrl)}
                                            download={m.fileName || "video.mp4"}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2.5 py-1 bg-[#B8323C] hover:bg-red-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition"
                                          >
                                            <Download className="w-3 h-3" />
                                            <span>Download / डाउनलोड</span>
                                          </a>
                                        </div>
                                      </div>
                                    ) : (
                                      <video
                                        key={getFullMediaUrl(m.mediaUrl)}
                                        src={getFullMediaUrl(m.mediaUrl)}
                                        controls
                                        playsInline
                                        preload="metadata"
                                        className="rounded-xl max-h-64 max-w-full sm:max-w-xs bg-black"
                                        onError={(e) => {
                                          console.warn("Video playback error for message:", m._id || m.id, e);
                                          setVideoErrors((prev) => ({ ...prev, [m._id || m.id]: true }));
                                        }}
                                      >
                                        <source src={getFullMediaUrl(m.mediaUrl)} type={m.mimeType || "video/mp4"} />
                                        Your browser does not support inline video playback.
                                      </video>
                                    )}
                                    <div className="flex items-center justify-between px-1 pt-1 text-[10px] opacity-75">
                                      <span className="truncate max-w-[180px]">{m.fileName || "Video clip"}</span>
                                      <div className="flex items-center gap-1.5">
                                        {m.fileSize > 0 && <span>{formatFileSize(m.fileSize)}</span>}
                                        <a
                                          href={getFullMediaUrl(m.mediaUrl)}
                                          download={m.fileName || "video.mp4"}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:underline flex items-center gap-0.5 font-bold"
                                        >
                                          <Download className="w-3 h-3" />
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Audio / Voice Note attachment */}
                                {m.type === "audio" && m.mediaUrl && (
                                  <div className="mb-1.5 p-2 rounded-xl bg-black/5 flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-[11px] font-bold">
                                      <span className="flex items-center gap-1">
                                        <Mic className="w-3.5 h-3.5 text-amber-600" />
                                        <span>Voice / Audio Note</span>
                                      </span>
                                      {m.fileSize > 0 && (
                                        <span className="text-[10px] opacity-70 font-mono">
                                          {formatFileSize(m.fileSize)}
                                        </span>
                                      )}
                                    </div>
                                    <audio
                                      controls
                                      preload="metadata"
                                      className="w-full max-w-[260px] h-8"
                                      src={getFullMediaUrl(m.mediaUrl)}
                                    />
                                  </div>
                                )}

                                {/* Document attachment */}
                                {m.type === "document" && m.mediaUrl && (
                                  <div
                                    className={`mb-1.5 p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                      isMe ? "bg-white/10 border-white/20 text-white" : "bg-white border-slate-200 text-slate-800"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                          isMe ? "bg-white/20 text-white" : "bg-red-50 text-[#B8323C]"
                                        }`}
                                      >
                                        <FileText className="w-5 h-5" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-bold truncate max-w-[160px] sm:max-w-[200px]" title={m.fileName}>
                                          {m.fileName || "Document attachment"}
                                        </p>
                                        <p className="text-[10px] opacity-75 font-mono">
                                          {m.fileSize > 0 ? formatFileSize(m.fileSize) : "Document"}
                                        </p>
                                      </div>
                                    </div>
                                    <a
                                      href={getFullMediaUrl(m.mediaUrl)}
                                      download={m.fileName || "document"}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`p-2 rounded-xl transition shrink-0 ${
                                        isMe ? "bg-white/20 hover:bg-white/30 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                      }`}
                                      title="Download file / फ़ाइल डाउनलोड करें"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                )}

                                {m.body && (
                                  <p className="whitespace-pre-wrap break-words">
                                    {renderHighlightedBody(m.body)}
                                  </p>
                                )}
                              </>
                            )}

                            <div
                              className={`flex items-center justify-end gap-1 text-[9px] mt-1 select-none ${
                                isMe ? "text-white/80" : "text-slate-400"
                              }`}
                            >
                              {(m.storageProvider === "google_drive" || m.driveFileId) && (
                                <span
                                  className="inline-flex items-center gap-0.5 opacity-80"
                                  title="Google Drive Cloud Secured / सुरक्षित गूगल ड्राइव"
                                >
                                  <Cloud className="w-2.5 h-2.5 inline" />
                                </span>
                              )}
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
                                <span className="inline-flex items-center gap-1">
                                  {m.status === "sending" ? (
                                    <Clock className="w-2.5 h-2.5 inline animate-spin" />
                                  ) : m.status === "queued" ? (
                                    <span className="text-amber-200 inline-flex items-center gap-1" title="Queued (Offline)">
                                      <Clock className="w-2.5 h-2.5 inline" />
                                      <span>Queued</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDiscardQueued(m);
                                        }}
                                        className="hover:text-red-300 ml-0.5 cursor-pointer"
                                        title="Cancel queued message"
                                      >
                                        <X className="w-2.5 h-2.5 inline" />
                                      </button>
                                    </span>
                                  ) : m.status === "failed" ? (
                                    <span className="text-amber-200 inline-flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRetry(m);
                                        }}
                                        className="hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                                        title="Retry sending"
                                      >
                                        <RotateCw className="w-2.5 h-2.5 inline" /> Retry
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDiscardQueued(m);
                                        }}
                                        className="hover:text-red-300 ml-0.5 cursor-pointer"
                                        title="Discard failed message"
                                      >
                                        <X className="w-2.5 h-2.5 inline" />
                                      </button>
                                    </span>
                                  ) : (
                                    <CheckCheck className="w-3 h-3 inline text-white/90" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons on hover for outgoing messages */}
                        {isMe && !m.isDeletedForEveryone && (
                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveReactionMsgId(
                                  activeReactionMsgId === (m._id || m.id) ? null : (m._id || m.id)
                                )
                              }
                              className="text-slate-400 hover:text-amber-500 p-1 transition cursor-pointer"
                              title="React / प्रतिक्रिया दें"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
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

                      {/* Reactions Badges List */}
                      {m.reactions && m.reactions.length > 0 && (
                        <div
                          className={`flex flex-wrap gap-1 mt-1 ${
                            isMe ? "justify-end mr-1" : "justify-start ml-1"
                          }`}
                        >
                          {Object.entries(
                            m.reactions.reduce((acc, r) => {
                              acc[r.emoji] = acc[r.emoji] || [];
                              acc[r.emoji].push(r);
                              return acc;
                            }, {})
                          ).map(([emoji, rList]) => {
                            const hasReacted = rList.some(
                              (r) => (r.user?._id || r.user?.id || r.user) === currentUserId
                            );
                            const reactorNames = rList
                              .map((r) => r.user?.name || "Citizen")
                              .join(", ");
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(m._id || m.id, emoji)}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border transition cursor-pointer shadow-2xs ${
                                  hasReacted
                                    ? "bg-red-50 border-red-200 text-[#B8323C]"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                }`}
                                title={reactorNames}
                              >
                                <span>{emoji}</span>
                                <span className="text-[10px] font-semibold">{rList.length}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Quote Banner */}
      {replyTarget && (
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
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
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200/80 flex items-center justify-between text-xs text-amber-900 shrink-0">
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

      {/* Media & Document Attachment Preview Tray */}
      {selectedFile && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            {filePreview ? (
              <img
                src={filePreview}
                alt="Upload preview"
                className="w-11 h-11 object-cover rounded-xl border border-slate-200 shrink-0"
              />
            ) : selectedCategory === "video" ? (
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
                <Video className="w-5 h-5" />
              </div>
            ) : selectedCategory === "audio" ? (
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
                <Mic className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {formatFileSize(selectedFile.size)} • {selectedCategory.toUpperCase()} • Add optional caption below
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition cursor-pointer"
            title="Remove attachment / हटाएँ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Uploading Progress Bar for Large Files / Attachments */}
      {uploadingMedia && (
        <div className="px-4 py-2 bg-slate-900 text-white text-xs border-t border-slate-800 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between gap-3 mb-1.5 font-medium">
            <span className="flex items-center gap-2 truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B8323C] shrink-0" />
              <span className="truncate">{uploadStatusText || "Uploading..."}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-xs font-bold text-emerald-400">{uploadProgress}%</span>
              <button
                type="button"
                onClick={handleCancelUpload}
                className="px-2 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-200 text-[10px] font-bold transition cursor-pointer"
                title="Cancel upload / रद्द करें"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-[#B8323C] to-red-500 h-full transition-all duration-200 rounded-full"
              style={{ width: `${Math.max(2, uploadProgress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Blocked Notice or Message Input Box */}
      {isBlocked ? (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
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
        <div className="relative shrink-0 z-20 bg-white border-t border-slate-200/90 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Emoji Picker Tray */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-full mb-2 left-2 sm:left-3 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 w-72 max-w-[calc(100vw-1.5rem)] animate-in fade-in zoom-in-95"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                <span className="font-bold text-slate-700">Quick Emojis / इमोजी</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-1 text-xl max-h-40 overflow-y-auto p-0.5">
                {POPULAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-lg transition transform hover:scale-115 active:scale-95 cursor-pointer text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Menu Popover */}
          {showAttachMenu && (
            <div
              ref={attachMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-full mb-2 left-2 sm:left-12 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 w-64 max-w-[calc(100vw-1.5rem)] animate-in fade-in zoom-in-95 text-xs font-semibold"
            >
              <div className="flex items-center justify-between pb-1.5 mb-1.5 px-2 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                <span>Attach / फ़ाइल जोड़ें</span>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(false)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-red-50 text-[#B8323C] flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold">Photos & Images</div>
                    <div className="text-[10px] text-slate-400 font-normal">JPG, PNG, WebP, GIF</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    videoInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold">Video Clips</div>
                    <div className="text-[10px] text-slate-400 font-normal">MP4, WebM, MOV</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    audioInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold">Audio & Voice</div>
                    <div className="text-[10px] text-slate-400 font-normal">MP3, WAV, M4A, OGG</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    docInputRef.current?.click();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold">Documents & Files</div>
                    <div className="text-[10px] text-slate-400 font-normal">PDF, DOC, XLS, PPT, ZIP</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false);
                    setShowCameraModal(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-50 transition cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-slate-800 font-bold">Live Camera / लाइव कैमरा</div>
                    <div className="text-[10px] text-slate-400 font-normal">Snap photo or record video</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSendMessage}
            className="p-1.5 sm:p-2.5 bg-white flex items-center gap-1 sm:gap-2 shrink-0 max-w-full"
          >
            {/* Hidden File Inputs for All Supported Media Types */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileSelect(e, "image")}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={videoInputRef}
              onChange={(e) => handleFileSelect(e, "video")}
              accept="video/*"
              className="hidden"
            />
            <input
              type="file"
              ref={audioInputRef}
              onChange={(e) => handleFileSelect(e, "audio")}
              accept="audio/*"
              className="hidden"
            />
            <input
              type="file"
              ref={docInputRef}
              onChange={(e) => handleFileSelect(e, "document")}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={(e) => handleFileSelect(e, "image")}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            {/* Emoji Trigger */}
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker((p) => !p);
                setShowAttachMenu(false);
              }}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 ${
                showEmojiPicker
                  ? "bg-amber-100 text-amber-700"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title="Emoji / इमोजी"
              aria-label="Toggle emoji picker"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Attachment Menu Trigger */}
            <button
              ref={attachButtonRef}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAttachMenu((p) => !p);
                setShowEmojiPicker(false);
              }}
              disabled={Boolean(editingMessage) || uploadingMedia}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-40 ${
                showAttachMenu
                  ? "bg-red-50 text-[#B8323C] ring-1 ring-red-200"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title="Attach media or document / मीडिया जोड़ें"
              aria-label="Attach file"
            >
              <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Quick Live Camera Snap / Record Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAttachMenu(false);
                setShowEmojiPicker(false);
                setShowCameraModal(true);
              }}
              disabled={Boolean(editingMessage) || uploadingMedia}
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-[#B8323C] hover:bg-red-50 transition cursor-pointer shrink-0 disabled:opacity-40"
              title="Live Camera Photo & Video / लाइव कैमरा"
              aria-label="Open camera"
            >
              <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Message Input Field */}
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onFocus={() => {
                setShowEmojiPicker(false);
                setShowAttachMenu(false);
              }}
              placeholder={
                editingMessage
                  ? "Edit your message... / संदेश संपादित करें..."
                  : selectedFile
                  ? `Add a caption for this ${selectedCategory} (optional)...`
                  : "Type a message... / संदेश लिखें..."
              }
              className="min-w-0 flex-1 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full bg-slate-100/90 hover:bg-slate-100 focus:bg-white border border-slate-200/80 focus:border-[#B8323C] text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8323C]/20 transition shadow-inner"
            />

            {/* Send / Save Button */}
            <button
              type="submit"
              disabled={(!inputText.trim() && !selectedFile) || uploadingMedia}
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition shadow-sm shrink-0 cursor-pointer ${
                (!inputText.trim() && !selectedFile) || uploadingMedia
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed shadow-none"
                  : "bg-[#B8323C] hover:bg-red-700 text-white shadow-md active:scale-95"
              }`}
              title={editingMessage ? "Save edit" : selectedFile ? "Send attachment" : "Send message"}
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
        </div>
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

      {/* Block Citizen Confirmation Modal */}
      {showBlockModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowBlockModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 relative shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${isBlocked ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {isBlocked ? "Unblock Citizen / अनब्लॉक करें" : "Block Citizen / नागरिक को ब्लॉक करें"}
                </h3>
                <p className="text-xs text-slate-500">
                  {otherUser.name || "This citizen"}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isBlocked
                ? `Are you sure you want to unblock ${otherUser.name || "this user"}? You will be able to exchange messages with them again.`
                : `Are you sure you want to block ${otherUser.name || "this user"}? They won't be able to send you messages or view your online status in chats.`}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleToggleBlock(true)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer text-white ${
                  isBlocked
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isBlocked ? "Yes, Unblock" : "Yes, Block"}
              </button>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel / रद्द करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Popup Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onCapture={(file, category) => {
          setSelectedFile(file);
          setSelectedCategory(category);
          if (category === "image") {
            setFilePreview(URL.createObjectURL(file));
          } else {
            setFilePreview(null);
          }
        }}
      />
    </div>
  );
}
