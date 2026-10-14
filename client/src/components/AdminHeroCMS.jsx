import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import { clearCMSCache } from "../services/cmsService";
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
        setSlides(hs.slides || []);
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
    setFormImageUrl(slide.imageUrl || "");
    setPreviewUrl(slide.imageUrl || "");
    setFormLinkUrl(slide.linkUrl || "/directory");
    setFormButtonText(slide.buttonText || "Explore Now");
    setFormIsActive(slide.isActive !== false);
    setUploadStatus(slide.imageUrl ? "success" : "idle");
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
    try {
      if (editingSlide && editingSlide._id) {
        const res = await API.put(
          `/settings/hero-slides/${editingSlide._id}`,
          {
            title: formTitle,
            subtitle: formSubtitle,
            caption: formCaption,
            imageUrl: formImageUrl,
            linkUrl: formLinkUrl,
            buttonText: formButtonText,
            isActive: formIsActive,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.slides) setSlides(res.data.slides);
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
            imageUrl: formImageUrl,
            linkUrl: formLinkUrl,
            buttonText: formButtonText,
            isActive: formIsActive,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.slides) setSlides(res.data.slides);
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
    try {
      const res = await API.delete(`/settings/hero-slides/${deleteSlideId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.slides) setSlides(res.data.slides);
      clearCMSCache();
      showToast("Hero slide deleted.");
      setDeleteSlideId(null);
    } catch (err) {
      showToast("Failed to delete slide: " + err.message, "error");
    }
  };

  const handleToggleActive = async (slide) => {
    const token = getAuthToken();
    try {
      const nextActive = !slide.isActive;
      const res = await API.put(
        `/settings/hero-slides/${slide._id}`,
        { ...slide, isActive: nextActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.slides) setSlides(res.data.slides);
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

      {/* Animation & Autoplay Controls FormSection */}
      <FormSection
        title="Carousel Playback & Animation Settings"
        description="Configure automated slide rotation interval, direction, and autoplay behaviors."
        icon={Sliders}
        actions={
          <button
            onClick={handleSaveHeroControls}
            disabled={savingSettings}
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {savingSettings ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Playback Controls</span>
          </button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {(heroSettings.animationSpeed / 1000).toFixed(1)} seconds per slide
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Transition Direction
            </label>
            <select
              value={heroSettings.animationDirection}
              onChange={(e) =>
                setHeroSettings({ ...heroSettings, animationDirection: e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold focus:bg-white focus:border-blue-500 outline-none"
            >
              <option value="left">Slide Left &larr;</option>
              <option value="right">Slide Right &rarr;</option>
              <option value="fade">Smooth Crossfade</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Animation transition effect
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Autoplay Behavior
            </label>
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 mt-0.5">
              <span className="text-xs font-semibold text-slate-700">Auto-rotate</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroSettings.enableAutoplay}
                  onChange={(e) =>
                    setHeroSettings({ ...heroSettings, enableAutoplay: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
              </label>
            </div>
          </div>
        </div>
      </FormSection>

      {/* Slide Workspace List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Current Slide Deck ({slides.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Use arrows to reorder slides sequentially
          </span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {slides.map((slide, index) => {
              const isActive = slide.isActive !== false;

              return (
                <div
                  key={slide._id || index}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-2xs ${
                    isActive ? "border-slate-200/90" : "border-slate-200 bg-slate-50/50 opacity-80"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Visual Banner Preview */}
                    <div className="relative h-44 w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 group">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent p-4 flex flex-col justify-end text-white">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="bg-white/20 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            #{index + 1}
                          </span>
                          <StatusBadge
                            status={isActive ? "active" : "inactive"}
                            label={isActive ? "Active Slide" : "Disabled"}
                            size="sm"
                          />
                        </div>
                        <h4 className="text-base font-extrabold leading-snug line-clamp-1">
                          {slide.title || "Untitled Slide"}
                        </h4>
                        {slide.subtitle && (
                          <p className="text-xs text-slate-300 line-clamp-1">{slide.subtitle}</p>
                        )}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="text-xs space-y-1">
                      {slide.caption && (
                        <p className="text-slate-600 line-clamp-2 leading-relaxed">
                          {slide.caption}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                        <span>Button: <strong className="text-slate-700">{slide.buttonText || "Explore"}</strong></span>
                        <span>•</span>
                        <span className="truncate">Link: <strong className="text-blue-600 font-mono">{slide.linkUrl || "/directory"}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Reordering Controls */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(index, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-30 cursor-pointer"
                        title="Move slide up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSlide(index, "down")}
                        disabled={index === slides.length - 1}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-30 cursor-pointer"
                        title="Move slide down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Edit, Status, Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(slide)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isActive
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{isActive ? "Hide" : "Enable"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditModal(slide)}
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                        title="Edit Slide Details"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteSlideId(slide._id)}
                        className="p-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150"
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
                  setFormImageUrl(url);
                  setPreviewUrl(url);
                  setUploadStatus(url ? "success" : "idle");
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
          setFormImageUrl(url);
          setPreviewUrl(url);
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
