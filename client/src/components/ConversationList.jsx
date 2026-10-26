import { useState } from "react";
import { resolveMediaUrl, getAvatarUrl } from "../utils/mediaUtils";
import {
  MessageSquare,
  UserPlus,
  ShieldAlert,
  Clock,
  Inbox,
  Sparkles,
  Users,
  Search,
  X,
  Image as ImageIcon,
  CheckCheck,
  Pin,
  BellOff,
  Video,
  Mic,
  FileText,
} from "lucide-react";

export default function ConversationList({
  conversations = [],
  selectedId,
  onSelectConversation,
  onOpenSearch,
  onOpenNewGroup,
  loading = false,
  onlineUserIds = new Set(),
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'direct' | 'groups' | 'unread' | 'requests'
  const [searchQuery, setSearchQuery] = useState("");

  const activeConversations = conversations.filter((c) => c.status === "active");
  const requestConversations = conversations.filter((c) => c.status === "pending" && !c.isInitiator);
  const groupConversations = activeConversations.filter((c) => c.type === "group");
  const directConversations = activeConversations.filter((c) => c.type === "direct" || !c.type);
  const unreadConversations = activeConversations.filter((c) => (c.unreadCount || 0) > 0);

  let displayedList = [...activeConversations];
  if (filter === "requests") displayedList = [...requestConversations];
  else if (filter === "groups") displayedList = [...groupConversations];
  else if (filter === "direct") displayedList = [...directConversations];
  else if (filter === "unread") displayedList = [...unreadConversations];

  // Search query filter
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayedList = displayedList.filter((c) => {
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

  // Pinned conversations sort to top
  displayedList.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const timeA = new Date(a.lastMessageAt || a.lastMessage?.createdAt || 0).getTime();
    const timeB = new Date(b.lastMessageAt || b.lastMessage?.createdAt || 0).getTime();
    return timeB - timeA;
  });

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

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-full min-h-0 overflow-hidden">
      {/* Top Sidebar Action Bar: New Group & New Chat (Clean header without duplicate title) */}
      <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 shrink-0">
        <button
          type="button"
          onClick={onOpenNewGroup}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 text-xs font-bold transition shadow-2xs cursor-pointer"
          title="Create Town Group / नया समूह"
        >
          <Users className="w-3.5 h-3.5 text-[#B8323C]" />
          <span>New Group</span>
        </button>

        <button
          type="button"
          onClick={onOpenSearch}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition shadow-2xs cursor-pointer"
          title="Search Citizens / नया संवाद शुरू करें"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ New Chat</span>
        </button>
      </div>

      {/* Instant Search Bar */}
      <div className="p-2.5 border-b border-slate-100 bg-white shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter conversations... / खोजें..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B8323C]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-slate-100 text-[11px] font-bold bg-slate-50/30 shrink-0">
        {[
          { id: "all", label: "All", count: activeConversations.length },
          { id: "unread", label: "Unread", count: unreadConversations.length },
          { id: "direct", label: "Direct", count: directConversations.length },
          { id: "groups", label: "Groups", count: groupConversations.length },
          { id: "requests", label: "Requests", count: requestConversations.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
              filter === tab.id
                ? "bg-[#B8323C] text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`text-[9px] px-1 rounded-full font-black ${
                  filter === tab.id ? "bg-white text-[#B8323C]" : "bg-slate-200 text-slate-700"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conversation List */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain divide-y divide-slate-100">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                  <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayedList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              {filter === "requests" ? "No message requests" : "No conversations found"}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {filter === "requests"
                ? "When citizens with restricted privacy reach out, their requests appear here."
                : "Find citizens using the '+ Chat' button above to start your first conversation."}
            </p>
          </div>
        ) : (
          displayedList.map((c) => {
            const isSelected = selectedId === (c.id || c._id);
            const isGroup = c.type === "group";
            const other = c.otherUser || {};
            const unread = c.unreadCount || 0;
            const displayName = isGroup ? c.groupName || "Town Group" : other.name || "Citizen";
            const otherId = String(other._id || other.id || "");
            const isOnline = !isGroup && otherId && onlineUserIds?.has?.(otherId);

            return (
              <button
                key={c.id || c._id}
                onClick={() => onSelectConversation(c)}
                className={`w-full text-left p-3.5 flex items-start gap-3 transition cursor-pointer ${
                  isSelected ? "bg-red-50/70 border-r-3 border-[#B8323C]" : "hover:bg-slate-50"
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 relative border border-slate-200/80 shadow-2xs flex items-center justify-center">
                  <div
                    className={`absolute inset-0 flex items-center justify-center font-bold text-xs ${
                      isGroup
                        ? "text-[#B8323C] bg-red-50"
                        : "text-slate-700 bg-gradient-to-br from-slate-100 to-slate-200"
                    }`}
                  >
                    {isGroup ? <Users className="w-5 h-5" /> : (other.name || "C")[0]?.toUpperCase()}
                  </div>
                  {isGroup ? (
                    c.groupAvatar ? (
                      <img
                        src={resolveMediaUrl(c.groupAvatar)}
                        alt={displayName}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null
                  ) : other.avatar ? (
                    <img
                      src={getAvatarUrl(other.avatar, 72)}
                      alt={other.name}
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  {isOnline && (
                    <span
                      className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full ring-1 ring-white z-10"
                      title="Online"
                    />
                  )}
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#B8323C] border-2 border-white rounded-full z-10" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {displayName}
                      </span>
                      {isGroup && (
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-bold text-[9px] shrink-0">
                          Group
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {c.isPinned && (
                        <Pin className="w-3 h-3 text-[#B8323C] shrink-0" title="Pinned conversation / पिन किया हुआ" />
                      )}
                      {c.isMuted && (
                        <BellOff className="w-3 h-3 text-slate-400 shrink-0" title="Muted / म्यूट" />
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        {formatTime(c.lastMessageAt || c.lastMessage?.createdAt)}
                      </span>
                    </div>
                  </div>

                  {isGroup ? (
                    <span className="text-[10px] text-slate-400 font-medium block -mt-0.5 truncate">
                      {c.groupDescription || `${c.otherMembers?.length ? c.otherMembers.length + 1 : "Town"} members`}
                    </span>
                  ) : other.username ? (
                    <span className="text-[10px] text-slate-400 font-mono block -mt-0.5">
                      @{other.username}
                    </span>
                  ) : null}

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                      {c.lastMessage?.type === "image" ? (
                        <ImageIcon className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : c.lastMessage?.type === "video" ? (
                        <Video className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : c.lastMessage?.type === "audio" ? (
                        <Mic className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : c.lastMessage?.type === "document" ? (
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                      ) : null}
                      <span>
                        {c.lastMessage?.text ||
                          (isGroup ? "Group conversation created" : "Started a direct conversation")}
                      </span>
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
    </div>
  );
}
