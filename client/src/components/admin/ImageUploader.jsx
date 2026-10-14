import { useState, useRef } from "react";
import { UploadCloud, Image as ImageIcon, X, AlertCircle, Link as LinkIcon, Check } from "lucide-react";

export default function ImageUploader({
  value = "",
  onChange = () => {},
  onFileSelect = () => {},
  onOpenMediaPicker,
  label = "Cover Image",
  helpText = "Upload high quality JPG, PNG, or WebP (max 10MB)",
  aspectRatio = "video", // "video" (16:9) | "banner" (3:1) | "square" (1:1) | "auto"
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [mode, setMode] = useState("upload"); // "upload" | "url"

  const validateFile = (file) => {
    setErrorMessage("");
    if (!file) return false;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg", "image/gif"];
    if (!allowed.includes(file.type.toLowerCase())) {
      setErrorMessage("Only JPEG, PNG, WebP, and GIF images are supported.");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Image file exceeds the 10MB limit.");
      return false;
    }

    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
      const tempUrl = URL.createObjectURL(file);
      onChange(tempUrl);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      onFileSelect(file);
      const tempUrl = URL.createObjectURL(file);
      onChange(tempUrl);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange("");
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const aspectClass =
    aspectRatio === "banner"
      ? "h-28 sm:h-36"
      : aspectRatio === "square"
      ? "h-40 w-40"
      : "h-44 sm:h-52";

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
              onClick={onOpenMediaPicker}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Choose from Library</span>
            </button>
          )}
          <span className="text-slate-300">•</span>
          <button
            type="button"
            onClick={() => setMode((m) => (m === "upload" ? "url" : "upload"))}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            {mode === "upload" ? "Enter URL instead" : "Upload file instead"}
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
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              disabled={disabled}
            />
          </div>
          {value && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-32 w-full">
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => setErrorMessage("Could not load image from this URL.")}
              />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-600 text-white p-1 rounded-lg transition"
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
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !value && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl overflow-hidden transition cursor-pointer ${aspectClass} ${
            dragOver
              ? "border-blue-500 bg-blue-50/50"
              : value
              ? "border-slate-200 bg-slate-900 cursor-default"
              : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg,image/gif"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />

          {value ? (
            <div className="relative w-full h-full group">
              <img
                src={value}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/90 hover:bg-white text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  Click to upload or drag & drop
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{helpText}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
