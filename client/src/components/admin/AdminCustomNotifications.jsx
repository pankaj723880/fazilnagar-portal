import { useState, useEffect } from "react";
import API from "../../api";
import PageHeader from "./PageHeader";
import ToastNotification from "./ToastNotification";
import {
  Bell,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  Users,
  Globe,
  Radio,
  RefreshCw,
  ShieldAlert,
  Info,
  Calendar,
  Sparkles,
  X,
} from "lucide-react";

export default function AdminCustomNotifications({ token, currentAdminUser }) {
  const [mode, setMode] = useState("notification"); // 'notification' | 'alert'
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("/");
  const [severity, setSeverity] = useState("info"); // 'info' | 'warning' | 'urgent'
  const [targetAudience, setTargetAudience] = useState("all"); // 'all' | 'registered'
  const [expiresInHours, setExpiresInHours] = useState("");

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [toast, setToast] = useState({ message: "", type: "success" });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await API.get("/notifications/admin/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setHistory(res.data.history || []);
      }
    } catch (err) {
      console.warn("Failed to fetch notification history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setToast({ message: "Please provide a valid title (at least 3 characters).", type: "error" });
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setToast({ message: "Please provide a valid message (at least 5 characters).", type: "error" });
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleBroadcast = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        link: link.trim() || "/",
        type: mode === "alert" ? "custom_alert" : "custom_notification",
        severity: mode === "alert" ? severity : "info",
        targetAudience,
        expiresInHours: expiresInHours ? Number(expiresInHours) : null,
      };

      const res = await API.post("/notifications/admin/broadcast", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setToast({
          message: res.data.message || `Successfully broadcasted to ${res.data.recipientCount} citizens!`,
          type: "success",
        });
        // Reset form
        setTitle("");
        setMessage("");
        setLink("/");
        setExpiresInHours("");
        setConfirmModalOpen(false);
        fetchHistory();
      } else {
        setToast({
          message: res.data?.message || "Broadcast failed. Please check parameters.",
          type: "error",
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to broadcast notification. Ensure you have admin privileges.";
      setToast({ message: errMsg, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPresetLink = (path) => {
    setLink(path);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Notifications & Civic Alerts Management"
        description="Broadcast customized news alerts, emergency warnings, and municipal updates directly to Fazilnagar town citizens."
        action={
          <button
            onClick={fetchHistory}
            disabled={loadingHistory}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
            <span>Refresh History</span>
          </button>
        }
      />

      {/* Mode Switcher */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
        <button
          type="button"
          onClick={() => setMode("notification")}
          className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
            mode === "notification"
              ? "bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20 text-blue-950"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div
            className={`p-2.5 rounded-xl ${
              mode === "notification" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Custom Notification</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              General news, community stories, directory notices, or public portal updates.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMode("alert")}
          className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
            mode === "alert"
              ? "bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20 text-rose-950"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <div
            className={`p-2.5 rounded-xl ${
              mode === "alert" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Emergency / Priority Alert</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              High-visibility civic announcements, weather warnings, or urgent public notices.
            </p>
          </div>
        </button>
      </div>

      {/* Main Composer & Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Composer Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">
                {mode === "alert" ? "Compose Town Alert" : "Compose Notification"}
              </span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  mode === "alert"
                    ? "bg-rose-100 text-rose-700 border border-rose-200"
                    : "bg-blue-100 text-blue-700 border border-blue-200"
                }`}
              >
                {mode === "alert" ? "Civic Alert" : "Standard"}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Admin Broadcast</span>
          </div>

          <form onSubmit={handleOpenConfirm} className="space-y-4">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Notification Title *</label>
                <span className="text-[11px] text-slate-400 font-mono">{title.length}/120</span>
              </div>
              <input
                type="text"
                required
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  mode === "alert"
                    ? "e.g., Heavy Rainfall & Power Advisory in Fazilnagar Ward 4"
                    : "e.g., Fazilnagar Annual Mela Schedule Published"
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
              />
            </div>

            {/* Message */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Message / Body *</label>
                <span className="text-[11px] text-slate-400 font-mono">{message.length}/600</span>
              </div>
              <textarea
                required
                rows={3}
                maxLength={600}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  mode === "alert"
                    ? "Detailed alert information for citizens, including emergency guidance or designated centers..."
                    : "Share the update details, news headline summary, or action notice for the town..."
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition resize-y"
              />
            </div>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Recipient Audience *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    targetAudience === "all"
                      ? "bg-slate-50 border-blue-500 ring-1 ring-blue-500 text-slate-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="targetAudience"
                    value="all"
                    checked={targetAudience === "all"}
                    onChange={() => setTargetAudience("all")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <Globe className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">All Visitors & Citizens</p>
                    <p className="text-[11px] text-slate-500">Town-wide broadcast</p>
                  </div>
                </label>

                <label
                  className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition ${
                    targetAudience === "registered"
                      ? "bg-slate-50 border-blue-500 ring-1 ring-blue-500 text-slate-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="targetAudience"
                    value="registered"
                    checked={targetAudience === "registered"}
                    onChange={() => setTargetAudience("registered")}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <Users className="w-4 h-4 text-indigo-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold">Registered Users Only</p>
                    <p className="text-[11px] text-slate-500">Citizen accounts</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Alert Severity & Expiry (Only in Alert mode) */}
            {mode === "alert" && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alert Severity Level *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSeverity("info")}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        severity === "info"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>Notice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity("warning")}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        severity === "warning"
                          ? "bg-amber-500 text-slate-950 border-amber-500 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Warning</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeverity("urgent")}
                      className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                        severity === "urgent"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Urgent</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Auto-Expiry Duration (Optional)
                  </label>
                  <select
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Expiry (Default 30-day retention)</option>
                    <option value="6">Expire in 6 Hours</option>
                    <option value="12">Expire in 12 Hours</option>
                    <option value="24">Expire in 24 Hours (1 Day)</option>
                    <option value="72">Expire in 3 Days</option>
                    <option value="168">Expire in 7 Days (1 Week)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Destination Link */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Destination URL / Action (Optional)
                </label>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span>Quick paths:</span>
                  <button
                    type="button"
                    onClick={() => setPresetLink("/news")}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    /news
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setPresetLink("/directory")}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    /directory
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setPresetLink("/emergency")}
                    className="text-blue-600 hover:underline cursor-pointer"
                  >
                    /emergency
                  </button>
                </div>
              </div>
              <input
                type="text"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/news, /directory, or full https:// link"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  mode === "alert"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {mode === "alert" ? "Preview & Broadcast Civic Alert" : "Preview & Broadcast Notification"}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Column (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Live Preview
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Dropdown Item</span>
            </div>

            {/* Notification Center Item Preview */}
            <div
              className={`p-3.5 rounded-xl border transition ${
                mode === "alert" && severity === "urgent"
                  ? "bg-rose-950/40 border-rose-700/60"
                  : mode === "alert" && severity === "warning"
                  ? "bg-amber-950/40 border-amber-700/60"
                  : "bg-slate-800/80 border-slate-700/60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-xl text-base shrink-0 ${
                    mode === "alert" && severity === "urgent"
                      ? "bg-rose-900/60 text-rose-300"
                      : mode === "alert" && severity === "warning"
                      ? "bg-amber-900/60 text-amber-300"
                      : "bg-blue-900/60 text-blue-300"
                  }`}
                >
                  {mode === "alert" ? (
                    severity === "urgent" ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    )
                  ) : (
                    <Bell className="w-4 h-4 text-blue-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {mode === "alert" && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          severity === "urgent"
                            ? "bg-rose-500/30 text-rose-300 border border-rose-500/40"
                            : severity === "warning"
                            ? "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                            : "bg-blue-500/30 text-blue-300 border border-blue-500/40"
                        }`}
                      >
                        {severity === "urgent" ? "Urgent Alert" : severity === "warning" ? "Notice" : "Alert"}
                      </span>
                    )}
                    <h5 className="text-xs font-bold text-white truncate">
                      {title.trim() || "Notification Title Appears Here"}
                    </h5>
                  </div>

                  <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                    {message.trim() || "Notification body message will be rendered here for users to read."}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-blue-400">
                    <span>Link: {link || "/"}</span>
                    <span className="text-slate-500">Just now</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Toast Preview */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Desktop / Laptop OS Notification Banner
              </span>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-black shrink-0">
                  FZ
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Fazilnagar Portal</span>
                    <span className="text-[10px] text-slate-500">Now</span>
                  </div>
                  <p className="text-xs font-bold text-white truncate mt-0.5">
                    {title.trim() || "Sample Notification Title"}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {message.trim() || "Sample alert message..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full my-auto max-h-[90vh] border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-xl ${
                    mode === "alert" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {mode === "alert" ? <AlertTriangle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Broadcast Dispatch
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verify broadcast parameters before sending
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Type:</span>
                <span className="font-bold text-slate-800 uppercase">
                  {mode === "alert" ? `Alert (${severity})` : "Standard Notification"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Audience:</span>
                <span className="font-bold text-slate-800">
                  {targetAudience === "all" ? "Town-wide (All Visitors & Citizens)" : "Registered Citizens"}
                </span>
              </div>
              {mode === "alert" && expiresInHours && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Expiry:</span>
                  <span className="font-bold text-amber-700">{expiresInHours} Hours</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Action URL:</span>
                <span className="font-mono text-slate-800">{link || "/"}</span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <p className="font-bold text-slate-800 text-xs">{title}</p>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0" />
              <span>This will immediately appear in citizen notification bells and device popups.</span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                  mode === "alert"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? (
                  <span>Broadcasting...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Recent Admin Broadcasts</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              {history.length}
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <Bell className="w-8 h-8 opacity-30 mx-auto mb-2" />
            <p>No custom notifications broadcasted yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Title & Message</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4">Link</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 max-w-xs sm:max-w-md">
                      <p className="font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.message}</p>
                    </td>
                    <td className="py-3 px-4">
                      {item.type === "custom_alert" ? (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.severity === "urgent"
                              ? "bg-rose-100 text-rose-700 border border-rose-200"
                              : item.severity === "warning"
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-blue-100 text-blue-700 border border-blue-200"
                          }`}
                        >
                          Alert ({item.severity || "info"})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          Notification
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                        {item.targetAudience === "registered" ? (
                          <>
                            <Users className="w-3 h-3 text-indigo-500" />
                            <span>Registered</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 text-blue-500" />
                            <span>Town-wide</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 truncate max-w-[120px]">
                      {item.link || "/"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Global Toast */}
      {toast.message && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
