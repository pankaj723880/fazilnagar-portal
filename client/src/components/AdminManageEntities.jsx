import { useState, useEffect } from "react";
import API from "../api";
import AdminPlaceEditModal from "./AdminPlaceEditModal";
import AdminCommunityPlaces from "./AdminCommunityPlaces";
import {
  Building2,
  GraduationCap,
  Stethoscope,
  Plus,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  Search,
  ExternalLink,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  Filter,
} from "lucide-react";

export default function AdminManageEntities({ token, onStatsChange }) {
  const [subSection, setSubSection] = useState("official"); // "official" | "community"
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState("");

  // Edit / Add Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);

  // Delete Confirm Modal
  const [deleteConfirmPlace, setDeleteConfirmPlace] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
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
        showToast("Error loading places directory.");
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
        showToast(`Restored "${place.name}" to active directory.`);
      } else {
        await API.patch(
          `/places/${place._id || place.id}/archive`,
          { reason: "Archived via admin management console" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast(`Archived "${place.name}". It is now hidden from public map.`);
      }
      fetchPlaces();
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Archive toggle error:", err);
      showToast(err.response?.data?.message || "Failed to toggle archive status.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmPlace) return;
    setIsDeleting(true);
    try {
      await API.delete(`/places/${deleteConfirmPlace._id || deleteConfirmPlace.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(`Permanently deleted "${deleteConfirmPlace.name}".`);
      setDeleteConfirmPlace(null);
      fetchPlaces();
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Delete place error:", err);
      showToast(err.response?.data?.message || "Failed to delete establishment.");
    } finally {
      setIsDeleting(false);
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

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18232E] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs border border-slate-700 animate-slide-down">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#18232E] text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              Directory Administration
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#18232E] tracking-tight">
            Manage All Town Entities
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Retained official institutions (Schools, Colleges, Hospitals) & community citizen submissions.
          </p>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubSection("official")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subSection === "official"
                ? "bg-[#18232E] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Official Institutions ({places.length})</span>
          </button>

          <button
            onClick={() => setSubSection("community")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subSection === "community"
                ? "bg-[#0D5E49] text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Community Submissions Queue</span>
          </button>
        </div>
      </div>

      {subSection === "community" ? (
        <AdminCommunityPlaces token={token} onStatsChange={onStatsChange} />
      ) : (
        <>
          {/* Stat Summary Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Entities</span>
              <h3 className="text-lg font-black text-slate-800">{places.length} Places</h3>
              <span className="text-[11px] text-emerald-600 font-semibold">In active database</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Schools & Colleges</span>
              <h3 className="text-lg font-black text-blue-700">{schoolsCount}</h3>
              <span className="text-[11px] text-slate-500">Official institutions</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Hospitals & Clinics</span>
              <h3 className="text-lg font-black text-emerald-700">{hospitalsCount}</h3>
              <span className="text-[11px] text-slate-500">Medical facilities</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-400">Archived Records</span>
              <h3 className="text-lg font-black text-amber-700">{archivedCount}</h3>
              <span className="text-[11px] text-slate-500">Hidden from public map</span>
            </div>
          </div>

          {/* Controls Bar: Search, Category Filter, Status Filter, Create New Entity */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, address, or slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-[#18232E] focus:bg-white"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-medium cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Schools & Colleges">Schools & Colleges</option>
                <option value="Hospitals & Clinics">Hospitals & Clinics</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none font-medium cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={fetchPlaces}
                disabled={loading}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                title="Refresh Table"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                onClick={() => {
                  setSelectedPlace(null);
                  setEditModalOpen(true);
                }}
                className="bg-[#0D5E49] hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create New Entity</span>
              </button>
            </div>
          </div>

          {/* Table of Entities */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#18232E]" />
                <span className="text-xs font-semibold">Loading directory entities from MongoDB...</span>
              </div>
            ) : filteredPlaces.length === 0 ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <Building2 className="w-8 h-8 text-slate-300" />
                <span className="text-sm font-bold text-slate-600">No matching entities found</span>
                <span className="text-xs text-slate-400">Try adjusting your search query or filters.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="py-3 px-4">Entity / Image</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Address & Area</th>
                      <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Last Updated</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPlaces.map((place) => {
                      const isSchool = place.category === "Schools & Colleges";
                      const lat = place.latitude ? Number(place.latitude).toFixed(6) : "None";
                      const lng = place.longitude ? Number(place.longitude).toFixed(6) : "None";
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;

                      return (
                        <tr key={place._id || place.id} className="hover:bg-slate-50/80 transition">
                          {/* Entity Name & Image */}
                          <td className="py-3 px-4">
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
                                    {isSchool ? <GraduationCap className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-900 truncate max-w-xs sm:max-w-sm">
                                  {place.name}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono block truncate">
                                  slug: {place.slug}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                isSchool
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              {isSchool ? <GraduationCap className="w-3 h-3" /> : <Stethoscope className="w-3 h-3" />}
                              <span>{place.category}</span>
                            </span>
                          </td>

                          {/* Address */}
                          <td className="py-3 px-4 max-w-xs">
                            <div className="text-slate-800 font-medium truncate" title={place.addressFull}>
                              {place.addressFull}
                            </div>
                            <span className="text-[10px] text-slate-400 font-semibold block">
                              Locality: {place.locality || "Town Center"}
                            </span>
                          </td>

                          {/* Coordinates */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-[#B8323C] shrink-0" />
                              <span>{lat}, {lng}</span>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-blue-600 transition"
                                title="Open in Google Maps"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {place.isArchived ? (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                Archived
                              </span>
                            ) : place.isPublished ? (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-max">
                                <CheckCircle className="w-2.5 h-2.5" /> Published
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                In Review
                              </span>
                            )}
                          </td>

                          {/* Last Updated */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                            {place.updatedAt
                              ? new Date(place.updatedAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Canonical Seed"}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit details and interactive map pin */}
                              <button
                                onClick={() => {
                                  setSelectedPlace(place);
                                  setEditModalOpen(true);
                                }}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer"
                                title="Edit details, coordinates on map & photos"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Archive / Restore */}
                              <button
                                onClick={() => handleArchiveToggle(place)}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  place.isArchived
                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-700"
                                }`}
                                title={place.isArchived ? "Restore to Directory" : "Archive from Directory"}
                              >
                                {place.isArchived ? (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                ) : (
                                  <Archive className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => setDeleteConfirmPlace(place)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition cursor-pointer"
                                title="Delete place"
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
            )}
          </div>
        </>
      )}

      {/* Edit / Add Modal */}
      <AdminPlaceEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedPlace(null);
        }}
        place={selectedPlace}
        onSave={(savedPlace) => {
          setEditModalOpen(false);
          setSelectedPlace(null);
          showToast(`Place "${savedPlace.name}" saved successfully to database!`);
          fetchPlaces();
          if (onStatsChange) onStatsChange();
        }}
        onDelete={(deletedId) => {
          setEditModalOpen(false);
          setSelectedPlace(null);
          showToast("Place removed from directory.");
          fetchPlaces();
          if (onStatsChange) onStatsChange();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmPlace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Confirm Deletion</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete <strong>{deleteConfirmPlace.name}</strong>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlace(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
