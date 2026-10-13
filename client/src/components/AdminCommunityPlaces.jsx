import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import API from "../api";
import {
  FAZILNAGAR_AREAS,
  COMMUNITY_ALLOWED_CATEGORIES,
  REVIEW_FLAG_AREAS,
  isWithinTownBoundary,
} from "../constants/areas";
import {
  Store,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  Trash2,
  Archive,
  RotateCcw,
  Search,
  ExternalLink,
  Phone,
  User,
  Compass,
  Check,
  X,
  ShieldAlert,
} from "lucide-react";

export default function AdminCommunityPlaces({ token, onStatsChange }) {
  const [subTab, setSubTab] = useState("pending"); // "pending" | "approved" | "rejected" | "archived"
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");

  // Edit location / fields modal
  const [editingItem, setEditingItem] = useState(null);
  const [editCategory, setEditCategory] = useState("");
  const [editLocality, setEditLocality] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");

  // Reject reason modal
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("Inaccurate location or duplicate entry.");

  // Image lightbox
  const [previewImage, setPreviewImage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const fetchCommunitySubmissions = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/submissions/places/admin?status=${subTab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Fetch community submissions error:", err);
      showToast("Failed to fetch community submissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunitySubmissions();
  }, [subTab]);

  const handleReviewAction = async (id, action, extraPayload = {}) => {
    setActionLoadingId(id);
    try {
      const res = await API.patch(
        `/submissions/places/admin/${id}/review`,
        { action, ...extraPayload },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      showToast(res.data?.message || `Submission marked as ${action}.`);
      setRejectingItem(null);
      setEditingItem(null);
      fetchCommunitySubmissions();
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Action error:", err);
      showToast(err.response?.data?.message || "Failed to execute review action.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveEditLocation = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    await handleReviewAction(editingItem._id, "editFields", {
      editedLocation: {
        category: editCategory,
        locality: editLocality,
        addressFull: editAddress,
        latitude: parseFloat(editLat),
        longitude: parseFloat(editLng),
      },
    });
  };

  const filteredItems = submissions.filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.trim().toLowerCase();
    return (
      item.name?.toLowerCase().includes(q) ||
      item.referenceId?.toLowerCase().includes(q) ||
      item.phone?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.locality?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18232E] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold border border-slate-700 animate-in fade-in">
          {toastMessage}
        </div>
      )}

      {/* Sub-tabs header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: "pending", label: "Pending Verification", icon: Clock },
            { id: "approved", label: "Approved (Public)", icon: CheckCircle },
            { id: "rejected", label: "Rejected", icon: XCircle },
            { id: "archived", label: "Archived Places", icon: Archive },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#18232E] text-white shadow-xs"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search filter */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, ref, or phone..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-[#B8323C] focus:bg-white"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-xs font-bold text-slate-500">
          Loading community submissions...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-1">
          <Store className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">No {subTab} community submissions</h4>
          <p className="text-xs text-slate-500">
            {subTab === "pending"
              ? "All community-submitted places have been reviewed."
              : `There are currently no places in the ${subTab} list.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <SubmissionCard
              key={item._id}
              item={item}
              actionLoadingId={actionLoadingId}
              onApprove={() => handleReviewAction(item._id, "approve")}
              onReject={() => {
                setRejectingItem(item);
                setRejectReason("Inaccurate location or duplicate entry.");
              }}
              onArchive={() => handleReviewAction(item._id, "archive")}
              onRestore={() => handleReviewAction(item._id, "restore")}
              onEdit={() => {
                setEditingItem(item);
                setEditCategory(item.category || "");
                setEditLocality(item.locality || "");
                setEditAddress(item.addressFull || "");
                setEditLat(item.latitude?.toString() || "");
                setEditLng(item.longitude?.toString() || "");
              }}
              onPreviewImage={(url) => setPreviewImage(url)}
            />
          ))}
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Reject Community Place Submission
            </h3>
            <p className="text-xs text-slate-600">
              Please specify the reason for rejecting <strong>{rejectingItem.name}</strong>. This reason will be logged in the moderation audit record.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Pin is outside Fazilnagar town boundary; duplicate shop listing; incomplete storefront photo."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs outline-none focus:border-red-500 font-medium resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleReviewAction(rejectingItem._id, "reject", {
                    rejectionReason: rejectReason,
                  })
                }
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details & Location Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEditLocation}
            className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-slate-200 p-5 space-y-3.5 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Edit & Correct Location: {editingItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                >
                  {COMMUNITY_ALLOWED_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ward / Locality</label>
                <select
                  value={editLocality}
                  onChange={(e) => setEditLocality(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                >
                  {FAZILNAGAR_AREAS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Full Address</label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-medium"
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-1.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl font-bold text-white bg-[#0D5E49] hover:bg-emerald-800 cursor-pointer"
              >
                Save Corrections
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Image Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm cursor-zoom-out"
        >
          <img
            src={previewImage}
            alt="Fullscreen preview"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

// Individual Submission Card with Mini Leaflet Pin Map
function SubmissionCard({
  item,
  actionLoadingId,
  onApprove,
  onReject,
  onArchive,
  onRestore,
  onEdit,
  onPreviewImage,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const lat = item.latitude;
    const lng = item.longitude;
    if (!lat || !lng) return;

    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 16,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const markerIcon = L.divIcon({
        html: `
          <div style="display:flex;align-items:center;justify-content:center;width:28px;height:36px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.4));">
            <svg viewBox="0 0 24 24" width="28" height="36" fill="#B8323C" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="3" fill="#ffffff" />
            </svg>
          </div>
        `,
        iconSize: [28, 36],
        iconAnchor: [14, 36],
      });

      L.marker([lat, lng], { icon: markerIcon }).addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [item.latitude, item.longitude]);

  const isLoading = actionLoadingId === item._id;
  const isInsideBoundary = isWithinTownBoundary(item.latitude, item.longitude);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden text-xs">
      {/* Top Banner with Reference ID & Badges */}
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-[#B8323C] bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]">
            {item.referenceId || "REF-LEGACY"}
          </span>
          <span className="font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded-md text-[11px]">
            {item.category}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Submitted: {new Date(item.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {item.status === "pending" && (
            <span className="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
              Pending Review
            </span>
          )}
          {item.status === "approved" && (
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
              ✓ Approved & Published
            </span>
          )}
          {item.status === "rejected" && (
            <span className="bg-red-100 text-red-800 border border-red-300 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
              ✕ Rejected
            </span>
          )}
          {item.status === "archived" && (
            <span className="bg-slate-200 text-slate-800 border border-slate-300 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
              Archived
            </span>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left Column: Details */}
        <div className="md:col-span-2 space-y-2.5">
          <div>
            <h3 className="text-base font-bold text-slate-900">{item.name}</h3>
            <p className="text-slate-600 mt-0.5">{item.addressFull}</p>
            {item.streetOrLandmark && (
              <p className="text-slate-500 text-[11px]">Landmark: {item.streetOrLandmark}</p>
            )}
          </div>

          {/* Warning Badges */}
          {item.duplicateWarning && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Duplicate Warning:</strong> {item.duplicateWarning}
              </span>
            </div>
          )}

          {!isInsideBoundary && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-2.5 rounded-xl text-[11px] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>
                <strong>Boundary Alert:</strong> Coordinates lie outside Fazilnagar town core sector. Verify if this establishment is on outer borders.
              </span>
            </div>
          )}

          {/* Key metadata grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px]">
            <div>
              <span className="text-slate-400 block">Locality</span>
              <span className="font-bold text-slate-800">{item.locality}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Owner / Contact</span>
              <span className="font-semibold text-slate-800">{item.ownerName || "Not specified"}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Primary Mobile</span>
              <span className="font-mono font-bold text-slate-900">{item.phone}</span>
            </div>
            {item.alternatePhone && (
              <div>
                <span className="text-slate-400 block">Alt Phone</span>
                <span className="font-mono text-slate-700">{item.alternatePhone}</span>
              </div>
            )}
            {item.whatsapp && (
              <div>
                <span className="text-slate-400 block">WhatsApp</span>
                <span className="font-mono text-slate-700">{item.whatsapp}</span>
              </div>
            )}
            {item.openingHours && (
              <div>
                <span className="text-slate-400 block">Hours</span>
                <span className="text-slate-700">{item.openingHours}</span>
              </div>
            )}
          </div>

          {item.description && (
            <p className="text-slate-700 text-[11px] bg-white p-2 rounded-lg border border-slate-100">
              "{item.description}"
            </p>
          )}

          {/* Photos Row */}
          <div>
            <span className="font-bold text-slate-800 text-[11px] block mb-1">
              Storefront & Gallery Photos:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {item.primaryImage && (
                <div
                  onClick={() => onPreviewImage(item.primaryImage)}
                  className="relative w-20 h-16 rounded-lg overflow-hidden border-2 border-emerald-500 shrink-0 cursor-zoom-in group"
                >
                  <img
                    src={item.primaryImage}
                    alt="Storefront Primary"
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                  <span className="absolute bottom-0 inset-x-0 bg-emerald-700/90 text-white text-[8px] font-bold text-center py-0.5">
                    Primary
                  </span>
                </div>
              )}

              {Array.isArray(item.images) &&
                item.images.map((imgUrl, i) => (
                  <div
                    key={i}
                    onClick={() => onPreviewImage(imgUrl)}
                    className="relative w-20 h-16 rounded-lg overflow-hidden border border-slate-200 shrink-0 cursor-zoom-in group"
                  >
                    <img
                      src={imgUrl}
                      alt={`Gallery ${i}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column: Mini Interactive Map & Coordinates */}
        <div className="space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#B8323C]" />
                Selected Pin Location
              </span>
              <span className="font-mono text-[10px] text-slate-500">
                {item.latitude?.toFixed(5)}, {item.longitude?.toFixed(5)}
              </span>
            </div>

            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
              <div ref={mapContainerRef} className="w-full h-full z-10" />
            </div>
          </div>

          {/* Review Trail Info */}
          {item.reviewedBy && (
            <div className="bg-slate-50 p-2 rounded-lg text-[10px] text-slate-500 border border-slate-100">
              Reviewed by <strong>{item.reviewedBy}</strong> on{" "}
              {new Date(item.reviewedAt).toLocaleDateString()}
              {item.rejectionReason && (
                <div className="text-red-700 mt-0.5">
                  <strong>Reason:</strong> {item.rejectionReason}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
            {item.status === "pending" && (
              <>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onApprove}
                  className="bg-[#0D5E49] hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Publish</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onReject}
                  className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Reject
                </button>

                <button
                  type="button"
                  onClick={onEdit}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Location</span>
                </button>
              </>
            )}

            {item.status === "approved" && (
              <>
                <button
                  type="button"
                  onClick={onEdit}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Correct Details</span>
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={onArchive}
                  className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Listing</span>
                </button>
              </>
            )}

            {(item.status === "archived" || item.status === "rejected") && (
              <button
                type="button"
                disabled={isLoading}
                onClick={onRestore}
                className="bg-emerald-50 hover:bg-emerald-100 text-[#0D5E49] border border-emerald-300 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore to Pending</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
