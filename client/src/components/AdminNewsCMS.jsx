import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Newspaper,
  Plus,
  Edit3,
  Trash2,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  MapPin,
  Calendar,
  Sparkles,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Layers,
  Smartphone,
  Share2,
  Bookmark
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

export default function AdminNewsCMS({ onStatsChange }) {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [toast, setToast] = useState(null);

  // Modal State
  const [newsModalOpen, setNewsModalOpen] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  // Form Fields
  const [newsFormTitle, setNewsFormTitle] = useState("");
  const [newsFormTitleHi, setNewsFormTitleHi] = useState("");
  const [newsFormSummary, setNewsFormSummary] = useState("");
  const [newsFormContent, setNewsFormContent] = useState("");
  const [newsFormCategory, setNewsFormCategory] = useState("Civic Updates");
  const [newsFormLocation, setNewsFormLocation] = useState("Fazilnagar");
  const [newsFormSource, setNewsFormSource] = useState("Municipal Ward Bureau");
  const [newsFormImageUrl, setNewsFormImageUrl] = useState("");
  const [newsFormImageFile, setNewsFormImageFile] = useState(null);
  const [newsFormVideoUrl, setNewsFormVideoUrl] = useState("");
  const [newsFormVideoFile, setNewsFormVideoFile] = useState(null);
  const [newsFormIsFeatured, setNewsFormIsFeatured] = useState(false);
  const [newsFormIsPublished, setNewsFormIsPublished] = useState(true);
  const [newsFormSubmitting, setNewsFormSubmitting] = useState(false);

  // Delete & Preview State
  const [deleteConfirmNews, setDeleteConfirmNews] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [previewNews, setPreviewNews] = useState(null);

  const categories = [
    "Civic Updates",
    "Heritage & Culture",
    "Development & Infra",
    "Health & Education",
    "Sports & Melas",
    "Announcements",
  ];

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await API.get("/news/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(async () => {
        return await API.get("/news?all=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
      });
      if (Array.isArray(res.data)) {
        setNewsList(res.data);
      }
    } catch (err) {
      console.warn("Fetch news error:", err);
      showToast("error", "Failed to load news articles.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const openCreateNewsModal = () => {
    setEditingNews(null);
    setNewsFormTitle("");
    setNewsFormTitleHi("");
    setNewsFormSummary("");
    setNewsFormContent("");
    setNewsFormCategory("Civic Updates");
    setNewsFormLocation("Fazilnagar");
    setNewsFormSource("Municipal Ward Bureau");
    setNewsFormImageUrl("");
    setNewsFormImageFile(null);
    setNewsFormVideoUrl("");
    setNewsFormVideoFile(null);
    setNewsFormIsFeatured(false);
    setNewsFormIsPublished(true);
    setNewsModalOpen(true);
  };

  const openEditNewsModal = (item) => {
    setEditingNews(item);
    setNewsFormTitle(item.title || "");
    setNewsFormTitleHi(item.titleHi || "");
    setNewsFormSummary(item.summary || item.description || "");
    setNewsFormContent(item.content || item.description || "");
    setNewsFormCategory(item.category || "Civic Updates");
    setNewsFormLocation(item.location || "Fazilnagar");
    setNewsFormSource(item.source || "Town Reporter");
    setNewsFormImageUrl(item.image || item.imageUrl || "");
    setNewsFormImageFile(null);
    setNewsFormVideoUrl(item.video || item.videoUrl || "");
    setNewsFormVideoFile(null);
    setNewsFormIsFeatured(item.isFeatured === true);
    setNewsFormIsPublished(Boolean(item.isPublished && item.status === "approved"));
    setNewsModalOpen(true);
  };

  const handleSaveNews = async (e) => {
    e.preventDefault();
    if (!newsFormTitle.trim()) {
      showToast("warning", "Please enter a news headline.");
      return;
    }
    if (!newsFormSummary.trim()) {
      showToast("warning", "Please provide a concise summary for the Reels card.");
      return;
    }

    setNewsFormSubmitting(true);
    const token = getAuthToken();

    try {
      const formData = new FormData();
      formData.append("title", newsFormTitle.trim());
      formData.append("titleHi", newsFormTitleHi.trim());
      formData.append("summary", newsFormSummary.trim());
      formData.append("description", newsFormSummary.trim());
      formData.append("content", newsFormContent.trim() || newsFormSummary.trim());
      formData.append("category", newsFormCategory);
      formData.append("location", newsFormLocation.trim());
      formData.append("source", newsFormSource.trim());
      formData.append("isFeatured", newsFormIsFeatured);
      formData.append("isPublished", newsFormIsPublished);
      formData.append("status", newsFormIsPublished ? "approved" : "draft");

      if (newsFormImageFile) {
        formData.append("image", newsFormImageFile);
      } else if (newsFormImageUrl && !newsFormImageUrl.startsWith("blob:")) {
        formData.append("imageUrl", newsFormImageUrl.trim());
      }

      if (newsFormVideoFile) {
        formData.append("video", newsFormVideoFile);
      } else if (newsFormVideoUrl && !newsFormVideoUrl.startsWith("blob:")) {
        formData.append("videoUrl", newsFormVideoUrl.trim());
      }

      const headers = { Authorization: `Bearer ${token}` };

      if (editingNews) {
        const res = await API.put(`/news/${editingNews._id}`, formData, { headers });
        setNewsList((prev) =>
          prev.map((n) => (n._id === editingNews._id ? res.data?.article || res.data || n : n))
        );
        showToast("success", "News story updated successfully.");
      } else {
        const res = await API.post("/news", formData, { headers });
        if (res.data?._id || res.data?.article) {
          setNewsList((prev) => [res.data?.article || res.data, ...prev]);
        }
        showToast("success", "News story published to town portal.");
      }
      setNewsModalOpen(false);
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Save news error:", err);
      showToast("error", err.response?.data?.message || "Failed to save article.");
    } finally {
      setNewsFormSubmitting(false);
    }
  };

  const handleToggleNewsFeatured = async (story) => {
    const token = getAuthToken();
    const nextVal = !story.isFeatured;

    try {
      await API.patch(
        `/news/${story._id}/feature`,
        { isFeatured: nextVal },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewsList((prev) =>
        prev.map((n) => (n._id === story._id ? { ...n, isFeatured: nextVal } : n))
      );
      showToast("success", `Article ${nextVal ? "pinned to top ⭐" : "unpinned"}.`);
    } catch (err) {
      console.error("Toggle featured error:", err);
      showToast("error", "Failed to toggle pinned status.");
    }
  };

  const handleToggleNewsPublish = async (story) => {
    const token = getAuthToken();
    const isCurrentlyLive = Boolean(story.isPublished && story.status === "approved");
    const nextVal = !isCurrentlyLive;
    const nextStatus = nextVal ? "approved" : "draft";

    try {
      await API.patch(
        `/news/${story._id}/publish`,
        { isPublished: nextVal, status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewsList((prev) =>
        prev.map((n) =>
          n._id === story._id
            ? { ...n, isPublished: nextVal, status: nextStatus }
            : n
        )
      );
      showToast("success", `Article ${nextVal ? "published live" : "moved to drafts"}.`);
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Toggle publish error:", err);
      showToast("error", "Failed to toggle publication status.");
    }
  };

  const confirmDeleteNews = async () => {
    if (!deleteConfirmNews) return;
    const token = getAuthToken();

    try {
      await API.delete(`/news/${deleteConfirmNews._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewsList((prev) => prev.filter((n) => n._id !== deleteConfirmNews._id));
      showToast("success", "News story permanently deleted.");
      setDeleteDialogOpen(false);
      setDeleteConfirmNews(null);
      if (onStatsChange) onStatsChange();
    } catch (err) {
      console.error("Delete news error:", err);
      showToast("error", "Failed to delete news article.");
    }
  };

  // Metrics
  const publishedCount = newsList.filter((n) => n.isPublished && n.status === "approved").length;
  const featuredCount = newsList.filter((n) => n.isFeatured).length;
  const draftCount = newsList.filter((n) => !n.isPublished || n.status !== "approved").length;

  // Filter
  const filteredNews = newsList.filter((item) => {
    const isLive = Boolean(item.isPublished && item.status === "approved");
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (statusFilter === "published" && !isLive) return false;
    if (statusFilter === "draft" && isLive) return false;
    if (statusFilter === "featured" && !item.isFeatured) return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchTitleHi = item.titleHi?.toLowerCase().includes(q);
      const matchSummary = item.summary?.toLowerCase().includes(q);
      const matchSource = item.source?.toLowerCase().includes(q);
      const matchLoc = item.location?.toLowerCase().includes(q);
      return matchTitle || matchTitleHi || matchSummary || matchSource || matchLoc;
    }
    return true;
  });

  const columns = [
    {
      key: "title",
      label: "Story & Headline",
      sortable: true,
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
            {item.image || item.imageUrl ? (
              <img src={item.image || item.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <Newspaper className="w-5 h-5" />
              </div>
            )}
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <span>{item.title}</span>
              {item.isFeatured && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Pinned
                </span>
              )}
            </div>
            {item.titleHi && (
              <div className="text-xs text-slate-500 font-hindi mt-0.5">{item.titleHi}</div>
            )}
            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">
              {item.summary || item.description}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Category & Source",
      sortable: true,
      render: (val, row) => {
        const item = row || val;
        const cat = (typeof val === "string" ? val : null) || item?.category || "General";
        return (
          <div className="text-xs">
            <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
              {cat}
            </span>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>By: {item?.source || "Reporter"}</span>
              {item?.location && <span>• {item.location}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: "date",
      label: "Published Date",
      sortable: true,
      render: (val, row) => {
        const item = row || val;
        const dt = item?.createdAt || val;
        return (
          <div className="text-xs text-slate-600">
            <div>{dt ? new Date(dt).toLocaleDateString() : "—"}</div>
            <div className="text-[11px] text-slate-400">
              {dt ? new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (val, row) => {
        const item = row || val;
        const isLive = Boolean(item?.isPublished && item?.status === "approved");
        return <StatusBadge status={isLive ? "published" : "draft"} />;
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (val, row) => {
        const item = row || val;
        const isLive = Boolean(item?.isPublished && item?.status === "approved");
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setPreviewNews(item)}
              title="Preview Reels card"
              className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleToggleNewsFeatured(item)}
              title={item?.isFeatured ? "Unpin story" : "Pin to top"}
              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
            >
              <Star
                className={`w-4 h-4 ${
                  item?.isFeatured ? "fill-amber-500 text-amber-500" : "text-slate-400"
                }`}
              />
            </button>
            <button
              onClick={() => handleToggleNewsPublish(item)}
              title={isLive ? "Move to drafts" : "Publish live"}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {isLive ? (
                <EyeOff className="w-4 h-4 text-amber-600" />
              ) : (
                <Eye className="w-4 h-4 text-emerald-600" />
              )}
            </button>
            <button
              onClick={() => openEditNewsModal(item)}
              title="Edit story"
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setDeleteConfirmNews(item);
                setDeleteDialogOpen(true);
              }}
              title="Delete story"
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

      {/* Page Header */}
      <PageHeader
        icon={Newspaper}
        title="News & Civic Reels Studio"
        subtitle="Publish town dispatches, official circulars, development bulletins, and fast-scroll mobile reels"
        badgeText={`${newsList.length} Articles`}
        primaryAction={{
          label: "Create News Story",
          icon: Plus,
          onClick: openCreateNewsModal,
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Website & Content" },
          { label: "News & Reels" },
        ]}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Newspaper}
          label="Total Articles"
          value={newsList.length}
          helperText="All recorded town bulletins"
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Published Live"
          value={publishedCount}
          helperText="Visible on public portal"
          color="emerald"
        />
        <StatCard
          icon={Star}
          label="Pinned Headlines"
          value={featuredCount}
          helperText="Featured at top of feed"
          color="amber"
        />
        <StatCard
          icon={Clock}
          label="Draft Stories"
          value={draftCount}
          helperText="Awaiting review or edits"
          color="indigo"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <SearchAndFilters
          searchPlaceholder="Search headlines, summaries, sources, or reporters..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              id: "category",
              label: "Category",
              value: categoryFilter,
              options: [
                { label: "All Categories", value: "all" },
                ...categories.map((c) => ({ label: c, value: c })),
              ],
              onChange: setCategoryFilter,
            },
            {
              id: "status",
              label: "Status",
              value: statusFilter,
              options: [
                { label: "All Statuses", value: "all" },
                { label: "Published Live", value: "published" },
                { label: "Drafts Only", value: "draft" },
                { label: "Pinned / Featured", value: "featured" },
              ],
              onChange: setStatusFilter,
            },
          ]}
          onReset={() => {
            setSearch("");
            setCategoryFilter("all");
            setStatusFilter("all");
          }}
          totalResults={filteredNews.length}
        />
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton type="table" rows={5} />
      ) : filteredNews.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No News Stories Found"
          description={
            search || categoryFilter !== "all" || statusFilter !== "all"
              ? "No articles match your search criteria. Try adjusting filters."
              : "No news articles created yet. Click Create News Story to post the first update."
          }
          actionLabel="Create News Story"
          onAction={openCreateNewsModal}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredNews}
          keyField="_id"
          defaultSortKey="date"
          defaultSortDirection="desc"
        />
      )}

      {/* Create / Edit Modal */}
      {newsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingNews ? "Edit News Article" : "Create News Story / Reel"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Draft municipal announcements, Hindi/English headlines, and cover photography
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNews} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Headlines */}
              <FormSection
                icon={Newspaper}
                title="Story Headline & Categorization"
                description="Bilingual titles and topic category"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Headline (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newsFormTitle}
                      onChange={(e) => setNewsFormTitle(e.target.value)}
                      placeholder="e.g. Major Upgrades Completed at Fazilnagar Community Health Center"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Headline (Hindi)
                    </label>
                    <input
                      type="text"
                      value={newsFormTitleHi}
                      onChange={(e) => setNewsFormTitleHi(e.target.value)}
                      placeholder="उदा. फाजिलनगर सामुदायिक स्वास्थ्य केंद्र में आधुनिक वार्डों का लोकार्पण"
                      className="w-full px-3 py-2 text-sm font-hindi border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      News Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newsFormCategory}
                      onChange={(e) => setNewsFormCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Location / Ward
                    </label>
                    <input
                      type="text"
                      value={newsFormLocation}
                      onChange={(e) => setNewsFormLocation(e.target.value)}
                      placeholder="e.g. Fazilnagar Main Town / Ward 04"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Summary and Content */}
              <FormSection
                icon={Layers}
                title="Summary & Full Body Narrative"
                description="Summary appears on mobile reels cards; content opens in full story view"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Brief Summary (Reel Card View) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={newsFormSummary}
                      onChange={(e) => setNewsFormSummary(e.target.value)}
                      placeholder="2-3 crisp sentences summarizing the core development for fast-scroll citizen readers..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Article Body Content
                    </label>
                    <textarea
                      rows={6}
                      value={newsFormContent}
                      onChange={(e) => setNewsFormContent(e.target.value)}
                      placeholder="Complete official news dispatch, press statements, quotes, and background information..."
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reporting Source / Bureau
                    </label>
                    <input
                      type="text"
                      value={newsFormSource}
                      onChange={(e) => setNewsFormSource(e.target.value)}
                      placeholder="e.g. Municipal Administration Press Desk / Amar Ujala Correspondent"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </FormSection>

              {/* Media Attachment (Photo & Video) */}
              <FormSection
                icon={Smartphone}
                title="Cover Photograph & Video Reel"
                description="High quality photograph or video clip for mobile story cards"
              >
                <div className="space-y-4">
                  <ImageUploader
                    value={newsFormImageUrl}
                    onChange={setNewsFormImageUrl}
                    onFileSelect={setNewsFormImageFile}
                    onPickFromLibrary={() => setMediaPickerOpen(true)}
                    label="News Cover Image"
                    aspectRatio="16:9"
                  />

                  <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Video Clip (MP4 / WebM - Optional for Video Reel)
                    </label>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setNewsFormVideoFile(file);
                          setNewsFormVideoUrl("");
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 cursor-pointer"
                    />
                    {newsFormVideoFile && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-blue-700 font-medium">
                        <span>📹 {newsFormVideoFile.name} ({(newsFormVideoFile.size / (1024 * 1024)).toFixed(1)} MB)</span>
                        <button
                          type="button"
                          onClick={() => setNewsFormVideoFile(null)}
                          className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    )}
                    {!newsFormVideoFile && newsFormVideoUrl && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                        <span className="truncate max-w-xs">Current Video: {newsFormVideoUrl}</span>
                        <button
                          type="button"
                          onClick={() => setNewsFormVideoUrl("")}
                          className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer"
                        >
                          ✕ Clear
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </FormSection>

              {/* Status and Pinned controls */}
              <FormSection
                icon={Star}
                title="Publishing & Pinning Controls"
                description="Control visibility and featured status"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={newsFormIsFeatured}
                      onChange={(e) => setNewsFormIsFeatured(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-slate-300"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Pin to Top (Featured Story)</div>
                      <div className="text-[11px] text-slate-500">Keep highlighted at the top of town news feed</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100">
                    <input
                      type="checkbox"
                      checked={newsFormIsPublished}
                      onChange={(e) => setNewsFormIsPublished(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Publish Immediately</div>
                      <div className="text-[11px] text-slate-500">Make visible to all portal visitors</div>
                    </div>
                  </label>
                </div>
              </FormSection>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setNewsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newsFormSubmitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {newsFormSubmitting ? "Saving..." : editingNews ? "Save Changes" : "Publish Story"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Reel Preview Modal */}
      {previewNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-800 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col ring-8 ring-slate-900/30">
            {/* Fake Phone Header */}
            <div className="bg-slate-900 text-white px-5 py-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Civic Reel Preview</span>
              <button
                onClick={() => setPreviewNews(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Reel Card */}
            <div className="relative aspect-[9/14] bg-slate-900 text-white flex flex-col justify-between overflow-hidden">
              {previewNews.image || previewNews.imageUrl ? (
                <img
                  src={previewNews.image || previewNews.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover opacity-60"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-slate-900" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

              {/* Card Header info */}
              <div className="relative z-10 p-4 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-blue-600/90 text-white text-[10px] font-bold">
                  {previewNews.category}
                </span>
                <span className="text-[11px] text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  {previewNews.location || "Fazilnagar"}
                </span>
              </div>

              {/* Card Footer content */}
              <div className="relative z-10 p-5 space-y-2">
                <h3 className="font-extrabold text-base leading-snug drop-shadow-sm">
                  {previewNews.title}
                </h3>
                {previewNews.titleHi && (
                  <p className="text-xs text-slate-300 font-hindi leading-snug">
                    {previewNews.titleHi}
                  </p>
                )}
                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed drop-shadow-xs">
                  {previewNews.summary || previewNews.description}
                </p>
                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10">
                  <span>Source: {previewNews.source || "Reporter"}</span>
                  <span>{new Date(previewNews.createdAt || Date.now()).toLocaleDateString()}</span>
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
            setNewsFormImageUrl(url);
            setMediaPickerOpen(false);
          }}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteConfirmNews(null);
        }}
        onConfirm={confirmDeleteNews}
        title="Delete News Story?"
        message={`Are you sure you want to permanently delete article "${deleteConfirmNews?.title}"? This cannot be undone.`}
        confirmLabel="Delete Story"
        variant="danger"
      />
    </div>
  );
}
