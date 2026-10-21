import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import { clearCMSCache } from "../services/cmsService";
import { resolveMediaUrl } from "../utils/mediaUtils";
import PageHeader from "./admin/PageHeader";
import FormSection from "./admin/FormSection";
import ImageUploader from "./admin/ImageUploader";
import MediaPicker from "./admin/MediaPicker";
import StatusBadge from "./admin/StatusBadge";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import {
  Layers,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Upload,
  X,
  Save,
  Play,
  Sliders,
  Image as ImageIcon,
} from "lucide-react";

export default function AdminHeroCMS() {
  const [slides, setSlides] = useState([]);
  const [heroSettings, setHeroSettings] = useState({
    animationSpeed: 5000,
    animationDirection: "left",
    enableAutoplay: true,
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("/directory");
  const [formButtonText, setFormButtonText] = useState("Explore Now");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Upload state handling: "idle" | "uploading" | "success" | "error"
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Media Picker state
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Delete dialog
  const [deleteSlideId, setDeleteSlideId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await API.get("/settings");
      if (res.data?.success && res.data?.settings) {
        const hs = res.data.settings.heroSettings || {};
        setHeroSettings({
          animationSpeed: hs.animationSpeed || 5000,
          animationDirection: hs.animationDirection || "left",
          enableAutoplay: hs.enableAutoplay !== false,
        });
        const rawSlides = hs.slides || [];
        setSlides(
          rawSlides.map((s) => ({
            ...s,
            imageUrl: resolveMediaUrl(s.imageUrl || s.src),
          }))
        );
      }
    } catch (err) {
      console.warn("Failed to fetch hero settings:", err);
      showToast("Could not load hero carousel settings.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleSaveHeroControls = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    const token = getAuthToken();
    try {
      await API.put(
        "/settings",
        {
          heroSettings: {
            ...heroSettings,
            slides,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      clearCMSCache("settings");
      clearCMSCache();
      showToast("Hero carousel playback and animation controls saved!");
    } catch (err) {
      console.error("Save hero controls error:", err);
      showToast("Failed to save controls: " + err.message, "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const openCreateModal = () => {
    setEditingSlide(null);
    setFormTitle("");
    setFormSubtitle("");
    setFormCaption("");
    setFormImageUrl("");
    setFormLinkUrl("/directory");
    setFormButtonText("Explore Now");
    setFormIsActive(true);
    setPreviewUrl("");
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError("");
    setSelectedFile(null);
    setModalOpen(true);
  };

  const openEditModal = (slide) => {
    setEditingSlide(slide);
    setFormTitle(slide.title || "");
    setFormSubtitle(slide.subtitle || "");
    setFormCaption(slide.caption || "");
    const resolvedUrl = resolveMediaUrl(slide.imageUrl || "");
    setFormImageUrl(resolvedUrl);
    setPreviewUrl(resolvedUrl);
    setFormLinkUrl(slide.linkUrl || "/directory");
    setFormButtonText(slide.buttonText || "Explore Now");
    setFormIsActive(slide.isActive !== false);
    setUploadStatus(resolvedUrl ? "success" : "idle");
    setUploadProgress(0);
    setUploadError("");
    setSelectedFile(null);
    setModalOpen(true);
  };

  const uploadImageFile = async (fileToUpload) => {
    if (!fileToUpload) return;
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError("");
    const token = getAuthToken();

    const formData = new FormData();
    // Use exact field name "image" expected by backend
    formData.append("image", fileToUpload);

    try {
      const res = await API.post("/media/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Let browser generate multipart boundary automatically
        },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      const permanentUrl = res.data?.url || res.data?.media?.url;
      if (!permanentUrl) {
        throw new Error("Server succeeded but did not return a permanent image URL.");
      }

      setFormImageUrl(permanentUrl);
      setPreviewUrl(permanentUrl);
      setUploadStatus("success");
      setUploadProgress(100);
      showToast("Slide image uploaded to cloud vault successfully!");
    } catch (err) {
      console.error("Hero slide upload error:", err);
      const msg = err.response?.data?.message || err.message || "Upload failed";
      setUploadStatus("error");
      setUploadError(msg);
      // Keep formImageUrl empty so blob is never saved
      setFormImageUrl("");
      showToast("Failed to upload image: " + msg, "error");
    }
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setSelectedFile(file);
    // Show temporary local preview
    const tempBlob = URL.createObjectURL(file);
    setPreviewUrl(tempBlob);
    // Never persist blob URL to formImageUrl
    setFormImageUrl("");
    uploadImageFile(file);
  };

  const handleClearImage = () => {
    setFormImageUrl("");
    setPreviewUrl("");
    setUploadStatus("idle");
    setUploadProgress(0);
    setUploadError("");
    setSelectedFile(null);
  };

  const handleSaveSlide = async (e) => {
    e.preventDefault();
    if (uploadStatus === "uploading") {
      showToast("Please wait for the image upload to complete before saving.", "error");
      return;
    }
    if (!formImageUrl.trim()) {
      showToast("Slide background image is required. Please upload or choose a photo.", "error");
      return;
    }
    if (formImageUrl.startsWith("blob:") || formImageUrl.startsWith("data:")) {
      showToast("Local temporary blob or data URLs cannot be saved. Please provide a web image URL or select from Media Library.", "error");
      return;
    }

    setFormSubmitting(true);
    const token = getAuthToken();
    const normalizedImageUrl = resolveMediaUrl(formImageUrl.trim());
    const mapSlides = (arr) => (arr || []).map((s) => ({ ...s, imageUrl: resolveMediaUrl(s.imageUrl || s.src) }));
    try {
      if (editingSlide && editingSlide._id) {
        const res = await API.put(
          `/settings/hero-slides/${editingSlide._id}`,
          {
            title: formTitle,
            subtitle: formSubtitle,
            caption: formCaption,
            imageUrl: normalizedImageUrl,
            linkUrl: formLinkUrl,
            buttonText: formButtonText,
            isActive: formIsActive,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.slides) setSlides(mapSlides(res.data.slides));
        clearCMSCache("settings");
        clearCMSCache();
        showToast("Hero slide updated successfully!");
      } else {
        const res = await API.post(
          "/settings/hero-slides",
          {
            title: formTitle,
            subtitle: formSubtitle,
            caption: formCaption,
            imageUrl: normalizedImageUrl,
            linkUrl: formLinkUrl,
            buttonText: formButtonText,
            isActive: formIsActive,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.slides) setSlides(mapSlides(res.data.slides));
        clearCMSCache("settings");
        clearCMSCache();
        showToast("New hero slide added to carousel!");
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Save slide error:", err);
      showToast("Error: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSlide = async () => {
    if (!deleteSlideId) return;
    const token = getAuthToken();
    const mapSlides = (arr) => (arr || []).map((s) => ({ ...s, imageUrl: resolveMediaUrl(s.imageUrl || s.src) }));
    try {
      const res = await API.delete(`/settings/hero-slides/${deleteSlideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.slides) setSlides(mapSlides(res.data.slides));
      clearCMSCache();
      showToast("Hero slide deleted.");
      setDeleteSlideId(null);
    } catch (err) {
      showToast("Failed to delete slide: " + err.message, "error");
    }
  };

  const handleToggleActive = async (slide) => {
    const token = getAuthToken();
    const mapSlides = (arr) => (arr || []).map((s) => ({ ...s, imageUrl: resolveMediaUrl(s.imageUrl || s.src) }));
    try {
      const nextActive = !slide.isActive;
      const res = await API.put(
        `/settings/hero-slides/${slide._id}`,
        { ...slide, isActive: nextActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.slides) setSlides(mapSlides(res.data.slides));
      clearCMSCache();
      showToast(`Slide ${nextActive ? "activated" : "deactivated"}.`);
    } catch (err) {
      showToast("Failed to toggle status: " + err.message, "error");
    }
  };

  const handleMoveSlide = async (index, direction) => {
    const newSlides = [...slides];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;

    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;
    setSlides(newSlides);

    // Save order
    const token = getAuthToken();
    try {
      await API.put(
        "/settings",
        { heroSettings: { ...heroSettings, slides: newSlides } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      clearCMSCache();
      showToast("Slide order updated.");
    } catch (err) {
      console.error("Reorder error:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Loading hero carousel slides...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hero Carousel Management"
        description="Curate top animated banner slides showcasing town landmarks, municipal initiatives, and historical highlights."
        icon={Layers}
        badge={
          <StatusBadge
            status="active"
            label={`${slides.filter((s) => s.isActive !== false).length} Active Slides`}
          />
        }
        actions={
          <button
            onClick={openCreateModal}
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Slide</span>
          </button>
        }
      />

      {/* 3.1 Playback Control Grid (Compact Card) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-extrabold text-slate-900 font-heading">
              Playback Control Grid
            </h2>
          </div>
          <button
            onClick={handleSaveHeroControls}
            disabled={savingSettings}
            className="h-9 px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Numeric Field: Slide Duration (ms) */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Slide Duration (ms)
            </label>
            <input
              type="number"
              step="500"
              min="2000"
              max="15000"
              value={heroSettings.animationSpeed}
              onChange={(e) =>
                setHeroSettings({ ...heroSettings, animationSpeed: Number(e.target.value) })
              }
              className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200/90 bg-slate-50/50 text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Transition dropdown: Transition Direction */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Transition Direction
            </label>
            <select
              value={heroSettings.animationDirection}
              onChange={(e) =>
                setHeroSettings({ ...heroSettings, animationDirection: e.target.value })
              }
              className="w-full h-[42px] px-3 py-2 rounded-xl border border-slate-200/90 bg-slate-50/50 text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none transition"
            >
              <option value="left">Slide Left ▾</option>
              <option value="right">Slide Right ▾</option>
              <option value="fade">Smooth Crossfade</option>
            </select>
          </div>
        </div>

        {/* Multi-select inline: Autoplay Behavior [✔ Auto-rotate] [5.0s per slide] */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() =>
              setHeroSettings({ ...heroSettings, enableAutoplay: !heroSettings.enableAutoplay })
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 ${
              heroSettings.enableAutoplay
                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                : "bg-slate-100 text-slate-500 border border-slate-200"
            }`}
          >
            <span>{heroSettings.enableAutoplay ? "✔ Auto-rotate" : "✕ Paused"}</span>
          </button>

          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {(heroSettings.animationSpeed / 1000).toFixed(1)}s per slide
          </span>
        </div>
      </div>

      {/* 3.2 Unified Current Slide Deck */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Current Slide Deck ({slides.filter((s) => s.isActive !== false).length} Active Slides)
            </h3>
            <p className="text-[11px] text-slate-400">
              Stackable cards with 40px touch zone reordering
            </p>
          </div>

          {/* Quick trigger + Add Slide placed at top right */}
          <button
            onClick={openCreateModal}
            className="h-10 px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Slide</span>
          </button>
        </div>

        {slides.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Slides in Carousel"
            description="Add your first hero banner slide to welcome visitors on the homepage."
            action={
              <button
                onClick={openCreateModal}
                className="bg-[#2563EB] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition"
              >
                + Add First Slide
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {slides.map((slide, index) => {
              const isActive = slide.isActive !== false;

              return (
                <div
                  key={slide._id || index}
                  className={`w-full bg-white rounded-2xl border border-slate-100 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition ${
                    isActive ? "border-slate-200/90" : "border-slate-200 bg-slate-50/70 opacity-75"
                  }`}
                >
                  {/* Left Area: Slide Thumbnail (64px, aspect-video rounded-lg) with number and tagline */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 shrink-0 aspect-video">
                      <img
                        src={resolveMediaUrl(slide.imageUrl)}
                        alt={slide.title || "Slide"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/images/fazilnagar_pawanagar.webp";
                        }}
                      />
                      <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] font-black px-1 rounded">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          #{index + 1} {slide.title || "Untitled Slide"}
                        </h4>
                        {!isActive && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {slide.subtitle || slide.caption || (slide.linkUrl ? `Target: ${slide.linkUrl}` : "Featured Slide")}
                      </p>
                    </div>
                  </div>

                  {/* Action Panel: Reorder buttons (↑ and ↓, 40px touch zone), hide checkbox ([✔] Hide), and editing pencil ✏️ */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {/* Reorder Buttons (40px touch zone) */}
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, "up")}
                      disabled={index === 0}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition disabled:opacity-30 cursor-pointer active:scale-95"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSlide(index, "down")}
                      disabled={index === slides.length - 1}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition disabled:opacity-30 cursor-pointer active:scale-95"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    {/* Hide checkbox / button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(slide)}
                      className={`h-10 px-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
                        !isActive
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                      title={isActive ? "Hide slide from portal" : "Show slide"}
                    >
                      <span>{isActive ? "Hide" : "✔ Hidden"}</span>
                    </button>

                    {/* Editing pencil ✏️ */}
                    <button
                      type="button"
                      onClick={() => openEditModal(slide)}
                      className="w-10 h-10 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95"
                      title="Edit slide"
                    >
                      <Edit className="w-4 h-4 text-slate-700" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setDeleteSlideId(slide._id)}
                      className="w-10 h-10 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition cursor-pointer active:scale-95"
                      title="Delete slide"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Slide Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
          >
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-[#18232E]">
                  {editingSlide ? "Edit Hero Slide" : "Create New Hero Slide"}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Slide Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="जैसे: पवित्र पावापुरी तीर्थधाम — भगवान महावीर की निर्वाण भूमि"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Location / Subtitle
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="Fazilnagar, Kushinagar (PIN 274401)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Short Description / Caption
                </label>
                <textarea
                  rows={2}
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder="Ancient historical heritage connecting Jain and Buddhist circuits in eastern Uttar Pradesh."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              {/* Cover Image Uploader */}
              <ImageUploader
                value={formImageUrl}
                previewUrl={previewUrl}
                uploadStatus={uploadStatus}
                uploadProgress={uploadProgress}
                errorMessage={uploadError}
                onFileSelect={handleFileSelect}
                onRetry={() => selectedFile && uploadImageFile(selectedFile)}
                onClear={handleClearImage}
                onChange={(url) => {
                  const resolved = resolveMediaUrl(url);
                  setFormImageUrl(resolved);
                  setPreviewUrl(resolved);
                  setUploadStatus(resolved ? "success" : "idle");
                  setUploadError("");
                }}
                onOpenMediaPicker={() => setMediaPickerOpen(true)}
                label="Slide Background Photo *"
                helpText="High-res town photos (1920x800 recommended)"
                aspectRatio="banner"
                disabled={formSubmitting || uploadStatus === "uploading"}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={formButtonText}
                    onChange={(e) => setFormButtonText(e.target.value)}
                    placeholder="Explore Now"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Button Link
                  </label>
                  <input
                    type="text"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    placeholder="/directory or /tourism"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold text-slate-800">Publish Immediately</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting || uploadStatus === "uploading" || !formImageUrl.trim()}
                  className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {(formSubmitting || uploadStatus === "uploading") && (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>
                    {uploadStatus === "uploading"
                      ? "Uploading Photo..."
                      : formSubmitting
                      ? "Saving..."
                      : editingSlide
                      ? "Update Slide"
                      : "Add Slide"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={(url) => {
          const resolved = resolveMediaUrl(url);
          setFormImageUrl(resolved);
          setPreviewUrl(resolved);
          setUploadStatus("success");
          setUploadError("");
          setSelectedFile(null);
          setMediaPickerOpen(false);
          showToast("Image selected from media library!");
        }}
        title="Select Image for Hero Slide"
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteSlideId)}
        title="Delete Hero Slide?"
        message="Are you sure you want to permanently delete this slide from the homepage hero carousel?"
        confirmText="Delete Slide"
        confirmVariant="danger"
        onConfirm={handleDeleteSlide}
        onCancel={() => setDeleteSlideId(null)}
      />

      {/* Floating Toast Notification */}
      {toast.message && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
