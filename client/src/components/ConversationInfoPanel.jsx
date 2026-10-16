import { useState, useEffect } from "react";
import API from "../api";
import {
  X,
  Shield,
  ShieldAlert,
  Ban,
  Flag,
  Users,
  Image as ImageIcon,
  FileText,
  Pin,
  Bell,
  BellOff,
  LogOut,
  MapPin,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function ConversationInfoPanel({
  conversation,
  currentUserId,
  onClose,
  onToggleBlock,
  onOpenReport,
  onOpenGroupDetails,
  onConversationUpdated,
  messages = [],
  onSelectImage,
  isBlocked = false,
}) {
  const [isMuted, setIsMuted] = useState(Boolean(conversation?.isMuted));
  const [isPinned, setIsPinned] = useState(Boolean(conversation?.isPinned));

  useEffect(() => {
    setIsMuted(Boolean(conversation?.isMuted));
    setIsPinned(Boolean(conversation?.isPinned));
  }, [conversation]);

  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      await API.patch(`/messages/conversations/${conversation._id || conversation.id}/preferences`, {
        isMuted: next,
      });
      if (onConversationUpdated) {
        onConversationUpdated({ conversationId: conversation._id || conversation.id, isMuted: next });
      }
    } catch (err) {
      setIsMuted(!next);
    }
  };

  const handleTogglePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      await API.patch(`/messages/conversations/${conversation._id || conversation.id}/preferences`, {
        isPinned: next,
      });
      if (onConversationUpdated) {
        onConversationUpdated({ conversationId: conversation._id || conversation.id, isPinned: next });
      }
    } catch (err) {
      setIsPinned(!next);
    }
  };

  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const otherUser = conversation.otherUser || {};
  const displayName = isGroup ? conversation.groupName || "Town Group" : otherUser.name || "Citizen";

  // Filter media from messages history
  const mediaMessages = messages.filter((m) => m.type === "image" && m.mediaUrl && !m.isDeletedForEveryone);
  const docMessages = messages.filter(
    (m) => ["document", "video", "audio"].includes(m.type) && m.mediaUrl && !m.isDeletedForEveryone
  );

  return (
    <div className="w-80 border-l border-slate-200/80 bg-white flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
          {isGroup ? "Group Details / समूह विवरण" : "Citizen Info / नागरिक विवरण"}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 flex flex-col items-center text-center border-b border-slate-100 space-y-3">
        {/* Large Avatar */}
        <div className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-slate-200/80 overflow-hidden shadow-xs relative">
          {isGroup ? (
            conversation.groupAvatar ? (
              <img src={conversation.groupAvatar} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-[#B8323C] bg-red-50">
                <Users className="w-10 h-10" />
              </div>
            )
          ) : otherUser.avatar ? (
            <img src={otherUser.avatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-slate-600 bg-slate-100">
              {(displayName || "C")[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* Name and Tags */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-center gap-1.5">
            <h4 className="text-sm font-black text-slate-900 tracking-tight">{displayName}</h4>
            {isGroup ? (
              <span className="px-1.5 py-0.2 rounded-md bg-[#B8323C]/10 text-[#B8323C] font-black text-[9px]">
                GROUP
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200">
                CITIZEN
              </span>
            )}
          </div>

          {!isGroup && otherUser.username && (
            <p className="text-xs text-slate-400 font-mono">@{otherUser.username}</p>
          )}

          {isGroup && (
            <p className="text-xs text-slate-500 font-medium">
              {conversation.otherMembers?.length ? conversation.otherMembers.length + 1 : 1} active members
            </p>
          )}
        </div>

        {/* Area / Bio */}
        {!isGroup && (otherUser.area || otherUser.bio) && (
          <div className="w-full pt-2 text-left space-y-2">
            {otherUser.area && (
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-[#B8323C] shrink-0" />
                <span className="font-medium truncate">{otherUser.area}</span>
              </div>
            )}
            {otherUser.bio && (
              <p className="text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 leading-relaxed italic">
                "{otherUser.bio}"
              </p>
            )}
          </div>
        )}

        {isGroup && conversation.groupDescription && (
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 w-full text-left leading-relaxed">
            {conversation.groupDescription}
          </p>
        )}
      </div>

      {/* Quick Toggles: Mute & Pin */}
      <div className="p-3 border-b border-slate-100 grid grid-cols-2 gap-2 text-xs">
        <button
          type="button"
          onClick={handleToggleMute}
          className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition cursor-pointer ${
            isMuted
              ? "bg-amber-50 text-amber-800 border-amber-200"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          <span>{isMuted ? "Muted / म्यूट" : "Mute / म्यूट"}</span>
        </button>

        <button
          type="button"
          onClick={handleTogglePin}
          className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition cursor-pointer ${
            isPinned
              ? "bg-red-50 text-[#B8323C] border-red-200"
              : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>{isPinned ? "Pinned / पिन किया" : "Pin / पिन करें"}</span>
        </button>
      </div>

      {/* Shared Media Gallery Preview */}
      <div className="p-4 border-b border-slate-100 flex-1">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-[#B8323C]" />
            <span>Shared Photos ({mediaMessages.length})</span>
          </span>
        </div>

        {mediaMessages.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-slate-50/70 rounded-2xl border border-slate-100">
            No photos shared in this chat yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {mediaMessages.slice(0, 9).map((m) => (
              <div
                key={m._id || m.id}
                onClick={() => onSelectImage && onSelectImage(m.mediaUrl)}
                className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition"
              >
                <img
                  src={m.mediaUrl}
                  alt={m.body || "Chat photo"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Shared Files & Documents Preview */}
      {docMessages.length > 0 && (
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#B8323C]" />
              <span>Shared Files ({docMessages.length})</span>
            </span>
          </div>
          <div className="space-y-1.5">
            {docMessages.slice(0, 5).map((m) => (
              <a
                key={m._id || m.id}
                href={m.mediaUrl.startsWith("http") ? m.mediaUrl : `${(API.defaults.baseURL || "").replace(/\/api\/?$/, "")}${m.mediaUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                download={m.fileName || "attachment"}
                className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition text-xs group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 truncate text-[11px] group-hover:text-[#B8323C]">
                    {m.fileName || "Shared file"}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    {m.fileSize ? `${(m.fileSize / 1024).toFixed(1)} KB` : m.type}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 space-y-2 text-xs">
        {isGroup ? (
          <>
            <button
              onClick={onOpenGroupDetails}
              className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#B8323C]" />
              <span>Manage Group Members</span>
            </button>
            <button
              onClick={onOpenGroupDetails}
              className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave Group / समूह छोड़ें</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onOpenReport}
              className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5 text-amber-600" />
              <span>Report Citizen / शिकायत करें</span>
            </button>
            <button
              onClick={onToggleBlock}
              className="w-full py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{isBlocked ? "Unblock Citizen" : "Block Citizen / ब्लॉक करें"}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
