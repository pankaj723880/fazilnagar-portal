import { useState, useEffect, useRef } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Image as ImageIcon,
  UploadCloud,
  Trash2,
  Copy,
  Check,
  Search,
  ExternalLink,
  Tag,
  Info,
  LayoutGrid,
  Table as TableIcon,
  Plus,
  FileImage,
  Calendar,
  Layers
} from "lucide-react";
import PageHeader from "./admin/PageHeader";
import SearchAndFilters from "./admin/SearchAndFilters";
import DataTable from "./admin/DataTable";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import EmptyState from "./admin/EmptyState";
import LoadingSkeleton from "./admin/LoadingSkeleton";
import FormSection from "./admin/FormSection";

export default function AdminMediaLibrary() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'
  const [toast, setToast] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [showUploadSection, setShowUploadSection] = useState(false);

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Upload Form State
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaAlt, setMediaAlt] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaTags, setMediaTags] = useState("general");

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await API.get("/media", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data?.media)) {
        setMediaList(res.data.media);
      }
    } catch (err) {
      console.warn("Failed to load media items:", err);
      showToast("error", "Failed to load media library items.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("warning", "Only image files (JPEG, PNG, WebP) are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "File size cannot exceed 10MB limit.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (!mediaTitle) {
      setMediaTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast("warning", "Please choose an image file to upload.");
      return;
    }

    setUploading(true);
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", mediaTitle);
    formData.append("altText", mediaAlt);
    formData.append("caption", mediaCaption);
    formData.append("tags", mediaTags);

    try {
      const res = await API.post("/media/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success && res.data?.media) {
        setMediaList((prev) => [res.data.media, ...prev]);
        showToast("success", "Image uploaded successfully to Media Library!");
        // Reset form
        setSelectedFile(null);
        setPreviewUrl("");
        setMediaTitle("");
        setMediaAlt("");
        setMediaCaption("");
        setShowUploadSection(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      showToast("error", "Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast("success", "Image URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const token = getAuthToken();
    try {
      await API.delete(`/media/${itemToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMediaList((prev) => prev.filter((m) => m._id !== itemToDelete._id));
      showToast("success", "Media item removed from library.");
    } catch (err) {
      showToast("error", "Delete failed: " + err.message);
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const filtered = mediaList.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.title?.toLowerCase().includes(q) ||
      m.altText?.toLowerCase().includes(q) ||
      (Array.isArray(m.tags) && m.tags.some((t) => t.toLowerCase().includes(q)))
    );
  });

  const tableColumns = [
    {
      key: "preview",
      label: "Preview",
      render: (val, row) => {
        const m = row || val;
        return (
          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
            {m?.url ? (
              <img src={m.url} alt={m?.altText || m?.title || "Media"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <FileImage className="w-5 h-5" />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "title",
      label: "Media Details",
      sortable: true,
      render: (val, row) => {
        const m = row || val;
        return (
          <div>
            <div className="font-semibold text-slate-900 text-sm">{m?.title || (typeof val === "string" ? val : "Untitled Image")}</div>
            {m?.altText && <div className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{m.altText}</div>}
            <div className="flex items-center gap-1.5 mt-1">
              {Array.isArray(m?.tags) &&
                m.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono"
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          </div>
        );
      },
    },
    {
      key: "format",
      label: "Format & Size",
      render: (val, row) => {
        const m = row || val;
        const fmt = (typeof val === "string" ? val : null) || m?.format || "IMAGE";
        return (
          <div className="text-xs text-slate-600">
            <div className="font-medium text-slate-800 uppercase">{fmt}</div>
            <div className="text-slate-400 mt-0.5">
              {m?.size ? `${(m.size / 1024).toFixed(0)} KB` : "—"}
            </div>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      label: "Uploaded",
      sortable: true,
      render: (val, row) => {
        const m = row || val;
        const dt = m?.createdAt || val;
        return (
          <div className="text-xs text-slate-500">
            {dt ? new Date(dt).toLocaleDateString() : "—"}
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      align: "right",
      render: (val, row) => {
        const m = row || val;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => handleCopyUrl(m?.url, m?._id)}
              title="Copy URL"
              className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              {copiedId === m?._id ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            {m?.url && (
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                title="View Full Resolution"
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => {
                setItemToDelete(m);
                setDeleteDialogOpen(true);
              }}
              title="Delete from Library"
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
        icon={ImageIcon}
        title="Media Library"
        subtitle="Manage town portal assets, hero banners, site logos, and historical photography"
        badgeText={`${mediaList.length} Files`}
        primaryAction={{
          label: showUploadSection ? "Close Uploader" : "Upload Image",
          icon: showUploadSection ? FileImage : Plus,
          onClick: () => setShowUploadSection(!showUploadSection),
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Media Library" },
        ]}
      />

      {/* Upload Drawer / Section */}
      {showUploadSection && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 bg-blue-50/20 shadow-xs animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Upload Media Asset</h3>
                <p className="text-xs text-slate-500">Supports JPEG, PNG, and WebP up to 10MB</p>
              </div>
            </div>
            <button
              onClick={() => setShowUploadSection(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Drop / Select zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition bg-white hover:bg-blue-50/40 min-h-[160px]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewUrl ? (
                  <div className="relative w-full h-36 flex flex-col items-center justify-center">
                    <img
                      src={previewUrl}
                      alt="Upload Preview"
                      className="max-h-28 max-w-full object-contain rounded-lg shadow-xs"
                    />
                    <span className="text-xs text-blue-600 font-semibold mt-2">
                      Click to choose another file
                    </span>
                  </div>
                ) : (
                  <>
                    <FileImage className="w-10 h-10 text-blue-400 mb-2" />
                    <p className="text-xs font-bold text-slate-800">Choose or drag image file</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">JPEG, PNG, WebP up to 10MB</p>
                  </>
                )}
              </div>

              {/* Metadata Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Image Title / Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mediaTitle}
                    onChange={(e) => setMediaTitle(e.target.value)}
                    placeholder="e.g. Mahavira Nirvana Sthal Main Shikhar"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alt Text (Accessibility & SEO)
                  </label>
                  <input
                    type="text"
                    value={mediaAlt}
                    onChange={(e) => setMediaAlt(e.target.value)}
                    placeholder="Concise description for screen readers"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Caption or Credit
                  </label>
                  <input
                    type="text"
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Photo credits or town archive reference"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={mediaTags}
                    onChange={(e) => setMediaTags(e.target.value)}
                    placeholder="heritage, hero, temple, event"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowUploadSection(false);
                  setSelectedFile(null);
                  setPreviewUrl("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <UploadCloud className="w-4 h-4 animate-bounce" />
                    <span>Uploading to Storage...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Confirm & Upload Asset</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and View Switcher */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1">
          <SearchAndFilters
            searchPlaceholder="Search media by title, alt text, or tag..."
            searchValue={search}
            onSearchChange={setSearch}
            onReset={() => setSearch("")}
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

      {/* Content */}
      {loading ? (
        <LoadingSkeleton type={viewMode === "table" ? "table" : "cards"} rows={5} count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No Media Assets Found"
          description={
            search
              ? "No images match your search query. Try searching with different keywords."
              : "No media assets stored yet. Upload your first image to populate the library."
          }
          actionLabel="Upload Media"
          onAction={() => setShowUploadSection(true)}
        />
      ) : viewMode === "table" ? (
        <DataTable
          columns={tableColumns}
          data={filtered}
          keyField="_id"
          defaultSortKey="createdAt"
          defaultSortDirection="desc"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div
              key={item._id}
              className="group relative bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col"
            >
              {/* Image Container */}
              <div className="relative aspect-square bg-slate-100 overflow-hidden">
                <img
                  src={item.url}
                  alt={item.altText || item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                  <button
                    onClick={() => handleCopyUrl(item.url, item._id)}
                    title="Copy URL"
                    className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm hover:scale-110 transition-transform"
                  >
                    {copiedId === item._id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Full Resolution"
                    className="p-2 bg-white/90 hover:bg-white text-slate-800 rounded-lg shadow-sm hover:scale-110 transition-transform"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => {
                      setItemToDelete(item);
                      setDeleteDialogOpen(true);
                    }}
                    title="Delete Image"
                    className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:scale-110 transition-transform"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Footer info */}
              <div className="p-2.5">
                <div className="font-semibold text-slate-900 text-xs truncate" title={item.title}>
                  {item.title || "Untitled Image"}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{item.format ? item.format.toUpperCase() : "IMG"}</span>
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ""}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Media Asset?"
        message={`Are you sure you want to delete "${itemToDelete?.title || "this image"}" from storage? Modules relying on this URL might display broken links.`}
        confirmLabel="Delete Asset"
        variant="danger"
      />
    </div>
  );
}
