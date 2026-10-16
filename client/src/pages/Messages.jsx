import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import API from "../api";
import { usePageSEO } from "../utils/seo";
import { getAuthUser, clearAuthSession } from "../utils/authStorage";
import { initClientSocket, getSocket, playMessageChime } from "../socket";
import { maskEmail } from "./ProfileEdit";
import UserSearch from "../components/UserSearch";
import ConversationList from "../components/ConversationList";
import ChatWindow from "../components/ChatWindow";
import CreateGroupModal from "../components/CreateGroupModal";
import MobileMessagingDrawer from "../components/MobileMessagingDrawer";
import ConversationInfoPanel from "../components/ConversationInfoPanel";
import {
  getCachedConversations,
  setCachedConversations,
} from "../utils/offlineChatStorage";
import {
  MessageSquare,
  Settings,
  ShieldAlert,
  LogOut,
  X,
  MessageCircle,
  Sparkles,
  Menu,
  WifiOff,
  CheckCircle2,
  RefreshCw,
  Camera,
  Phone,
  User,
  Loader2,
  AlertCircle,
  Edit3,
} from "lucide-react";

export default function Messages() {
  const [searchParams] = useSearchParams();
  const convParam = searchParams.get("conv") || searchParams.get("conversationId");

  usePageSEO({
    title: "Messages | Fazilnagar Town Portal",
    description: "Private user-to-user town messaging and community communications in Fazilnagar.",
    canonicalPath: "/messages",
    noIndex: true,
  });

  const portalUser = getAuthUser();
  const currentUserId = portalUser?._id || portalUser?.id;

  const [profile, setProfile] = useState(null);
  const [conversations, setConversations] = useState(() => getCachedConversations());
  const [activeConversation, setActiveConversation] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(
    () => getCachedConversations().length === 0
  );
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [reconnectFlash, setReconnectFlash] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Quick Profile Edit Modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState("");
  const [editAvatarFile, setEditAvatarFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");
  const [profileErrorMsg, setProfileErrorMsg] = useState("");

  const activeConvIdRef = useRef(null);

  // Keep activeConvIdRef in sync
  useEffect(() => {
    activeConvIdRef.current = activeConversation?._id || activeConversation?.id || null;
  }, [activeConversation]);

  // Dynamic Browser Tab Badge for total unread town messages
  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) Messages | Fazilnagar Town Portal`;
    } else {
      document.title = "Messages | Fazilnagar Town Portal";
    }
  }, [totalUnreadCount]);

  // Instant optimistic unread count zeroing and conversation selection
  const handleSelectConversation = (conv) => {
    if (!conv) {
      setActiveConversation(null);
      activeConvIdRef.current = null;
      return;
    }

    const convId = conv._id || conv.id;
    activeConvIdRef.current = convId;

    // 1. Immediately zero-out unread badge in state and offline storage (ZERO DELAY)
    const updatedConv = { ...conv, unreadCount: 0 };
    setActiveConversation(updatedConv);

    setConversations((prev) => {
      const nextList = prev.map((c) =>
        (c._id || c.id) === convId ? { ...c, unreadCount: 0 } : c
      );
      setCachedConversations(nextList);
      return nextList;
    });

    // 2. Immediately emit socket mark_read
    try {
      const socket = getSocket();
      if (socket) {
        socket.emit("mark_read", { conversationId: convId });
      }
    } catch {}
  };

  // Handle URL deep-link (?conv=...)
  useEffect(() => {
    if (convParam && conversations.length > 0) {
      const match = conversations.find(
        (c) => String(c._id || c.id) === String(convParam)
      );
      if (match) {
        handleSelectConversation(match);
      }
    }
  }, [convParam, conversations.length]);

  // Initialize socket and fetch profile & presence
  useEffect(() => {
    let isMounted = true;

    // Connect socket
    initClientSocket();

    async function loadData() {
      try {
        const [profileRes, convRes, presenceRes] = await Promise.all([
          API.get("/profile/me"),
          API.get("/messages/conversations"),
          API.get("/messages/presence").catch(() => ({ data: { onlineUserIds: [] } })),
        ]);

        if (!isMounted) return;

        if (profileRes.data?.profile) {
          const p = profileRes.data.profile;
          setProfile(p);
          setEditName(p.name || "");
          setEditPhone(p.phone || "");
          setEditAvatarPreview(p.avatar || "");
        }
        if (convRes.data?.conversations) {
          // Normalize: if user is currently looking at active conversation, keep its unreadCount = 0
          const activeId = activeConvIdRef.current;
          const normalized = convRes.data.conversations.map((c) => {
            if (activeId && String(c._id || c.id) === String(activeId)) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          });
          setConversations(normalized);
          setCachedConversations(normalized);
        }
        if (presenceRes.data?.onlineUserIds) {
          setOnlineUserIds(new Set(presenceRes.data.onlineUserIds.map(String)));
        }
      } catch (err) {
        console.error("Data load error:", err);
      } finally {
        if (isMounted) setLoadingConversations(false);
      }
    }

    loadData();

    // Online / Offline window listeners
    const handleOnline = () => {
      setIsOnline(true);
      setReconnectFlash(true);
      setTimeout(() => setReconnectFlash(false), 3500);
      initClientSocket();
      loadData();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for socket events
    let socket;
    try {
      socket = getSocket();
    } catch {
      // socket not ready
    }

    if (socket) {
      const handleConvUpdated = (data) => {
        // Play notification chime for incoming messages not sent by self
        const senderId = data?.lastMessage?.sender;
        if (senderId && String(senderId) !== String(currentUserId)) {
          playMessageChime();
        }

        // Refetch conversation list when an update or message arrives
        API.get("/messages/conversations")
          .then((res) => {
            if (isMounted && res.data?.conversations) {
              const activeId = activeConvIdRef.current;
              const normalized = res.data.conversations.map((c) => {
                if (activeId && String(c._id || c.id) === String(activeId)) {
                  return { ...c, unreadCount: 0 };
                }
                return c;
              });
              setConversations(normalized);
              setCachedConversations(normalized);
            }
          })
          .catch(() => {});
      };

      const handleConvMarkedRead = ({ conversationId }) => {
        if (!conversationId) return;
        setConversations((prev) => {
          const nextList = prev.map((c) =>
            String(c._id || c.id) === String(conversationId)
              ? { ...c, unreadCount: 0 }
              : c
          );
          setCachedConversations(nextList);
          return nextList;
        });
      };

      const handleUserOnline = ({ userId }) => {
        if (!userId) return;
        setOnlineUserIds((prev) => new Set(prev).add(String(userId)));
      };

      const handleUserOffline = ({ userId }) => {
        if (!userId) return;
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          next.delete(String(userId));
          return next;
        });
      };

      const handleOnlineUsersList = ({ onlineUserIds: list }) => {
        if (Array.isArray(list)) {
          setOnlineUserIds(new Set(list.map(String)));
        }
      };

      socket.on("conversation_updated", handleConvUpdated);
      socket.on("conversation_read", handleConvUpdated);
      socket.on("conversation_marked_read", handleConvMarkedRead);
      socket.on("conversation_created", handleConvUpdated);
      socket.on("conversation_left", handleConvUpdated);
      socket.on("user_online", handleUserOnline);
      socket.on("user_offline", handleUserOffline);
      socket.on("online_users_list", handleOnlineUsersList);

      // Query active citizens from socket server
      socket.emit("get_online_users", (res) => {
        if (isMounted && res?.success && Array.isArray(res.onlineUserIds)) {
          setOnlineUserIds(new Set(res.onlineUserIds.map(String)));
        }
      });

      return () => {
        isMounted = false;
        socket.off("conversation_updated", handleConvUpdated);
        socket.off("conversation_read", handleConvUpdated);
        socket.off("conversation_marked_read", handleConvMarkedRead);
        socket.off("conversation_created", handleConvUpdated);
        socket.off("conversation_left", handleConvUpdated);
        socket.off("user_online", handleUserOnline);
        socket.off("user_offline", handleUserOffline);
        socket.off("online_users_list", handleOnlineUsersList);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [currentUserId]);

  const handleManualReconnect = async () => {
    setReconnecting(true);
    try {
      initClientSocket();
      const [convRes, presenceRes] = await Promise.all([
        API.get("/messages/conversations"),
        API.get("/messages/presence").catch(() => ({ data: { onlineUserIds: [] } })),
      ]);
      if (convRes.data?.conversations) {
        const activeId = activeConvIdRef.current;
        const normalized = convRes.data.conversations.map((c) => {
          if (activeId && String(c._id || c.id) === String(activeId)) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
        setConversations(normalized);
        setCachedConversations(normalized);
      }
      if (presenceRes.data?.onlineUserIds) {
        setOnlineUserIds(new Set(presenceRes.data.onlineUserIds.map(String)));
      }
      setIsOnline(true);
      setReconnectFlash(true);
      setTimeout(() => setReconnectFlash(false), 3000);
    } catch {
      // Still unreachable
    } finally {
      setReconnecting(false);
    }
  };

  const handleSignOut = () => {
    clearAuthSession();
    window.location.href = "/login";
  };

  // Start or open a 1-to-1 chat with a citizen picked from search
  const handleSelectCitizenFromSearch = async (user) => {
    setShowSearchModal(false);
    try {
      const res = await API.post("/messages/conversations/direct", {
        recipientId: user.id || user._id,
      });

      if (res.data?.success && res.data.conversation) {
        const conv = res.data.conversation;
        handleSelectConversation(conv);

        // Update conversation list
        setConversations((prev) => {
          const exists = prev.find((c) => (c.id || c._id) === (conv.id || conv._id));
          if (!exists) {
            const nextList = [conv, ...prev];
            setCachedConversations(nextList);
            return nextList;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Start direct conversation error:", err);
    }
  };

  const handleGroupCreated = (newGroup) => {
    setConversations((prev) => {
      const nextList = [
        newGroup,
        ...prev.filter((c) => (c._id || c.id) !== (newGroup._id || newGroup.id)),
      ];
      setCachedConversations(nextList);
      return nextList;
    });
    handleSelectConversation(newGroup);
  };

  const handleConversationUpdated = (update) => {
    const convId = update.conversationId || update._id || update.id;
    setConversations((prev) => {
      const nextList = prev.map((c) => {
        if ((c.id || c._id) === convId) {
          return {
            ...c,
            ...update,
            isMuted: update.isMuted !== undefined ? update.isMuted : c.isMuted,
            isPinned: update.isPinned !== undefined ? update.isPinned : c.isPinned,
            isArchived: update.isArchived !== undefined ? update.isArchived : c.isArchived,
            status: update.status || c.status,
            groupName: update.groupName || c.groupName,
            groupDescription: update.groupDescription !== undefined ? update.groupDescription : c.groupDescription,
            lastMessage: update.lastMessage || c.lastMessage,
            lastMessageAt: update.lastMessage ? new Date().toISOString() : c.lastMessageAt,
          };
        }
        return c;
      });
      setCachedConversations(nextList);
      return nextList;
    });

    setActiveConversation((prev) => {
      if (prev && ((prev.id || prev._id) === convId)) {
        return {
          ...prev,
          ...update,
          isMuted: update.isMuted !== undefined ? update.isMuted : prev.isMuted,
          isPinned: update.isPinned !== undefined ? update.isPinned : prev.isPinned,
          isArchived: update.isArchived !== undefined ? update.isArchived : prev.isArchived,
          status: update.status || prev.status,
        };
      }
      return prev;
    });
  };

  // Quick Profile Image selection & compression
  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileErrorMsg("Please choose a JPG, PNG, or WebP picture.");
      return;
    }
    setEditAvatarFile(file);
    setEditAvatarPreview(URL.createObjectURL(file));
  };

  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Compression failed"));
            },
            "image/webp",
            0.85
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSavingProfile(true);
    setProfileErrorMsg("");
    setProfileSuccessMsg("");

    try {
      let avatarUrl = profile?.avatar || "";

      // 1. Upload avatar if selected
      if (editAvatarFile) {
        const compressedBlob = await compressImage(editAvatarFile);
        const formData = new FormData();
        formData.append("avatar", compressedBlob, "avatar.webp");
        const uploadRes = await API.post("/profile/avatar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (uploadRes.data?.avatar) {
          avatarUrl = uploadRes.data.avatar;
        }
      }

      // 2. Update name and mobile phone in database
      const updateRes = await API.patch("/profile/me", {
        name: editName.trim(),
        phone: editPhone.trim(),
      });

      if (updateRes.data?.profile) {
        const updated = {
          ...updateRes.data.profile,
          avatar: avatarUrl || updateRes.data.profile.avatar,
        };
        setProfile(updated);
        setEditName(updated.name);
        setEditPhone(updated.phone || "");
        setEditAvatarPreview(updated.avatar || "");
        setEditAvatarFile(null);
        setProfileSuccessMsg("Profile and mobile number updated! / प्रोफ़ाइल सुरक्षित हुई।");
        setTimeout(() => {
          setShowProfileModal(false);
          setProfileSuccessMsg("");
        }, 2000);
      }
    } catch (err) {
      setProfileErrorMsg(err.response?.data?.message || err.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const displayName = profile?.name || portalUser?.name || portalUser?.email || "Citizen";
  const userEmail = profile?.email || portalUser?.email || "";
  const username =
    profile?.username ||
    (userEmail ? userEmail.split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 15) : "citizen");

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 h-full flex flex-col py-2 md:py-3 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-3 pb-2.5 mb-2 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          {/* Mobile Hamburger Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition md:hidden cursor-pointer"
            title="Navigation Menu / मेन्यू"
            aria-label="Open Mobile Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-800" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B8323C] text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                Town Messaging / नगर संवाद
              </h1>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Fazilnagar real-time direct messaging &amp; civic communications
              </p>
            </div>
          </div>
        </div>

        {/* User Card & Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition cursor-pointer text-left group"
            title="Update Profile Picture & Mobile / प्रोफ़ाइल बदलें"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0 relative">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600">
                  {(displayName || "C")[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-left hidden sm:block">
              <span className="text-xs font-bold text-slate-800 block leading-tight group-hover:text-[#B8323C] transition">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                {profile?.phone ? profile.phone : `@${username}`}
              </span>
            </div>
            <Edit3 className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#B8323C] ml-0.5 transition" />
          </button>

          <Link
            to="/profile"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
            title="Full Profile & Privacy Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>

          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition cursor-pointer"
            title="Sign out / लॉग आउट"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Offline / Reconnect Banner */}
      {!isOnline && (
        <div className="mb-2 bg-amber-500/10 border border-amber-300/80 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 shadow-xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <WifiOff className="w-3.5 h-3.5" />
            </span>
            <div className="truncate">
              <span className="font-bold">Offline / आप ऑफ़लाइन हैं</span>
              <span className="text-[11px] text-amber-800/80 ml-2 hidden sm:inline">
                Outgoing messages will queue and sync when reconnected.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualReconnect}
            disabled={reconnecting}
            className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 text-[11px]"
          >
            <RefreshCw className={`w-3 h-3 ${reconnecting ? "animate-spin" : ""}`} />
            <span>{reconnecting ? "Reconnecting..." : "Retry"}</span>
          </button>
        </div>
      )}

      {reconnectFlash && (
        <div className="mb-2 bg-emerald-50 border border-emerald-300 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs shrink-0 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <p className="font-bold text-xs">
              Connected! Town messages are synchronized. / कनेक्शन पुनः स्थापित हुआ।
            </p>
          </div>
        </div>
      )}

      {/* Main Messaging Interface - Fixed Full-Height Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 lg:gap-5 items-stretch flex-1 min-h-0 overflow-hidden">
        {/* Left Column: Conversations List */}
        <div
          className={`md:col-span-5 ${
            showInfoPanel && activeConversation ? "lg:col-span-4 xl:col-span-3" : "lg:col-span-4"
          } ${activeConversation ? "hidden md:flex" : "flex"} flex-col h-full min-h-0 overflow-hidden`}
        >
          <ConversationList
            conversations={conversations}
            selectedId={activeConversation?._id || activeConversation?.id}
            onSelectConversation={handleSelectConversation}
            onOpenSearch={() => setShowSearchModal(true)}
            onOpenNewGroup={() => setShowCreateGroupModal(true)}
            loading={loadingConversations}
            onlineUserIds={onlineUserIds}
          />
        </div>

        {/* Center Column: Chat Window or Empty State */}
        <div
          className={`md:col-span-7 ${
            showInfoPanel && activeConversation
              ? "lg:col-span-5 xl:col-span-6"
              : "lg:col-span-8"
          } ${activeConversation ? "flex" : "hidden md:flex"} flex-col h-full min-h-0 overflow-hidden`}
        >
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              currentUserId={currentUserId}
              onBack={() => {
                setActiveConversation(null);
                activeConvIdRef.current = null;
              }}
              onConversationUpdated={handleConversationUpdated}
              onlineUserIds={onlineUserIds}
              onOpenMobileMenu={() => setMobileDrawerOpen(true)}
              onToggleInfoPanel={() => setShowInfoPanel((p) => !p)}
              showInfoPanel={showInfoPanel}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-red-50 text-[#B8323C] flex items-center justify-center shadow-xs">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="max-w-sm space-y-1">
                <h2 className="text-base font-bold text-slate-800">
                  Select a Conversation / संवाद चुनें
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Choose a chat from the left or search for a verified citizen to start a new private discussion.
                </p>
              </div>

              <button
                onClick={() => setShowSearchModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Search Citizens / नया संवाद शुरू करें</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Conversation Information Panel on larger screens */}
        {showInfoPanel && activeConversation && (
          <div className="hidden lg:flex lg:col-span-3 xl:col-span-3 flex-col h-full min-h-0 overflow-hidden">
            <ConversationInfoPanel
              conversation={activeConversation}
              currentUserId={currentUserId}
              onlineUserIds={onlineUserIds}
              onClose={() => setShowInfoPanel(false)}
              onConversationUpdated={handleConversationUpdated}
              onLeftGroup={() => {
                setActiveConversation(null);
                activeConvIdRef.current = null;
                setShowInfoPanel(false);
              }}
            />
          </div>
        )}
      </div>

      {/* Mandatory Mobile Slide-in Drawer */}
      <MobileMessagingDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        conversations={conversations}
        selectedId={activeConversation?._id || activeConversation?.id}
        onSelectConversation={(conv) => {
          handleSelectConversation(conv);
          setMobileDrawerOpen(false);
        }}
        onOpenNewChat={() => {
          setMobileDrawerOpen(false);
          setShowSearchModal(true);
        }}
        onOpenCreateGroup={() => {
          setMobileDrawerOpen(false);
          setShowCreateGroupModal(true);
        }}
        profile={profile}
        portalUser={portalUser}
        onlineUserIds={onlineUserIds}
        currentUserId={currentUserId}
        onStartChatWithCitizen={(citizen) => {
          setMobileDrawerOpen(false);
          handleSelectCitizenFromSearch(citizen);
        }}
      />

      {/* Citizen Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-2 relative shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <button
              onClick={() => setShowSearchModal(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition z-10 cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <UserSearch onSelectUser={handleSelectCitizenFromSearch} />
          </div>
        </div>
      )}

      {/* Quick Profile Picture & Mobile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#B8323C] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Edit Profile / प्रोफ़ाइल अपडेट
                  </h3>
                  <p className="text-[10px] text-slate-400">Add profile photo and mobile number</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-800 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Selector */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-xs shrink-0 flex items-center justify-center relative">
                  {editAvatarPreview ? (
                    <img src={editAvatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-slate-600">
                      {(editName || displayName || "C")[0]?.toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="quick-avatar-input"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#B8323C]" />
                    <span>Change Photo / फ़ोटो बदलें</span>
                  </label>
                  <input
                    id="quick-avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <p className="text-[10px] text-slate-400">JPG, PNG, or WebP. Auto-compressed.</p>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Display Name / नाम <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none"
                />
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Mobile Phone / मोबाइल नंबर</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 flex items-center">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                  <input
                    type="tel"
                    maxLength={15}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Used for citizen contact &amp; identification</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <Link
                  to="/profile"
                  onClick={() => setShowProfileModal(false)}
                  className="text-xs text-[#B8323C] hover:underline font-bold"
                >
                  More privacy settings →
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-1.5 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Save / सुरक्षित करें</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
}
