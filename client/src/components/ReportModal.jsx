import { useState } from "react";
import API from "../api";
import { Flag, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function ReportModal({ targetUser, targetMessage, onClose, onReportSubmitted }) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser?._id && !targetUser?.id) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await API.post("/messages/report", {
        targetUserId: targetUser._id || targetUser.id,
        targetMessageId: targetMessage?._id || targetMessage?.id || null,
        targetConversationId: targetMessage?.conversationId || null,
        reason,
        details: details.trim(),
      });

      if (res.data?.success) {
        setSuccess(true);
        if (onReportSubmitted) onReportSubmitted();
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full p-4 sm:p-5 relative shadow-2xl border border-slate-200 max-h-[90dvh] overflow-y-auto my-auto">
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Flag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Report to Moderators / शिकायत दर्ज करें
            </h3>
            <p className="text-[11px] text-slate-500">
              Report {targetUser?.name || "citizen"} for violating community guidelines.
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-800">
              Report submitted successfully / शिकायत दर्ज हो गई
            </p>
            <p className="text-[11px] text-slate-500">
              Portal administrators will review this report promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {targetMessage && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                  Reported Message / संदेश:
                </span>
                <p className="text-slate-700 italic truncate">"{targetMessage.body}"</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for reporting / शिकायत का कारण
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 h-10 sm:h-10.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B8323C]/20 focus:border-[#B8323C]"
              >
                <option value="spam">Spam or Unsolicited Commercial / स्पैम</option>
                <option value="harassment">Harassment or Abuse / उत्पीड़न</option>
                <option value="inappropriate">Inappropriate Content / अनुचित सामग्री</option>
                <option value="fraud">Fraud, Scams or OTP Phishing / धोखाधड़ी</option>
                <option value="other">Other Violation / अन्य</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Details (Optional) / विवरण
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Explain what happened... / संक्षेप में बताएं..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B8323C]/20 focus:border-[#B8323C]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 h-9 sm:h-10 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 h-9 sm:h-10 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Report</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
