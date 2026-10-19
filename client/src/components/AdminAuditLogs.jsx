import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  ShieldAlert,
  Clock,
  User,
  RefreshCw,
  Eye,
  FileText,
  Filter,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import PageHeader from "./admin/PageHeader";
import SearchAndFilters from "./admin/SearchAndFilters";
import DataTable from "./admin/DataTable";
import Pagination from "./admin/Pagination";
import EmptyState from "./admin/EmptyState";
import LoadingSkeleton from "./admin/LoadingSkeleton";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All");
  const [entityFilter, setEntityFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedLog, setSelectedLog] = useState(null);

  const actions = [
    "All",
    "CREATE",
    "UPDATE",
    "DELETE",
    "PUBLISH",
    "UNPUBLISH",
    "ARCHIVE",
    "RESTORE",
    "SETTINGS_UPDATE",
    "REVIEW_APPROVE",
    "REVIEW_REJECT",
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
      case "REVIEW_APPROVE":
        return "bg-teal-50 text-teal-700 border-teal-200";
      case "REVIEW_REJECT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const adminStr = (log.adminEmail || log.adminUser?.email || "").toLowerCase();
    const titleStr = (log.entityTitle || log.entityId || "").toLowerCase();
    const detailStr = (log.changesSummary || "").toLowerCase();
    return adminStr.includes(q) || titleStr.includes(q) || detailStr.includes(q);
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const columns = [
    {
      key: "createdAt",
      label: "Timestamp",
      sortable: true,
      render: (val, row) => {
        const item = row || val;
        const dt = (typeof val === "string" || val instanceof Date) ? val : item?.createdAt;
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{dt ? new Date(dt).toLocaleString("en-IN") : "—"}</span>
          </div>
        );
      },
    },
    {
      key: "adminEmail",
      label: "Administrator",
      render: (val, row) => {
        const item = row || val;
        const email = (typeof val === "string" ? val : null) || item?.adminEmail || item?.adminUser?.email || "Town Admin";
        return (
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[160px]">{email}</span>
          </div>
        );
      },
    },
    {
      key: "action",
      label: "Action",
      sortable: true,
      render: (val, row) => {
        const item = row || val;
        const act = (typeof val === "string" ? val : null) || item?.action || "ACTION";
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadge(
              act
            )}`}
          >
            {act}
          </span>
        );
      },
    },
    {
      key: "entityType",
      label: "Entity Type",
      sortable: true,
      render: (val, row) => {
        const item = row || val;
        const type = (typeof val === "string" ? val : null) || item?.entityType || "—";
        return (
          <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {type}
          </span>
        );
      },
    },
    {
      key: "entityTitle",
      label: "Target Record",
      render: (val, row) => {
        const item = row || val;
        const title = (typeof val === "string" ? val : null) || item?.entityTitle || item?.entityId || "—";
        return (
          <div className="text-xs font-semibold text-slate-900 max-w-[180px] truncate" title={title}>
            {title}
          </div>
        );
      },
    },
    {
      key: "changesSummary",
      label: "Audit Details",
      render: (val, row) => {
        const item = row || val;
        const summary = (typeof val === "string" ? val : null) || item?.changesSummary || "—";
        return (
          <div className="text-xs text-slate-600 max-w-[260px] truncate" title={summary}>
            {summary}
          </div>
        );
      },
    },
    {
      key: "view",
      label: "",
      align: "right",
      render: (val, row) => {
        const item = row || val;
        return (
          <button
            onClick={() => setSelectedLog(item)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            title="Inspect log details"
          >
            <Eye className="w-4 h-4" />
          </button>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={ShieldAlert}
        title="Audit Logs & Activity Trail"
        subtitle="Immutable chronological ledger of administrative operations, updates, approvals, and configuration changes"
        badgeText={`${logs.length} Log Entries`}
        primaryAction={{
          label: "Refresh Logs",
          icon: RefreshCw,
          onClick: fetchLogs,
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Audit Logs" },
        ]}
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchAndFilters
          searchPlaceholder="Search by admin email, target record, or summary..."
          searchValue={search}
          onSearchChange={(v) => {
            setSearch(v);
            setCurrentPage(1);
          }}
          filters={[
            {
              id: "action",
              label: "Action",
              value: actionFilter,
              options: actions.map((a) => ({ label: a, value: a })),
              onChange: (v) => {
                setActionFilter(v);
                setCurrentPage(1);
              },
            },
            {
              id: "entity",
              label: "Entity Type",
              value: entityFilter,
              options: entityTypes.map((e) => ({ label: e, value: e })),
              onChange: (v) => {
                setEntityFilter(v);
                setCurrentPage(1);
              },
            },
          ]}
          onReset={() => {
            setSearch("");
            setActionFilter("All");
            setEntityFilter("All");
            setCurrentPage(1);
          }}
          totalResults={filteredLogs.length}
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={6} />
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No Audit Records Found"
          description="No activity logs match your current filter criteria or none have been logged yet."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearch("");
            setActionFilter("All");
            setEntityFilter("All");
          }}
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={paginatedLogs}
            keyField="_id"
          />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredLogs.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Detail Drawer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-auto max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Audit Log Record Details</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: {selectedLog._id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Timestamp</span>
                  <span className="text-slate-800 font-medium">
                    {new Date(selectedLog.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Administrator</span>
                  <span className="text-slate-800 font-medium">
                    {selectedLog.adminEmail || selectedLog.adminUser?.email || "Town Admin"}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Action</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getActionBadge(
                      selectedLog.action
                    )}`}
                  >
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Entity Type</span>
                  <span className="font-bold text-slate-800">{selectedLog.entityType}</span>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Target Record Reference</span>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-slate-800 break-all">
                  {selectedLog.entityTitle ? (
                    <div>
                      <div className="font-semibold font-sans mb-0.5">{selectedLog.entityTitle}</div>
                      <div className="text-[11px] text-slate-400">ID: {selectedLog.entityId}</div>
                    </div>
                  ) : (
                    selectedLog.entityId || "N/A"
                  )}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 block mb-1">Changes Summary</span>
                <p className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 leading-relaxed">
                  {selectedLog.changesSummary || "No detailed summary recorded."}
                </p>
              </div>

              {selectedLog.metadata && (
                <div>
                  <span className="font-semibold text-slate-500 block mb-1">Metadata Snapshot</span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto max-h-40">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
