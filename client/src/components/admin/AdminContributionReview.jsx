import { useState, useEffect, useMemo, useCallback } from "react";
import API from "../../api";
import { getAuthToken } from "../../utils/authStorage";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Search,
  Filter,
  ExternalLink,
  MapPin,
  Clock,
  User,
  FileText,
  Building,
  Check,
  X,
  Eye,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

export default function AdminContributionReview({ onStatsChange = () => {} }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    changes_requested: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);

  // Detail Modal & Partial Approval
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedFieldsToApprove, setSelectedFieldsToApprove] = useState([]);
  const [reviewerComments, setReviewerComments] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState("");

  const token = getAuthToken();
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Fetch submissions list
  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (moduleFilter !== "all") params.append("module", moduleFilter);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const res = await API.get(`/contributions?${params.toString()}`, { headers: authHeaders });
      setSubmissions(Array.isArray(res.data?.submissions) ? res.data.submissions : []);
      if (res.data?.statusCounts) {
        setStatusCounts(res.data.statusCounts);
      }
    } catch (err) {
      console.error("Error loading contributions:", err);
      setError(err.response?.data?.message || "Failed to load contribution proposals.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, moduleFilter, searchQuery, authHeaders]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Load single submission detail
  const handleOpenDetail = async (submissionId) => {
    setSelectedSubmissionId(submissionId);
    setLoadingDetail(true);
    setDetailData(null);
    setReviewerComments("");
    try {
      const res = await API.get(`/contributions/${submissionId}`, { headers: authHeaders });
      setDetailData(res.data);
      // Default to checking all changed proposed fields for approval
      const changed = res.data.changedFields || Object.keys(res.data.submission?.proposedValues || {});
      setSelectedFieldsToApprove(changed);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to load submission details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleFieldApproval = (fieldName) => {
    setSelectedFieldsToApprove((prev) =>
      prev.includes(fieldName) ? prev.filter((f) => f !== fieldName) : [...prev, fieldName]
    );
  };

  // Execute Review Decision (Approve / Reject / Changes Requested)
  const handleExecuteReview = async (action) => {
    if (!detailData?.submission) return;

    if (action === "approve" && selectedFieldsToApprove.length === 0) {
      alert("Please select at least one field to approve.");
      return;
    }

    if (action === "reject" && !reviewerComments.trim()) {
      const reason = window.prompt("Please provide a reason for rejecting this contribution:");
      if (!reason || !reason.trim()) {
        alert("Rejection reason is required.");
        return;
      }
      setReviewerComments(reason.trim());
    }

    setSubmittingAction(true);
    try {
      const payload = {
        action,
        approvedFields: action === "approve" ? selectedFieldsToApprove : [],
        reviewerComments: reviewerComments.trim(),
      };

      const res = await API.patch(`/contributions/${detailData.submission._id}/review`, payload, {
        headers: authHeaders,
      });

      setActionSuccessMsg(`Contribution successfully marked as ${action}.`);
      setSelectedSubmissionId(null);
      setDetailData(null);
      fetchSubmissions();
      onStatsChange();

      // Clear client cache and trigger map & directory update broadcast event
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("fazilnagar_cached_places");
          sessionStorage.removeItem("fazilnagar_cached_places_stats");
          localStorage.setItem("fazilnagar_last_place_update", String(Date.now()));
        } catch (_) {}
        window.dispatchEvent(
          new CustomEvent("fazilnagar-place-updated", {
            detail: { action, place: res.data?.appliedPlace, submissionId: detailData.submission._id },
          })
        );
      }

      setTimeout(() => setActionSuccessMsg(""), 4000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to apply review decision.");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Approved</span>;
      case "rejected":
        return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Rejected</span>;
      case "changes_requested":
        return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Changes Requested</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">Pending Review</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 font-heading">
              Public Contribution Review Desk
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Review citizen proposals for Map and Directory records. Compare proposed values with live database records, verify Google Maps pins, and approve selected fields.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchSubmissions}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Metric Status Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("pending")}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === "pending"
              ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending Review</span>
          <div className="text-xl font-extrabold text-amber-900 mt-1">{statusCounts.pending || 0}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("approved")}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === "approved"
              ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approved Live</span>
          <div className="text-xl font-extrabold text-emerald-900 mt-1">{statusCounts.approved || 0}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === "rejected"
              ? "bg-red-50/80 border-red-300 ring-2 ring-red-400/30"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Rejected</span>
          <div className="text-xl font-extrabold text-red-900 mt-1">{statusCounts.rejected || 0}</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
            statusFilter === "all"
              ? "bg-slate-100 border-slate-300 ring-2 ring-slate-400/30"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">All Submissions</span>
          <div className="text-xl font-extrabold text-slate-800 mt-1">{statusCounts.all || 0}</div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Reference ID (FZ-CONTRIB-...), entity name, or submitter..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer w-full sm:w-auto"
        >
          <option value="all">All Modules</option>
          <option value="map">🗺️ Map Proposals</option>
          <option value="directory">🏢 Directory Proposals</option>
        </select>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading contribution submissions...</div>
      ) : submissions.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">No Submissions Found</h4>
          <p className="text-xs text-slate-500">
            {statusFilter === "pending"
              ? "All caught up! There are no pending contributions awaiting review."
              : "No submissions match your active filter criteria."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Module / Type</th>
                  <th className="py-3 px-4">Entity Name / Proposed Title</th>
                  <th className="py-3 px-4">Location Check</th>
                  <th className="py-3 px-4">Submitter</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const locStatus = sub.locationComparison?.status;
                  return (
                    <tr key={sub._id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{sub.referenceId}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            sub.targetModule === "map"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {sub.targetModule === "map" ? "🗺️ Map" : "🏢 Directory"} &bull; {sub.submissionType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-slate-900 max-w-[200px] truncate">
                        {sub.targetEntityName || sub.proposedValues?.name || "Unnamed"}
                      </td>
                      <td className="py-3 px-4">
                        {sub.googleMapsUrl ? (
                          locStatus === "consistent" ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                              ✓ Verified Pin
                            </span>
                          ) : locStatus === "mismatch" ? (
                            <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 inline-flex items-center gap-1">
                              ⚠️ Coord Mismatch
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-flex items-center gap-1">
                              ⚠️ Check Pin
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400">Non-location</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {sub.submitterInfo?.name || "Citizen"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(sub.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(sub._id)}
                          className="px-3 py-1.5 bg-[#0D5E49] hover:bg-emerald-800 text-white rounded-lg font-bold text-xs transition cursor-pointer shadow-2xs"
                        >
                          Review &amp; Compare
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review & Side-by-Side Comparison Modal */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-emerald-400 font-bold">
                    {detailData?.submission?.referenceId}
                  </span>
                  <span className="text-[10px] uppercase font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {detailData?.submission?.submissionType?.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-base font-extrabold mt-0.5">
                  Review Proposal: {detailData?.submission?.targetEntityName || detailData?.submission?.proposedValues?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmissionId(null);
                  setDetailData(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail || !detailData ? (
              <div className="p-16 text-center text-xs text-slate-500">Loading proposal details...</div>
            ) : (
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Stale Warning Banner if live record changed */}
                {detailData.isStale && (
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Stale Submission Alert</strong>
                      The live record was modified by another update after this proposal was submitted. Check the current live values carefully before approving.
                    </div>
                  </div>
                )}

                {/* Duplicate Warning Banner */}
                {detailData.submission?.duplicateWarnings?.length > 0 && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                    <strong className="block font-bold">⚠️ Possible Duplicate Entity Detected:</strong>
                    {detailData.submission.duplicateWarnings.map((dw, i) => (
                      <p key={i} className="text-[11px] text-blue-800">
                        &bull; Existing: <strong>{dw.name}</strong> ({dw.category}) &mdash; {dw.similarity}
                      </p>
                    ))}
                  </div>
                )}

                {/* Submitter & Evidence Notes */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Submitter:</span>
                      <strong>{detailData.submission?.submitterInfo?.name || "Local Resident"}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Contact Info:</span>
                      <span>{detailData.submission?.submitterInfo?.contact || "None provided"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Date Submitted:</span>
                      <span>{new Date(detailData.submission?.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  {detailData.submission?.evidenceNotes && (
                    <div>
                      <span className="text-slate-400 block text-[10px]">Evidence / Submitter Notes:</span>
                      <p className="italic text-slate-800 mt-0.5">"{detailData.submission.evidenceNotes}"</p>
                    </div>
                  )}

                  {detailData.submission?.attachments?.length > 0 && (
                    <div>
                      <span className="text-slate-400 block text-[10px] mb-1">Attached Files / Proof:</span>
                      <div className="flex flex-wrap gap-2">
                        {detailData.submission.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>Attachment #{i + 1}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Review Box with Google Maps Verification */}
                {(detailData.submission?.googleMapsUrl ||
                  detailData.submission?.proposedValues?.googleMapsUrl ||
                  detailData.submission?.proposedValues?.latitude !== undefined ||
                  detailData.submission?.proposedValues?.longitude !== undefined) && (
                  <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-700" />
                        <h4 className="text-xs font-bold text-emerald-900">
                          Google Maps Location Review &amp; Coordinate Verification
                        </h4>
                      </div>
                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                        Google Maps Only
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-emerald-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Proposed Coordinates:</span>
                        <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                          {detailData.submission.proposedValues?.latitude ?? "—"}, {detailData.submission.proposedValues?.longitude ?? "—"}
                        </div>
                        {detailData.submission.proposedValues?.latitude && detailData.submission.proposedValues?.longitude && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${detailData.submission.proposedValues.latitude},${detailData.submission.proposedValues.longitude}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0D5E49] hover:underline mt-1"
                          >
                            <span>Open Proposed Pin in Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold">Submitted Google Maps Link:</span>
                        {(() => {
                          const mapsLink =
                            detailData.submission.googleMapsUrl ||
                            detailData.submission.proposedValues?.googleMapsUrl ||
                            "";
                          if (!mapsLink) {
                            return <span className="text-slate-400 italic text-xs mt-0.5 block">None provided</span>;
                          }
                          return (
                            <>
                              <a
                                href={mapsLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-blue-700 hover:underline block truncate max-w-full mt-0.5"
                                title={mapsLink}
                              >
                                {mapsLink}
                              </a>
                              <div className="mt-1 text-[11px]">
                                {detailData.submission.locationComparison?.status === "consistent" ? (
                                  <span className="text-emerald-700 font-bold">✓ Coordinates match Google Maps URL link</span>
                                ) : detailData.submission.locationComparison?.status === "mismatch" ? (
                                  <span className="text-red-700 font-bold">
                                    ⚠️ {detailData.submission.locationComparison.warningMessage}
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-bold">
                                    ⚠️ {detailData.submission.locationComparison?.warningMessage || "Inspect pin manually on Google Maps"}
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Side-by-Side Comparison Table with Field Approval Checkboxes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                      Field-by-Field Proposal Comparison
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Check the box next to each proposed field you wish to approve and apply.
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Approve</th>
                          <th className="py-2.5 px-3 w-40">Field</th>
                          <th className="py-2.5 px-3">Current Live Value</th>
                          <th className="py-2.5 px-3">Proposed Value</th>
                          <th className="py-2.5 px-3 w-28 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailData.diffs?.map((diff) => {
                          const isApproved = selectedFieldsToApprove.includes(diff.field);
                          return (
                            <tr
                              key={diff.field}
                              className={diff.isChanged ? "bg-amber-50/40" : "bg-white"}
                            >
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isApproved}
                                  onChange={() => handleToggleFieldApproval(diff.field)}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                <div className="flex items-center gap-1.5">
                                  {diff.field === "latitude" && <span className="text-emerald-700 font-extrabold text-sm">🌐</span>}
                                  {diff.field === "longitude" && <span className="text-blue-700 font-extrabold text-sm">🧭</span>}
                                  {diff.field === "googleMapsUrl" && <span className="text-rose-700 font-extrabold text-sm">📍</span>}
                                  <span>{diff.field}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 max-w-xs break-words">
                                {diff.currentLiveValue !== null && diff.currentLiveValue !== undefined && diff.currentLiveValue !== "" ? (
                                  String(diff.currentLiveValue)
                                ) : (
                                  <span className="text-slate-300 italic">None</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-xs break-words">
                                {diff.proposedValue !== null && diff.proposedValue !== undefined && diff.proposedValue !== "" ? (
                                  String(diff.proposedValue)
                                ) : (
                                  <span className="text-slate-300 italic">None</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {diff.isChanged ? (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                    Changed
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Unchanged</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Reviewer Comments */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Reviewer Notes / Rejection Reason (Logged in Audit Trail)
                  </label>
                  <textarea
                    rows={2}
                    value={reviewerComments}
                    onChange={(e) => setReviewerComments(e.target.value)}
                    placeholder="Enter approval verification notes, pin confirmation details, or rejection reasons..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Past Decisions / Audit History */}
                {detailData.submission?.auditTrail?.length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Submission Audit History
                    </h5>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      {detailData.submission.auditTrail.map((at, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-slate-800">{at.action}</span>
                          <span className="text-slate-400">by {at.actor}</span>
                          <span className="text-slate-400">({new Date(at.timestamp).toLocaleString()})</span>
                          <span className="text-slate-600 italic">&mdash; {at.details}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedSubmissionId(null);
                  setDetailData(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => handleExecuteReview("reject")}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Reject Proposal
                </button>

                <button
                  type="button"
                  disabled={submittingAction}
                  onClick={() => handleExecuteReview("changes_requested")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Request Corrections
                </button>

                <button
                  type="button"
                  disabled={submittingAction || selectedFieldsToApprove.length === 0}
                  onClick={() => handleExecuteReview("approve")}
                  className="px-5 py-2 bg-[#0D5E49] hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Approve {selectedFieldsToApprove.length} Selected Field{selectedFieldsToApprove.length === 1 ? "" : "s"} &amp; Update Live
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
