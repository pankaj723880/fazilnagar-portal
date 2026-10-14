import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import AdminPlaceEditModal from "./AdminPlaceEditModal";
import AdminCommunityPlaces from "./AdminCommunityPlaces";
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
  School,
  Hospital
} from "lucide-react";
import PageHeader from "./admin/PageHeader";
import StatCard from "./admin/StatCard";
import SearchAndFilters from "./admin/SearchAndFilters";
import DataTable from "./admin/DataTable";
import StatusBadge from "./admin/StatusBadge";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import LoadingSkeleton from "./admin/LoadingSkeleton";

export default function AdminManageEntities({ token: propToken, onStatsChange }) {
  const token = propToken || getAuthToken();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);

  // Edit / Add Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // Delete Confirm Dialog
  const [deleteConfirmPlace, setDeleteConfirmPlace] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const fetchPlaces = async () => {
    setLoading(true);
    try {
      const res = await API.get("/places/admin?archived=all");
      setPlaces(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch Places Admin Error:", err);
      // Fallback to public list
      try {
        const fallbackRes = await API.get("/places");
        setPlaces(Array.isArray(fallbackRes.data) ? fallbackRes.data : []);
      } catch (_) {
        showToast("error", "Error loading places directory from MongoDB.");
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
      if (place.isArchived) {
        await API.patch(
          `/places/${place._id || place.id}/restore`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("success", `Restored "${place.name}" to public directory.`);
      } else {
        await API.patch(
          `/places/${place._id || place.id}/archive`,
          { reason: "Archived via admin management console" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("success", `Archived "${place.name}". It is now hidden from the public map.`);
      }
      fetchPlaces();
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Archive toggle error:", err);
      showToast("error", err.response?.data?.message || "Failed to toggle archive status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmPlace) return;
    try {
      await API.delete(`/places/${deleteConfirmPlace._id || deleteConfirmPlace.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("success", `Permanently deleted "${deleteConfirmPlace.name}".`);
      setDeleteConfirmPlace(null);
      setDeleteDialogOpen(false);
      fetchPlaces();
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Delete place error:", err);
      showToast("error", err.response?.data?.message || "Failed to delete establishment.");
    }
  };

  // Filter places
  const filteredPlaces = places.filter((p) => {
    if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
    if (statusFilter === "published" && (!p.isPublished || p.isArchived)) return false;
    if (statusFilter === "archived" && !p.isArchived) return false;
    if (statusFilter === "in_review" && (p.isPublished || p.isArchived)) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchName = p.name?.toLowerCase().includes(q);
      const matchAddr = p.addressFull?.toLowerCase().includes(q);
      const matchCat = p.category?.toLowerCase().includes(q);
      const matchLoc = p.locality?.toLowerCase().includes(q);
      const matchSlug = p.slug?.toLowerCase().includes(q);
      if (!matchName && !matchAddr && !matchCat && !matchLoc && !matchSlug) return false;
    }
    return true;
  });

  const schoolsCount = places.filter((p) => p.category === "Schools & Colleges").length;
  const hospitalsCount = places.filter((p) => p.category === "Hospitals & Clinics").length;
  const archivedCount = places.filter((p) => p.isArchived).length;

  const tableColumns = [
    {
      key: "name",
      label: "Establishment / Institution",
      sortable: true,
      render: (place) => {
        const isSchool = place.category === "Schools & Colleges";
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
              {place.imageUrl ? (
                <img
                  src={place.imageUrl}
                  alt={place.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  {isSchool ? <GraduationCap className="w-4 h-4 text-blue-500" /> : <Stethoscope className="w-4 h-4 text-emerald-500" />}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 text-sm truncate max-w-xs sm:max-w-sm">
                {place.name}
              </h4>
              <span className="text-[11px] text-slate-400 font-mono block truncate">
                slug: {place.slug}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      label: "Category",
      sortable: true,
      render: (val, row) => {
        const place = row || val;
        const cat = (typeof val === "string" ? val : null) || place?.category || "Listing";
        const isSchool = cat === "Schools & Colleges";
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isSchool
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {isSchool ? <GraduationCap className="w-3.5 h-3.5" /> : <Stethoscope className="w-3.5 h-3.5" />}
            <span>{cat}</span>
          </span>
        );
      },
    },
    {
      key: "address",
      label: "Address & Landmark",
      render: (val, row) => {
        const place = row || val;
        return (
          <div className="max-w-xs text-xs">
            <div className="text-slate-800 font-medium truncate" title={place?.addressFull}>
              {place?.addressFull || "—"}
            </div>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
              Locality: {place?.locality || "Town Center"}
            </span>
          </div>
        );
      },
    },
    {
      key: "coordinates",
      label: "Map Coordinates",
      render: (val, row) => {
        const place = row || val;
        const lat = place?.latitude ? Number(place.latitude).toFixed(5) : "—";
        const lng = place?.longitude ? Number(place.longitude).toFixed(5) : "—";
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place?.latitude},${place?.longitude}`;
        return (
          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>{lat}, {lng}</span>
            {place?.latitude && place?.longitude && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-blue-600 transition"
                title="Open in Google Maps"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (val, row) => {
        const place = row || val;
        if (place?.isArchived) return <StatusBadge status="archived" />;
        if (place?.isPublished) return <StatusBadge status="published" />;
        return <StatusBadge status="pending" label="In Review" />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (val, row) => {
        const place = row || val;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => {
                setSelectedPlace(place);
                setEditModalOpen(true);
              }}
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              title="Edit details, photos, coordinates"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleArchiveToggle(place)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                place?.isArchived
                  ? "text-emerald-700 hover:bg-emerald-50"
                  : "text-amber-700 hover:bg-amber-50"
              }`}
              title={place?.isArchived ? "Restore to Directory" : "Archive from Directory"}
            >
              {place?.isArchived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setDeleteConfirmPlace(place);
                setDeleteDialogOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Delete establishment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      },
    },
  ];

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
        icon={Building2}
        title="Official Entities (19)"
        subtitle="Manage verified municipal institutions, colleges, schools, and medical facilities across Fazilnagar"
        badgeText={`${places.length} Official Places`}
        primaryAction={{
          label: "Create New Entity",
          icon: Plus,
          onClick: () => {
            setSelectedPlace(null);
            setEditModalOpen(true);
          },
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Directory Management" },
          { label: "Entities (19)" },
        ]}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building2}
          label="Total Official Entities"
          value={places.length}
          helperText="Verified canonical records"
          color="blue"
        />
        <StatCard
          icon={GraduationCap}
          label="Schools & Colleges"
          value={schoolsCount}
          helperText="Educational institutions"
          color="indigo"
        />
        <StatCard
          icon={Stethoscope}
          label="Hospitals & Clinics"
          value={hospitalsCount}
          helperText="Medical healthcare centers"
          color="emerald"
        />
        <StatCard
          icon={Archive}
          label="Archived Places"
          value={archivedCount}
          helperText="Hidden from public map"
          color="amber"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchAndFilters
          searchPlaceholder="Search by institution name, address, or slug..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "category",
              label: "Category",
              value: categoryFilter,
              options: [
                { label: "All Categories", value: "all" },
                { label: "Schools & Colleges", value: "Schools & Colleges" },
                { label: "Hospitals & Clinics", value: "Hospitals & Clinics" },
              ],
              onChange: setCategoryFilter,
            },
            {
              id: "status",
              label: "Status",
              value: statusFilter,
              options: [
                { label: "All Statuses", value: "all" },
                { label: "Published", value: "published" },
                { label: "Archived", value: "archived" },
              ],
              onChange: setStatusFilter,
            },
          ]}
          onReset={() => {
            setSearch("");
            setCategoryFilter("all");
            setStatusFilter("all");
          }}
          totalResults={filteredPlaces.length}
        />
      </div>

      {/* Data Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={6} />
      ) : filteredPlaces.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No Matching Establishments"
          description={
            search || categoryFilter !== "all" || statusFilter !== "all"
              ? "No institutions match your filter criteria. Try clearing search filters."
              : "No official institutions recorded yet. Click Create New Entity to add one."
          }
          actionLabel="Create New Entity"
          onAction={() => {
            setSelectedPlace(null);
            setEditModalOpen(true);
          }}
        />
      ) : (
        <DataTable
          columns={tableColumns}
          data={filteredPlaces}
          keyField="_id"
          defaultSortKey="name"
        />
      )}

      {/* Edit / Create Modal */}
      {editModalOpen && (
        <AdminPlaceEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedPlace(null);
          }}
          place={selectedPlace}
          onSave={() => {
            setEditModalOpen(false);
            setSelectedPlace(null);
            fetchPlaces();
            showToast("success", "Institution saved successfully.");
          }}
          onDelete={() => {
            setEditModalOpen(false);
            setSelectedPlace(null);
            fetchPlaces();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirmPlace(null);
        }}
        onConfirm={handleDelete}
        title="Delete Official Institution?"
        message={`Are you sure you want to permanently delete "${deleteConfirmPlace?.name}"? Its map coordinates and directory listing will be permanently removed.`}
        confirmLabel="Delete Institution"
        variant="danger"
      />
    </div>
  );
}
