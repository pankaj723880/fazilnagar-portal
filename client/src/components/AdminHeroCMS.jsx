import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  CheckCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Upload,
  X,
  Save,
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
  const [toast, setToast] = useState("");

  // Slide Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formCaption, setFormCaption] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("/directory");
  const [formButtonText, setFormButtonText] = useState("Explore Now");
  const [formIsActive, setFormIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
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
      showToast("Hero carousel animation controls saved!");
    } catch (err) {
      console.error("Save hero controls error:", err);
      showToast("Failed to save controls: " + err.message);
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
    setModalOpen(true);
  };

  const openEditModal = (slide) => {
    setEditingSlide(slide);
    setFormTitle(slide.title || "");
    setFormSubtitle(slide.subtitle || "");
    setFormCaption(slide.caption || "");
    setFormImageUrl(slide.imageUrl || "");
    setFormLinkUrl(slide.linkUrl || "/directory");
    setFormButtonText(slide.buttonText || "Explore Now");
    setFormIsActive(slide.isActive !== false);
    setModalOpen(true);
  };

  const handleImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("image", file);
    formData.append("title", "Hero Slide - " + file.originalname);

    try {
      const res = await API.post("/media/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      if (res.data?.media?.url) {
        setFormImageUrl(res.data.media.url);
        showToast("Image uploaded to library successfully!");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast("Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveSlide = async (e) => {
    e.preventDefault();
    if (!formImageUrl.trim()) {
      showToast("Image URL is required for hero slide.");
      return;
    }

    setFormSubmitting(true);
    const token = getAuthToken();
    try {
      if (editingSlide && editingSlide._id) {
        // Update existing slide
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
        showToast("Hero slide updated successfully!");
      } else {
        // Create new slide
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
        showToast("New hero slide added!");
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Save slide error:", err);
      showToast("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteSlide = async (id) => {
    if (!confirm("Are you sure you want to delete this hero slide?")) return;
    const token = getAuthToken();
    try {
      const res = await API.delete(`/settings/hero-slides/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.slides) setSlides(res.data.slides);
      showToast("Hero slide deleted.");
    } catch (err) {
      showToast("Failed to delete slide: " + err.message);
    }
  };

  const handleToggleActive = async (slide) => {
    const token = getAuthToken();
    try {
      const res = await API.put(
        `/settings/hero-slides/${slide._id}`,
        { isActive: !slide.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.slides) setSlides(res.data.slides);
      showToast(`Slide ${!slide.isActive ? "enabled" : "hidden"}.`);
    } catch (err) {
      showToast("Error toggling slide: " + err.message);
    }
  };

  const moveSlide = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    setSlides(newSlides);

    // Save ordering to backend
    const token = getAuthToken();
    try {
      await API.put(
        "/settings",
        { heroSettings: { ...heroSettings, slides: newSlides } },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Slide order updated.");
    } catch (err) {
      console.warn("Failed to save reordering:", err);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs font-semibold">Loading hero carousel CMS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Homepage Hero Banners & Slider</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Hero Carousel & Banner CMS
          </h2>
          <p className="text-xs text-slate-500">
            Upload photos, configure moving background speed, transition directions, and reorder homepage slides.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Hero Slide</span>
        </button>
      </div>

      {/* Animation & Speed Control Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          Animation & Transition Controls
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Slide Interval / Speed
            </label>
            <select
              value={heroSettings.animationSpeed}
              onChange={(e) =>
                setHeroSettings((prev) => ({ ...prev, animationSpeed: parseInt(e.target.value) }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value={3000}>3 Seconds (Fast)</option>
              <option value={5000}>5 Seconds (Recommended)</option>
              <option value={8000}>8 Seconds (Relaxed)</option>
              <option value={12000}>12 Seconds (Slow)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Transition Direction
            </label>
            <select
              value={heroSettings.animationDirection}
              onChange={(e) =>
                setHeroSettings((prev) => ({ ...prev, animationDirection: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="left">Left-to-Right Carousel</option>
              <option value="right">Right-to-Left Carousel</option>
              <option value="fade">Smooth Fade Crossfade</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveHeroControls}
              disabled={savingSettings}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Animation Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Slide Items Grid / List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Current Hero Slides ({slides.length})
          </h3>
          <span className="text-[11px] text-slate-400">Drag or use arrows to change display order</span>
        </div>

        {slides.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-slate-400">
            <p className="text-xs font-semibold">No custom hero slides configured.</p>
            <button onClick={openCreateModal} className="text-blue-600 text-xs font-bold mt-2 hover:underline">
              + Add your first hero slide
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {slides.map((slide, idx) => (
              <div
                key={slide._id || idx}
                className={`bg-white p-4 rounded-2xl border transition shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  slide.isActive === false ? "opacity-60 bg-slate-50 border-slate-200" : "border-slate-200"
                }`}
              >
                {/* Slide Preview & Info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-24 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 relative group">
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?auto=format&fit=crop&w=300&q=80";
                      }}
                    />
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-extrabold text-[#18232E] truncate">
                        {slide.title || "Untitled Slide"}
                      </h4>
                      {slide.isActive === false && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-blue-600 font-semibold truncate">{slide.subtitle}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{slide.caption}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
                  {/* Reorder Arrows */}
                  <button
                    onClick={() => moveSlide(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveSlide(idx, 1)}
                    disabled={idx === slides.length - 1}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Toggle Active */}
                  <button
                    onClick={() => handleToggleActive(slide)}
                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                      slide.isActive !== false
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                    title={slide.isActive !== false ? "Hide Slide" : "Show Slide"}
                  >
                    {slide.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(slide)}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                    title="Edit Slide Details"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteSlide(slide._id)}
                    className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                    title="Delete Slide"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE / EDIT SLIDE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#18232E] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold">
                {editingSlide ? "Edit Hero Slide" : "Add New Hero Slide"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Slide Main Headline (शीर्षक)
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Official Civic & Digital Directory"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sub-heading / Category Highlight
                </label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  placeholder="e.g. Fazilnagar Nagar Panchayat, Kushinagar"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descriptive Caption
                </label>
                <textarea
                  rows={2}
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  placeholder="Brief 1-2 sentence description..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Photo Upload & URL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Hero Background Image <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Enter image URL or upload below..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                    required
                  />
                  <label className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? "Uploading..." : "Upload File"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>

                {formImageUrl && (
                  <div className="h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={formImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Call To Action Button Text
                  </label>
                  <input
                    type="text"
                    value={formButtonText}
                    onChange={(e) => setFormButtonText(e.target.value)}
                    placeholder="Explore Now"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Destination URL
                  </label>
                  <input
                    type="text"
                    value={formLinkUrl}
                    onChange={(e) => setFormLinkUrl(e.target.value)}
                    placeholder="/directory or /emergency"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="slideActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <label htmlFor="slideActive" className="font-bold text-slate-700 cursor-pointer">
                  Display this slide in active carousel
                </label>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {formSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingSlide ? "Update Slide" : "Add Slide"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
