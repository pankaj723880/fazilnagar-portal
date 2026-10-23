import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import { getAuthUser } from "../utils/authStorage";
import { X, Send, Briefcase, MapPin, Building, ShieldAlert, CheckCircle2, Loader2, MessageSquare } from "lucide-react";

export default function ApplyJobModal({ job, onClose, onAppliedSuccess }) {
  const navigate = useNavigate();
  const user = getAuthUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!job) return null;

  const defaultMessage = `Hello, I am interested in applying for ${job.title} at ${job.company}. Please share more details about the role and the application process.`;

  const handleApply = async () => {
    if (!user) {
      navigate("/login", {
        state: {
          from: `/jobs/${job._id || job.id}`,
          message: "Please log in to apply for this job vacancy.",
        },
      });
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await API.post(`/jobs/${job._id || job.id}/apply`);
      if (res.data?.success) {
        setSuccess(true);
        setConversationId(res.data.conversationId);
        if (onAppliedSuccess) onAppliedSuccess(job._id || job.id, res.data.conversationId);
      }
    } catch (err) {
      const resp = err.response?.data;
      if (err.response?.status === 409 || resp?.alreadyApplied) {
        setAlreadyApplied(true);
        setConversationId(resp?.conversationId);
        setError("You have already applied for this vacancy.");
      } else {
        setError(resp?.message || "Failed to submit application. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChat = () => {
    if (conversationId) {
      navigate(`/messages?conv=${conversationId}`);
    } else {
      navigate("/messages");
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apply-modal-title"
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1E293B] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/40">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#A83D32] dark:text-[#C45A4C] bg-red-50 dark:bg-red-950/40 px-2.5 py-0.5 rounded-full border border-red-200/60 dark:border-red-900/40">
              <Briefcase className="w-3 h-3" /> Job Application
            </span>
            <h2 id="apply-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 font-heading">
              {job.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-slate-400" /> {job.company}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}</span>
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

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto text-xs sm:text-sm">
          {success ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Application Sent!</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                  Your application and inquiry message have been delivered to <strong>{job.company}</strong> in Fazilnagar Messages.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="px-5 py-2.5 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <MessageSquare className="w-4 h-4" /> Open Conversation in Chat
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition"
                >
                  Close
                </button>
              </div>
            </div>
          ) : alreadyApplied ? (
            <div className="text-center py-5 space-y-3">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Already Applied</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-sm mx-auto">
                  You have already submitted an application for this vacancy. You can reopen your direct conversation with the employer.
                </p>
              </div>
              {conversationId && (
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="px-5 py-2.5 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-xs transition"
                >
                  <MessageSquare className="w-4 h-4" /> Reopen Chat With Employer
                </button>
              )}
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-xl text-red-700 dark:text-red-300 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  The following official application message will be delivered via Town Chat:
                </p>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700 text-slate-700 dark:text-slate-200 italic font-sans leading-relaxed">
                  “{defaultMessage}”
                </div>
                <p className="text-[11px] text-slate-400">
                  ⚡ Once sent, this immediately opens a real-time conversation between you and <strong>{job.company}</strong> so you can discuss shifts, timings, and credentials.
                </p>
              </div>

              {/* Safety notice */}
              <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 p-3 rounded-2xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="text-[11px] leading-relaxed">
                  <strong>Notice:</strong> Fazilnagar Jobs is a 100% free community platform. Never pay registration fees, application charges, or money for job offers or interviews.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!success && !alreadyApplied && (
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={submitting}
              className="px-6 py-2.5 bg-[#A83D32] hover:bg-[#873027] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Application...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Confirm &amp; Apply Now
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
