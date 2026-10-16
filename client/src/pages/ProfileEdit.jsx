import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import { getAuthUser } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";
import { Camera, Save, ArrowLeft, Shield, Lock, CheckCircle2, AlertCircle, Phone } from "lucide-react";

// Mask email utility (ra****@gmail.com)
export function maskEmail(email) {
  if (!email || typeof email !== "string" || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}****@${domain}`;
  }
  return `${local.slice(0, 2)}****@${domain}`;
}

export default function ProfileEdit() {
  usePageSEO({
    title: "Profile & Privacy Settings | Fazilnagar Town Portal",
    description: "Manage your Fazilnagar messaging profile, avatar, privacy preferences, and message request rules.",
    canonicalPath: "/profile",
    noIndex: true,
  });

  const portalUser = getAuthUser();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [bio, setBio] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [findByEmail, setFindByEmail] = useState(false);
  const [whoCanMessage, setWhoCanMessage] = useState("everyone");
  const [lastSeenVisible, setLastSeenVisible] = useState(true);

  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        const res = await API.get("/profile/me");
        if (res.data?.profile && isMounted) {
          const p = res.data.profile;
          setUsername(p.username || "");
          setDisplayName(p.name || "");
          setPhone(p.phone || "");
          setArea(p.area || "");
          setBio(p.bio || "");
          setShowEmail(Boolean(p.showEmail));
          setFindByEmail(Boolean(p.findByEmail));
          setWhoCanMessage(p.whoCanMessage || "everyone");
          setLastSeenVisible(p.lastSeenVisible ?? true);
          setAvatarPreview(p.avatar || "");
          return;
        }
      } catch (err) {
        console.warn("Could not load remote profile:", err.message);
      }

      if (isMounted && portalUser) {
        const derived = portalUser.email ? portalUser.email.split("@")[0].replace(/[^a-z0-9_]/g, "_").slice(0, 15) : "citizen";
        setUsername(derived);
        setDisplayName(portalUser.name || derived);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Client-Side Image Compression: max 500 KB WebP
  const compressImage = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 600;
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
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Image compression failed"));
            },
            "image/webp",
            0.82
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error("Failed to read image file"));
      reader.readAsDataURL(file);
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Upload compressed avatar to backend if new file selected
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

      // 2. Update Profile fields in MongoDB via Express
      const res = await API.patch("/profile/me", {
        username: username.toLowerCase().trim(),
        name: displayName.trim(),
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
        setUsername(p.username);
        setDisplayName(p.name);
        setPhone(p.phone || "");
      }

      setSuccessMsg("Profile and privacy settings saved successfully! / प्रोफ़ाइल सुरक्षित हो गई।");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
      setAvatarUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/messages"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Messages / संदेश</span>
        </Link>
        <span className="text-xs text-slate-500 font-mono">
          {portalUser?.email ? maskEmail(portalUser.email) : ""}
        </span>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Profile & Privacy / प्रोफ़ाइल एवं गोपनीयता
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Personalize your town directory card and control who can message or find you.
          </p>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="relative group w-20 h-20 rounded-full overflow-hidden bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={displayName || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-black text-slate-500">
                  {(displayName || username || "F")[0]?.toUpperCase()}
                </span>
              )}
              <label
                htmlFor="avatar-input"
                className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition"
                title="Change Photo"
              >
                <Camera className="w-5 h-5" />
                <span className="text-[9px] font-bold mt-0.5">Edit</span>
              </label>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <label
                htmlFor="avatar-input"
                className="inline-block px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs"
              >
                Choose Photo / फ़ोटो चुनें
              </label>
              <input
                id="avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <p className="text-[11px] text-slate-500">
                Compressed to &lt; 500 KB WebP automatically. JPEG, PNG, WebP supported.
              </p>
            </div>
          </div>

          {/* Name & Handle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username / यूज़रनेम (@handle) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">@</span>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="ramesh_fazilnagar"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#B8323C] focus:border-transparent outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400">Lowercase letters, numbers, and underscores only.</span>
            </div>
          </div>

          {/* Mobile Number & Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Mobile Number / मोबाइल नंबर</span>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                </span>
                <input
                  type="tel"
                  maxLength={15}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ""))}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900 focus:ring-2 focus:ring-[#B8323C] focus:border-transparent outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400">For contact and civic identification.</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Area / Mohalla / मोहल्ला (Optional)
              </label>
              <input
                type="text"
                maxLength={60}
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Main Market, Sathiaon Road, Pawanagar"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] focus:border-transparent outline-none"
              />
              <span className="text-[10px] text-slate-400">Helps neighbors identify you in search.</span>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bio / संक्षिप्त परिचय (Optional)
            </label>
            <input
              type="text"
              maxLength={250}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Local shop owner / समाजसेवी"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-[#B8323C] focus:border-transparent outline-none"
            />
          </div>

          {/* Privacy Controls Section */}
          <div className="border-t border-slate-200/90 pt-5 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#B8323C]" />
              <h2 className="text-sm font-bold text-slate-900">
                Privacy Controls / गोपनीयता नियंत्रण
              </h2>
            </div>

            {/* Who can message me */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Who can message me / मुझे कौन संदेश भेज सकता है?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  whoCanMessage === "everyone"
                    ? "bg-white border-[#B8323C] text-slate-900 shadow-2xs font-semibold"
                    : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                }`}>
                  <input
                    type="radio"
                    name="whoCanMessage"
                    value="everyone"
                    checked={whoCanMessage === "everyone"}
                    onChange={(e) => setWhoCanMessage(e.target.value)}
                    className="accent-[#B8323C]"
                  />
                  <div>
                    <span className="block font-bold">Everyone / सभी नागरिक</span>
                    <span className="text-[10px] text-slate-500 font-normal">Directly open conversations</span>
                  </div>
                </label>

                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                  whoCanMessage === "requests"
                    ? "bg-white border-[#B8323C] text-slate-900 shadow-2xs font-semibold"
                    : "bg-white/60 border-slate-200 text-slate-600 hover:bg-white"
                }`}>
                  <input
                    type="radio"
                    name="whoCanMessage"
                    value="requests"
                    checked={whoCanMessage === "requests"}
                    onChange={(e) => setWhoCanMessage(e.target.value)}
                    className="accent-[#B8323C]"
                  />
                  <div>
                    <span className="block font-bold">Only people I accept (Requests)</span>
                    <span className="text-[10px] text-slate-500 font-normal">New messages go to Message Requests</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Email privacy checkboxes */}
            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showEmail}
                  onChange={(e) => setShowEmail(e.target.checked)}
                  className="mt-0.5 accent-[#B8323C] rounded w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    Show masked email on my profile card
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Your full email is NEVER made public. When enabled, it displays as:{" "}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                      {portalUser?.email ? maskEmail(portalUser.email) : "ra****@gmail.com"}
                    </code>
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={findByEmail}
                  onChange={(e) => setFindByEmail(e.target.checked)}
                  className="mt-0.5 accent-[#B8323C] rounded w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    Allow discovery by exact email address
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Default is off. If enabled, people who already know your exact email address can find your town messaging handle.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lastSeenVisible}
                  onChange={(e) => setLastSeenVisible(e.target.checked)}
                  className="mt-0.5 accent-[#B8323C] rounded w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800 block">
                    Show online / active status
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Allow people you chat with to see when you are active.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Safety Tip */}
          <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <Lock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              <strong>Town Safety Tip / सुरक्षा सलाह:</strong> Never share OTPs, UPI PINs, passwords, or personal banking credentials in town chat.
            </p>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving || avatarUploading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white font-bold text-xs shadow-sm active:scale-95 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Saving..." : "Save Changes / सुरक्षित करें"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
