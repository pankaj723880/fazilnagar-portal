import { useState, useEffect } from "react";
import API from "../../api";
import { getAuthToken } from "../../utils/authStorage";
import {
  Image as ImageIcon,
  Search,
  X,
  Upload,
  Check,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

export default function MediaPicker({
  isOpen = false,
  onClose = () => {},
  onSelect = () => {},
  title = "Select Media Asset",
}) {
  const [mediaList, setMediaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen]);

  const fetchMedia = async () => {
    setLoading(true);
    const token = getAuthToken();
    try {
      const res = await API.get("/media", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const items = res.data?.items || res.data?.media || [];
      if (Array.isArray(items)) {
        setMediaList(items);
      }
    } catch (err) {
      console.warn("Failed to load media for picker:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("image", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

    try {
      const res = await API.post("/media/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Let the browser generate boundary automatically
        },
        timeout: 60000,
      });
      const permanentUrl = res.data?.url || res.data?.media?.url;
      if (permanentUrl) {
        onSelect(permanentUrl);
        onClose();
      } else {
        throw new Error("No URL returned from upload server.");
      }
    } catch (err) {
      console.error("Quick upload error:", err);
      alert("Failed to upload image: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const filtered = mediaList.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (m.title && m.title.toLowerCase().includes(q)) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(q))) ||
      (m.filename && m.filename.toLowerCase().includes(q))
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl my-auto bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-2xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#18232E]">
                {title}
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose an existing uploaded image or upload a new one
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? "Uploading..." : "Upload New"}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleQuickUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search images by title or tags..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="p-4 overflow-y-auto flex-1 min-h-[300px]">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
              <p className="text-xs font-semibold">Loading media library...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">No images found</p>
              <p className="text-[11px]">Upload an image using the button above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((item) => (
                <div
                  key={item._id || item.url}
                  onClick={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video cursor-pointer hover:border-blue-500 hover:shadow-md transition"
                >
                  <img
                    src={item.url}
                    alt={item.altText || item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white">
                    <span className="text-[11px] font-bold truncate">
                      {item.title || "Untitled Image"}
                    </span>
                    <span className="text-[9px] text-slate-300">
                      {item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : "Click to select"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>{filtered.length} media assets available</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
