import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
} from "lucide-react";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");

  const actions = [
    "All",
    "CREATE",
    "UPDATE",
    "DELETE",
    "PUBLISH",
    "UNPUBLISH",
    "ARCHIVE",
    "SETTINGS_UPDATE",
  ];

  const entityTypes = [
    "All",
    "Place",
    "News",
    "PublicService",
    "Event",
    "HeritageSite",
    "SiteSettings",
    "Advertisement",
    "Submission",
    "MediaItem",
    "User",
  ];

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const params = {};
      if (actionFilter !== "All") params.action = actionFilter;
      if (entityFilter !== "All") params.entityType = entityFilter;

      const res = await API.get("/audit", {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data?.logs)) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.warn("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (act) => {
    switch (act) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "UPDATE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "DELETE":
        return "bg-red-50 text-red-700 border-red-200";
      case "PUBLISH":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "UNPUBLISH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "SETTINGS_UPDATE":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-bold mb-1">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
            <span>Governance & Security Auditing</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Admin Audit Logs & Activity Trail
          </h2>
          <p className="text-xs text-slate-500">
            Immutable tracking of every administrative create, update, delete, and settings revision.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-slate-500"
          >
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Entity:</span>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-slate-500"
          >
            {entityTypes.map((et) => (
              <option key={et} value={et}>{et}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-600 mb-2" />
            <p className="text-xs font-semibold">Loading activity logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <p className="text-xs font-semibold">No audit logs found for the selected filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity Type</th>
                  <th className="py-3 px-4">Record Title / ID</th>
                  <th className="py-3 px-4">Details / Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{new Date(log.createdAt).toLocaleString("en-IN")}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {log.adminEmail || log.adminUser?.email || "Admin"}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-700">
                      {log.entityType}
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-semibold max-w-[200px] truncate" title={log.entityTitle || log.entityId}>
                      {log.entityTitle || log.entityId || "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[320px] truncate" title={log.changesSummary}>
                      {log.changesSummary || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
