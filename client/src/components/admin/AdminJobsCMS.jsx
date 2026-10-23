import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import API from "../../api";
import { getAuthToken } from "../../utils/authStorage";
import PageHeader from "./PageHeader";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import {
  Briefcase,
  Users,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Flag,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  X,
  ChevronRight,
  FileText,
  Building,
  UserCheck,
  Check,
  Loader2,
} from "lucide-react";

export default function AdminJobsCMS({ onStatsChange }) {
  const [activeSubTab, setActiveSubTab] = useState("listings"); // "listings" | "applications" | "reported"
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "job" | "job_seeker"
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [listings, setListings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    totalListings: 0,
    vacanciesCount: 0,
    seekersCount: 0,
    openCount: 0,
    filledCount: 0,
    expiredCount: 0,
    reportedCount: 0,
    totalApplications: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get("/jobs/admin/stats");
      if (res.data?.success) {
        setStats(res.data.stats);
        if (onStatsChange) onStatsChange();
      }
    } catch (err) {
      console.warn("Failed to load jobs stats:", err);
    }
  }, [onStatsChange]);

  const fetchListings = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 15,
        type: typeFilter,
        status: statusFilter,
        search: searchQuery.trim() || undefined,
        reportedOnly: activeSubTab === "reported" ? "true" : undefined,
      };

      const res = await API.get("/jobs/admin/all", { params });
      if (res.data?.success) {
        setListings(res.data.listings || []);
        setPage(res.data.page || 1);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load admin jobs listings:", err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, searchQuery, activeSubTab]);

  const fetchApplications = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await API.get("/jobs/admin/applications", {
        params: { page: pageNum, limit: 15 },
      });
      if (res.data?.success) {
        setApplications(res.data.applications || []);
        setPage(res.data.page || 1);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load admin applications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeSubTab === "applications") {
      fetchApplications(1);
    } else {
      fetchListings(1);
    }
  }, [activeSubTab, typeFilter, statusFilter, fetchListings, fetchApplications]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  const handleStatusChange = async (listingId, newStatus) => {
    setActioningId(listingId);
    try {
      const res = await API.patch(`/jobs/admin/${listingId}/status`, { status: newStatus });
      if (res.data?.success) {
        showToast(`Listing marked as ${newStatus}.`);
        setListings((prev) =>
          prev.map((l) => (l._id === listingId ? { ...l, status: newStatus } : l))
        );
        fetchStats();
      }
    } catch (err) {
      alert("Failed to update status: " + (err.response?.data?.message || err.message));
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleVerify = async (listingId, currentVerified) => {
    setActioningId(listingId);
    try {
      const res = await API.patch(`/jobs/admin/${listingId}/verify`, {
        isVerified: !currentVerified,
      });
      if (res.data?.success) {
        showToast(`Verification updated to ${!currentVerified ? "Verified" : "Unverified"}.`);
        setListings((prev) =>
          prev.map((l) => (l._id === listingId ? { ...l, isVerified: !currentVerified } : l))
        );
      }
    } catch (err) {
      alert("Failed to update verification: " + (err.response?.data?.message || err.message));
    } finally {
      setActioningId(null);
    }
  };

  const handleDeleteListing = async (listingId, title) => {
    const ok = window.confirm(
      `Are you sure you want to permanently delete "${title}"? All submitted applications and records for this listing will also be purged.`
    );
    if (!ok) return;

    setActioningId(listingId);
    try {
      const res = await API.delete(`/jobs/admin/${listingId}`);
      if (res.data?.success) {
        showToast("Listing deleted successfully.");
        setListings((prev) => prev.filter((l) => l._id !== listingId));
        fetchStats();
      }
    } catch (err) {
      alert("Failed to delete listing: " + (err.response?.data?.message || err.message));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#A83D32] mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Civic Marketplace</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-heading">
            Fazilnagar Jobs & Talent Management
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Admin oversight for local employer vacancies, candidate profiles, submitted applications, and citizen reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              if (activeSubTab === "applications") fetchApplications(page);
              else fetchListings(page);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            title="Refresh listings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/jobs/post"
            target="_blank"
            className="px-4 py-2 rounded-xl bg-[#A83D32] hover:bg-[#873027] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>+ Post a Listing</span>
          </Link>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Listings</span>
          <span className="text-2xl font-extrabold text-slate-900 mt-1 block">{stats.totalListings}</span>
          <span className="text-[11px] text-emerald-600 font-semibold">{stats.openCount} Open & Active</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Employer Vacancies</span>
          <span className="text-2xl font-extrabold text-indigo-600 mt-1 block">{stats.vacanciesCount}</span>
          <span className="text-[11px] text-slate-500">Category A: Find a Job</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Candidate Profiles</span>
          <span className="text-2xl font-extrabold text-teal-600 mt-1 block">{stats.seekersCount}</span>
          <span className="text-[11px] text-slate-500">Category B: Find Talent</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Applications Sent</span>
          <span className="text-2xl font-extrabold text-amber-600 mt-1 block">{stats.totalApplications}</span>
          <span className="text-[11px] text-slate-500">Recorded town interactions</span>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reported Listings</span>
          <span className={`text-2xl font-extrabold mt-1 block ${stats.reportedCount > 0 ? "text-rose-600" : "text-slate-400"}`}>
            {stats.reportedCount}
          </span>
          <span className="text-[11px] text-slate-500">Community safety flags</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            setActiveSubTab("listings");
            setTypeFilter("all");
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === "listings" && typeFilter === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>All Listings ({stats.totalListings})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("listings");
            setTypeFilter("job");
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === "listings" && typeFilter === "job"
              ? "bg-indigo-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Vacancies ({stats.vacanciesCount})</span>
        </button>

        <button
          onClick={() => {
            setActiveSubTab("listings");
            setTypeFilter("job_seeker");
          }}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === "listings" && typeFilter === "job_seeker"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Candidates ({stats.seekersCount})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("applications")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === "applications"
              ? "bg-amber-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Applications ({stats.totalApplications})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("reported")}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === "reported"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>Reported ({stats.reportedCount})</span>
        </button>
      </div>

      {/* Filter and Search Bar (Active for listings) */}
      {activeSubTab !== "applications" && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") fetchListings(1);
              }}
              placeholder="Search by job title, company, candidate name, skills, or location..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A83D32]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open (Active)</option>
              <option value="paused">Paused</option>
              <option value="filled">Filled</option>
              <option value="expired">Expired</option>
              <option value="deleted">Deleted</option>
            </select>

            <button
              onClick={() => fetchListings(1)}
              className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              Filter
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#A83D32] animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading marketplace records from database...</p>
        </div>
      ) : activeSubTab === "applications" ? (
        /* Applications Table */
        applications.length === 0 ? (
          <EmptyState
            title="No Applications Recorded"
            description="When job seekers click 'Apply Now', application records and town chat threads are tracked here."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Applicant</th>
                    <th className="py-3 px-4">Applied Job Vacancy</th>
                    <th className="py-3 px-4">Employer</th>
                    <th className="py-3 px-4">Date Applied</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {applications.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        <div>{app.applicant?.name || "Citizen User"}</div>
                        <div className="text-[11px] text-slate-500">{app.applicant?.email || app.applicant?.phone || "No phone"}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 line-clamp-1">{app.listing?.title || "Deleted Job"}</div>
                        <div className="text-[11px] text-slate-500">{app.listing?.company || "Employer"} • {app.listing?.location}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{app.employer?.name || "Employer Account"}</div>
                        <div className="text-[11px] text-slate-400">{app.employer?.email || ""}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(app.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {app.status || "Submitted"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {app.listing?._id && (
                          <Link
                            to={`/jobs/${app.listing._id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A83D32] hover:underline"
                          >
                            <span>View Job</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Listings Table */
        listings.length === 0 ? (
          <EmptyState
            title="No Listings Found"
            description="No job listings match your selected category, status, or search query."
          />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Title / Role</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Compensation</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Verified</th>
                    <th className="py-3 px-4">Activity</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {listings.map((item) => {
                    const isJob = item.type === "job";
                    const isActing = actioningId === item._id;

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 max-w-[220px] truncate">
                            {isJob ? item.title : item.desiredRole || "Seeking Employment"}
                          </div>
                          <div className="text-[11px] text-slate-500 max-w-[220px] truncate">
                            {isJob ? item.company : item.displayName || item.owner?.name}
                            {item.category && ` • ${item.category}`}
                          </div>
                          {item.reportsCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded mt-1 border border-rose-200">
                              <Flag className="w-2.5 h-2.5" />
                              {item.reportsCount} Report{item.reportsCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          {isJob ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Vacancy
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Candidate
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                          {isJob ? item.salaryText || "Negotiable" : item.expectedSalary || "Negotiable"}
                        </td>

                        <td className="py-3 px-4 text-slate-600 max-w-[140px] truncate">
                          {isJob ? item.location : item.preferredLocation || "Fazilnagar"}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={item.status}
                            disabled={isActing}
                            onChange={(e) => handleStatusChange(item._id, e.target.value)}
                            className={`text-[11px] font-bold px-2 py-1 rounded-lg border focus:outline-none cursor-pointer ${
                              item.status === "open"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : item.status === "filled"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : item.status === "paused"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <option value="open">Open</option>
                            <option value="paused">Paused</option>
                            <option value="filled">Filled</option>
                            <option value="expired">Expired</option>
                            <option value="deleted">Deleted</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isActing}
                            onClick={() => handleToggleVerify(item._id, item.isVerified)}
                            className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                              item.isVerified
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200"
                            }`}
                            title={item.isVerified ? "Verified listing (click to unverify)" : "Unverified (click to verify)"}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span className="text-[10px] font-bold">{item.isVerified ? "Yes" : "No"}</span>
                          </button>
                        </td>

                        <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                          <div>👁️ {item.views || 0} views</div>
                          <div>📬 {item.applicationsCount || item.inquiriesCount || 0} leads</div>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              to={`/jobs/${item._id}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                              title="View listing page on website"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => handleDeleteListing(item._id, isJob ? item.title : item.displayName)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>Showing page {page} of {totalPages} ({totalCount} total)</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                if (activeSubTab === "applications") fetchApplications(page - 1);
                else fetchListings(page - 1);
              }}
              className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                if (activeSubTab === "applications") fetchApplications(page + 1);
                else fetchListings(page + 1);
              }}
              className="px-3 py-1.5 rounded-lg border bg-white disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
