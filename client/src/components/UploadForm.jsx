import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Video as VideoIcon,
  Trash2,
  RefreshCw,
  UploadCloud,
  Film,
  Camera,
  X,
} from "lucide-react";

const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
];

const ALLOWED_VIDEO_MIMES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
];

export default function UploadForm() {
  const token = getAuthToken();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState("");
  const [titleHi, setTitleHi] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [reporterName, setReporterName] = useState("");
  const [locationName, setLocationName] = useState("Fazilnagar");

  // Media state (Photo or Video)
  const [mediaType, setMediaType] = useState("none"); // "none" | "image" | "video"
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [mediaMeta, setMediaMeta] = useState(null); // { name, size, type }
  const [webImageUrl, setWebImageUrl] = useState("");

  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Clear or reset media
  const handleRemoveMedia = () => {
    setSelectedFile(null);
    setMediaPreviewUrl("");
    setMediaMeta(null);
    setMediaType("none");
    setValidationError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Process selected photo or video
  const handleFileSelected = (file) => {
    setValidationError("");
    if (!file) return;

    const mime = (file.type || "").toLowerCase();
    const ext = (file.name || "").split(".").pop().toLowerCase();

    const isImage =
      ALLOWED_IMAGE_MIMES.includes(mime) ||
      file.type.startsWith("image/") ||
      ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(ext);

    const isVideo =
      ALLOWED_VIDEO_MIMES.includes(mime) ||
      file.type.startsWith("video/") ||
      ["mp4", "webm", "mov", "avi", "mkv"].includes(ext);

    if (!isImage && !isVideo) {
      setValidationError(
        "Unsupported media format. Please select an image (JPG, PNG, WebP, GIF) or video (MP4, WebM, MOV)."
      );
      return;
    }

    // Size checks: 15MB for images, 50MB for videos
    const maxSizeBytes = isVideo ? 50 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setValidationError(
        `${isVideo ? "Video" : "Image"} exceeds the maximum allowed size (${
          isVideo ? "50MB" : "15MB"
        }).`
      );
      return;
    }

    setSelectedFile(file);
    // Explicit priority: if it matches image extension or mime, mark as image unless it's strictly a video
    const finalType = isVideo && !isImage ? "video" : "image";
    setMediaType(finalType);
    setMediaMeta({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2) + " MB",
      type: finalType === "video" ? "Video Clip" : "Photograph",
      mime: mime || (finalType === "video" ? `video/${ext}` : `image/${ext}`),
    });

    // Create safe data URL or object URL for local preview
    if (finalType === "image") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      const videoObjectUrl = URL.createObjectURL(file);
      setMediaPreviewUrl(videoObjectUrl);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions

    if (!title.trim()) {
      setValidationError("Please provide a story headline.");
      return;
    }
    if (!description.trim()) {
      setValidationError("Please provide story details/description.");
      return;
    }

    setLoading(true);
    setUploadProgress(10);
    setMessage("");
    setIsSuccess(false);
    setValidationError("");

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("titleHi", titleHi.trim());
    formData.append("description", description.trim());
    formData.append("summary", description.trim().slice(0, 280));
    formData.append("category", category);
    formData.append("location", locationName.trim() || "Fazilnagar");
    formData.append(
      "source",
      reporterName.trim() ? `${reporterName.trim()} (Citizen)` : "Citizen Reporter"
    );

    // Attach media
    if (selectedFile) {
      if (mediaType === "video") {
        formData.append("video", selectedFile);
        formData.append("mediaType", "video");
      } else {
        formData.append("image", selectedFile);
        formData.append("mediaType", "image");
        // Also provide base64 imageUrl as backup if available
        if (mediaPreviewUrl && mediaPreviewUrl.startsWith("data:image/")) {
          formData.append("imageUrl", mediaPreviewUrl);
        }
      }
    } else if (webImageUrl.trim() && !webImageUrl.startsWith("blob:")) {
      formData.append("imageUrl", webImageUrl.trim());
      formData.append("mediaType", "image");
    }

    try {
      const activeToken = getAuthToken();
      if (!activeToken) {
        setValidationError("Authentication required. Please sign in to submit a story.");
        navigate("/login", {
          state: { from: "/create-news", message: "Please log in to submit a local story." },
        });
        return;
      }
      const headers = { Authorization: `Bearer ${activeToken}` };

      const res = await API.post("/news", formData, {
        headers,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(Math.min(95, percent));
          }
        },
      });

      setUploadProgress(100);
      const msg = res.data?.moderationMessage || "Story published live to Fazilnagar News Feed!";
      setMessage(msg);
      setIsSuccess(true);
      setTimeout(() => navigate("/news"), 1800);
    } catch (err) {
      console.error("Submission error:", err);
      setMessage(
        err.response?.data?.message ||
          "Failed to submit story. Please check fields and file size."
      );
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[520px] mx-auto bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200 my-3 sm:my-5">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Citizen Reporter Open Desk</span>
          </span>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Post Town News / समाचार जोड़ें
          </h2>
          <p className="text-xs text-slate-500">
            Submit community news, local stories, photos, and video updates for the town portal.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`p-3 rounded-xl text-xs font-bold mb-3 flex items-center gap-2 ${
            isSuccess
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{message}</span>
        </div>
      )}

      {validationError && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block font-bold text-[#18232E] mb-1">
            News Headline (शीर्षक) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Major Market Gathering or Road Construction near Fazilnagar Crossing"
            className="w-full h-10 sm:h-10.5 px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label className="block font-bold text-[#18232E] mb-1">
            Hindi Headline (हिंदी शीर्षक - Optional)
          </label>
          <input
            type="text"
            value={titleHi}
            onChange={(e) => setTitleHi(e.target.value)}
            placeholder="उदा. फाजिलनगर चौराहे पर सड़क निर्माण कार्य पूर्ण"
            className="w-full h-10 sm:h-10.5 px-3.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="block font-bold text-[#18232E] mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 sm:h-10.5 px-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
              disabled={loading}
            >
              <option value="General">General (सामान्य)</option>
              <option value="Civic Updates">Civic Updates (नगर समाचार)</option>
              <option value="Events">Events (कार्यक्रम)</option>
              <option value="Healthcare">Healthcare (स्वास्थ्य)</option>
              <option value="Education">Education (शिक्षा)</option>
              <option value="Market">Market (बाजार)</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#18232E] mb-1">
              Your Name (रिपोर्टर का नाम)
            </label>
            <input
              type="text"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="e.g. Ramesh Singh / Ward 5"
              className="w-full h-10 sm:h-10.5 px-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block font-bold text-[#18232E] mb-1">Location / Area</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. College Road, Fazilnagar"
              className="w-full h-10 sm:h-10.5 px-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
              disabled={loading}
            />
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ADD MEDIA CONTROL: PHOTO OR VIDEO ATTACHMENT                 */}
        {/* ------------------------------------------------------------- */}
        <div className="p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="block font-bold text-[#18232E] text-xs">
                Add Media / फ़ोटो या वीडियो जोड़ें
              </span>
              <span className="text-[11px] text-slate-500">
                Attach a photo (JPG, PNG, WebP) or video clip (MP4, WebM up to 50MB)
              </span>
            </div>

            {selectedFile && (
              <button
                type="button"
                onClick={handleRemoveMedia}
                className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            )}
          </div>

          {/* Hidden multi-accept file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                handleFileSelected(e.target.files[0]);
              }
            }}
            className="hidden"
            id="story-media-file-input"
            disabled={loading}
          />

          {!selectedFile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Add Photo Button */}
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "image/*";
                    fileInputRef.current.click();
                  }
                }}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-[#B8323C] hover:bg-red-50/30 transition-all flex items-center gap-3 cursor-pointer group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-red-100/70 text-[#B8323C] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-[#18232E] text-xs group-hover:text-[#B8323C]">
                    Select Photo / फ़ोटो चुनें
                  </div>
                  <div className="text-[10px] text-slate-400">JPG, PNG, WebP up to 15MB</div>
                </div>
              </button>

              {/* Add Video Button */}
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "video/mp4,video/webm,video/quicktime";
                    fileInputRef.current.click();
                  }
                }}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-sky-600 hover:bg-sky-50/30 transition-all flex items-center gap-3 cursor-pointer group text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-sky-100/70 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-[#18232E] text-xs group-hover:text-sky-700">
                    Select Video / वीडियो चुनें
                  </div>
                  <div className="text-[10px] text-slate-400">MP4, WebM clip up to 50MB</div>
                </div>
              </button>
            </div>
          ) : (
            /* Selected Media Preview & Details */
            <div className="mt-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      mediaType === "video"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {mediaType === "video" ? "📹 Video Clip" : "📷 Photograph"}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-xs">
                    {mediaMeta?.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({mediaMeta?.size})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.accept =
                          mediaType === "video" ? "video/*" : "image/*";
                        fileInputRef.current.click();
                      }
                    }}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Replace</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Local Media Preview Player / Image */}
              <div className="relative rounded-xl overflow-hidden bg-black/90 aspect-video flex items-center justify-center">
                {mediaType === "video" ? (
                  <video
                    key={mediaPreviewUrl}
                    src={mediaPreviewUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                  >
                    <source src={mediaPreviewUrl} type={selectedFile?.type || "video/mp4"} />
                  </video>
                ) : (
                  <img
                    src={mediaPreviewUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-white">
                  Local Preview
                </div>
              </div>
            </div>
          )}

          {/* Web image link fallback */}
          {!selectedFile && (
            <div className="pt-2 border-t border-slate-200/60 flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium shrink-0">
                Or Web Link:
              </span>
              <input
                type="url"
                value={webImageUrl}
                onChange={(e) => setWebImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or https://..."
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-[#B8323C] text-[11px] bg-white"
                disabled={loading}
              />
            </div>
          )}
        </div>

        <div>
          <label className="block font-bold text-[#18232E] mb-1">
            Story Details / विस्तृत विवरण <span className="text-red-500">*</span>
          </label>
          <textarea
            rows="4"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of what occurred, time, people involved, civic impact..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-[#B8323C] text-xs bg-[#F5F7F8]"
            required
            disabled={loading}
          ></textarea>
        </div>

        {/* Progress bar when submitting */}
        {loading && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-600">
              <span>Uploading & Processing Media...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#B8323C] h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full h-10 sm:h-11 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-[#B8323C] hover:bg-red-700 cursor-pointer active:scale-[0.99]"
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Publishing Story & Media ({uploadProgress}%)...</span>
            </div>
          ) : (
            <span>🚀 Submit Story for Fazilnagar News Feed</span>
          )}
        </button>
      </form>
    </div>
  );
}