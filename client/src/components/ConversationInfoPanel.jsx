import { useState, useEffect } from "react";
import API from "../api";
import { resolveMediaUrl } from "../utils/mediaUtils";
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
  Phone,
  Calendar,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ConversationInfoPanel({
  conversation,
  currentUserId,
  onClose,
  onToggleBlock: propToggleBlock,
  onOpenReport: propOpenReport,
  onOpenGroupDetails,
  onConversationUpdated,
  messages: propMessages = [],
  onSelectImage,
  isBlocked: propIsBlocked,
}) {
  const [isMuted, setIsMuted] = useState(Boolean(conversation?.isMuted));
  const [isPinned, setIsPinned] = useState(Boolean(conversation?.isPinned));
  const [localBlocked, setLocalBlocked] = useState(Boolean(propIsBlocked));
  const [panelMessages, setPanelMessages] = useState(propMessages);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Embedded Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportNotes, setReportNotes] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState("");

  const conversationId = conversation?._id || conversation?.id;

  useEffect(() => {
    setIsMuted(Boolean(conversation?.isMuted));
    setIsPinned(Boolean(conversation?.isPinned));
  }, [conversation?.isMuted, conversation?.isPinned]);

  useEffect(() => {
    if (propIsBlocked !== undefined) {
      setLocalBlocked(Boolean(propIsBlocked));
    }
  }, [propIsBlocked]);

  useEffect(() => {
    if (propMessages && propMessages.length > 0) {
      setPanelMessages(propMessages);
    } else if (conversationId) {
      // If messages not passed or empty, fetch recent history to populate media & docs
      setLoadingMedia(true);
      API.get(`/messages/conversations/${conversationId}/messages`, {
        params: { limit: 50 },
      })
        .then((res) => {
          if (res.data?.success && Array.isArray(res.data.messages)) {
            setPanelMessages(res.data.messages);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingMedia(false));
    }
  }, [conversationId, propMessages]);

  const handleToggleMute = async () => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      await API.patch(`/messages/conversations/${conversationId}/preferences`, {
        isMuted: next,
      });
      if (onConversationUpdated) {
        onConversationUpdated({ conversationId, isMuted: next });
      }
    } catch (err) {
      setIsMuted(!next);
    }
  };

  const handleTogglePin = async () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      await API.patch(`/messages/conversations/${conversationId}/preferences`, {
        isPinned: next,
      });
      if (onConversationUpdated) {
        onConversationUpdated({ conversationId, isPinned: next });
      }
    } catch (err) {
      setIsPinned(!next);
    }
  };

  const handleBlockAction = async () => {
    if (propToggleBlock) {
      propToggleBlock();
      return;
    }

    const otherId = conversation?.otherUser?._id || conversation?.otherUser?.id;
    if (!otherId) return;

    if (!localBlocked) {
      const ok = window.confirm(
        `Are you sure you want to block ${conversation?.otherUser?.name || "this citizen"}? You will not receive any more messages from them.`
      );
      if (!ok) return;

      try {
        const res = await API.post("/messages/block", { targetUserId: otherId });
        if (res.data?.success) {
          setLocalBlocked(true);
          if (onConversationUpdated) {
            onConversationUpdated({ conversationId, isBlocked: true, status: "blocked" });
          }
        }
      } catch (err) {
        alert("Failed to block citizen: " + (err.response?.data?.message || err.message));
      }
    } else {
      try {
        const res = await API.post("/messages/unblock", { targetUserId: otherId });
        if (res.data?.success) {
          setLocalBlocked(false);
          if (onConversationUpdated) {
            onConversationUpdated({ conversationId, isBlocked: false, status: "active" });
          }
        }
      } catch (err) {
        alert("Failed to unblock citizen: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleOpenReportModal = () => {
    if (propOpenReport) {
      propOpenReport();
    } else {
      setShowReportModal(true);
    }
  };

  const handleSubmitReport = async (e) => {
    if (e) e.preventDefault();
    const otherId = conversation?.otherUser?._id || conversation?.otherUser?.id;
    if (!otherId) return;

    setSubmittingReport(true);
    setReportFeedback("");
    try {
      const res = await API.post("/messages/report", {
        reportedUserId: otherId,
        conversationId,
        reason: reportReason,
        description: reportNotes.trim(),
      });
      if (res.data?.success) {
        setReportFeedback("Report submitted to town moderation. Thank you for keeping Fazilnagar safe.");
        setTimeout(() => {
          setShowReportModal(false);
          setReportFeedback("");
          setReportNotes("");
        }, 2500);
      }
    } catch (err) {
      alert("Failed to submit report: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReport(false);
    }
  };

  if (!conversation) return null;

  const isGroup = conversation.type === "group";
  const otherUser = conversation.otherUser || {};
  const displayName = isGroup ? conversation.groupName || "Town Group" : otherUser.name || "Citizen";

  // Filter media from messages history
  const mediaMessages = panelMessages.filter(
    (m) => m.type === "image" && m.mediaUrl && !m.isDeletedForEveryone
  );
  const docMessages = panelMessages.filter(
    (m) => ["document", "video", "audio"].includes(m.type) && m.mediaUrl && !m.isDeletedForEveryone
  );

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-full min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain divide-y divide-slate-100">
        <div className="p-5 flex flex-col items-center text-center space-y-3">
          {/* Large Avatar */}
          <div className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-slate-200/80 overflow-hidden shadow-xs relative">
            {isGroup ? (
              conversation.groupAvatar ? (
                <img
                  src={resolveMediaUrl(conversation.groupAvatar)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-[#B8323C] bg-red-50">
                  <Users className="w-10 h-10" />
                </div>
              )
            ) : otherUser.avatar ? (
              <img
                src={resolveMediaUrl(otherUser.avatar)}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
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
                <span className="px-1.5 py-0.5 rounded-md bg-[#B8323C]/10 text-[#B8323C] font-black text-[9px]">
                  GROUP
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[9px] border border-emerald-200">
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

          {/* Contact & Bio Info */}
          {!isGroup && (otherUser.area || otherUser.phone || otherUser.bio) && (
            <div className="w-full pt-2 text-left space-y-2">
              {otherUser.area && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-[#B8323C] shrink-0" />
                  <span className="font-medium truncate">{otherUser.area}</span>
                </div>
              )}
              {otherUser.phone && (
                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium font-mono truncate">{otherUser.phone}</span>
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
                ? "bg-amber-50 text-amber-800 border-amber-300 shadow-2xs"
                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {isMuted ? <BellOff className="w-3.5 h-3.5 text-amber-600" /> : <Bell className="w-3.5 h-3.5" />}
            <span>{isMuted ? "Muted / म्यूट" : "Mute / म्यूट"}</span>
          </button>

          <button
            type="button"
            onClick={handleTogglePin}
            className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition cursor-pointer ${
              isPinned
                ? "bg-red-50 text-[#B8323C] border-red-300 shadow-2xs"
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
            {loadingMedia && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
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
                  onClick={() => {
                    if (onSelectImage) onSelectImage(m.mediaUrl);
                    else setLightboxImage(m.mediaUrl);
                  }}
                  className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 hover:scale-[1.02] transition shadow-2xs"
                  title="Click to view photo"
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
                  href={m.mediaUrl}
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

        {/* Actions (Report & Block buttons from screenshot) */}
        <div className="p-4 space-y-2 text-xs">
          {isGroup ? (
            <>
              <button
                type="button"
                onClick={onOpenGroupDetails}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-[#B8323C]" />
                <span>Manage Group Members</span>
              </button>
              <button
                type="button"
                onClick={onOpenGroupDetails}
                className="w-full py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Group / समूह छोड़ें</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleOpenReportModal}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
              >
                <Flag className="w-3.5 h-3.5 text-amber-600" />
                <span>Report Citizen / शिकायत करें</span>
              </button>
              <button
                type="button"
                onClick={handleBlockAction}
                className={`w-full py-2.5 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-98 ${
                  localBlocked
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300"
                    : "bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{localBlocked ? "Unblock Citizen / अनब्लॉक करें" : "Block Citizen / ब्लॉक करें"}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Embedded Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-2 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Full view"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Embedded Report Citizen Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Flag className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Report Citizen / नागरिक की शिकायत
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportFeedback ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{reportFeedback}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Reason for reporting / शिकायत का कारण <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-[#B8323C] outline-none"
                  >
                    <option value="spam">Spam or advertising / स्पैम या विज्ञापन</option>
                    <option value="harassment">Harassment or abusive language / दुर्व्यवहार</option>
                    <option value="inappropriate">Inappropriate media / अनुचित सामग्री</option>
                    <option value="impersonation">Fake profile or impersonation / फ़र्ज़ी प्रोफ़ाइल</option>
                    <option value="other">Other civic rule violation / अन्य कारण</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Details / विवरण (Optional)
                  </label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="Provide additional details to assist moderation team..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Cancel / रद्द करें
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 py-2 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {submittingReport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Flag className="w-3.5 h-3.5" />
                    )}
                    <span>Submit Report / शिकायत भेजें</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
