import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Megaphone,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  MousePointer,
  TrendingUp,
  X,
  Play,
  Pause,
  Calendar,
  Layers,
  Monitor
} from "lucide-react";
import PageHeader from "./admin/PageHeader";
import StatCard from "./admin/StatCard";
import SearchAndFilters from "./admin/SearchAndFilters";
import DataTable from "./admin/DataTable";
import StatusBadge from "./admin/StatusBadge";
import FormSection from "./admin/FormSection";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import LoadingSkeleton from "./admin/LoadingSkeleton";
import ImageUploader from "./admin/ImageUploader";
import MediaPicker from "./admin/MediaPicker";

export default function AdminAdvertisementsCMS({ onStatsChange }) {
  const [adsList, setAdsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);

  // Modal State
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Form Fields
  const [adFormTitle, setAdFormTitle] = useState("");
  const [adFormDesc, setAdFormDesc] = useState("");
  const [adFormFormat, setAdFormFormat] = useState("floating");
  const [adFormPlacement, setAdFormPlacement] = useState("bottom-right");
  const [adFormFrequency, setAdFormFrequency] = useState("once-per-session");
  const [adFormInterval, setAdFormInterval] = useState(60);
  const [adFormCtaText, setAdFormCtaText] = useState("Learn More");
  const [adFormUrl, setAdFormUrl] = useState("");
  const [adFormDestUrl, setAdFormDestUrl] = useState("");
  const [adFormStart, setAdFormStart] = useState("");
  const [adFormEnd, setAdFormEnd] = useState("");
  const [adFormActive, setAdFormActive] = useState(true);
  const [adFormPublished, setAdFormPublished] = useState(true);
  const [adFormIsPermanent, setAdFormIsPermanent] = useState(false);
  const [adFormSubmitting, setAdFormSubmitting] = useState(false);

  // Confirmation & Preview
  const [deleteConfirmAd, setDeleteConfirmAd] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await API.get("/advertisements/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(res.data)) {
        setAdsList(res.data);
      }
    } catch (err) {
      console.warn("Fetch ads error:", err);
      showToast("error", "Failed to load advertisements.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const openCreateAdModal = (defaultFormat = "floating", isPermanent = false) => {
    setEditingAd(null);
    setAdFormTitle("");
    setAdFormDesc("");
    setAdFormFormat(defaultFormat);
    setAdFormPlacement("bottom-right");
    setAdFormFrequency(isPermanent ? "permanent" : "always");
    setAdFormInterval(60);
    setAdFormCtaText("Learn More");
    setAdFormUrl("");
    setAdFormDestUrl("");
    setAdFormStart("");
    setAdFormEnd("");
    setAdFormActive(true);
    setAdFormPublished(true);
    setAdFormIsPermanent(isPermanent);
    setAdModalOpen(true);
  };

  const openEditAdModal = (ad) => {
    setEditingAd(ad);
    setAdFormTitle(ad.title || "");
    setAdFormDesc(ad.description || "");
    setAdFormFormat(ad.format || "floating");
    setAdFormPlacement(ad.placement || "bottom-right");
    setAdFormFrequency(ad.frequency || (ad.isPermanent ? "permanent" : "always"));
    setAdFormInterval(ad.redisplayIntervalMinutes || 60);
    setAdFormCtaText(ad.ctaText || "Learn More");
    setAdFormUrl(ad.imageUrl || "");
    setAdFormDestUrl(ad.destinationUrl || "");
    setAdFormStart(ad.startDate ? new Date(ad.startDate).toISOString().slice(0, 16) : "");
    setAdFormEnd(ad.endDate ? new Date(ad.endDate).toISOString().slice(0, 16) : "");
    setAdFormActive(ad.isActive !== false);
    setAdFormPublished(ad.isPublished === true);
    setAdFormIsPermanent(Boolean(ad.isPermanent || ad.frequency === "permanent"));
    setAdModalOpen(true);
  };

  const handleSaveAd = async (e) => {
    e.preventDefault();
    if (!adFormTitle.trim()) {
      showToast("warning", "Please enter an advertisement title.");
      return;
    }

    if (!adFormUrl.trim()) {
      showToast("warning", "Please provide a banner image or select from media library.");
      return;
    }

    setAdFormSubmitting(true);
    const token = getAuthToken();

    try {
      const payload = {
        title: adFormTitle.trim(),
        description: adFormDesc.trim(),
        format: adFormFormat,
        placement: adFormPlacement,
        frequency: adFormFrequency,
        redisplayIntervalMinutes: parseInt(adFormInterval, 10) || 60,
        ctaText: adFormCtaText.trim() || "Learn More",
        destinationUrl: adFormDestUrl.trim(),
        imageUrl: adFormUrl.trim(),
        isActive: adFormActive,
        isPublished: adFormPublished,
        isPermanent: adFormIsPermanent,
      };

      if (adFormStart) payload.startDate = adFormStart;
      if (adFormEnd) payload.endDate = adFormEnd;

      if (editingAd) {
        const res = await API.put(`/advertisements/${editingAd._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAdsList((prev) =>
          prev.map((a) => (a._id === editingAd._id ? res.data?.ad || a : a))
        );
        showToast("success", "Advertisement updated successfully.");
      } else {
        const res = await API.post("/advertisements", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.ad) {
          setAdsList((prev) => [res.data.ad, ...prev]);
        }
        showToast("success", "Advertisement created successfully.");
      }
      setAdModalOpen(false);
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Save ad error:", err);
      showToast("error", err.response?.data?.message || "Failed to save advertisement.");
    } finally {
      setAdFormSubmitting(false);
    }
  };

  const handleToggleAdPublish = async (ad) => {
    const token = getAuthToken();
    const nextVal = !ad.isPublished;

    try {
      await API.patch(
        `/advertisements/${ad._id}/publish`,
        { isPublished: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdsList((prev) =>
        prev.map((a) => (a._id === ad._id ? { ...a, isPublished: nextVal } : a))
      );
      showToast("success", `Advertisement ${nextVal ? "published live" : "unpublished"}.`);
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Toggle ad publish error:", err);
      showToast("error", "Failed to update publication status.");
    }
  };

  const handleToggleAdActive = async (ad) => {
    const token = getAuthToken();
    const nextVal = !ad.isActive;

    try {
      await API.patch(
        `/advertisements/${ad._id}/toggle`,
        { isActive: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAdsList((prev) =>
        prev.map((a) => (a._id === ad._id ? { ...a, isActive: nextVal } : a))
      );
      showToast("success", `Advertisement ${nextVal ? "enabled" : "disabled"}.`);
    } catch (err) {
      console.error("Toggle ad active error:", err);
      showToast("error", "Failed to toggle active status.");
    }
  };

  const confirmDeleteAd = async () => {
    if (!deleteConfirmAd) return;
    const token = getAuthToken();

    try {
      await API.delete(`/advertisements/${deleteConfirmAd._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdsList((prev) => prev.filter((a) => a._id !== deleteConfirmAd._id));
      showToast("success", "Advertisement deleted permanently.");
      setDeleteDialogOpen(false);
      setDeleteConfirmAd(null);
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Delete ad error:", err);
      showToast("error", "Failed to delete advertisement.");
    }
  };

  // Real Metric Calculations
  const now = new Date();
  const liveAdsCount = adsList.filter((a) => {
    if (!a.isActive || !a.isPublished) return false;
    if (a.startDate && new Date(a.startDate) > now) return false;
    if (a.endDate && new Date(a.endDate) < now) return false;
    return true;
  }).length;

  const totalImpressions = adsList.reduce((acc, a) => acc + (a.impressions || 0), 0);
  const totalClicks = adsList.reduce((acc, a) => acc + (a.clicks || 0), 0);
  const totalDismissals = adsList.reduce((acc, a) => acc + (a.dismissals || 0), 0);
  const overallCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  // Filter Ads
  const filteredAds = adsList.filter((a) => {
    if (formatFilter !== "all" && a.format !== formatFilter) return false;
    if (statusFilter === "live") {
      if (!a.isActive || !a.isPublished) return false;
      if (a.startDate && new Date(a.startDate) > now) return false;
      if (a.endDate && new Date(a.endDate) < now) return false;
    } else if (statusFilter === "paused") {
      if (a.isActive) return false;
    } else if (statusFilter === "draft") {
      if (a.isPublished) return false;
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = a.title?.toLowerCase().includes(q);
      const matchDesc = a.description?.toLowerCase().includes(q);
      const matchFormat = a.format?.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchFormat;
    }
    return true;
  });

  const columns = [
    {
      key: "title",
      label: "Advertisement & Sponsor",
      sortable: true,
      render: (ad) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
            {ad.imageUrl ? (
              <img src={ad.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Megaphone className="w-5 h-5" />
              </div>
            )}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>{ad.title}</span>
              {ad.isPermanent && (
                <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-bold">
                  Permanent
                </span>
              )}
            </div>
            {ad.description && (
              <div className="text-xs text-slate-500 max-w-xs truncate mt-0.5">{ad.description}</div>
            )}
            {ad.destinationUrl && (
              <a
                href={ad.destinationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5 mt-0.5"
              >
                <span>{ad.destinationUrl}</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "format",
      label: "Format & Placement",
      sortable: true,
      render: (ad) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-800 capitalize bg-slate-100 px-2 py-0.5 rounded">
            {ad.format || "floating"}
          </span>
          <div className="text-[11px] text-slate-400 mt-1">
            Pos: {ad.placement || "bottom-right"}
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      label: "Schedule",
      render: (ad) => {
        if (ad.isPermanent) {
          return <span className="text-xs font-semibold text-purple-700">Always Active</span>;
        }
        return (
          <div className="text-[11px] text-slate-600 space-y-0.5">
            <div>From: {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : "Immediate"}</div>
            <div>Until: {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : "No expiry"}</div>
          </div>
        );
      },
    },
    {
      key: "analytics",
      label: "Real Analytics",
      render: (ad) => {
        const ctr = (ad.impressions || 0) > 0 ? (((ad.clicks || 0) / ad.impressions) * 100).toFixed(1) : "0.0";
        return (
          <div className="text-xs space-y-0.5">
            <div className="font-bold text-slate-800">{ad.impressions || 0} <span className="font-normal text-slate-400 text-[11px]">views</span></div>
            <div className="text-slate-600">{ad.clicks || 0} <span className="text-slate-400 text-[11px]">clicks ({ctr}%)</span></div>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (ad) => {
        if (!ad.isPublished) return <StatusBadge status="draft" />;
        if (!ad.isActive) return <StatusBadge status="archived" label="Paused" />;
        return <StatusBadge status="live" label="Live" />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (ad) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setPreviewAd(ad)}
            title="Preview Advertisement"
            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleAdActive(ad)}
            title={ad.isActive ? "Pause Advertisement" : "Enable Advertisement"}
            className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
          >
            {ad.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-600" />}
          </button>
          <button
            onClick={() => handleToggleAdPublish(ad)}
            title={ad.isPublished ? "Unpublish Ad" : "Publish Ad Live"}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {ad.isPublished ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-emerald-600" />}
          </button>
          <button
            onClick={() => openEditAdModal(ad)}
            title="Edit Advertisement"
            className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setDeleteConfirmAd(ad);
              setDeleteDialogOpen(true);
            }}
            title="Delete Advertisement"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
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

      {/* Page Header */}
      <PageHeader
        icon={Megaphone}
        title="Advertisements & Sponsor Registry"
        subtitle="Manage town business banners, floating notices, permanent civic promotions, and real CTR analytics"
        badgeText={`${adsList.length} Total Campaigns`}
        primaryAction={{
          label: "Create Advertisement",
          icon: Plus,
          onClick: () => openCreateAdModal("floating", false),
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Directory Management" },
          { label: "Advertisements" },
        ]}
      />

      {/* Real Analytics Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Megaphone}
          label="Active Campaigns"
          value={liveAdsCount}
          helperText="Currently live on portal"
          color="blue"
        />
        <StatCard
          icon={Eye}
          label="Total Impressions"
          value={totalImpressions.toLocaleString()}
          helperText="Verified session displays"
          color="indigo"
        />
        <StatCard
          icon={MousePointer}
          label="Total Click-Throughs"
          value={totalClicks.toLocaleString()}
          helperText="Direct visitor engagements"
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Average CTR"
          value={`${overallCtr}%`}
          helperText="Click conversion rate"
          color="amber"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchAndFilters
          searchPlaceholder="Search campaigns by business name or description..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "format",
              label: "Format",
              value: formatFilter,
              options: [
                { label: "All Formats", value: "all" },
                { label: "Floating Corner", value: "floating" },
                { label: "Sticky Bottom", value: "sticky-bottom" },
                { label: "Sticky Top", value: "sticky-top" },
                { label: "Billboard Banner", value: "banner" },
              ],
              onChange: setFormatFilter,
            },
            {
              id: "status",
              label: "Status",
              value: statusFilter,
              options: [
                { label: "All Statuses", value: "all" },
                { label: "Currently Live", value: "live" },
                { label: "Paused", value: "paused" },
                { label: "Draft", value: "draft" },
              ],
              onChange: setStatusFilter,
            },
          ]}
          onReset={() => {
            setSearch("");
            setFormatFilter("all");
            setStatusFilter("all");
          }}
          totalResults={filteredAds.length}
        />
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={5} />
      ) : filteredAds.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Advertisements Found"
          description={
            search || formatFilter !== "all" || statusFilter !== "all"
              ? "No advertising campaigns match your filter criteria. Try clearing search filters."
              : "No sponsor advertisements configured yet. Click Create Advertisement to launch your first banner."
          }
          actionLabel="Create Advertisement"
          onAction={() => openCreateAdModal("floating", false)}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredAds}
          keyField="_id"
          defaultSortKey="title"
        />
      )}

      {/* Create / Edit Modal */}
      {adModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingAd ? "Edit Advertisement" : "Create New Advertisement"}
                  </h3>
                  <p className="text-xs text-slate-500">Configure format, placement, schedule, and sponsor imagery</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAd} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Format selection */}
              <FormSection
                icon={Layers}
                title="Advertisement Display Format"
                description="Choose the visual layout for the advertisement"
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: "floating", label: "Floating Card", desc: "Non-intrusive bottom corner modal" },
                    { id: "sticky-bottom", label: "Sticky Bottom", desc: "Docked bottom ribbon banner" },
                    { id: "sticky-top", label: "Sticky Top", desc: "Docked header announcement bar" },
                    { id: "banner", label: "In-Feed Banner", desc: "Embedded within content sections" },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setAdFormFormat(fmt.id)}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        adFormFormat === fmt.id
                          ? "border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="font-bold text-xs text-slate-900">{fmt.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </FormSection>

              {/* Basic Details */}
              <FormSection
                icon={Megaphone}
                title="Campaign & Sponsor Information"
                description="Business name, headline, destination link, and CTA button"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Campaign Title / Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={adFormTitle}
                      onChange={(e) => setAdFormTitle(e.target.value)}
                      placeholder="e.g. Anand Diagnostic Center - 24x7 Pathology"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description / Subtitle
                    </label>
                    <input
                      type="text"
                      value={adFormDesc}
                      onChange={(e) => setAdFormDesc(e.target.value)}
                      placeholder="Special opening discount on all health packages this month"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CTA Button Text
                    </label>
                    <input
                      type="text"
                      value={adFormCtaText}
                      onChange={(e) => setAdFormCtaText(e.target.value)}
                      placeholder="e.g. Call Now / Book Appointment"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Destination URL / Phone Link
                    </label>
                    <input
                      type="text"
                      value={adFormDestUrl}
                      onChange={(e) => setAdFormDestUrl(e.target.value)}
                      placeholder="https://example.com or tel:+919876543210"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Banner Image */}
              <FormSection
                icon={Monitor}
                title="Advertisement Banner Graphic"
                description="Visual asset displayed in the ad slot"
              >
                <ImageUploader
                  value={adFormUrl}
                  onChange={setAdFormUrl}
                  onPickFromLibrary={() => setMediaPickerOpen(true)}
                  label="Ad Banner Graphic"
                  aspectRatio="16:9"
                />
              </FormSection>

              {/* Scheduling and Rules */}
              <FormSection
                icon={Calendar}
                title="Scheduling, Placement & Visibility"
                description="Set display frequency, start/end dates, or mark as permanent"
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Display Placement
                      </label>
                      <select
                        value={adFormPlacement}
                        onChange={(e) => setAdFormPlacement(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="bottom-right">Bottom Right Corner</option>
                        <option value="bottom-left">Bottom Left Corner</option>
                        <option value="center">Screen Center Modal</option>
                        <option value="top">Top Header Bar</option>
                        <option value="bottom">Docked Bottom Ribbon</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Display Frequency Rule
                      </label>
                      <select
                        value={adFormFrequency}
                        onChange={(e) => setAdFormFrequency(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="always">Always on page load</option>
                        <option value="once-per-session">Once per browser session</option>
                        <option value="timed-interval">Timed Interval Redisplay</option>
                        <option value="permanent">Permanent (Always Active)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Campaign Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={adFormStart}
                        onChange={(e) => setAdFormStart(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Campaign Expiry Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={adFormEnd}
                        onChange={(e) => setAdFormEnd(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adFormIsPermanent}
                        onChange={(e) => setAdFormIsPermanent(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-800">Permanent Ad</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adFormActive}
                        onChange={(e) => setAdFormActive(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-800">Enabled (Active)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adFormPublished}
                        onChange={(e) => setAdFormPublished(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-800">Published Live</span>
                    </label>
                  </div>
                </div>
              </FormSection>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adFormSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {adFormSubmitting ? "Saving..." : editingAd ? "Save Changes" : "Create Advertisement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewAd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-bold text-slate-700">Preview: {previewAd.format} format</span>
              <button
                onClick={() => setPreviewAd(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
                {previewAd.imageUrl ? (
                  <img src={previewAd.imageUrl} alt="" className="w-full h-44 object-cover" />
                ) : (
                  <div className="h-40 flex items-center justify-center text-slate-400">
                    <Megaphone className="w-8 h-8" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Sponsored
                    </span>
                    <span className="text-[11px] text-slate-400">Fazilnagar Town Portal</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{previewAd.title}</h4>
                  {previewAd.description && (
                    <p className="text-xs text-slate-600 mt-1">{previewAd.description}</p>
                  )}
                  {previewAd.destinationUrl && (
                    <div className="mt-3">
                      <a
                        href={previewAd.destinationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs"
                      >
                        {previewAd.ctaText || "Learn More"} →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker */}
      {mediaPickerOpen && (
        <MediaPicker
          onSelect={(url) => {
            setAdFormUrl(url);
            setMediaPickerOpen(false);
          }}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirmAd(null);
        }}
        onConfirm={confirmDeleteAd}
        title="Delete Advertisement?"
        message={`Are you sure you want to permanently delete campaign "${deleteConfirmAd?.title}"? If live, it will immediately disappear from the public portal.`}
        confirmLabel="Delete Campaign"
        variant="danger"
      />
    </div>
  );
}
