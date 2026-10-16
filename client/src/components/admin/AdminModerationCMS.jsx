import { useState, useEffect } from "react";
import API from "../../api";
import {
  ShieldAlert,
  Flag,
  CheckCircle2,
  XCircle,
  UserX,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Filter,
  MessageSquare,
  Clock,
  Check,
} from "lucide-react";

export default function AdminModerationCMS() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [actioningId, setActioningId] = useState(null);
  const [moderatorNotes, setModeratorNotes] = useState({});
  const [actionMsg, setActionMsg] = useState("");

  const fetchReports = async (pageNum = 1) => {
    setLoading(true);
    setActionMsg("");
    try {
      const res = await API.get("/messages/moderation/reports", {
        params: {
          page: pageNum,
          limit: 15,
          status: filterStatus === "all" ? undefined : filterStatus,
        },
      });

      if (res.data?.success) {
        setReports(res.data.reports || []);
        setPage(res.data.pagination?.page || 1);
        setTotalPages(res.data.pagination?.pages || 1);
        setTotalReports(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Failed to load moderation reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
  }, [filterStatus]);

  const handleAction = async (reportId, status, suspendUser = false) => {
    const notes = moderatorNotes[reportId] || "";
    if (suspendUser) {
      const ok = window.confirm(
        "Are you sure you want to suspend this user's account? Their status will be set to suspended."
      );
      if (!ok) return;
    }

    setActioningId(reportId);
    setActionMsg("");
    try {
      const res = await API.patch(`/messages/moderation/reports/${reportId}`, {
        status,
        moderatorNotes: notes,
        suspendUser,
      });

      if (res.data?.success) {
        setActionMsg(`Report updated successfully (${status})`);
        // Update local report state
        setReports((prev) =>
          prev.map((r) =>
            r._id === reportId
              ? {
                  ...r,
                  status,
                  moderatorNotes: notes,
                  moderatedAt: new Date().toISOString(),
                  targetUser: suspendUser
                    ? { ...r.targetUser, isSuspended: true, status: "suspended" }
                    : r.targetUser,
                }
              : r
          )
        );
      }
    } catch (err) {
      alert("Action failed: " + (err.response?.data?.message || err.message));
    } finally {
      setActioningId(null);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const reporterName = r.reporter?.name?.toLowerCase() || "";
    const targetName = r.targetUser?.name?.toLowerCase() || "";
    const reason = r.reason?.toLowerCase() || "";
    const details = r.details?.toLowerCase() || "";
    return (
      reporterName.includes(q) ||
      targetName.includes(q) ||
      reason.includes(q) ||
      details.includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-red-50 text-[#B8323C] rounded-xl border border-red-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Citizen Moderation Desk
              </h1>
              <p className="text-xs text-slate-500">
                Review reported messages, abusive citizens, and manage town safety enforcement.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => fetchReports(page)}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Desk</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: "all", label: "All Reports" },
            { id: "pending", label: "Pending" },
            { id: "action_taken", label: "Action Taken" },
            { id: "dismissed", label: "Dismissed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setFilterStatus(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-[#B8323C] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search citizens or reasons..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B8323C]"
          />
        </div>
      </div>

      {/* Reports Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#B8323C]" />
            <p className="text-xs">Loading reports from database...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No reports found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {filterStatus === "pending"
                ? "The moderation queue is clean! All citizen reports have been reviewed."
                : "No moderation reports match the selected filter."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredReports.map((report) => {
              const isTargetSuspended = report.targetUser?.isSuspended;
              const isActioning = actioningId === report._id;

              return (
                <div key={report._id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition space-y-3">
                  {/* Top line: status badge, reason, date */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] uppercase tracking-wide ${
                          report.status === "pending"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : report.status === "action_taken"
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {report.status?.replace("_", " ")}
                      </span>

                      <span className="font-bold text-slate-900 capitalize flex items-center gap-1">
                        <Flag className="w-3.5 h-3.5 text-[#B8323C]" />
                        Reason: {report.reason}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(report.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Citizen info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Reported Citizen (Target)
                      </span>
                      <div className="font-bold text-slate-800">
                        {report.targetUser?.name || "Unknown"}
                        {isTargetSuspended && (
                          <span className="ml-1.5 text-[10px] text-red-600 bg-red-100 px-1.5 py-0.2 rounded font-black">
                            SUSPENDED
                          </span>
                        )}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {report.targetUser?.email && <span>{report.targetUser.email} • </span>}
                        {report.targetUser?.username && <span>@{report.targetUser.username}</span>}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                        Reported By
                      </span>
                      <div className="font-bold text-slate-800">
                        {report.reporter?.name || "Anonymous Citizen"}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {report.reporter?.email || "No email"}
                      </div>
                    </div>
                  </div>

                  {/* Report Details / Message Content */}
                  {report.details && (
                    <div className="text-xs text-slate-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                      <strong className="text-amber-900 block mb-1">Citizen Details / Note:</strong>
                      <p className="leading-relaxed">{report.details}</p>
                    </div>
                  )}

                  {report.targetMessage?.body && (
                    <div className="text-xs text-slate-700 bg-slate-100 p-3 rounded-xl border border-slate-200">
                      <strong className="text-slate-800 block mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                        Flagged Message Excerpt:
                      </strong>
                      <p className="font-mono bg-white p-2 rounded border border-slate-200">
                        {report.targetMessage.body}
                      </p>
                    </div>
                  )}

                  {/* Moderator Notes & Action Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <input
                      type="text"
                      placeholder="Add moderator audit note..."
                      defaultValue={report.moderatorNotes || ""}
                      onChange={(e) =>
                        setModeratorNotes((prev) => ({
                          ...prev,
                          [report._id]: e.target.value,
                        }))
                      }
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#B8323C]"
                    />

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAction(report._id, "dismissed", false)}
                        disabled={isActioning}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                        title="Dismiss report as invalid or resolved"
                      >
                        <XCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Dismiss</span>
                      </button>

                      <button
                        onClick={() => handleAction(report._id, "action_taken", false)}
                        disabled={isActioning}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Mark report as action taken"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Action Taken</span>
                      </button>

                      <button
                        onClick={() => handleAction(report._id, "action_taken", true)}
                        disabled={isActioning || isTargetSuspended}
                        className="px-3 py-1.5 bg-[#B8323C] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Suspend citizen account from Fazilnagar portal"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Suspend User</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
