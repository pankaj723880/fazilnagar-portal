import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  HardDrive,
  Upload,
  RefreshCw,
  ExternalLink,
  FolderCheck,
  CheckCircle,
  Copy,
  CheckCheck,
  Trash2,
  Plus
} from "lucide-react";
import PageHeader from "./admin/PageHeader";
import ToastNotification from "./admin/ToastNotification";
import ConfirmDialog from "./admin/ConfirmDialog";
import EmptyState from "./admin/EmptyState";
import LoadingSkeleton from "./admin/LoadingSkeleton";

export default function AdminDriveStorage() {
  const [driveData, setDriveData] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveUploading, setDriveUploading] = useState(false);
  const [copiedFileId, setCopiedFileId] = useState(null);
  const [driveUploadFile, setDriveUploadFile] = useState(null);
  const [toast, setToast] = useState(null);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDeleteId, setFileToDeleteId] = useState(null);

  useEffect(() => {
    fetchDriveData();
  }, []);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const fetchDriveData = async () => {
    setDriveLoading(true);
    try {
      const res = await API.get("/google-drive/inspect");
      setDriveData(res.data);
    } catch (err) {
      console.error("Failed to load Google Drive info:", err);
      showToast("error", "Failed to retrieve Google Drive storage details.");
    } finally {
      setDriveLoading(false);
    }
  };

  const handleUploadToDrive = async (file) => {
    if (!file) return;
    setDriveUploading(true);
    const token = getAuthToken();
    try {
      const formData = new FormData();
      formData.append("file", file);
      await API.post("/google-drive/admin/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      showToast("success", "Media file uploaded successfully to Google Drive 'Fazilnagar Media'!");
      setDriveUploadFile(null);
      await fetchDriveData();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to upload file to Google Drive.");
    } finally {
      setDriveUploading(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDeleteId) return;
    const token = getAuthToken();
    try {
      await API.delete(`/google-drive/media/${fileToDeleteId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("success", "Media file deleted from Google Drive.");
      setDeleteDialogOpen(false);
      setFileToDeleteId(null);
      await fetchDriveData();
    } catch (err) {
      showToast("error", "Failed to delete media file from Google Drive.");
    }
  };

  const handleCopyUrl = (url, id) => {
    const fullUrl = url.startsWith("http") ? url : `https://fazilnagar-portal.onrender.com${url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedFileId(id);
    showToast("success", "Direct Delivery URL copied to clipboard!");
    setTimeout(() => setCopiedFileId(null), 2500);
  };

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
        icon={HardDrive}
        title="Google Drive Cloud Storage"
        subtitle="Persistent cloud asset synchronization with dedicated Google Drive folder & CDN delivery proxy"
        badgeText="OAuth 2.0 Connected"
        primaryAction={{
          label: "Refresh Storage",
          icon: RefreshCw,
          onClick: fetchDriveData,
        }}
        breadcrumbs={[
          { label: "Overview", to: "/admin/review?tab=dashboard" },
          { label: "Directory Management" },
          { label: "Google Drive Storage" },
        ]}
      />

      {/* Connection Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>OAuth Connected</span>
              </span>
              <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                drive.file Scope
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-2">
              Storage Sync: {driveData?.folder?.folderName || "Fazilnagar Media"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Persistent storage account for municipal records, brochures, high-res photos, and site backups.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {driveData?.folder?.folderWebViewLink && (
              <a
                href={driveData.folder.folderWebViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#14233B] hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-xs"
              >
                <span>Open in Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Connected Account</span>
            <span className="font-semibold text-slate-800 truncate block">{driveData?.accountEmail || "pss809352@gmail.com"}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Dedicated Folder</span>
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <FolderCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{driveData?.folder?.folderName || "Fazilnagar Media"}</span>
            </span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Files Stored</span>
            <span className="font-bold text-slate-900">
              {driveData?.folder?.filesUploadedCount ?? driveData?.mongo?.totalCount ?? 0} cloud files
            </span>
          </div>
        </div>
      </div>

      {/* Direct Upload Box */}
      <div className="bg-[#14233B] text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block mb-1">
              Direct Cloud Upload
            </span>
            <h3 className="text-sm sm:text-base font-bold">Upload Media to Google Drive</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Files are automatically uploaded to the <strong className="text-emerald-300">Fazilnagar Media</strong> directory and given permanent CDN URLs.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <label className="bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl px-4 py-2 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer transition">
              <Upload className="w-4 h-4 text-emerald-400" />
              <span className="truncate max-w-[150px]">{driveUploadFile ? driveUploadFile.name : "Choose File"}</span>
              <input
                type="file"
                accept="image/*,video/mp4,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setDriveUploadFile(f);
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => handleUploadToDrive(driveUploadFile)}
              disabled={!driveUploadFile || driveUploading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              {driveUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      {driveLoading ? (
        <LoadingSkeleton type="cards" count={4} />
      ) : (!driveData?.mongo?.recentFiles || driveData.mongo.recentFiles.length === 0) &&
        (!driveData?.folder?.files || driveData.folder.files.length === 0) ? (
        <EmptyState
          icon={FolderCheck}
          title="No Files Uploaded Yet"
          description="Upload an image, PDF, or video above to populate the Google Drive media storage."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(driveData?.mongo?.recentFiles && driveData.mongo.recentFiles.length > 0
            ? driveData.mongo.recentFiles
            : driveData?.folder?.files || []
          ).map((file, idx) => {
            const fileId = file.id || file._id || file.driveFileId;
            const driveFileId = file.driveFileId || file.id;
            const fileName = file.fileName || file.name || "Media File";
            const fileSize = file.fileSize || file.size || 0;
            const deliveryUrl = file.deliveryUrl || `/api/google-drive/media/${fileId}`;
            const fullDeliveryUrl = deliveryUrl.startsWith("http")
              ? deliveryUrl
              : `https://fazilnagar-portal.onrender.com${deliveryUrl}`;
            const driveWebLink = file.webViewLink || `https://drive.google.com/file/d/${driveFileId}/view`;

            return (
              <div
                key={fileId || idx}
                className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between hover:shadow-md transition"
              >
                {/* Image Preview Container */}
                <div className="h-36 bg-slate-900 relative overflow-hidden group flex items-center justify-center">
                  <img
                    src={fullDeliveryUrl}
                    alt={fileName}
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className="bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      {file.mimeType || "image"}
                    </span>
                  </div>
                </div>

                {/* File Details */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 line-clamp-1 text-xs" title={fileName}>
                      {fileName}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{fileSize > 1024 ? `${Math.round(fileSize / 1024)} KB` : `${fileSize} B`}</span>
                      <span>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(deliveryUrl, fileId)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer"
                      title="Copy delivery URL"
                    >
                      {copiedFileId === fileId ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-1">
                      <a
                        href={driveWebLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-lg text-[10px] transition"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setFileToDeleteId(fileId);
                          setDeleteDialogOpen(true);
                        }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg text-[10px] transition cursor-pointer"
                        title="Delete from Google Drive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setFileToDeleteId(null);
        }}
        onConfirm={confirmDeleteFile}
        title="Delete Google Drive File?"
        message="Are you sure you want to delete this file from Google Drive and town database records?"
        confirmLabel="Delete File"
        variant="danger"
      />
    </div>
  );
}
