import { useState, useEffect, useRef } from "react";
import API from "../api";
import { getSocket } from "../socket";
import ReportModal from "./ReportModal";
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
} from "lucide-react";

export default function ChatWindow({
  conversation,
  currentUserId,
  onBack,
  onConversationUpdated,
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
  const [isBlocked, setIsBlocked] = useState(conversation?.status === "blocked");

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const conversationId = conversation?._id || conversation?.id;
  const otherUser = conversation?.otherUser || {};
  const isPendingRequest = conversation?.status === "pending" && !conversation?.isInitiator;

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

    socket.on("new_message", handleNewMessage);
    socket.on("user_typing", handleUserTyping);
    socket.on("user_stop_typing", handleUserStopTyping);

    return () => {
      socket.emit("leave_conversation", { conversationId });
      socket.off("new_message", handleNewMessage);
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stop_typing", handleUserStopTyping);
    };
  }, [conversationId, currentUserId]);

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

  // Send Message (Optimistic delivery)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
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
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) => (m.clientMessageId === tempId ? { ...m, status: "failed" } : m))
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
            {otherUser.avatar ? (
              <img src={otherUser.avatar} alt={otherUser.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-100">
                {(otherUser.name || "C")[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 truncate">
              {otherUser.name || "Citizen"}
            </h3>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
              {otherUser.username && <span className="font-mono">@{otherUser.username}</span>}
              {otherUser.area && <span>• {otherUser.area}</span>}
              {isBlocked && <span className="text-red-500 font-bold">• Blocked</span>}
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
              className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 transition"
              title="Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActionsDropdown && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowActionsDropdown(false);
                    setReportTarget({ user: otherUser });
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 transition"
                >
                  <Flag className="w-3.5 h-3.5 text-amber-600" />
                  <span>Report Citizen</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleBlock}
                  className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-red-600 transition"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{isBlocked ? "Unblock Citizen" : "Block Citizen"}</span>
                </button>
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

                <div className="flex items-end gap-1.5 max-w-[80%]">
                  {/* Action buttons on hover (Reply & Report) */}
                  {!isMe && (
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition">
                      <button
                        type="button"
                        onClick={() => setReplyTarget(m)}
                        className="text-slate-400 hover:text-slate-600 p-1 transition"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportTarget({ user: otherUser, message: m })}
                        className="text-slate-400 hover:text-amber-600 p-1 transition"
                        title="Report message"
                      >
                        <Flag className="w-3.5 h-3.5" />
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
                    {m.body}

                    <div
                      className={`flex items-center justify-end gap-1 text-[9px] mt-1 select-none ${
                        isMe ? "text-white/80" : "text-slate-400"
                      }`}
                    >
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

                  {isMe && (
                    <button
                      onClick={() => setReplyTarget(m)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 p-1 transition"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder="Type a message... / संदेश लिखें..."
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8323C]/20 focus:border-[#B8323C] transition"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-2xl bg-[#B8323C] hover:bg-red-700 disabled:opacity-40 disabled:hover:bg-[#B8323C] text-white transition shadow-2xs"
            title="Send message"
          >
            <Send className="w-4 h-4" />
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
    </div>
  );
}
