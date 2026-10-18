import { useState, useEffect, useMemo } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import { clearCMSCache } from "../services/cmsService";
import PageHeader from "./admin/PageHeader";
import StatusBadge from "./admin/StatusBadge";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import ImageUploader from "./admin/ImageUploader";
import MediaPicker from "./admin/MediaPicker";
import {
  Store,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Eye,
  EyeOff,
  CheckCircle2,
  Phone,
  Navigation,
  MapPin,
  Search,
  ExternalLink,
  Sliders,
  X,
  Save,
  Check,
  ImageIcon,
} from "lucide-react";

const CATEGORY_PRESETS = [
  { value: "healthcare", label: "🏥 Healthcare", name: "Healthcare" },
  { value: "sweets", label: "🍬 Sweets & Chaat", name: "Sweets & Chaat" },
  { value: "schools", label: "🏫 Schools & Colleges", name: "Schools & Colleges" },
  { value: "fuel", label: "⛽ Fuel Stations", name: "Fuel Stations" },
  { value: "markets", label: "🥦 Sabzi & Mandi", name: "Sabzi & Mandi" },
  { value: "emergency", label: "🚨 Emergency & Aid", name: "Emergency & Aid" },
  { value: "transport", label: "🚌 Bus & Travel", name: "Bus & Travel" },
  { value: "admin", label: "🏛️ Govt & Civic", name: "Govt & Civic" },
  { value: "shops", label: "🛍️ Local Shops", name: "Local Shops" },
  { value: "other", label: "📍 Civic Index", name: "Other" },
];

export default function AdminCivicDirectoryCMS({ onStatsChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Filter state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "hidden"

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formCategory, setFormCategory] = useState("healthcare");
  const [formCategoryLabel, setFormCategoryLabel] = useState("🏥 Healthcare");
  const [formPhone, setFormPhone] = useState("");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formDirectionsUrl, setFormDirectionsUrl] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formVerified, setFormVerified] = useState(true);
  const [formIsActive, setFormIsActive] = useState(true);
  const [formDisplayOrder, setFormDisplayOrder] = useState(1);

  // Upload & Media Picker state
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Delete Dialog
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDirectory();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const fetchDirectory = async (triggerStatsChange = false) => {
    setLoading(true);
    try {
      const res = await API.get("/civic-directory?all=true");
      const list = res.data?.items || (Array.isArray(res.data) ? res.data : []);
      const sorted = [...list].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
      setItems(sorted);
      if (triggerStatsChange && onStatsChange) onStatsChange();
    } catch (err) {
      console.warn("Failed to fetch civic directory index:", err);
      showToast("Could not load civic directory index.", "error");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormCategory("healthcare");
    setFormCategoryLabel("🏥 Healthcare");
    setFormPhone("");
    setFormLat("26.6827");
    setFormLng("84.0498");
    setFormDirectionsUrl("");
    setFormImage("");
    setFormVerified(true);
    setFormIsActive(true);
    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.displayOrder || 0)) + 1 : 1;
    setFormDisplayOrder(nextOrder);
    setPreviewUrl("");
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError("");
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormTitle(item.title || "");
    setFormSubtitle(item.subtitle || "");
    setFormCategory(item.category || "healthcare");
    setFormCategoryLabel(item.categoryLabel || "📍 Civic");
    setFormPhone(item.phone || "");
    setFormLat(item.lat !== null && item.lat !== undefined ? String(item.lat) : "");
    setFormLng(item.lng !== null && item.lng !== undefined ? String(item.lng) : "");
    setFormDirectionsUrl(item.directionsUrl || "");
    setFormImage(item.image || "");
    setPreviewUrl(item.image || "");
    setFormVerified(item.verified !== false);
    setFormIsActive(item.isActive !== false);
    setFormDisplayOrder(item.displayOrder !== undefined ? item.displayOrder : 1);
    setUploadStatus(item.image ? "success" : "idle");
    setUploadProgress(0);
    setUploadError("");
    setModalOpen(true);
  };

  const handleCategoryPresetChange = (presetValue) => {
    setFormCategory(presetValue);
    const found = CATEGORY_PRESETS.find((p) => p.value === presetValue);
    if (found) {
      setFormCategoryLabel(found.label);
    }
  };

  const handleUploadImage = async (fileToUpload) => {
    if (!fileToUpload) return;
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError("");
    const token = getAuthToken();

    const formData = new FormData();
    formData.append("image", fileToUpload);

    try {
      const res = await API.post("/media/upload", formData, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      const uploadedUrl = res.data?.mediaItem?.url || res.data?.url;
      if (uploadedUrl) {
        setFormImage(uploadedUrl);
        setPreviewUrl(uploadedUrl);
        setUploadStatus("success");
        showToast("Image uploaded successfully!");
      } else {
        throw new Error("No URL returned from upload");
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      setUploadStatus("error");
      setUploadError(err.response?.data?.message || err.message || "Failed to upload image");
      showToast("Upload failed: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const handleSelectMedia = (selectedMedia) => {
    const url = typeof selectedMedia === "string" ? selectedMedia : (selectedMedia?.url || selectedMedia?.secure_url);
    if (url) {
      setFormImage(url);
      setPreviewUrl(url);
      setUploadStatus("success");
      setUploadError("");
      setMediaPickerOpen(false);
      showToast("Selected image from Media Library.");
    }
  };

  const handleSaveListing = async (e) => {
    if (e) e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Please enter listing name/title.", "error");
      return;
    }

    setSubmitting(true);
    const token = getAuthToken();

    const payload = {
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      category: formCategory.trim(),
      categoryLabel: formCategoryLabel.trim(),
      phone: formPhone.trim(),
      lat: formLat ? parseFloat(formLat) : null,
      lng: formLng ? parseFloat(formLng) : null,
      directionsUrl: formDirectionsUrl.trim(),
      image: formImage.trim(),
      verified: formVerified,
      isActive: formIsActive,
      displayOrder: Number(formDisplayOrder) || 1,
    };

    try {
      if (editingItem) {
        const id = editingItem._id || editingItem.id || editingItem.itemId;
        await API.put(`/civic-directory/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast(`Listing "${payload.title}" updated successfully!`);
      } else {
        await API.post("/civic-directory", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        showToast(`New listing "${payload.title}" added to index!`);
      }

      clearCMSCache("civicDirectory");
      clearCMSCache();
      setModalOpen(false);
      fetchDirectory(true);
    } catch (err) {
      console.error("Save listing error:", err);
      showToast("Failed to save listing: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item) => {
    const token = getAuthToken();
    const id = item._id || item.id || item.itemId;
    try {
      const res = await API.patch(
        `/civic-directory/${id}/toggle-active`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(res.data?.message || `Listing visibility updated.`);
      clearCMSCache("civicDirectory");
      clearCMSCache();
      fetchDirectory(true);
    } catch (err) {
      console.error("Toggle active error:", err);
      showToast("Failed to toggle visibility.", "error");
    }
  };

  const handleMoveOrder = async (item, direction) => {
    const currentIndex = items.findIndex((i) => (i._id || i.id || i.itemId) === (item._id || item.id || item.itemId));
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const reordered = [...items];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    // Re-assign displayOrder sequentially
    const payloadItems = reordered.map((it, idx) => ({
      id: it._id || it.id || it.itemId,
      displayOrder: idx + 1,
    }));

    // Optimistic update
    setItems(reordered.map((it, idx) => ({ ...it, displayOrder: idx + 1 })));

    const token = getAuthToken();
    try {
      await API.patch(
        "/civic-directory/reorder",
        { items: payloadItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      clearCMSCache("civicDirectory");
      clearCMSCache();
      showToast(`Reordered "${item.title}" successfully.`);
    } catch (err) {
      console.error("Reorder failed:", err);
      showToast("Failed to save reordered positions.", "error");
      fetchDirectory();
    }
  };

  const handleDeleteListing = async () => {
    if (!deleteItemId) return;
    setDeleting(true);
    const token = getAuthToken();
    try {
      await API.delete(`/civic-directory/${deleteItemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Listing deleted from Civic Directory Index.");
      clearCMSCache("civicDirectory");
      clearCMSCache();
      setDeleteItemId(null);
      fetchDirectory(true);
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Failed to delete listing: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setDeleting(false);
    }
  };

  // Memoized filter listings
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }
      if (statusFilter === "active" && item.isActive === false) return false;
      if (statusFilter === "hidden" && item.isActive !== false) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchSub = (item.subtitle || "").toLowerCase().includes(q);
        const matchCat = (item.categoryLabel || "").toLowerCase().includes(q);
        const matchPhone = (item.phone || "").toLowerCase().includes(q);
        return matchTitle || matchSub || matchCat || matchPhone;
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, search]);

  const { activeCount, hiddenCount } = useMemo(() => {
    let active = 0;
    for (const i of items) {
      if (i.isActive !== false) active++;
    }
    return { activeCount: active, hiddenCount: items.length - active };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.message && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}

      {/* Header */}
      <PageHeader
        title="Civic Directory Index"
        subtitle="Manage verified directory listings featured on the homepage carousel. Add, edit, delete, reorder, or toggle live visibility."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDirectory}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition border border-slate-200"
              title="Refresh listings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Listing</span>
            </button>
          </div>
        }
      />

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Listings</span>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">{items.length}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live on Carousel</span>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">{activeCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Hidden / Draft</span>
          <div className="text-xl font-extrabold text-amber-700 mt-0.5">{hiddenCount}</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Verified Badges</span>
          <div className="text-xl font-extrabold text-blue-700 mt-0.5">
            {items.filter((i) => i.verified !== false).length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-2xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings by title, phone, or landmark..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Categories</option>
            {CATEGORY_PRESETS.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>
      </div>

      {/* Listings Cards / Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-xs text-slate-500">Loading civic directory listings...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No Directory Listings Found"
          description={
            search || categoryFilter !== "all" || statusFilter !== "all"
              ? "No listings match your current filters. Try resetting search or category."
              : "No listings in the Civic Directory Index yet. Click 'Add Listing' to create your first one."
          }
          action={
            <button
              onClick={openCreateModal}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Listing</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item, index) => {
            const isFirst = index === 0;
            const isLast = index === filteredItems.length - 1;
            const isActive = item.isActive !== false;
            const isVerified = item.verified !== false;

            return (
              <div
                key={item._id || item.id || item.itemId || index}
                className={`bg-white rounded-2xl border p-4 shadow-2xs transition hover:shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  !isActive ? "border-slate-200/60 bg-slate-50/60 opacity-80" : "border-slate-200"
                }`}
              >
                {/* Left: Reorder controls + Thumbnail + Info */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0 w-full md:w-auto">
                  {/* Order & Up/Down Arrows */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveOrder(item, "up")}
                      className={`p-1 rounded-md transition ${
                        isFirst
                          ? "text-slate-200 cursor-not-allowed"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      title="Move up in carousel"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-black text-slate-600 tabular-nums my-0.5">
                      #{item.displayOrder || index + 1}
                    </span>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveOrder(item, "down")}
                      className={`p-1 rounded-md transition ${
                        isLast
                          ? "text-slate-200 cursor-not-allowed"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      title="Move down in carousel"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="relative w-24 h-16 sm:w-28 sm:h-18 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <span className="absolute top-1 left-1 bg-slate-950/80 backdrop-blur-xs text-white text-[9px] font-semibold px-1.5 py-0.5 rounded">
                      {item.categoryLabel || item.category}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.title}</h4>
                      {isVerified ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full"
                          title="Verified Badge Active"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded-full">
                          Unverified
                        </span>
                      )}

                      {!isActive && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full">
                          Hidden
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                      <span>{item.subtitle || "Fazilnagar"}</span>
                    </p>

                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600 flex-wrap">
                      {item.phone && (
                        <span className="inline-flex items-center gap-1 font-medium">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{item.phone}</span>
                        </span>
                      )}

                      {item.lat && item.lng && (
                        <span className="inline-flex items-center gap-1 font-mono text-slate-500 text-[10px]">
                          <Navigation className="w-3 h-3 text-blue-500" />
                          <span>
                            {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                          </span>
                        </span>
                      )}

                      {item.directionsUrl && (
                        <a
                          href={item.directionsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-0.5 text-[10px]"
                        >
                          <span>Custom Maps Link</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-end">
                  {/* Hide/Show toggle button */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                      isActive
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                        : "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200"
                    }`}
                    title={isActive ? "Click to hide from homepage" : "Click to show on homepage"}
                  >
                    {isActive ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Live</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition border border-slate-200"
                    title="Edit listing details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => setDeleteItemId(item._id || item.id || item.itemId)}
                    className="p-2 rounded-xl text-slate-600 hover:text-red-600 hover:bg-red-50 transition border border-slate-200"
                    title="Delete listing"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Listing Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingItem ? "Edit Directory Listing" : "Add Civic Directory Listing"}
                  </h3>
                  <p className="text-xs text-slate-500">Configure public card for the homepage snap carousel.</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveListing} className="p-6 space-y-5">
              {/* Name & Subtitle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Listing Name / Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. CHC Fazilnagar"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Address / Subtitle (Location Pin)
                  </label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    placeholder="e.g. Hospital Road, Main Market NH-27"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Category & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category Preset</label>
                  <select
                    value={formCategory}
                    onChange={(e) => handleCategoryPresetChange(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {CATEGORY_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Card Badge Label (Shown on Image)
                  </label>
                  <input
                    type="text"
                    value={formCategoryLabel}
                    onChange={(e) => setFormCategoryLabel(e.target.value)}
                    placeholder="e.g. 🏥 Healthcare"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Image Upload / Replacement */}
              <div className="border-t border-slate-100 pt-4">
                <ImageUploader
                  value={formImage}
                  previewUrl={previewUrl || formImage}
                  uploadStatus={uploadStatus}
                  uploadProgress={uploadProgress}
                  errorMessage={uploadError}
                  onFileSelect={handleUploadImage}
                  onRetry={() => {}}
                  onClear={() => {
                    setFormImage("");
                    setPreviewUrl("");
                    setUploadStatus("idle");
                    setUploadError("");
                  }}
                  onChange={(url) => {
                    setFormImage(url);
                    setPreviewUrl(url);
                    setUploadStatus(url ? "success" : "idle");
                    setUploadError("");
                  }}
                  onOpenMediaPicker={() => setMediaPickerOpen(true)}
                  label="Card Photo / Image"
                  helpText="Upload a photo (JPG, PNG, WebP max 10MB) or choose from Media Library"
                  aspectRatio="video"
                  disabled={submitting || uploadStatus === "uploading"}
                />
              </div>

              {/* Phone & Call Button */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number (Triggers "Call" button on public card)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 05564222102 or +91 9450812345"
                    className="w-full text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Coordinates & Directions Link */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-blue-600" />
                    <span>GPS Coordinates & Directions Routing</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormLat("26.6827");
                      setFormLng("84.0498");
                      showToast("Loaded Fazilnagar Town Center coordinates.");
                    }}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Town Center Default
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-medium text-slate-600 mb-1 block">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                      placeholder="e.g. 26.6808"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-slate-600 mb-1 block">Longitude</span>
                    <input
                      type="number"
                      step="any"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                      placeholder="e.g. 84.0472"
                      className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-600 mb-1 block">
                    Optional Custom Directions / Google Maps URL Override
                  </span>
                  <input
                    type="url"
                    value={formDirectionsUrl}
                    onChange={(e) => setFormDirectionsUrl(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Badges & Settings: Verified, Visible, Display Order */}
              <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Verified Toggle */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formVerified}
                    onChange={(e) => setFormVerified(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Verification Badge (✔)</span>
                    <span className="text-[10px] text-slate-500 block">Show green checkmark on card</span>
                  </div>
                </label>

                {/* Active Toggle */}
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Active on Homepage</span>
                    <span className="text-[10px] text-slate-500 block">Show in public snap carousel</span>
                  </div>
                </label>

                {/* Display Order */}
                <div className="p-3 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-900 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="1"
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{editingItem ? "Update Listing" : "Create Listing"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {mediaPickerOpen && (
        <MediaPicker
          isOpen={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelect={handleSelectMedia}
          title="Select Directory Listing Image"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteItemId)}
        title="Delete Listing from Index"
        message="Are you sure you want to permanently remove this listing from the Civic Directory Index? It will no longer appear on the homepage carousel."
        confirmText={deleting ? "Deleting..." : "Delete Listing"}
        confirmVariant="danger"
        onConfirm={handleDeleteListing}
        onCancel={() => setDeleteItemId(null)}
      />
    </div>
  );
}
