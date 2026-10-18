import { useState, useEffect, useMemo } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import AdminPlaceEditModal from "./AdminPlaceEditModal";
import {
  Building2,
  GraduationCap,
  Stethoscope,
  Plus,
  Edit3,
  Trash2,
  Archive,
  RotateCcw,
  Search,
  ExternalLink,
  MapPin,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Layers,
  Map as MapIcon,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Building,
} from "lucide-react";
import PageHeader from "./admin/PageHeader";
import StatCard from "./admin/StatCard";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import LoadingSkeleton from "./admin/LoadingSkeleton";

const CATEGORY_TABS = [
  { id: "all", label: "All Entities" },
  { id: "village", label: "Villages (गांव)" },
  { id: "town", label: "Towns (कस्बा)" },
  { id: "city", label: "Cities (शहर)" },
  { id: "landmark", label: "Landmarks (लैंडमार्क)" },
  { id: "Schools & Colleges", label: "Schools & Colleges" },
  { id: "Hospitals & Clinics", label: "Hospitals & Clinics" },
];

const STATUS_OPTIONS = [
  { id: "all", label: "All Statuses" },
  { id: "verified", label: "Verified Only" },
  { id: "needs_verification", label: "Needs Review / Candidate" },
  { id: "unverified", label: "Unverified" },
  { id: "archived", label: "Archived Only" },
];

const PAGE_SIZE = 25;

export default function AdminManageEntities({ token: propToken, onStatsChange }) {
  const token = propToken || getAuthToken();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState(null);

  // Edit / Add Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // Delete Confirm Dialog
  const [deleteConfirmPlace, setDeleteConfirmPlace] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const res = await API.get("/places/admin?archived=all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = Array.isArray(res.data) ? res.data : (res.data?.places || []);
      setPlaces(data);
    } catch (err) {
      console.error("Fetch Places Admin Error:", err);
      try {
        const fallbackRes = await API.get("/places/map-entities");
        setPlaces(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
      } catch (_) {
        showToast("error", "Error loading map entities from database.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  const handleArchiveToggle = async (place) => {
    try {
      const pId = place._id || place.id || place.slug;
      if (place.isArchived) {
        await API.patch(
          `/places/${pId}/restore`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("success", `Restored "${place.name}" to public map.`);
      } else {
        await API.patch(
          `/places/${pId}/archive`,
          { reason: "Archived via admin management console" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("success", `Archived "${place.name}". It is now hidden from the public map.`);
      }
      try {
        sessionStorage.removeItem("fazilnagar_cached_places");
        sessionStorage.removeItem("fazilnagar_cached_places_stats");
        localStorage.setItem("fazilnagar_last_place_update", String(Date.now()));
      } catch (_) {}
      fetchPlaces();
      window.dispatchEvent(new CustomEvent("fazilnagar-place-updated"));
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Archive toggle error:", err);
      showToast("error", err.response?.data?.message || "Failed to toggle archive status.");
    }
  };

  const openDeleteDialog = (place) => {
    setDeleteError("");
    if (place.id === "fazilnagar-hub" || place.name === "Fazilnagar Centre") {
      setDeleteError("The central Fazilnagar Hub cannot be deleted as it is the zero-km origin reference for the entire region.");
    }
    setDeleteConfirmPlace(place);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmPlace) return;
    const pId = deleteConfirmPlace._id || deleteConfirmPlace.id || deleteConfirmPlace.slug;

    if (deleteConfirmPlace.id === "fazilnagar-hub" || deleteConfirmPlace.name === "Fazilnagar Centre") {
      showToast("error", "The central Fazilnagar Hub is protected and cannot be deleted.");
      return;
    }

    try {
      await API.delete(`/places/${pId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("success", `Permanently deleted "${deleteConfirmPlace.name}".`);
      setDeleteConfirmPlace(null);
      setDeleteDialogOpen(false);
      try {
        sessionStorage.removeItem("fazilnagar_cached_places");
        sessionStorage.removeItem("fazilnagar_cached_places_stats");
        localStorage.setItem("fazilnagar_last_place_update", String(Date.now()));
      } catch (_) {}
      fetchPlaces();
      window.dispatchEvent(new CustomEvent("fazilnagar-place-updated"));
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Delete place error:", err);
      showToast("error", err.response?.data?.message || "Failed to delete entity.");
    }
  };

  // Filter places
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      // Category / Type filter
      if (categoryFilter !== "all") {
        const matchesCat = p.category === categoryFilter;
        const matchesType = p.entityType === categoryFilter || p.type === categoryFilter;
        if (!matchesCat && !matchesType) return false;
      }

      // Verification Status filter
      if (statusFilter === "verified") {
        if (p.isArchived || p.verificationStatus !== "verified") return false;
      } else if (statusFilter === "needs_verification") {
        if (p.isArchived || (p.verificationStatus !== "needs_verification" && p.verificationStatus !== "discovered")) return false;
      } else if (statusFilter === "unverified") {
        if (p.isArchived || p.verificationStatus !== "unverified") return false;
      } else if (statusFilter === "archived") {
        if (!p.isArchived) return false;
      }

      // Search query filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = p.name?.toLowerCase().includes(q);
        const matchHindi = p.hindiName && p.hindiName.includes(q);
        const matchAddr = p.addressFull?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        const matchType = (p.entityType || p.type)?.toLowerCase().includes(q);
        const matchLoc = p.locality?.toLowerCase().includes(q);
        const matchDistrict = p.district?.toLowerCase().includes(q);
        const matchId = String(p.id || p._id || p.sno)?.toLowerCase().includes(q);
        const matchSlug = p.slug?.toLowerCase().includes(q);
        if (!matchName && !matchHindi && !matchAddr && !matchCat && !matchType && !matchLoc && !matchDistrict && !matchId && !matchSlug) {
          return false;
        }
      }

      return true;
    });
  }, [places, categoryFilter, statusFilter, search]);

  // Pagination calculation
  const totalItems = filteredPlaces.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const paginatedPlaces = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPlaces.slice(start, start + PAGE_SIZE);
  }, [filteredPlaces, currentPage]);

  // Reset to page 1 on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, search]);

  // Statistics counters
  const totalCount = places.length;
  const villagesCount = places.filter((p) => p.category === "village" || p.entityType === "village" || p.type === "village").length;
  const townsCitiesCount = places.filter((p) => p.type === "town" || p.type === "city" || p.category === "town" || p.category === "city").length;
  const verifiedCount = places.filter((p) => p.verificationStatus === "verified" && !p.isArchived).length;
  const needsReviewCount = places.filter((p) => (p.verificationStatus === "needs_verification" || p.verificationStatus === "discovered") && !p.isArchived).length;

  const renderTypeBadge = (place) => {
    const type = place.entityType || place.type || place.category || "place";
    if (type === "hub" || place.id === "fazilnagar-hub") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-300">
          <MapPin className="w-3 h-3 text-red-600" />
          <span>Central Hub</span>
        </span>
      );
    }
    if (type === "village") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
          <span>गांव (Village)</span>
        </span>
      );
    }
    if (type === "town") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span>कस्बा (Town)</span>
        </span>
      );
    }
    if (type === "city") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-300">
          <span>शहर (City)</span>
        </span>
      );
    }
    if (type === "Schools & Colleges" || place.category === "Schools & Colleges") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-300">
          <GraduationCap className="w-3 h-3 text-blue-600" />
          <span>School / College</span>
        </span>
      );
    }
    if (type === "Hospitals & Clinics" || place.category === "Hospitals & Clinics") {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 border border-teal-300">
          <Stethoscope className="w-3 h-3 text-teal-600" />
          <span>Hospital / Clinic</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300">
        <span>{place.category || type}</span>
      </span>
    );
  };

  const renderStatusBadge = (place) => {
    if (place.isArchived) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 border border-slate-300">
          <span>📦 Archived</span>
        </span>
      );
    }
    if (place.verificationStatus === "verified") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span>✓ Verified</span>
        </span>
      );
    }
    if (place.verificationStatus === "needs_verification" || place.verificationStatus === "discovered") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
          <span>⚠️ Needs Review</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
        <span>Unverified</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {toast && (
        <ToastNotification
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        icon={MapIcon}
        title="Map Entity Management & Geospatial CRUD"
        subtitle="Manage villages, towns, cities, landmarks, and civic locations on the Fazilnagar Interactive Map"
        badgeText={`${totalCount} Total Map Records`}
        primaryAction={{
          label: "Add Map Entity",
          icon: Plus,
          onClick: () => {
            setSelectedPlace(null);
            setEditModalOpen(true);
          },
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Directory Management" },
          { label: "Map Entities" },
        ]}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MapPin}
          label="Total Map Entities"
          value={totalCount}
          helperText="All settlements & landmarks"
          color="blue"
        />
        <StatCard
          icon={Building2}
          label="Villages & Panchayats"
          value={villagesCount}
          helperText="Local Fazilnagar settlements"
          color="indigo"
        />
        <StatCard
          icon={CheckCircle}
          label="Verified Locations"
          value={verifiedCount}
          helperText="Census & survey verified"
          color="emerald"
        />
        <StatCard
          icon={AlertTriangle}
          label="Needs Review / Candidate"
          value={needsReviewCount}
          helperText="Pending field verification"
          color="amber"
        />
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name (e.g. Lavkush, Karmaini), Hindi name, locality, ID..."
              className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#B8323C] transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-[#B8323C] font-medium"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                categoryFilter === tab.id
                  ? "bg-[#B8323C] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8">
            <LoadingSkeleton count={6} />
          </div>
        ) : paginatedPlaces.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={MapPin}
              title="No Map Entities Found"
              description={
                search || categoryFilter !== "all" || statusFilter !== "all"
                  ? "No locations match your current search and filter criteria."
                  : "No map entities exist in the database. Use 'Add Map Entity' to create your first record."
              }
              action={
                search || categoryFilter !== "all" || statusFilter !== "all"
                  ? {
                      label: "Reset Filters",
                      onClick: () => {
                        setSearch("");
                        setCategoryFilter("all");
                        setStatusFilter("all");
                      },
                    }
                  : {
                      label: "Create First Entity",
                      onClick: () => {
                        setSelectedPlace(null);
                        setEditModalOpen(true);
                      },
                    }
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Entity & Local Name</th>
                  <th className="py-3 px-4">Type / Category</th>
                  <th className="py-3 px-4">Coordinates & Google Maps</th>
                  <th className="py-3 px-4">Locality / District</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedPlaces.map((place) => {
                  const lat = Number(place.latitude ?? place.lat);
                  const lng = Number(place.longitude ?? place.lng);
                  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
                  const googleMapsUrl = hasCoords
                    ? `https://www.google.com/maps/search/?api=1&query=${lat}%2C${lng}`
                    : "";

                  return (
                    <tr
                      key={place._id || place.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Name & Hindi */}
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {place.name}
                        </div>
                        {place.hindiName && (
                          <div className="text-slate-600 font-medium text-xs mt-0.5">
                            {place.hindiName}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {place.id || place._id} {place.sno ? `• SNO #${place.sno}` : ""}
                        </div>
                      </td>

                      {/* Type / Category */}
                      <td className="py-3 px-4">
                        {renderTypeBadge(place)}
                        {place.coordinateSource && (
                          <div className="text-[10px] text-slate-400 mt-1 max-w-[180px] truncate" title={place.coordinateSource}>
                            Ref: {place.coordinateSource}
                          </div>
                        )}
                      </td>

                      {/* Coordinates & Google Maps */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {hasCoords ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#B8323C] shrink-0" />
                            <span className="font-semibold text-xs">
                              {lat.toFixed(4)}, {lng.toFixed(4)}
                            </span>
                            <a
                              href={googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-slate-400 hover:text-[#B8323C] hover:bg-red-50 transition"
                              title="Open exact saved coordinates in Google Maps"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No coordinates</span>
                        )}
                        {place.distanceKm !== undefined && place.distanceKm !== null && (
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5">
                            {place.distanceKm} km {place.compassDirection ? `(${place.compassDirection})` : ""}
                          </div>
                        )}
                      </td>

                      {/* Locality & District */}
                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-semibold truncate max-w-[170px]">
                          {place.locality || "Fazilnagar"}
                        </div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[170px]">
                          {place.district || "Kushinagar"}, {place.state || "UP"}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {renderStatusBadge(place)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlace(place);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit coordinates & details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleArchiveToggle(place)}
                            className={`p-1.5 rounded-lg transition cursor-pointer ${
                              place.isArchived
                                ? "text-emerald-700 hover:bg-emerald-50"
                                : "text-amber-700 hover:bg-amber-50"
                            }`}
                            title={place.isArchived ? "Restore to Public Map" : "Hide from Map"}
                          >
                            {place.isArchived ? (
                              <RotateCcw className="w-4 h-4" />
                            ) : (
                              <Archive className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteDialog(place)}
                            disabled={place.id === "fazilnagar-hub"}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Delete entity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing <span className="font-bold">{(currentPage - 1) * PAGE_SIZE + 1}</span> to{" "}
              <span className="font-bold">
                {Math.min(currentPage * PAGE_SIZE, totalItems)}
              </span>{" "}
              of <span className="font-bold">{totalItems}</span> map entities
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-bold text-slate-800">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {editModalOpen && (
        <AdminPlaceEditModal
          isOpen={editModalOpen}
          place={selectedPlace}
          allEntities={places}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedPlace(null);
          }}
          onSave={(saved) => {
            showToast("success", `Entity "${saved.name}" saved successfully.`);
            fetchPlaces();
            window.dispatchEvent(new CustomEvent("fazilnagar-place-updated", { detail: saved }));
            if (onStatsChange) onStatsChange();
          }}
          onDelete={(p) => {
            setEditModalOpen(false);
            openDeleteDialog(p);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && deleteConfirmPlace && (
        <ConfirmDialog
          isOpen={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setDeleteConfirmPlace(null);
          }}
          onConfirm={handleDelete}
          title={deleteError ? "Protected Central Record" : "Delete Map Entity"}
          message={
            deleteError ||
            `Are you sure you want to permanently delete "${deleteConfirmPlace.name}"? This will remove its marker and data from the Fazilnagar interactive map.`
          }
          confirmLabel={deleteError ? "Understood" : "Delete Permanently"}
          confirmVariant={deleteError ? "neutral" : "danger"}
          disabled={Boolean(deleteError)}
        />
      )}
    </div>
  );
}
