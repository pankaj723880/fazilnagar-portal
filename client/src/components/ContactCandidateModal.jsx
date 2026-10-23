import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { getAuthUser } from "../utils/authStorage";
import { X, Send, User, MapPin, Sparkles, Loader2, MessageSquare, ShieldAlert } from "lucide-react";

export default function ContactCandidateModal({ candidate, onClose, onContactedSuccess }) {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!candidate) return null;

  const candidateName = candidate.displayName || "there";
  const defaultMessage = `Hello ${candidateName}, I saw your profile on Fazilnagar Jobs. I have an opportunity for ${jobTitle.trim() || candidate.desiredRole || "an open role"} at ${companyName.trim() || "our enterprise/organization"}. Are you interested in discussing this opportunity?`;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", {
        state: {
          from: `/jobs/${candidate._id || candidate.id}`,
          message: "Please log in to contact this candidate.",
        },
      });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await API.post(`/jobs/${candidate._id || candidate.id}/contact`, {
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        customMessage: customNote.trim() ? customNote.trim() : defaultMessage,
      });

      if (res.data?.success && res.data.conversationId) {
        if (onContactedSuccess) {
          onContactedSuccess(candidate._id || candidate.id, res.data.conversationId);
        }
        navigate(`/messages?conv=${res.data.conversationId}`);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message to candidate.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-candidate-title"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/40">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40">
              <Sparkles className="w-3 h-3" /> Talent Inquiry
            </span>
            <h2 id="contact-candidate-title" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-heading">
              Contact {candidateName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-3 mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{candidate.desiredRole}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {candidate.preferredLocation}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSend} className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Your Company, Shop, or Organization
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Kisan Agro Supplies, Gupta Medical, etc."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83D32]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Opportunity / Job Title Offered
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder={`e.g. ${candidate.desiredRole || "Accountant, Sales Executive, etc."}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83D32]"
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Message preview to candidate:
            </p>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 italic font-sans leading-relaxed">
              “{defaultMessage}”
            </div>
            <p className="text-[11px] text-slate-400">
              💬 Clicking send will deliver this message and immediately open a chat window with {candidateName}.
            </p>
          </div>

          <div className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldAlert className="w-4 h-4 shrink-0 text-slate-400" />
            <span>Fazilnagar Jobs prohibits asking candidates for upfront security deposits or recruitment fees.</span>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Sending Invitation...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Message &amp; Open Chat
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
