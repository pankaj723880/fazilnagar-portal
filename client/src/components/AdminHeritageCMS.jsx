import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Compass,
  Plus,
  Trash2,
  Edit,
  RefreshCw,
  CheckCircle,
  Eye,
  EyeOff,
  Search,
  Filter,
  X,
  Save,
  MapPin,
  Clock,
  Sparkles,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

export default function AdminHeritageCMS() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [toast, setToast] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formName, setFormName] = useState("");
  const [formNameHi, setFormNameHi] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategory, setFormCategory] = useState("Jain Heritage");
  const [formSignificance, setFormSignificance] = useState("");
  const [formNarrative, setFormNarrative] = useState("");
  const [formDistance, setFormDistance] = useState("Within town area / 0 km");
  const [formAddress, setFormAddress] = useState("Fazilnagar, Kushinagar, UP");
  const [formLat, setFormLat] = useState("26.6827");
  const [formLng, setFormLng] = useState("84.0498");
  const [formHours, setFormHours] = useState("06:00 AM – 07:00 PM");
  const [formFee, setFormFee] = useState("Free Admission");
  const [formPrimaryImage, setFormPrimaryImage] = useState("");
  const [formGalleryText, setFormGalleryText] = useState("");
  const [formIsTwinHighlight, setFormIsTwinHighlight] = useState(true);
  const [formIsPublished, setFormIsPublished] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    "All",
    "Jain Heritage",
    "Buddhist Heritage",
    "Hindu Temples",
    "Historical Monument",
    "Cultural Landmark",
  ];

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await API.get("/heritage/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data?.sites)) {
        setSites(res.data.sites);
      }
    } catch (err) {
      console.warn("Failed to fetch heritage sites:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const openCreateModal = () => {
    setEditingSite(null);
    setFormName("");
    setFormNameHi("");
    setFormSlug("");
    setFormCategory("Jain Heritage");
    setFormSignificance("Sacred site associated with ancient Malla Ganarajya and Mahavira's nirvana tradition.");
    setFormNarrative("");
    setFormDistance("Within Fazilnagar town");
    setFormAddress("Pawapuri Road, Fazilnagar, Kushinagar, UP - 274401");
    setFormLat("26.6827");
    setFormLng("84.0498");
    setFormHours("06:00 AM – 07:00 PM");
    setFormFee("Free Entry");
    setFormPrimaryImage("https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1200&q=80");
    setFormGalleryText("");
    setFormIsTwinHighlight(true);
    setFormIsPublished(true);
    setModalOpen(true);
  };

  const openEditModal = (site) => {
    setEditingSite(site);
    setFormName(site.name || "");
    setFormNameHi(site.nameHindi || "");
    setFormSlug(site.slug || "");
    setFormCategory(site.category || "Jain Heritage");
    setFormSignificance(site.historicalSignificance || "");
    setFormNarrative(site.narrative || "");
    setFormDistance(site.distanceFromFazilnagarCenter || "Within town area");
    setFormAddress(site.locationAddress || "");
    setFormLat(site.latitude ? String(site.latitude) : "26.6827");
    setFormLng(site.longitude ? String(site.longitude) : "84.0498");
    setFormHours(site.visitingHours || "06:00 AM – 07:00 PM");
    setFormFee(site.entryFee || "Free Admission");
    setFormPrimaryImage(site.primaryImage || "");
    const galleryLines = Array.isArray(site.galleryImages)
      ? site.galleryImages.map((g) => `${g.url} | ${g.caption || ""} | ${g.credit || ""}`).join("\n")
      : "";
    setFormGalleryText(galleryLines);
    setFormIsTwinHighlight(site.isTwinHeritageHighlight !== false);
    setFormIsPublished(site.isPublished !== false);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formNarrative.trim()) {
      showToast("Name and narrative are required.");
      return;
    }

    setSubmitting(true);
    const token = getAuthToken();

    // Parse gallery lines
    const parsedGallery = formGalleryText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        return {
          url: parts[0] || "",
          caption: parts[1] || "",
          credit: parts[2] || "",
        };
      })
      .filter((g) => g.url.startsWith("http"));

    const payload = {
      name: formName,
      nameHindi: formNameHi,
      slug: formSlug || formName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      category: formCategory,
      historicalSignificance: formSignificance,
      narrative: formNarrative,
      distanceFromFazilnagarCenter: formDistance,
      locationAddress: formAddress,
      latitude: parseFloat(formLat) || 26.6827,
      longitude: parseFloat(formLng) || 84.0498,
      visitingHours: formHours,
      entryFee: formFee,
      primaryImage: formPrimaryImage,
      galleryImages: parsedGallery,
      isTwinHeritageHighlight: formIsTwinHighlight,
      isPublished: formIsPublished,
    };

    try {
      if (editingSite && editingSite._id) {
        const res = await API.put(`/heritage/${editingSite._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.site) {
          setSites((prev) =>
            prev.map((s) => (s._id === editingSite._id ? res.data.site : s))
          );
          showToast("Heritage site updated.");
        }
      } else {
        const res = await API.post("/heritage", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.site) {
          setSites((prev) => [res.data.site, ...prev]);
          showToast("Heritage site added.");
        }
      }
      setModalOpen(false);
    } catch (err) {
      showToast("Error saving site: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (site) => {
    const token = getAuthToken();
    try {
      await API.patch(
        `/heritage/${site._id}/publish`,
        { isPublished: !site.isPublished },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSites((prev) =>
        prev.map((s) => (s._id === site._id ? { ...s, isPublished: !site.isPublished } : s))
      );
      showToast(`Site ${!site.isPublished ? "published" : "unpublished"}.`);
    } catch (err) {
      showToast("Status update failed: " + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this heritage site?")) return;
    const token = getAuthToken();
    try {
      await API.delete(`/heritage/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSites((prev) => prev.filter((s) => s._id !== id));
      showToast("Heritage site deleted.");
    } catch (err) {
      showToast("Delete failed: " + err.message);
    }
  };

  const filtered = sites.filter((s) => {
    const matchesCat = selectedCategory === "All" || s.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.nameHindi?.toLowerCase().includes(search.toLowerCase()) ||
      s.narrative?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold mb-1">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sacred Twin Heritage CMS</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Fazilnagar & Kushinagar Twin Heritage
          </h2>
          <p className="text-xs text-slate-500">
            Manage Pawapuri Jain Tirth, Sathiaon archaeological mound, Buddhist axis trails, and historical descriptions.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Heritage Destination</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search heritage sites by name or history..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Heritage Sites */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
            <p className="text-xs font-semibold">Loading heritage sites...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <p className="text-xs font-semibold">No heritage sites found.</p>
          </div>
        ) : (
          filtered.map((site) => (
            <div
              key={site._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  {site.primaryImage ? (
                    <img
                      src={site.primaryImage}
                      alt={site.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1">
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                      {site.category}
                    </span>
                    {site.isTwinHeritageHighlight && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Twin Axis
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    {site.isPublished ? (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold">
                        Published
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-700 text-white text-[10px] font-bold">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <h3 className="text-base font-extrabold text-[#18232E]">
                    {site.name}
                  </h3>
                  {site.nameHindi && (
                    <p className="text-xs text-emerald-800 font-semibold">{site.nameHindi}</p>
                  )}
                  <p className="text-xs text-slate-600 line-clamp-3">
                    {site.historicalSignificance}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-red-500" />
                      {site.distanceFromFazilnagarCenter}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {site.visitingHours}
                    </span>
                    {site.galleryImages?.length > 0 && (
                      <span className="text-emerald-700 font-bold">
                        📸 {site.galleryImages.length} Gallery Photos
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleTogglePublish(site)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer ${
                    site.isPublished
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  {site.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{site.isPublished ? "Live" : "Draft"}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(site)}
                    className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                    title="Edit Site"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(site._id)}
                    className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition cursor-pointer"
                    title="Delete Site"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="bg-[#18232E] text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>{editingSite ? "Edit Heritage Destination" : "Add Heritage Destination"}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Destination Name (English) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Pawapuri Jain Tirth Complex"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Destination Name (Hindi)
                  </label>
                  <input
                    type="text"
                    value={formNameHi}
                    onChange={(e) => setFormNameHi(e.target.value)}
                    placeholder="उदा. पावापुरी तीर्थ (फाजिलनगर)"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.filter((c) => c !== "All").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Distance / Proximity</label>
                  <input
                    type="text"
                    value={formDistance}
                    onChange={(e) => setFormDistance(e.target.value)}
                    placeholder="e.g. Within town area / 0 km"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Historical Significance Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formSignificance}
                  onChange={(e) => setFormSignificance(e.target.value)}
                  placeholder="Key historical context, ancient scripture references, or archaeological value..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Detailed Narrative & Visitor Guide <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={formNarrative}
                  onChange={(e) => setFormNarrative(e.target.value)}
                  placeholder="In-depth history, pilgrimage significance, temple architecture, and festival details..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Image URL</label>
                  <input
                    type="text"
                    value={formPrimaryImage}
                    onChange={(e) => setFormPrimaryImage(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visiting Hours</label>
                  <input
                    type="text"
                    value={formHours}
                    onChange={(e) => setFormHours(e.target.value)}
                    placeholder="06:00 AM – 07:00 PM"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formLat}
                    onChange={(e) => setFormLat(e.target.value)}
                    placeholder="26.6827"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formLng}
                    onChange={(e) => setFormLng(e.target.value)}
                    placeholder="84.0498"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Photo Gallery (One per line: ImageURL | Caption | Credit)
                </label>
                <textarea
                  rows={3}
                  value={formGalleryText}
                  onChange={(e) => setFormGalleryText(e.target.value)}
                  placeholder="https://images.unsplash.com/... | Main Shikhara | Archaeologist Archive"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsPublished}
                    onChange={(e) => setFormIsPublished(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Publish on website</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formIsTwinHighlight}
                    onChange={(e) => setFormIsTwinHighlight(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Spotlight in Sacred Twin Heritage Axis</span>
                </label>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingSite ? "Update Destination" : "Save Destination"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
