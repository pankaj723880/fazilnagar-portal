import { useState, useRef } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  AlertCircle,
  Link as LinkIcon,
  Check,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function ImageUploader({
  value = "",
  previewUrl = "",
  onChange = () => {},
  onFileSelect = null,
  uploadStatus = "idle", // "idle" | "uploading" | "success" | "error"
  uploadProgress = 0,
  errorMessage = "",
  onRetry = null,
  onClear = null,
  onOpenMediaPicker,
  label = "Cover Image",
  helpText = "Upload high quality JPG, PNG, or WebP (max 10MB)",
  aspectRatio = "video", // "video" (16:9) | "banner" (3:1) | "square" (1:1) | "auto"
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState("");
  const [mode, setMode] = useState("upload"); // "upload" | "url"

  // Effective display image (use previewUrl if provided, otherwise value)
  const displayImage = previewUrl || value;

  const validateFile = (file) => {
    setLocalError("");
    if (!file) return false;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/gif",
      "image/svg+xml",
    ];
    if (file.type && !allowed.includes(file.type.toLowerCase())) {
      setLocalError("Only JPEG, PNG, WebP, GIF, and SVG images are supported.");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setLocalError("Image file exceeds the 10MB limit.");
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          onChange(evt.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploadStatus === "uploading") return;

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      if (onFileSelect) {
        onFileSelect(file);
      } else {
        const reader = new FileReader();
        reader.onload = (evt) => {
          onChange(evt.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else {
      onChange("");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setLocalError("");
  };

  const aspectClass =
    aspectRatio === "banner"
      ? "h-32 sm:h-44"
      : aspectRatio === "square"
      ? "h-40 w-40"
      : "h-44 sm:h-56";

  const effectiveError = errorMessage || localError;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-800">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {onOpenMediaPicker && (
            <button
              type="button"
              disabled={disabled || uploadStatus === "uploading"}
              onClick={onOpenMediaPicker}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Choose from Library</span>
            </button>
          )}
          <span className="text-slate-300">•</span>
          <button
            type="button"
            disabled={disabled || uploadStatus === "uploading"}
            onClick={() => setMode((m) => (m === "upload" ? "url" : "upload"))}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer disabled:opacity-50"
          >
            {mode === "upload" ? "Enter Web URL instead" : "Upload file instead"}
          </button>
        </div>
      </div>

      {mode === "url" ? (
        <div className="space-y-2">
          <div className="relative">
            <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={value}
              onChange={(e) => {
                const val = e.target.value;
                onChange(val);
                if (val.startsWith("blob:") || val.startsWith("data:")) {
                  setLocalError("Local blob or data URLs cannot be saved. Please provide a web image URL.");
                } else {
                  setLocalError("");
                }
              }}
              placeholder="https://example.com/photo.jpg"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              disabled={disabled}
            />
          </div>
          {value && (
            <div className={`relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 ${aspectClass} w-full`}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setLocalError("Could not load image from this URL. Please verify the link.")}
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-600 text-white p-1 rounded-lg transition cursor-pointer"
                title="Clear image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (uploadStatus !== "uploading") setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (!displayImage && uploadStatus !== "uploading" && !disabled) {
              fileInputRef.current?.click();
            }
          }}
          className={`relative border-2 border-dashed rounded-2xl overflow-hidden transition ${aspectClass} ${
            dragOver
              ? "border-blue-500 bg-blue-50/50"
              : displayImage
              ? "border-slate-200 bg-slate-900"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled || uploadStatus === "uploading"}
          />

          {displayImage ? (
            <div className="relative w-full h-full group">
              <img
                src={displayImage}
                alt="Selected preview"
                className={`w-full h-full object-cover transition duration-300 ${
                  uploadStatus === "uploading" ? "filter blur-xs opacity-60" : ""
                }`}
              />

              {/* Status Pill Badge */}
              <div className="absolute top-3 left-3 z-10">
                {uploadStatus === "uploading" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/90 backdrop-blur-xs text-white text-[11px] font-bold shadow-md animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Uploading... {uploadProgress > 0 ? `${uploadProgress}%` : ""}</span>
                  </span>
                )}
                {uploadStatus === "success" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/95 backdrop-blur-xs text-white text-[11px] font-bold shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Cloud Ready</span>
                  </span>
                )}
                {uploadStatus === "error" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/95 backdrop-blur-xs text-white text-[11px] font-bold shadow-md">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Upload Failed</span>
                  </span>
                )}
              </div>

              {/* Hover / Action Controls Overlay */}
              {uploadStatus !== "uploading" && (
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/95 hover:bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Change Photo</span>
                  </button>
                  {value && (
                    <a
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-800/90 hover:bg-slate-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl shadow-md transition flex items-center gap-1"
                      title="Open full image in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              )}

              {/* Active Uploading Overlay */}
              {uploadStatus === "uploading" && (
                <div className="absolute inset-0 bg-slate-950/60 flex flex-col items-center justify-center p-4 text-white text-center space-y-2">
                  <RefreshCw className="w-7 h-7 animate-spin text-blue-400" />
                  <p className="text-xs font-extrabold tracking-wide">
                    Uploading image to persistent storage...
                  </p>
                  {uploadProgress > 0 && (
                    <div className="w-48 bg-white/20 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-400 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-300">
                    Please keep this window open
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Click to select photo or drag & drop
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{helpText}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error state alert with retry option */}
      {effectiveError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span className="font-medium leading-tight">{effectiveError}</span>
          </div>
          {onRetry && uploadStatus === "error" && (
            <button
              type="button"
              onClick={onRetry}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[10px] transition shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
