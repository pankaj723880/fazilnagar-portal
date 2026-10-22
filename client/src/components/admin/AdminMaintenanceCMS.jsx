import { useState, useEffect } from "react";
import API from "../../api";
import { getAuthToken } from "../../utils/authStorage";
import { clearCMSCache } from "../../services/cmsService";
import PageHeader from "./PageHeader";
import FormSection from "./FormSection";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";
import ToastNotification from "./ToastNotification";
import MaintenancePage from "../MaintenancePage";
import {
  Wrench,
  Power,
  Clock,
  Calendar,
  AlertTriangle,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  History,
  Terminal,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

const DEFAULT_MESSAGE = "We are temporarily unavailable due to scheduled maintenance. Please check back soon.";
const DEFAULT_REOPENING_TEXT = "Coming back soon";

export default function AdminMaintenanceCMS({ onStatusChange }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Maintenance form state
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [reopeningText, setReopeningText] = useState(DEFAULT_REOPENING_TEXT);
  const [expectedReopeningTime, setExpectedReopeningTime] = useState("");
  const [scheduledStartTime, setScheduledStartTime] = useState("");
  const [scheduledEndTime, setScheduledEndTime] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchMaintenanceData();
    fetchAuditLogs();
  }, []);

  const fetchMaintenanceData = async () => {
    setLoading(true);
    try {
      const res = await API.get("/settings/maintenance");
      if (res.data?.success && res.data?.maintenance) {
        const m = res.data.maintenance;
        setEnabled(Boolean(m.enabled));
        setIsActive(Boolean(m.isActive));
        setMessage(m.message || DEFAULT_MESSAGE);
        setReopeningText(m.reopeningText || DEFAULT_REOPENING_TEXT);
        setExpectedReopeningTime(m.expectedReopeningTime ? formatDatetimeForInput(m.expectedReopeningTime) : "");
        setScheduledStartTime(m.scheduledStartTime ? formatDatetimeForInput(m.scheduledStartTime) : "");
        setScheduledEndTime(m.scheduledEndTime ? formatDatetimeForInput(m.scheduledEndTime) : "");
        setLastUpdatedBy(m.lastUpdatedBy || "");
        setLastUpdatedAt(m.lastUpdatedAt || null);
      }
    } catch (err) {
      console.warn("Failed to fetch maintenance status:", err);
      showToast("Failed to load maintenance status.", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingAudit(true);
    try {
      const token = getAuthToken();
      const res = await API.get("/settings/maintenance/audit-logs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data.auditLogs)) {
        setAuditLogs(res.data.auditLogs);
      }
    } catch (err) {
      console.warn("Failed to fetch audit logs:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const formatDatetimeForInput = (dateInput) => {
    if (!dateInput) return "";
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return "";
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ message: msg, type });
  };

  const handleSave = async (forceEnabled = null) => {
    const targetEnabled = forceEnabled !== null ? forceEnabled : enabled;

    // Dates validation
    if (scheduledStartTime && scheduledEndTime) {
      const start = new Date(scheduledStartTime).getTime();
      const end = new Date(scheduledEndTime).getTime();
      if (end <= start) {
        showToast("Scheduled End Time must be later than Scheduled Start Time.", "error");
        return;
      }
    }

    setSaving(true);
    const token = getAuthToken();

    try {
      const payload = {
        enabled: targetEnabled,
        message: message.trim() || DEFAULT_MESSAGE,
        reopeningText: reopeningText.trim() || DEFAULT_REOPENING_TEXT,
        expectedReopeningTime: expectedReopeningTime ? new Date(expectedReopeningTime).toISOString() : null,
        scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime).toISOString() : null,
        scheduledEndTime: scheduledEndTime ? new Date(scheduledEndTime).toISOString() : null,
      };

      const res = await API.put("/settings/maintenance", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setEnabled(Boolean(res.data.maintenance?.enabled));
        setIsActive(Boolean(res.data.maintenance?.isActive));
        setLastUpdatedBy(res.data.maintenance?.lastUpdatedBy || "");
        setLastUpdatedAt(res.data.maintenance?.lastUpdatedAt || null);
        clearCMSCache("settings");
        clearCMSCache();
        showToast(res.data.message || "Maintenance settings saved successfully.");
        fetchAuditLogs();
        if (onStatusChange) onStatusChange(res.data.maintenance);
      } else {
        showToast(res.data?.message || "Failed to update maintenance settings.", "error");
      }
    } catch (err) {
      console.error("Save maintenance error:", err);
      showToast(err.response?.data?.message || "Error saving maintenance settings.", "error");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const handleToggleClick = () => {
    if (!enabled) {
      // Prompt confirmation before turning maintenance ON
      setConfirmOpen(true);
    } else {
      // Immediately turn OFF
      handleSave(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-[#A83D32]" />
          <span className="font-medium">Loading maintenance controls…</span>
        </div>
      </div>
    );
  }

  const draftMaintenanceObj = {
    enabled,
    isActive,
    message,
    reopeningText,
    expectedReopeningTime: expectedReopeningTime ? new Date(expectedReopeningTime).toISOString() : null,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <ToastNotification
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <PageHeader
        title="Global Maintenance Mode"
        subtitle="Control portal-wide availability, configure citizen notices, schedule maintenance windows, and inspect audit logs."
        badge="System Operations"
        icon={Wrench}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Preview Citizen View</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#A83D32] hover:bg-[#873027] text-white shadow-xs transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? "Saving…" : "Save Configuration"}</span>
            </button>
          </div>
        }
      />

      {/* Real-time Status Card */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isActive
            ? "bg-red-500/10 border-red-500/40 text-red-900 dark:text-red-100 shadow-sm"
            : "bg-emerald-500/10 border-emerald-500/40 text-emerald-900 dark:text-emerald-100 shadow-sm"
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isActive ? "bg-red-600 text-white animate-pulse" : "bg-emerald-600 text-white"
              }`}
            >
              {isActive ? <ShieldAlert className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {isActive ? "Maintenance Mode is Currently ACTIVE" : "Portal is LIVE & PUBLIC"}
                </h2>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    isActive ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {isActive ? "Locked for Citizens" : "Fully Accessible"}
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {isActive
                  ? "Non-admin visitors are currently intercepted by the full-screen maintenance notice. Public data APIs return HTTP 503."
                  : "All public pages, directory entries, news stories, and APIs are operating normally. Authenticated admins can enable maintenance at any time."}
              </p>
              {lastUpdatedAt && (
                <p className="text-[11px] opacity-75 mt-1.5 font-mono">
                  Last updated by: <strong>{lastUpdatedBy || "Admin"}</strong> on{" "}
                  {new Date(lastUpdatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
                </p>
              )}
            </div>
          </div>

          {/* Master ON/OFF Switch */}
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={handleToggleClick}
              disabled={saving}
              className={`px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-2 transition cursor-pointer ${
                enabled
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{enabled ? "Turn Maintenance OFF" : "Turn Maintenance ON"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Messages & Display Text */}
        <div className="lg:col-span-2 space-y-6">
          <FormSection
            title="Citizen Notice & Message"
            description="Customize the notification text and reopening information presented to citizens."
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Maintenance Message (Visible to Citizens)
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={1000}
                  placeholder={DEFAULT_MESSAGE}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A83D32]/40 transition"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <button
                    type="button"
                    onClick={() => setMessage(DEFAULT_MESSAGE)}
                    className="text-[#A83D32] dark:text-[#C45A4C] hover:underline font-semibold"
                  >
                    Reset to default notice
                  </button>
                  <span>{message.length} / 1000 chars</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Expected Reopening Text
                  </label>
                  <input
                    type="text"
                    value={reopeningText}
                    onChange={(e) => setReopeningText(e.target.value)}
                    placeholder="Coming back soon"
                    maxLength={200}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A83D32]/40 transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Display badge label, e.g. "Coming back soon" or "Tomorrow 6:00 AM"
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Countdown Target (Date &amp; Time)
                  </label>
                  <input
                    type="datetime-local"
                    value={expectedReopeningTime}
                    onChange={(e) => setExpectedReopeningTime(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A83D32]/40 transition font-mono"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                    <span>Triggers live countdown if future</span>
                    {expectedReopeningTime && (
                      <button
                        type="button"
                        onClick={() => setExpectedReopeningTime("")}
                        className="text-red-500 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          {/* Scheduling Section */}
          <FormSection
            title="Scheduled Maintenance Windows"
            description="Optionally configure automatic start and conclusion times. Server authoritative clock handles activation."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Scheduled Start Time (Auto-ON)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStartTime}
                  onChange={(e) => setScheduledStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A83D32]/40 transition font-mono"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Activates automatically when reached</span>
                  {scheduledStartTime && (
                    <button
                      type="button"
                      onClick={() => setScheduledStartTime("")}
                      className="text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Scheduled End Time (Auto-OFF)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledEndTime}
                  onChange={(e) => setScheduledEndTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A83D32]/40 transition font-mono"
                />
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Deactivates automatically after expiry</span>
                  {scheduledEndTime && (
                    <button
                      type="button"
                      onClick={() => setScheduledEndTime("")}
                      className="text-red-500 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </FormSection>
        </div>

        {/* Right Column: Emergency Recovery, Bypass & Security Info */}
        <div className="space-y-6">
          <FormSection
            title="Administrator Access & Bypass"
            description="How authorized admins retain full access during active maintenance."
          >
            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Standard Admin Bypass</span>
                </div>
                <p>
                  Any authenticated administrator automatically bypasses maintenance. You can view all public pages, test features, and access the CMS normally.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-purple-500" />
                  <span>CLI Emergency Recovery</span>
                </div>
                <p>
                  In the event of an admin lockout or server misconfiguration, maintenance can be immediately deactivated directly on the server without any public URL exposure:
                </p>
                <div className="p-2 rounded bg-slate-900 text-slate-100 font-mono text-[11px] select-all">
                  npm run maintenance:off
                </div>
              </div>
            </div>
          </FormSection>

          {/* Quick Actions */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Maintenance Actions
            </h3>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-purple-500" />
              <span>Preview Maintenance Screen</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave()}
              className="w-full py-2.5 px-3 rounded-xl bg-[#A83D32] hover:bg-[#873027] text-white text-xs font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving…" : "Save Changes"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="mt-8">
        <FormSection
          title="Maintenance Mode Audit Trail"
          description="Tamper-evident logs of all maintenance activations, deactivations, and schedule adjustments."
        >
          {loadingAudit ? (
            <div className="py-8 flex justify-center text-xs text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading audit history…
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No maintenance operations recorded in audit log yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Timestamp (IST)</th>
                    <th className="py-3 px-4">Admin User</th>
                    <th className="py-3 px-4">Action Summary</th>
                    <th className="py-3 px-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log._id || log.createdAt} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                        {log.adminEmail || "Admin"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                        {log.changesSummary || log.action}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {log.ipAddress || "127.0.0.1"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FormSection>
      </div>

      {/* Confirmation Dialog before enabling Maintenance Mode */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Activate Maintenance Mode?"
        message="Enabling maintenance mode will immediately lock public access to all website pages and public data APIs for non-admin visitors. Authorized admins will still be able to log in and manage the portal."
        confirmLabel="Yes, Activate Maintenance"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => handleSave(true)}
        onCancel={() => setConfirmOpen(false)}
      />

      {/* Full-Screen Citizen Preview Modal */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl h-[90vh] bg-[var(--background-primary)] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-amber-500/30">
            <div className="p-3 bg-amber-500/20 border-b border-amber-500/30 flex items-center justify-between px-6 text-amber-900 dark:text-amber-100 text-xs font-bold">
              <span>Citizen Maintenance Page Live Preview (Using Current Draft Settings)</span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer"
              >
                Close Preview
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MaintenancePage
                maintenance={draftMaintenanceObj}
                siteSettings={{}}
                isPreview={true}
                onClosePreview={() => setPreviewOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
