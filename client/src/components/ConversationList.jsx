import { useState } from "react";
import { MessageSquare, UserPlus, ShieldAlert, Clock, Inbox, Sparkles, Users } from "lucide-react";

export default function ConversationList({
  conversations,
  selectedId,
  onSelectConversation,
  onOpenSearch,
  onOpenNewGroup,
  loading,
  onlineUserIds = new Set(),
}) {
  const [filter, setFilter] = useState("all"); // 'all' | 'groups' | 'requests'

  const activeConversations = conversations.filter((c) => c.status === "active");
  const requestConversations = conversations.filter((c) => c.status === "pending" && !c.isInitiator);
  const groupConversations = activeConversations.filter((c) => c.type === "group");

  const displayedList =
    filter === "requests"
      ? requestConversations
      : filter === "groups"
      ? groupConversations
      : activeConversations;

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
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[650px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#B8323C] text-white flex items-center justify-center shadow-2xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">Messages / संवाद</h2>
            <p className="text-[10px] text-slate-400">Fazilnagar Citizens</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenNewGroup}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Create Town Group / नया समूह"
          >
            <Users className="w-3.5 h-3.5 text-[#B8323C]" />
            <span className="hidden sm:inline">New Group</span>
          </button>

          <button
            onClick={onOpenSearch}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-2xs cursor-pointer"
            title="Search Citizens / नया संवाद"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#B8323C]" />
            <span>Chat</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-3 pt-2 gap-2 text-xs font-semibold">
        <button
          onClick={() => setFilter("all")}
          className={`pb-2 px-2 border-b-2 transition cursor-pointer ${
            filter === "all"
              ? "border-[#B8323C] text-[#B8323C]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All ({activeConversations.length})
        </button>

        {groupConversations.length > 0 && (
          <button
            onClick={() => setFilter("groups")}
            className={`pb-2 px-2 border-b-2 transition cursor-pointer ${
              filter === "groups"
                ? "border-[#B8323C] text-[#B8323C]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Groups ({groupConversations.length})
          </button>
        )}

        <button
          onClick={() => setFilter("requests")}
          className={`pb-2 px-2 border-b-2 flex items-center gap-1.5 transition ${
            filter === "requests"
              ? "border-[#B8323C] text-[#B8323C]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Requests</span>
          {requestConversations.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
              {requestConversations.length}
            </span>
          )}
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading chats...</div>
        ) : displayedList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-slate-700">
              {filter === "requests" ? "No message requests" : "No conversations yet"}
            </p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              {filter === "requests"
                ? "When citizens with restricted privacy reach out, their requests appear here."
                : "Find citizens using the search button above to start your first chat."}
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
                  isSelected ? "bg-red-50/70 border-r-2 border-[#B8323C]" : "hover:bg-slate-50"
                }`}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 relative">
                  {isGroup ? (
                    c.groupAvatar ? (
                      <img src={c.groupAvatar} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[#B8323C] bg-red-50">
                        <Users className="w-5 h-5" />
                      </div>
                    )
                  ) : other.avatar ? (
                    <img src={other.avatar} alt={other.name} className="w-full h-full object-cover" />
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
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {formatTime(c.lastMessageAt || c.lastMessage?.createdAt)}
                    </span>
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
                    <p
                      className={`text-xs truncate ${
                        unread > 0 ? "font-bold text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {c.lastMessage?.text || (isGroup ? "Group created" : "Started conversation")}
                    </p>

                    {unread > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-[#B8323C] text-white font-bold text-[10px] shrink-0">
                        {unread > 9 ? "9+" : unread}
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
