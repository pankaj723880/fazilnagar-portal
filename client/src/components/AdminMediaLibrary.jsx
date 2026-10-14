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
  RefreshCw,
  CheckCircle,
  FileImage,
  ExternalLink,
  Tag,
  Info,
} from "lucide-react";

export default function AdminMediaLibrary() {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [copiedId, setCopiedId] = useState(null);

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
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("Only image files (JPEG, PNG, WebP) are allowed.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("File size cannot exceed 10MB.");
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
      showToast("Please choose an image file to upload.");
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
        showToast("Image uploaded to media library!");
        // Reset form
        setSelectedFile(null);
        setPreviewUrl("");
        setMediaTitle("");
        setMediaAlt("");
        setMediaCaption("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (err) {
      showToast("Upload failed: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    showToast("URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this media item?")) return;
    const token = getAuthToken();
    try {
      await API.delete(`/media/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMediaList((prev) => prev.filter((m) => m._id !== id));
      showToast("Media item removed.");
    } catch (err) {
      showToast("Delete failed: " + err.message);
    }
  };

  const filtered = mediaList.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.title?.toLowerCase().includes(q) ||
      m.altText?.toLowerCase().includes(q) ||
      m.tags?.some((t) => t.toLowerCase().includes(q))
    );
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
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mb-1">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Digital Media Assets</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Town Media Library & Asset Storage
          </h2>
          <p className="text-xs text-slate-500">
            Upload images for hero slides, directory listings, public notices, and twin heritage stories. Copy URLs with one click.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-blue-600" />
          <span>Upload New Image</span>
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* File drop area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50 hover:bg-blue-50/50 min-h-[140px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              {previewUrl ? (
                <div className="relative w-full h-28">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain rounded-lg"
                  />
                  <span className="text-[10px] text-blue-600 font-bold block mt-1">
                    Click to change
                  </span>
                </div>
              ) : (
                <>
                  <FileImage className="w-8 h-8 text-slate-400 mb-1" />
                  <p className="text-xs font-bold text-slate-700">Choose or drop image file</p>
                  <p className="text-[10px] text-slate-400">JPEG, PNG, WebP up to 10MB</p>
                </>
              )}
            </div>

            {/* Title & Alt */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Title / Name
                </label>
                <input
                  type="text"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  placeholder="e.g. Pawapuri Mandir Front View"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Alt Text (SEO & Accessibility)
                </label>
                <input
                  type="text"
                  value={mediaAlt}
                  onChange={(e) => setMediaAlt(e.target.value)}
                  placeholder="Descriptive text for visually impaired"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Caption & Tags & Submit */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Caption / Credit
                </label>
                <input
                  type="text"
                  value={mediaCaption}
                  onChange={(e) => setMediaCaption(e.target.value)}
                  placeholder="e.g. Photo by Nagar Panchayat"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={mediaTags}
                  onChange={(e) => setMediaTags(e.target.value)}
                  placeholder="heritage, hero, temple"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                {uploading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>{uploading ? "Uploading to Cloud..." : "Upload & Save to Library"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search media by title, alt text or tag..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
            <p className="text-xs font-semibold">Loading media library...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <p className="text-xs font-semibold">No media items found.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between group hover:border-blue-400 transition"
            >
              <div className="relative h-36 bg-slate-100 overflow-hidden">
                <img
                  src={item.url}
                  alt={item.altText || item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => handleCopyUrl(item.url, item._id)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedId === item._id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-700 text-white backdrop-blur-xs transition cursor-pointer"
                    title="Delete Media"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <h4 className="text-xs font-extrabold text-[#18232E] truncate" title={item.title}>
                  {item.title}
                </h4>
                {item.altText && (
                  <p className="text-[10px] text-slate-500 truncate" title={item.altText}>
                    Alt: {item.altText}
                  </p>
                )}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>
                    {item.fileSizeBytes
                      ? `${(item.fileSizeBytes / 1024).toFixed(0)} KB`
                      : "Cloud"}
                  </span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <span>View</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
