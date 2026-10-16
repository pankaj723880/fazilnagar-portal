import { useState, useEffect } from "react";
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

  // Dynamic Browser Tab Badge for total unread town messages
  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) Messages | Fazilnagar Town Portal`;
    } else {
      document.title = "Messages | Fazilnagar Town Portal";
    }
  }, [totalUnreadCount]);

  // Handle URL deep-link (?conv=...)
  useEffect(() => {
    if (convParam && conversations.length > 0) {
      const match = conversations.find(
        (c) => String(c._id || c.id) === String(convParam)
      );
      if (match) {
        setActiveConversation(match);
      }
    }
  }, [convParam, conversations]);

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
          setProfile(profileRes.data.profile);
        }
        if (convRes.data?.conversations) {
          setConversations(convRes.data.conversations);
          setCachedConversations(convRes.data.conversations);
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
              setConversations(res.data.conversations);
            }
          })
          .catch(() => {});
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
        setConversations(convRes.data.conversations);
        setCachedConversations(convRes.data.conversations);
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
        setActiveConversation(conv);

        // Update conversation list
        setConversations((prev) => {
          const exists = prev.find((c) => (c.id || c._id) === (conv.id || conv._id));
          if (!exists) {
            return [conv, ...prev];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Start direct conversation error:", err);
    }
  };

  const handleGroupCreated = (newGroup) => {
    setConversations((prev) => [
      newGroup,
      ...prev.filter((c) => (c._id || c.id) !== (newGroup._id || newGroup.id)),
    ]);
    setActiveConversation(newGroup);
  };

  const handleConversationUpdated = (update) => {
    setConversations((prev) =>
      prev.map((c) => {
        if ((c.id || c._id) === update.conversationId || (c.id || c._id) === update._id) {
          return {
            ...c,
            groupName: update.groupName || c.groupName,
            groupDescription: update.groupDescription !== undefined ? update.groupDescription : c.groupDescription,
            status: update.status || c.status,
            lastMessage: update.lastMessage || c.lastMessage,
            lastMessageAt: new Date().toISOString(),
          };
        }
        return c;
      })
    );
  };

  const displayName = profile?.name || portalUser?.name || portalUser?.email || "Citizen";
  const userEmail = profile?.email || portalUser?.email || "";
  const username =
    profile?.username ||
    (userEmail ? userEmail.split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 15) : "citizen");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* Mobile Hamburger Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 -ml-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition md:hidden cursor-pointer"
            title="Navigation Menu / मेन्यू"
            aria-label="Open Mobile Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-800" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#B8323C] text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Town Messaging / नगर संवाद
              </h1>
              <p className="text-xs text-slate-500">
                Fazilnagar real-time direct messaging &amp; civic communications
              </p>
            </div>
          </div>
        </div>

        {/* User Card & Settings */}
        <div className="flex items-center gap-3">
          <Link
            to="/profile"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition"
          >
            <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden shrink-0">
              {profile?.avatar ? (
                <img src={profile.avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600">
                  {(displayName || "C")[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-800 block leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block leading-tight">
                @{username}
              </span>
            </div>
            <Settings className="w-4 h-4 text-slate-400 ml-1" />
          </Link>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 transition"
            title="Sign out / लॉग आउट"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Offline / Reconnect Banner */}
      {!isOnline && (
        <div className="mb-4 bg-amber-500/10 border border-amber-300/80 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <WifiOff className="w-4 h-4" />
            </span>
            <div>
              <p className="font-bold">You are currently offline / आप ऑफ़लाइन हैं</p>
              <p className="text-[11px] text-amber-800/80">
                Browsing cached conversations. Outgoing messages will queue and send automatically when connection recovers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleManualReconnect}
            disabled={reconnecting}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reconnecting ? "animate-spin" : ""}`} />
            <span>{reconnecting ? "Reconnecting..." : "Retry Connection"}</span>
          </button>
        </div>
      )}

      {reconnectFlash && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <p className="font-bold">
              Connected! Town messages are synchronized. / कनेक्शन पुनः स्थापित हुआ।
            </p>
          </div>
        </div>
      )}

      {/* Main Messaging Interface */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Conversations List */}
        <div
          className={`md:col-span-5 ${
            showInfoPanel && activeConversation ? "lg:col-span-4 xl:col-span-3" : "lg:col-span-4"
          } ${activeConversation ? "hidden md:block" : "block"}`}
        >
          <ConversationList
            conversations={conversations}
            selectedId={activeConversation?._id || activeConversation?.id}
            onSelectConversation={(conv) => setActiveConversation(conv)}
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
          } ${activeConversation ? "block" : "hidden md:block"}`}
        >
          {activeConversation ? (
            <ChatWindow
              conversation={activeConversation}
              currentUserId={currentUserId}
              onBack={() => setActiveConversation(null)}
              onConversationUpdated={handleConversationUpdated}
              onlineUserIds={onlineUserIds}
              onOpenMobileMenu={() => setMobileDrawerOpen(true)}
              onToggleInfoPanel={() => setShowInfoPanel((p) => !p)}
              showInfoPanel={showInfoPanel}
            />
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs h-[650px] flex flex-col items-center justify-center p-8 text-center space-y-4">
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                <span>Search Citizens / नया संवाद शुरू करें</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Conversation Information Panel on larger screens */}
        {showInfoPanel && activeConversation && (
          <div className="hidden lg:block lg:col-span-3 xl:col-span-3">
            <ConversationInfoPanel
              conversation={activeConversation}
              currentUserId={currentUserId}
              onlineUserIds={onlineUserIds}
              onClose={() => setShowInfoPanel(false)}
              onConversationUpdated={handleConversationUpdated}
              onLeftGroup={() => {
                setActiveConversation(null);
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
          setActiveConversation(conv);
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-2 relative shadow-2xl border border-slate-200">
            <button
              onClick={() => setShowSearchModal(false)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition z-10"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <UserSearch onSelectUser={handleSelectCitizenFromSearch} />
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Security Tip Footer */}
      <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/60 text-amber-900 text-xs flex items-center gap-2.5">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Citizen Safety Notice:</strong> Never share your one-time passwords (OTP), banking details, or passwords with anyone on the portal. Messages are stored securely in MongoDB Atlas.
        </span>
      </div>
    </div>
  );
}
