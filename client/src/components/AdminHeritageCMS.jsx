import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import { clearCMSCache } from "../services/cmsService";
import {
  Compass,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  Clock,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  Globe,
  Image as ImageIcon
} from "lucide-react";
import PageHeader from "./admin/PageHeader";
import SearchAndFilters from "./admin/SearchAndFilters";
import DataTable from "./admin/DataTable";
import StatusBadge from "./admin/StatusBadge";
import FormSection from "./admin/FormSection";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import LoadingSkeleton from "./admin/LoadingSkeleton";
import MediaPicker from "./admin/MediaPicker";
import ImageUploader from "./admin/ImageUploader";

export default function AdminHeritageCMS() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [toast, setToast] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState(null);

  // Form fields
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
  const [formHeritageZone, setFormHeritageZone] = useState("fazilnagar");
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
      let res;
      const headers = {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      try {
        res = await API.get("/heritage/admin", {
          params: { _t: Date.now() },
          headers,
        });
      } catch (adminErr) {
        // Fallback to public endpoint if admin endpoint has issue
        res = await API.get("/heritage", {
          params: { _t: Date.now() },
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        });
      }
      if (res.data?.success && Array.isArray(res.data?.sites)) {
        setSites(res.data.sites);
      } else if (Array.isArray(res.data)) {
        setSites(res.data);
      }
    } catch (err) {
      console.warn("Failed to fetch heritage sites:", err);
      showToast("error", "Failed to load heritage sites");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const openCreateModal = () => {
    setEditingSite(null);
    setFormName("");
    setFormNameHi("");
    setFormSlug("");
    setFormCategory("Jain Heritage");
    setFormHeritageZone("fazilnagar");
    setFormSignificance("Sacred site associated with ancient Malla Ganarajya and Mahavira's nirvana tradition.");
    setFormNarrative("");
    setFormDistance("Within Fazilnagar town");
    setFormAddress("Pawapuri Road, Fazilnagar, Kushinagar, UP - 274401");
    setFormLat("26.6827");
    setFormLng("84.0498");
    setFormHours("06:00 AM – 07:00 PM");
    setFormFee("Free Admission");
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
    setFormHeritageZone(site.heritageZone || (site.category === "Buddhist Heritage" ? "kushinagar" : "fazilnagar"));
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
      showToast("warning", "Site name and detailed narrative are required.");
      return;
    }

    const latNum = parseFloat(formLat);
    const lngNum = parseFloat(formLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      showToast("warning", "Latitude and Longitude must be valid numbers.");
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
      heritageZone: formHeritageZone,
      historicalSignificance: formSignificance,
      narrative: formNarrative,
      distanceFromFazilnagarCenter: formDistance,
      locationAddress: formAddress,
      latitude: latNum,
      longitude: lngNum,
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
          clearCMSCache("heritage");
          showToast("success", "Heritage site updated successfully.");
        }
      } else {
        const res = await API.post("/heritage", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.site) {
          setSites((prev) => [res.data.site, ...prev]);
          clearCMSCache("heritage");
          showToast("success", "New heritage site published.");
        }
      }
      setModalOpen(false);
    } catch (err) {
      showToast("error", "Error saving site: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePublish = async (site) => {
    const token = getAuthToken();
    const nextPublished = !site.isPublished;
    try {
      try {
        await API.patch(
          `/heritage/${site._id}/publish`,
          { isPublished: nextPublished },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (patchErr) {
        if (patchErr.response?.status === 404 || patchErr.status === 404) {
          await API.put(
            `/heritage/${site._id}`,
            { isPublished: nextPublished },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          throw patchErr;
        }
      }
      setSites((prev) =>
        prev.map((s) => (s._id === site._id ? { ...s, isPublished: nextPublished } : s))
      );
      clearCMSCache("heritage");
      showToast("success", `Site ${nextPublished ? "published" : "unpublished"} successfully.`);
    } catch (err) {
      showToast("error", "Status update failed: " + (err.response?.data?.message || err.message));
    }
  };

  const confirmDelete = async () => {
    if (!siteToDelete) return;
    const token = getAuthToken();
    try {
      await API.delete(`/heritage/${siteToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSites((prev) => prev.filter((s) => s._id !== siteToDelete._id));
      clearCMSCache("heritage");
      showToast("success", "Heritage site removed successfully.");
    } catch (err) {
      showToast("error", "Delete failed: " + err.message);
    } finally {
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
    }
  };

  const filtered = sites.filter((s) => {
    const matchesCat = selectedCategory === "All" || s.category === selectedCategory;
    const matchesSearch =
      !search.trim() ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.nameHindi?.toLowerCase().includes(search.toLowerCase()) ||
      s.narrative?.toLowerCase().includes(search.toLowerCase()) ||
      s.historicalSignificance?.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const tableColumns = [
    {
      key: "name",
      label: "Site & Heritage Landmark",
      sortable: true,
      render: (val, row) => {
        const site = row || val;
        return (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
              {site?.primaryImage ? (
                <img src={site.primaryImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Compass className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">{site?.name}</div>
              {site?.nameHindi && <div className="text-xs text-slate-500 font-hindi">{site.nameHindi}</div>}
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">/{site?.slug}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      label: "Category & Tradition",
      sortable: true,
      render: (val, row) => {
        const site = row || val;
        const cat = (typeof val === "string" ? val : null) || site?.category || "Heritage";
        return (
          <div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {cat}
            </span>
            {site?.isTwinHeritageHighlight && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Twin Highlight
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "distance",
      label: "Proximity & Address",
      render: (val, row) => {
        const site = row || val;
        return (
          <div className="text-xs text-slate-600 max-w-[200px]">
            <div className="font-medium text-slate-800 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {site?.distanceFromFazilnagarCenter || "Fazilnagar"}
            </div>
            <div className="text-slate-400 truncate mt-0.5">{site?.locationAddress || "—"}</div>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (val, row) => {
        const site = row || val;
        return (
          <StatusBadge status={site?.isPublished ? "published" : "draft"} />
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (val, row) => {
        const site = row || val;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleTogglePublish(site)}
              title={site?.isPublished ? "Unpublish site" : "Publish site"}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {site?.isPublished ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-emerald-600" />}
            </button>
            <button
              onClick={() => openEditModal(site)}
              title="Edit Site Details"
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSiteToDelete(site);
                setDeleteDialogOpen(true);
              }}
              title="Delete Site"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Top Header */}
      <PageHeader
        icon={Compass}
        title="Twin Heritage CMS"
        subtitle="Manage sacred Buddhist & Jain historical sites across Fazilnagar (Pawa) and Kushinagar"
        badgeText={`${sites.length} Landmarks`}
        primaryAction={{
          label: "Add Heritage Site",
          icon: Plus,
          onClick: openCreateModal,
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Twin Heritage" },
        ]}
      />

      {/* View Switcher & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <SearchAndFilters
            searchPlaceholder="Search heritage sites, traditions, narratives..."
            searchValue={search}
            onSearchChange={setSearch}
            filters={[
              {
                id: "category",
                label: "Category",
                value: selectedCategory,
                options: categories.map((c) => ({ label: c, value: c })),
                onChange: setSelectedCategory,
              },
            ]}
            onReset={() => {
              setSearch("");
              setSelectedCategory("All");
            }}
            totalResults={filtered.length}
          />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-1 bg-slate-50 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
            title="Table View"
          >
            <TableIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <LoadingSkeleton type={viewMode === "table" ? "table" : "cards"} rows={4} count={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No Heritage Sites Found"
          description={
            search || selectedCategory !== "All"
              ? "No heritage sites match your filter criteria. Try clearing filters."
              : "No sacred heritage sites configured yet. Add your first site now."
          }
          actionLabel="Add Heritage Site"
          onAction={openCreateModal}
        />
      ) : viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filtered}
          keyField="_id"
          defaultSortKey="name"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((site) => (
            <div
              key={site._id}
              className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col group"
            >
              {/* Image Banner */}
              <div className="relative h-44 bg-slate-100 overflow-hidden">
                {site.primaryImage ? (
                  <img
                    src={site.primaryImage}
                    alt={site.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <Compass className="w-10 h-10 mb-1" />
                    <span className="text-xs">No Cover Image</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-black/70 backdrop-blur-xs text-white">
                    {site.category}
                  </span>
                  {site.isTwinHeritageHighlight && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/90 text-white flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Highlight
                    </span>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <StatusBadge status={site.isPublished ? "published" : "draft"} />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base line-clamp-1">{site.name}</h3>
                  {site.nameHindi && (
                    <p className="text-xs text-slate-500 font-hindi mt-0.5 line-clamp-1">{site.nameHindi}</p>
                  )}
                  <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                    {site.historicalSignificance || site.narrative}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-medium text-slate-700">{site.distanceFromFazilnagarCenter || "Fazilnagar"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{site.visitingHours || "Open Daily"}</span>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleTogglePublish(site)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    {site.isPublished ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                        <span>Unpublish</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Publish</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(site)}
                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit site"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSiteToDelete(site);
                        setDeleteDialogOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete site"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingSite ? "Edit Heritage Site" : "Add Sacred Heritage Site"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Document history, visitor info, coordinates, and images
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Section 1: Identity */}
              <FormSection
                icon={Compass}
                title="Site Identity & Classification"
                description="Names in Hindi and English, category tradition, and URL slug"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Site Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Mahavira Nirvana Sthal (Pawapuri)"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Site Name (Hindi)
                    </label>
                    <input
                      type="text"
                      value={formNameHi}
                      onChange={(e) => setFormNameHi(e.target.value)}
                      placeholder="उदा. भगवान महावीर निर्वाण स्थल (पावापुरी)"
                      className="w-full px-3 py-2 text-sm font-hindi border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tradition & Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setFormCategory(newCat);
                        if (newCat === "Buddhist Heritage") {
                          setFormHeritageZone("kushinagar");
                        } else if (newCat === "Jain Heritage") {
                          setFormHeritageZone("fazilnagar");
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {categories.filter((c) => c !== "All").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Website Tab / Heritage Axis <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formHeritageZone}
                      onChange={(e) => setFormHeritageZone(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="fazilnagar">Fazilnagar (Pawanagar Tab)</option>
                      <option value="kushinagar">Kushinagar (Mahaparinirvana Tab)</option>
                      <option value="both">Both Tabs (Twin Sacred Bond)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      URL Slug
                    </label>
                    <input
                      type="text"
                      value={formSlug}
                      onChange={(e) => setFormSlug(e.target.value)}
                      placeholder="e.g. mahavira-nirvana-sthal-pawapuri"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 2: Narrative & Significance */}
              <FormSection
                icon={Sparkles}
                title="Historical Significance & Narrative"
                description="Provide authentic historical narratives connecting Fazilnagar/Pawa and Kushinagar"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Historical Significance Summary
                    </label>
                    <input
                      type="text"
                      value={formSignificance}
                      onChange={(e) => setFormSignificance(e.target.value)}
                      placeholder="Brief headline significance (e.g. Traditional final discourse and Nirvana site of 24th Tirthankara)"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Comprehensive Historical Narrative <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={formNarrative}
                      onChange={(e) => setFormNarrative(e.target.value)}
                      placeholder="Detailed architectural, historical, and spiritual narrative for visitors and researchers..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 3: Location & Coordinates */}
              <FormSection
                icon={MapPin}
                title="Location, Timing & Coordinates"
                description="Precise coordinates ensure map markers accurately represent the site on public maps"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Distance from Fazilnagar Center
                    </label>
                    <input
                      type="text"
                      value={formDistance}
                      onChange={(e) => setFormDistance(e.target.value)}
                      placeholder="e.g. Within Fazilnagar / 0 km or 18 km north"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Address / Landmark
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="e.g. Pawapuri Mandir Marg, Fazilnagar, 274401"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Visiting Hours
                    </label>
                    <input
                      type="text"
                      value={formHours}
                      onChange={(e) => setFormHours(e.target.value)}
                      placeholder="e.g. 06:00 AM – 07:00 PM"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Entry Fee
                    </label>
                    <input
                      type="text"
                      value={formFee}
                      onChange={(e) => setFormFee(e.target.value)}
                      placeholder="e.g. Free Admission"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Latitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                      placeholder="26.6827"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Longitude <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                      placeholder="84.0498"
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 4: Imagery */}
              <FormSection
                icon={ImageIcon}
                title="Photographs & Gallery"
                description="Primary cover photography and supplementary photo archive"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Primary Cover Image URL
                    </label>
                    <ImageUploader
                      value={formPrimaryImage}
                      onChange={setFormPrimaryImage}
                      onPickFromLibrary={() => setMediaPickerOpen(true)}
                      label="Cover Photograph"
                      aspectRatio="16:9"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Photo Gallery Items (One per line format: <code className="text-blue-600">URL | Caption | Credit</code>)
                    </label>
                    <textarea
                      rows={3}
                      value={formGalleryText}
                      onChange={(e) => setFormGalleryText(e.target.value)}
                      placeholder="https://example.com/photo1.jpg | Main Temple Shikhar | Archeological Survey&#10;https://example.com/photo2.jpg | Ancient Inscription Pillar | Town Archives"
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Section 5: Highlights and Status */}
              <FormSection
                icon={Globe}
                title="Publishing & Highlighting Controls"
                description="Control visibility on the Twin Heritage public portal and town highlights"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formIsTwinHighlight}
                      onChange={(e) => setFormIsTwinHighlight(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded-sm border-slate-300 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Twin Heritage Highlight</div>
                      <div className="text-[11px] text-slate-500">Feature prominently on the homepage twin circuit</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={formIsPublished}
                      onChange={(e) => setFormIsPublished(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Published to Public</div>
                      <div className="text-[11px] text-slate-500">Visible to town citizens and tourists</div>
                    </div>
                  </label>
                </div>
              </FormSection>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingSite ? "Save Changes" : "Create Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {mediaPickerOpen && (
        <MediaPicker
          onSelect={(url) => {
            setFormPrimaryImage(url);
            setMediaPickerOpen(false);
          }}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Heritage Site?"
        message={`Are you sure you want to permanently delete "${siteToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Site"
        variant="danger"
      />
    </div>
  );
}
