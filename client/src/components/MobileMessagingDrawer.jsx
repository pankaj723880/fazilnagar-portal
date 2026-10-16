import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import {
  X,
  Search,
  MessageSquare,
  Users,
  UserPlus,
  Inbox,
  Settings,
  Sparkles,
  Shield,
  Loader2,
  Filter,
} from "lucide-react";
import { resolveMediaUrl } from "../utils/mediaUtils";

export default function MobileMessagingDrawer({
  isOpen,
  onClose,
  conversations = [],
  selectedId,
  onSelectConversation,
  onOpenSearch,
  onOpenNewGroup,
  loading = false,
  onlineUserIds = new Set(),
  profile,
  portalUser,
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'direct' | 'groups' | 'unread' | 'requests'
  const [searchQuery, setSearchQuery] = useState("");
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [searchingCitizens, setSearchingCitizens] = useState(false);
  const [activeTab, setActiveTab] = useState("chats"); // 'chats' | 'citizens'

  const drawerRef = useRef(null);

  // Esc key & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Citizen live search in drawer
  useEffect(() => {
    if (activeTab !== "citizens" || discoverQuery.trim().length < 2) {
      setDiscoverUsers([]);
      setSearchingCitizens(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingCitizens(true);
      try {
        const res = await API.get("/users/search", {
          params: { q: discoverQuery.trim(), page: 1, limit: 10 },
        });
        if (res.data?.success) {
          setDiscoverUsers(res.data.users || []);
        }
      } catch {
        setDiscoverUsers([]);
      } finally {
        setSearchingCitizens(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [discoverQuery, activeTab]);

  if (!isOpen) return null;

  // Conversations filtering & sorting
  const activeConversations = conversations.filter((c) => c.status === "active");
  const requestConversations = conversations.filter((c) => c.status === "pending" && !c.isInitiator);
  const groupConversations = activeConversations.filter((c) => c.type === "group");
  const directConversations = activeConversations.filter((c) => c.type === "direct" || !c.type);
  const unreadConversations = activeConversations.filter((c) => (c.unreadCount || 0) > 0);

  let filteredList = activeConversations;
  if (filter === "requests") filteredList = requestConversations;
  else if (filter === "groups") filteredList = groupConversations;
  else if (filter === "direct") filteredList = directConversations;
  else if (filter === "unread") filteredList = unreadConversations;

  // Client search within conversations
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filteredList = filteredList.filter((c) => {
      const isGrp = c.type === "group";
      const name = (isGrp ? c.groupName : c.otherUser?.name) || "";
      const username = c.otherUser?.username || "";
      const lastMsg = c.lastMessage?.text || "";
      return (
        name.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q) ||
        lastMsg.toLowerCase().includes(q)
      );
    });
  }

  // Format short timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const displayName = profile?.name || portalUser?.name || portalUser?.email || "Citizen";
  const username =
    profile?.username ||
    (portalUser?.email ? portalUser.email.split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 15) : "citizen");

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Drawer */}
      <div
        ref={drawerRef}
        className="relative w-[85%] max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Town Messaging Drawer"
      >
        {/* Drawer Header: User Profile Card */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 min-w-0 hover:opacity-85 transition"
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300/80">
              {profile?.avatar ? (
                <img
                  src={resolveMediaUrl(profile.avatar)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600">
                  {(displayName || "C")[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-900 block truncate leading-tight">
                {displayName}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">@{username}</span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/profile"
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
              title="Messaging Settings"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-200/60 transition"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="p-3 border-b border-slate-100 grid grid-cols-2 gap-2 bg-white">
          <button
            onClick={() => {
              onClose();
              onOpenSearch();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>+ New Chat</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenNewGroup();
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-[#B8323C]" />
            <span>Create Group</span>
          </button>
        </div>

        {/* Top Drawer Tabs: Chats vs Discover Citizens */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 text-xs font-bold">
          <button
            onClick={() => setActiveTab("chats")}
            className={`flex-1 py-2.5 text-center border-b-2 transition ${
              activeTab === "chats"
                ? "border-[#B8323C] text-[#B8323C] bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Conversations ({activeConversations.length})
          </button>
          <button
            onClick={() => setActiveTab("citizens")}
            className={`flex-1 py-2.5 text-center border-b-2 transition ${
              activeTab === "citizens"
                ? "border-[#B8323C] text-[#B8323C] bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Discover Citizens
          </button>
        </div>

        {/* CHATS TAB */}
        {activeTab === "chats" && (
          <>
            {/* Search within conversations */}
            <div className="p-2.5 border-b border-slate-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats... / खोजें..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B8323C]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-100 text-[11px] font-bold">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread", count: unreadConversations.length },
                { id: "direct", label: "Direct", count: directConversations.length },
                { id: "groups", label: "Groups", count: groupConversations.length },
                { id: "requests", label: "Requests", count: requestConversations.length },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-full whitespace-nowrap transition flex items-center gap-1 ${
                    filter === pill.id
                      ? "bg-[#B8323C] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span>{pill.label}</span>
                  {pill.count > 0 && (
                    <span
                      className={`text-[9px] px-1 rounded-full font-black ${
                        filter === pill.id ? "bg-white text-[#B8323C]" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {pill.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#B8323C]" />
                  <span>Loading conversations...</span>
                </div>
              ) : filteredList.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No chats found</p>
                  <p className="text-[11px] text-slate-400">
                    {filter === "requests"
                      ? "No pending message requests."
                      : "Tap '+ New Chat' to find verified citizens."}
                  </p>
                </div>
              ) : (
                filteredList.map((c) => {
                  const isSelected = selectedId === (c.id || c._id);
                  const isGroup = c.type === "group";
                  const other = c.otherUser || {};
                  const unread = c.unreadCount || 0;
                  const itemTitle = isGroup ? c.groupName || "Town Group" : other.name || "Citizen";
                  const otherId = String(other._id || other.id || "");
                  const isOnline = !isGroup && otherId && onlineUserIds?.has?.(otherId);

                  return (
                    <button
                      key={c.id || c._id}
                      onClick={() => {
                        onSelectConversation(c);
                        onClose();
                      }}
                      className={`w-full text-left p-3 flex items-start gap-3 transition cursor-pointer ${
                        isSelected ? "bg-red-50/70 border-r-3 border-[#B8323C]" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 relative">
                        {isGroup ? (
                          c.groupAvatar ? (
                            <img
                              src={resolveMediaUrl(c.groupAvatar)}
                              alt={itemTitle}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[#B8323C] bg-red-50">
                              <Users className="w-5 h-5" />
                            </div>
                          )
                        ) : other.avatar ? (
                          <img
                            src={resolveMediaUrl(other.avatar)}
                            alt={other.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-100">
                            {(other.name || "C")[0]?.toUpperCase()}
                          </div>
                        )}
                        {isOnline && (
                          <span
                            className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-white"
                            title="Online"
                          />
                        )}
                        {unread > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#B8323C] border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900 truncate">{itemTitle}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                            {formatTime(c.lastMessageAt || c.lastMessage?.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-[11px] text-slate-500 truncate">
                            {c.lastMessage?.text || (isGroup ? "Group conversation" : "Direct chat")}
                          </p>
                          {unread > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-[#B8323C] text-white text-[9px] font-black shrink-0">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* CITIZENS DISCOVERY TAB */}
        {activeTab === "citizens" && (
          <div className="flex-1 flex flex-col p-3 overflow-y-auto">
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                placeholder="Search citizen by name or @username..."
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B8323C]"
              />
              {discoverQuery && (
                <button
                  onClick={() => setDiscoverQuery("")}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {searchingCitizens ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#B8323C]" />
                <span>Searching citizens...</span>
              </div>
            ) : discoverQuery.trim().length < 2 ? (
              <div className="p-6 text-center text-xs text-slate-400 space-y-1">
                <Sparkles className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">Type at least 2 characters</p>
                <p className="text-[11px]">Discover verified citizens in Fazilnagar to start messaging.</p>
              </div>
            ) : discoverUsers.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No citizens found matching "{discoverQuery}".
              </div>
            ) : (
              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
                {discoverUsers.map((u) => (
                  <div
                    key={u.id || u._id}
                    onClick={() => {
                      onClose();
                      onOpenSearch();
                    }}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold text-slate-600">
                        {u.avatar ? (
                          <img
                            src={resolveMediaUrl(u.avatar)}
                            alt={u.name}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          (u.name || "C")[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate leading-tight">
                          {u.name}
                        </span>
                        {u.username && (
                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                            @{u.username}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-[#B8323C] bg-red-50 px-2 py-0.5 rounded-lg shrink-0">
                      Chat
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer: Privacy Notice & Settings Link */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between text-[11px] text-slate-500">
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-1.5 hover:text-slate-800 font-medium"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>Privacy &amp; Blocked Users</span>
          </Link>
          <span className="text-[10px] font-mono text-slate-400">PIN 274401</span>
        </div>
      </div>
    </div>
  );
}
