import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { getAuthUser, getAuthToken, setAuthSession } from "../utils/authStorage";
import { resolveMediaUrl } from "../utils/mediaUtils";
import { maskEmail } from "../utils/maskEmail";
import {
  X,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Shield,
  ShieldAlert,
  Lock,
  Loader2,
  ExternalLink,
  MapPin,
  FileText,
  AtSign,
} from "lucide-react";

export default function EditProfileModal({ isOpen, onClose, initialTab = "profile" }) {
  const portalUser = getAuthUser();
  const isAdmin = portalUser?.role === "admin";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form Fields
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);

  // Privacy Fields
  const [showEmail, setShowEmail] = useState(false);
  const [findByEmail, setFindByEmail] = useState(false);
  const [whoCanMessage, setWhoCanMessage] = useState("everyone");
  const [lastSeenVisible, setLastSeenVisible] = useState(true);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSuccessMsg("");
      setErrorMsg("");
    }
  }, [isOpen, initialTab]);

  // Load user profile on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await API.get("/profile/me");
        if (res.data?.profile && isMounted) {
          const p = res.data.profile;
          setDisplayName(p.name || "");
          setUsername(p.username || "");
          setPhone(p.phone || "");
          setArea(p.area || "");
          setBio(p.bio || "");
          setShowEmail(Boolean(p.showEmail));
          setFindByEmail(Boolean(p.findByEmail));
          setWhoCanMessage(p.whoCanMessage || "everyone");
          setLastSeenVisible(p.lastSeenVisible ?? true);
          setAvatarPreview(p.avatar || "");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("Could not fetch remote profile:", err?.message);
      }

      if (isMounted && portalUser) {
        const derived = portalUser.email
          ? portalUser.email.split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 15)
          : "citizen";
        setDisplayName(portalUser.name || derived);
        setUsername(portalUser.username || derived);
        setPhone(portalUser.phone || "");
        setAvatarPreview(portalUser.avatar || "");
      }
      if (isMounted) setLoading(false);
    }

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Image compression for profile photo
  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Image compression failed"));
            },
            "image/webp",
            0.9
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Please select a JPEG, PNG, or WebP image.");
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      let uploadedAvatarUrl = avatarPreview;
      if (avatarFile) {
        setAvatarUploading(true);
        const compressedBlob = await compressImage(avatarFile);
        const formData = new FormData();
        formData.append("avatar", compressedBlob, "avatar.webp");

        const uploadRes = await API.post("/profile/avatar", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (uploadRes.data?.avatar) {
          uploadedAvatarUrl = uploadRes.data.avatar;
          setAvatarPreview(uploadedAvatarUrl);
        }
        setAvatarUploading(false);
        setAvatarFile(null);
      }

      const res = await API.patch("/profile/me", {
        name: displayName.trim(),
        username: username.toLowerCase().trim(),
        phone: phone.trim(),
        area: area.trim(),
        bio: bio.trim(),
        showEmail,
        findByEmail,
        whoCanMessage,
        lastSeenVisible,
      });

      if (res.data?.profile) {
        const p = res.data.profile;
        setDisplayName(p.name);
        setUsername(p.username);
        setPhone(p.phone || "");
        const currentToken = getAuthToken();
        if (currentToken) {
          setAuthSession(currentToken, {
            ...portalUser,
            ...p,
            avatar: uploadedAvatarUrl || p.avatar || portalUser?.avatar || "",
          });
        }
        // Emit global auth change event so entire app updates synchronously
        window.dispatchEvent(new Event("auth-change"));
      }

      setSuccessMsg("Profile updated successfully! / प्रोफ़ाइल सुरक्षित हो गई।");
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
      setAvatarUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#B8323C] text-white flex items-center justify-center shadow-xs">
              {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id="edit-profile-title" className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  {isAdmin ? "Admin Profile & Settings" : "Edit Profile / प्रोफ़ाइल संपादित करें"}
                </h2>
                {isAdmin && (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                {portalUser?.email ? maskEmail(portalUser.email) : "Manage your public profile & preferences"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            aria-label="Close profile popup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-4 sm:px-5 pt-3 pb-1 border-b border-slate-100 flex items-center gap-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "profile"
                ? "bg-[#B8323C] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "privacy"
                ? "bg-[#B8323C] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Privacy &amp; Security</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("admin")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === "admin"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-amber-900 hover:bg-amber-50"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Desk</span>
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        <div className="px-4 sm:px-5 pt-3 empty:hidden">
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-800 font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Scrollable Form Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#B8323C]" />
              <span className="text-xs font-medium">Loading profile details...</span>
            </div>
          ) : activeTab === "profile" ? (
            <form id="edit-profile-form" onSubmit={handleSave} className="space-y-4">
              {/* Avatar Selector */}
              <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-xs shrink-0 flex items-center justify-center relative group">
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl sm:text-2xl text-slate-600 bg-gradient-to-br from-slate-100 to-slate-200 select-none">
                    {(displayName || username || "C")[0]?.toUpperCase()}
                  </div>
                  {avatarPreview ? (
                    <img
                      src={resolveMediaUrl(avatarPreview)}
                      alt="Avatar Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <label
                    htmlFor="modal-avatar-input"
                    className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-[9px] font-bold">Edit</span>
                  </label>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="modal-avatar-input"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#B8323C]" />
                    <span>Change Photo / फ़ोटो बदलें</span>
                  </label>
                  <input
                    id="modal-avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarSelect}
                    className="hidden"
                  />
                  <p className="text-[10px] text-slate-400">JPG, PNG, or WebP. Auto-compressed.</p>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Display Name / नाम <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ramesh Chandra / रमेश चंद्र"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none"
                />
              </div>

              {/* Username (@handle) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username / यूज़रनेम (@handle) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs text-slate-400 font-mono">
                    <AtSign className="w-3.5 h-3.5 inline" />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={20}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="admin_fazilnagar"
                    className="w-full pl-8 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">3-20 lowercase letters, numbers, and underscores.</span>
              </div>

              {/* Mobile Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Mobile Phone / मोबाइल नंबर</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs text-slate-400 flex items-center">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                  <input
                    type="tel"
                    maxLength={15}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Used for citizen identification &amp; SMS notifications.</span>
              </div>

              {/* Area / Ward */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Area / मोहल्ला / वार्ड</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 text-xs text-slate-400 flex items-center">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  </span>
                  <input
                    type="text"
                    maxLength={60}
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Ward 4, Main Market, Fazilnagar"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Bio / परिचय</span>
                  <span className="text-[10px] text-slate-400 font-normal">{bio.length}/250</span>
                </label>
                <textarea
                  rows={2}
                  maxLength={250}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short note about your role, business, or civic interests..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] outline-none resize-none"
                />
              </div>
            </form>
          ) : activeTab === "privacy" ? (
            <form id="edit-profile-form" onSubmit={handleSave} className="space-y-4">
              {/* Who can message you */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Who Can Message You? / आपको कौन संदेश भेज सकता है?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="whoCanMessage"
                      value="everyone"
                      checked={whoCanMessage === "everyone"}
                      onChange={() => setWhoCanMessage("everyone")}
                      className="accent-[#B8323C]"
                    />
                    <span>Everyone in Fazilnagar / सभी नागरिक (Recommended)</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="whoCanMessage"
                      value="contacts"
                      checked={whoCanMessage === "contacts"}
                      onChange={() => setWhoCanMessage("contacts")}
                      className="accent-[#B8323C]"
                    />
                    <span>Approved Contacts Only / केवल स्वीकृत संपर्क</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="whoCanMessage"
                      value="none"
                      checked={whoCanMessage === "none"}
                      onChange={() => setWhoCanMessage("none")}
                      className="accent-[#B8323C]"
                    />
                    <span>Nobody (Private Mode) / कोई नहीं</span>
                  </label>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Show Email on Public Directory
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Display your email address to other verified citizens
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showEmail}
                    onChange={(e) => setShowEmail(e.target.checked)}
                    className="w-4 h-4 accent-[#B8323C] cursor-pointer"
                  />
                </label>

                <hr className="border-slate-200" />

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Allow Finding by Email
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Other citizens can locate your profile via search using your email
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={findByEmail}
                    onChange={(e) => setFindByEmail(e.target.checked)}
                    className="w-4 h-4 accent-[#B8323C] cursor-pointer"
                  />
                </label>

                <hr className="border-slate-200" />

                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Show Online Status / Last Seen
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Display active green dot when you are online in the town portal
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={lastSeenVisible}
                    onChange={(e) => setLastSeenVisible(e.target.checked)}
                    className="w-4 h-4 accent-[#B8323C] cursor-pointer"
                  />
                </label>
              </div>
            </form>
          ) : (
            /* Admin Tab */
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">Administrator Privilege Active</span>
                    <span className="text-[10px] text-amber-800">You have town administration access.</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/admin/review?tab=dashboard"
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex flex-col gap-1 transition"
                >
                  <span className="text-base">📊</span>
                  <span className="text-xs font-bold text-slate-900">Admin Overview</span>
                  <span className="text-[10px] text-slate-500">Live metrics &amp; stats</span>
                </Link>

                <Link
                  to="/admin/review?tab=pending"
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-amber-50/70 hover:bg-amber-100 border border-amber-200/80 flex flex-col gap-1 transition"
                >
                  <span className="text-base">🛡️</span>
                  <span className="text-xs font-bold text-amber-950">Review Desk</span>
                  <span className="text-[10px] text-amber-700">Approve news &amp; places</span>
                </Link>

                <Link
                  to="/admin/review?tab=directory"
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/80 flex flex-col gap-1 transition"
                >
                  <span className="text-base">🧭</span>
                  <span className="text-xs font-bold text-emerald-950">Civic Directory</span>
                  <span className="text-[10px] text-emerald-700">Manage listings &amp; aids</span>
                </Link>

                <Link
                  to="/admin/review?tab=audit"
                  onClick={onClose}
                  className="p-3 rounded-2xl bg-blue-50/70 hover:bg-blue-100 border border-blue-200/80 flex flex-col gap-1 transition"
                >
                  <span className="text-base">📜</span>
                  <span className="text-xs font-bold text-blue-950">Audit Logs</span>
                  <span className="text-[10px] text-blue-700">Security event history</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Cancel / बंद करें
          </button>

          {activeTab !== "admin" ? (
            <button
              type="submit"
              form="edit-profile-form"
              disabled={saving || loading || avatarUploading}
              className="px-5 py-2 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving || avatarUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{saving ? "Saving..." : "Save Changes / सुरक्षित करें"}</span>
            </button>
          ) : (
            <Link
              to="/admin/review"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <span>Open Admin Desk</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
