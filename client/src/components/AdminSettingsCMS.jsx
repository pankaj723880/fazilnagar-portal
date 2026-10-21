import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import { clearCMSCache } from "../services/cmsService";
import PageHeader from "./admin/PageHeader";
import FormSection from "./admin/FormSection";
import MediaPicker from "./admin/MediaPicker";
import StatusBadge from "./admin/StatusBadge";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
import AdminThemeGallery from "./admin/AdminThemeGallery";
import {
  Sliders,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Globe,
  Phone,
  Mail,
  MapPin,
  Megaphone,
  Share2,
  Eye,
  ShieldCheck,
  FileText,
  RotateCcw,
  Sparkles,
  Link as LinkIcon,
  Palette,
  ExternalLink,
  Users,
} from "lucide-react";

export default function AdminSettingsCMS({ onSaveSuccess }) {
  const [settings, setSettings] = useState(null);
  const [initialSettings, setInitialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [activeTab, setActiveTab] = useState("general"); // general | visitor-counter | themes | announcement | contact | sections | seo | footer
  const [isDirty, setIsDirty] = useState(false);
  const [realVisitorStats, setRealVisitorStats] = useState(null);

  // Media Picker state
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null); // "logoUrl" | "ogImage"

  // Reset confirmation
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await API.get("/settings");
      if (res.data?.success && res.data?.settings) {
        setSettings(res.data.settings);
        setInitialSettings(JSON.parse(JSON.stringify(res.data.settings)));
        setIsDirty(false);
      }
      try {
        const token = getAuthToken();
        const visRes = await API.get("/visitors/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (visRes.data?.success) {
          setRealVisitorStats(visRes.data.realActiveCount);
        }
      } catch (_) {}
    } catch (err) {
      console.warn("Failed to load settings:", err);
      showToast("Failed to load portal configuration.", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!settings) return;

    setSaving(true);
    const token = getAuthToken();
    try {
      const res = await API.put("/settings", settings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        setSettings(res.data.settings);
        setInitialSettings(JSON.parse(JSON.stringify(res.data.settings)));
        setIsDirty(false);
        clearCMSCache("settings");
        clearCMSCache();
        showToast("Website settings and layout saved successfully!", "success");
        if (onSaveSuccess) onSaveSuccess(res.data.settings);
      }
    } catch (err) {
      console.error("Save settings error:", err);
      showToast(
        "Failed to save settings: " + (err.response?.data?.message || err.message),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (initialSettings) {
      setSettings(JSON.parse(JSON.stringify(initialSettings)));
      setIsDirty(false);
      setResetDialogOpen(false);
      showToast("Unsaved changes discarded.", "info");
    }
  };

  const updateField = (path, value) => {
    setIsDirty(true);
    setSettings((prev) => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      const keys = path.split(".");
      let current = copy;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return copy;
    });
  };

  // Hex color validator
  const isValidHex = (hex) => /^#([0-9A-F]{3}){1,2}$/i.test(hex);

  if (loading) {
    return (
      <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Loading portal configuration & settings...</p>
      </div>
    );
  }

  if (!settings) return null;

  const tabs = [
    { id: "general", label: "General Identity", icon: Globe },
    { id: "visitor-counter", label: "Live Visitor Counter", icon: Users },
    { id: "themes", label: "Theme Gallery", icon: Palette },
    { id: "announcement", label: "Announcement Ticker", icon: Megaphone },
    { id: "contact", label: "Official Contacts", icon: Phone },
    { id: "sections", label: "Homepage Visibility", icon: Eye },
    { id: "seo", label: "SEO & Social Sharing", icon: Share2 },
    { id: "footer", label: "Footer & Legal", icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* 2.1 Quick Save Actions Bar: Sticky-top block */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate font-heading">
              {activeTab === "themes"
                ? "Theme Gallery & Visual Identity"
                : activeTab === "visitor-counter"
                ? "Live Visitor Counter Settings"
                : "Site Settings & Controls"}
            </h1>
            {activeTab !== "themes" && (
              isDirty ? (
                <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300 shrink-0">
                  ● Unsaved
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 shrink-0 flex items-center gap-1">
                  <span>✔</span> Synced
                </span>
              )
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate hidden sm:block">
            {activeTab === "themes"
              ? "12 themes with Light/Dark appearance mode. Saved to database and applied across public portal."
              : activeTab === "visitor-counter"
              ? "Mode A: Real Active Presence vs Mode B: Simulated Counter (0–1500) with clear admin labeling"
              : "Brand identity, announcement ticker, official helplines, and homepage visibility"}
          </p>
        </div>

        {activeTab !== "themes" && (
          <div className="flex items-center gap-2 shrink-0">
            {isDirty && (
              <button
                type="button"
                onClick={() => setResetDialogOpen(true)}
                disabled={saving}
                className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                title="Reset Changes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? "Saving..." : "Save Settings"}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2.2 Horizontal Navigation Carousel (Swipeable row for settings panels) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200/90 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Container or Theme Gallery */}
      {activeTab === "themes" ? (
        <AdminThemeGallery onSaveSuccess={() => showToast("Website theme updated successfully!", "success")} />
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* SUBTAB 1: GENERAL IDENTITY (Single-Column Form Card) */}
        {activeTab === "general" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 space-y-3.5 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>🏛️</span> General Identity &amp; Municipal Taglines
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Manage the official portal branding, English &amp; Hindi taglines, and town crest emblem.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-bold text-slate-800 mb-1">
                  Full Portal Name (पूरा नाम) *
                </label>
                <input
                  type="text"
                  value={settings.siteName || ""}
                  onChange={(e) => updateField("siteName", e.target.value)}
                  placeholder="Fazilnagar Town Portal"
                  className="w-full h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200/90 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-800 mb-1">
                  Short Brand Name (संक्षिप्त नाम) *
                </label>
                <input
                  type="text"
                  value={settings.shortName || ""}
                  onChange={(e) => updateField("shortName", e.target.value)}
                  placeholder="FAZILNAGAR"
                  className="w-full h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200/90 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-800 mb-1">
                  Municipal Tagline (English)
                </label>
                <input
                  type="text"
                  value={settings.tagline || ""}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  placeholder="Town Directory, Public Utilities & Civic Digital Services"
                  className="w-full h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200/90 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-800 mb-1 font-hindi">
                  Municipal Tagline (हिंदी)
                </label>
                <input
                  type="text"
                  value={settings.taglineHi || ""}
                  onChange={(e) => updateField("taglineHi", e.target.value)}
                  placeholder="फाजिलनगर नगर पंचायत — डिजिटल नागरिक सेवा पोर्टल"
                  className="w-full h-[42px] px-3 py-2 text-sm font-hindi rounded-xl border border-slate-200/90 bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-slate-800 mb-1">
                  Logo Emblem URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.logoUrl || ""}
                    onChange={(e) => updateField("logoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200/90 bg-slate-50/50 font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget("logoUrl")}
                    className="h-[42px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Media Library</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB: LIVE VISITOR COUNTER SETTINGS */}
        {activeTab === "visitor-counter" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 space-y-5 shadow-2xs">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" /> Live Visitor Counter Settings
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure whether visitors see the real active presence or an admin-simulated count (0–1500).
                </p>
              </div>

              {/* Real Analytics Live Indicator (Completely separate from simulated figures) */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-slate-500 font-medium">Actual Analytics (Real Visitors):</span>
                <span className="font-mono font-bold text-slate-900">
                  {realVisitorStats !== null ? `${realVisitorStats} active` : "Counting..."}
                </span>
              </div>
            </div>

            {/* Mode Selection Grid */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Visitor Counter Mode *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mode A: Real Live Count */}
                <label
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                    (settings.liveVisitorCounter?.mode || "real") === "real"
                      ? "border-emerald-600 bg-emerald-50/40 text-emerald-950 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm flex items-center gap-2">
                      <span>🟢</span> Mode A: Real Live Count
                    </span>
                    <input
                      type="radio"
                      name="counterMode"
                      checked={(settings.liveVisitorCounter?.mode || "real") === "real"}
                      onChange={() => updateField("liveVisitorCounter.mode", "real")}
                      className="accent-emerald-600 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Displays the genuine, deduplicated active visitor presence on the portal using real-time heartbeats and stale session expiration.
                  </p>
                </label>

                {/* Mode B: Simulated Count */}
                <label
                  className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition ${
                    settings.liveVisitorCounter?.mode === "simulated"
                      ? "border-amber-600 bg-amber-50/40 text-amber-950 shadow-xs"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-sm flex items-center gap-2">
                      <span>⚡</span> Mode B: Simulated Count
                    </span>
                    <input
                      type="radio"
                      name="counterMode"
                      checked={settings.liveVisitorCounter?.mode === "simulated"}
                      onChange={() => updateField("liveVisitorCounter.mode", "simulated")}
                      className="accent-amber-600 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Allows admins to broadcast a shared demonstration number (0–1500) with optional synchronized random variation across all visitors.
                  </p>
                </label>
              </div>
            </div>

            {/* Clear Warning Banner when Simulated Mode is Active */}
            {settings.liveVisitorCounter?.mode === "simulated" && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3 text-xs leading-relaxed animate-in fade-in duration-150">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">⚠️ SIMULATED MODE ACTIVATED</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    The public portal visitor counter is currently displaying the simulated figures configured below. Real analytics remain completely separate, unaffected, and unmanipulated.
                  </p>
                </div>
              </div>
            )}

            {/* Simulated Configuration Form Controls */}
            {settings.liveVisitorCounter?.mode === "simulated" && (
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-4 animate-in fade-in duration-150">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Simulated Parameters (Enforced 0–1500 Server-Side)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-800 mb-1">
                      Base Public Display Count (0–1500) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="1500"
                      value={settings.liveVisitorCounter?.simulatedCount ?? 120}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10);
                        const val = isNaN(raw) ? 0 : Math.min(1500, Math.max(0, raw));
                        updateField("liveVisitorCounter.simulatedCount", val);
                      }}
                      className="w-full h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                      required
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Default display number seen by all public visitors when variation is disabled.
                    </p>
                  </div>

                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2.5 cursor-pointer pt-2 sm:pt-0">
                      <input
                        type="checkbox"
                        checked={Boolean(settings.liveVisitorCounter?.randomVariance)}
                        onChange={(e) => updateField("liveVisitorCounter.randomVariance", e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Enable Automatic Random Variation
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1 pl-6">
                      Smoothly varies the display number between minimum and maximum. All visitors see the same synchronized count.
                    </p>
                  </div>
                </div>

                {Boolean(settings.liveVisitorCounter?.randomVariance) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80">
                    <div>
                      <label className="block text-[12px] font-bold text-slate-800 mb-1">
                        Minimum Count (0–1500) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1500"
                        value={settings.liveVisitorCounter?.varianceMin ?? 100}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          const val = isNaN(raw) ? 0 : Math.min(1500, Math.max(0, raw));
                          updateField("liveVisitorCounter.varianceMin", val);
                        }}
                        className="w-full h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Lower variation bound.</p>
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-slate-800 mb-1">
                        Maximum Count (0–1500) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1500"
                        value={settings.liveVisitorCounter?.varianceMax ?? 150}
                        onChange={(e) => {
                          const raw = parseInt(e.target.value, 10);
                          const val = isNaN(raw) ? 0 : Math.min(1500, Math.max(0, raw));
                          updateField("liveVisitorCounter.varianceMax", val);
                        }}
                        className="w-full h-[42px] px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-mono focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Upper variation bound.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUBTAB 2: ANNOUNCEMENT TICKER */}
        {activeTab === "announcement" && (
          <FormSection
            title="Announcement Ticker & Emergency Broadcast Strip"
            description="Display an animated high-visibility announcement banner at the top of the homepage."
            icon={Megaphone}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Enable Top Announcement Ticker
                  </span>
                  <span className="text-[11px] text-slate-500">
                    When enabled, banner is rendered immediately beneath the top navigation bar.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.announcement?.enabled !== false}
                    onChange={(e) => updateField("announcement.enabled", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563EB]"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Ticker Message Text (सूचना संदेश)
                </label>
                <input
                  type="text"
                  value={settings.announcement?.text || ""}
                  onChange={(e) => updateField("announcement.text", e.target.value)}
                  placeholder="जैसे: नगर पंचायत फाजिलनगर — स्वच्छ सर्वेक्षण एवं जन्म प्रमाण पत्र हेतु ऑनलाइन आवेदन प्रारंभ।"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Destination Link URL (वैकल्पिक लिंक)
                </label>
                <input
                  type="text"
                  value={settings.announcement?.link || ""}
                  onChange={(e) => updateField("announcement.link", e.target.value)}
                  placeholder="/news या https://edistrict.up.gov.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Background Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={isValidHex(settings.announcement?.bgColor) ? settings.announcement.bgColor : "#0D5E49"}
                      onChange={(e) => updateField("announcement.bgColor", e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={settings.announcement?.bgColor || "#0D5E49"}
                      onChange={(e) => updateField("announcement.bgColor", e.target.value)}
                      placeholder="#0D5E49"
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                        isValidHex(settings.announcement?.bgColor || "#0D5E49")
                          ? "border-slate-200 bg-slate-50"
                          : "border-red-300 bg-red-50 text-red-600"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Text Color (Hex)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={isValidHex(settings.announcement?.textColor) ? settings.announcement.textColor : "#FFFFFF"}
                      onChange={(e) => updateField("announcement.textColor", e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-300 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={settings.announcement?.textColor || "#FFFFFF"}
                      onChange={(e) => updateField("announcement.textColor", e.target.value)}
                      placeholder="#FFFFFF"
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                        isValidHex(settings.announcement?.textColor || "#FFFFFF")
                          ? "border-slate-200 bg-slate-50"
                          : "border-red-300 bg-red-50 text-red-600"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                  Live Ticker Banner Preview:
                </span>
                <div
                  style={{
                    backgroundColor: settings.announcement?.bgColor || "#0D5E49",
                    color: settings.announcement?.textColor || "#FFFFFF",
                  }}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>📢</span>
                    <span className="truncate">
                      {settings.announcement?.text || "Announcement ticker text will appear here."}
                    </span>
                  </div>
                  {settings.announcement?.link && (
                    <span className="text-[11px] underline opacity-90 shrink-0 ml-2">
                      View Notice &rarr;
                    </span>
                  )}
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {/* SUBTAB 3: OFFICIAL CONTACTS */}
        {activeTab === "contact" && (
          <FormSection
            title="Official Contacts & Municipal Emergency Helplines"
            description="Verified administrative numbers, emergency contacts, and civic office hours for Fazilnagar residents."
            icon={Phone}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nagar Panchayat Office Phone (कार्यालय फोन)
                </label>
                <input
                  type="text"
                  value={settings.contact?.officialPhone || ""}
                  onChange={(e) => updateField("contact.officialPhone", e.target.value)}
                  placeholder="+91 5564 222102"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  24/7 Emergency Helplines (Police: 112 / Ambulance: 108)
                </label>
                <input
                  type="text"
                  value={settings.contact?.emergencyPhone || ""}
                  onChange={(e) => updateField("contact.emergencyPhone", e.target.value)}
                  placeholder="112, 108, 1090"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-red-600 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Community Health Centre (CHC) Fazilnagar Phone
                </label>
                <input
                  type="text"
                  value={settings.contact?.chcPhone || ""}
                  onChange={(e) => updateField("contact.chcPhone", e.target.value)}
                  placeholder="+91 5564 222108"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={settings.contact?.email || ""}
                  onChange={(e) => updateField("contact.email", e.target.value)}
                  placeholder="admin@fazilnagar.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nagar Panchayat Office Address
                </label>
                <input
                  type="text"
                  value={settings.contact?.officeAddress || ""}
                  onChange={(e) => updateField("contact.officeAddress", e.target.value)}
                  placeholder="Nagar Panchayat Office, Main Market Road, Fazilnagar, Kushinagar, UP - 274401"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Public Office Working Hours
                </label>
                <input
                  type="text"
                  value={settings.contact?.workingHours || ""}
                  onChange={(e) => updateField("contact.workingHours", e.target.value)}
                  placeholder="Monday to Saturday: 10:00 AM – 05:00 PM (Sunday Closed)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
            </div>
          </FormSection>
        )}

        {/* SUBTAB 4: HOMEPAGE VISIBILITY (THE 12 SWITCHES) */}
        {activeTab === "sections" && (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 space-y-4 shadow-2xs">
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <span>👁️</span> Homepage Visibility Switches (12 Sections)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Toggle sections live on the citizen portal instantly. Switches persist directly to database upon saving.
              </p>
            </div>

            <div className="space-y-4">
              {/* Group A: Hero & Alerts */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  A. Hero Carousel &amp; Civic Alerts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { key: "heroCarousel", label: "Show Hero Carousel", desc: "Top animated photo slides" },
                    { key: "announcementBanner", label: "Show News Ticker", desc: "Live scrolling notification bar" },
                    { key: "emergencyStrip", label: "Show Emergency Grid", desc: "One-touch 24/7 call buttons" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 active:scale-98 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                            : "bg-slate-50/70 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <h5 className="text-xs font-bold truncate">{sec.label}</h5>
                          <p className="text-[10px] text-slate-500 truncate">{sec.desc}</p>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] ${isEnabled ? 'left-[19px]' : 'left-[3px]'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group B: Directory & Discovery */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  B. Directory &amp; Geographic Discovery
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { key: "statsCounters", label: "Show Statistics Grid", desc: "19+ Verified Institution counters" },
                    { key: "quickCategories", label: "Show Category Hubs", desc: "Education, Hospitals, Fuel buttons" },
                    { key: "interactiveMap", label: "Show Town Map", desc: "Verified geographic town map" },
                    { key: "featuredDirectory", label: "Show Directory Cards", desc: "Town institutions preview" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 active:scale-98 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                            : "bg-slate-50/70 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <h5 className="text-xs font-bold truncate">{sec.label}</h5>
                          <p className="text-[10px] text-slate-500 truncate">{sec.desc}</p>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] ${isEnabled ? 'left-[19px]' : 'left-[3px]'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group C: Public Services & Heritage */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  C. Content, Public Utilities &amp; Heritage
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { key: "heritageSpotlight", label: "Show Heritage Section", desc: "Pawapuri and Kushinagar narrative" },
                    { key: "publicServices", label: "Show Civic Services", desc: "e-District and government schemes" },
                    { key: "latestNews", label: "Show News & Reels", desc: "Community update bulletin carousel" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 active:scale-98 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                            : "bg-slate-50/70 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <h5 className="text-xs font-bold truncate">{sec.label}</h5>
                          <p className="text-[10px] text-slate-500 truncate">{sec.desc}</p>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] ${isEnabled ? 'left-[19px]' : 'left-[3px]'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group D: Citizen Corner & Sponsorship */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  D. Citizen Engagement &amp; Commercial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {[
                    { key: "citizenCorner", label: "Show Citizen Corner", desc: "Add local shop/place callout" },
                    { key: "advertisements", label: "Show Ad Slots", desc: "Floating, banner and sponsor slots" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 active:scale-98 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-slate-900"
                            : "bg-slate-50/70 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <h5 className="text-xs font-bold truncate">{sec.label}</h5>
                          <p className="text-[10px] text-slate-500 truncate">{sec.desc}</p>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] ${isEnabled ? 'left-[19px]' : 'left-[3px]'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group E: Contribution Form Layout */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  E. Public Contribution Forms Layout (/contribute/* &amp; /forms/*)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(() => {
                    const isEnabled = Boolean(settings.contributionFormSettings?.hideNavbarAndFooter);
                    return (
                      <div
                        id="toggle-hide-navbar-footer-area-details"
                        onClick={() => updateField("contributionFormSettings.hideNavbarAndFooter", !isEnabled)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2.5 active:scale-98 ${
                          isEnabled
                            ? "bg-amber-50/70 border-amber-300 text-slate-900"
                            : "bg-slate-50/70 border-slate-200 text-slate-500"
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <h5 className="text-xs font-bold truncate">Hide Navbar, Footer &amp; Return Button</h5>
                          <p className="text-[10px] text-slate-500 truncate">
                            {isEnabled ? "ON: Hidden on all public forms" : "OFF: Standard layout (visible)"}
                          </p>
                        </div>
                        <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${isEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}>
                          <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-[3px] ${isEnabled ? 'left-[19px]' : 'left-[3px]'}`} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 5: SEO & SOCIAL SHARING */}
        {activeTab === "seo" && (
          <FormSection
            title="SEO Metadata & Social Media Open Graph"
            description="Manage Google search engine indexing tags, meta titles, descriptions, and social sharing image cards."
            icon={Share2}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Meta Title Tag (Google Search)
                </label>
                <input
                  type="text"
                  value={settings.seoSettings?.metaTitle || ""}
                  onChange={(e) => updateField("seoSettings.metaTitle", e.target.value)}
                  placeholder="Fazilnagar Town Portal | Official Civic Directory & Public Services (PIN 274401)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={settings.seoSettings?.metaDescription || ""}
                  onChange={(e) => updateField("seoSettings.metaDescription", e.target.value)}
                  placeholder="Official digital civic portal for Fazilnagar, Kushinagar, UP. Verified educational hub, medical emergency helplines, twin heritage, and municipal services."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Social Sharing Image (Open Graph Image URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.seoSettings?.ogImage || ""}
                    onChange={(e) => updateField("seoSettings.ogImage", e.target.value)}
                    placeholder="https://example.com/og-card.jpg"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget("ogImage")}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Media Library
                  </button>
                </div>
              </div>

              {/* Social Card Preview */}
              {settings.seoSettings?.metaTitle && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                    Social Card Share Preview (WhatsApp / Twitter / Facebook):
                  </span>
                  <div className="max-w-md rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-2xs">
                    {settings.seoSettings?.ogImage ? (
                      <div className="h-44 w-full bg-slate-900 overflow-hidden">
                        <img
                          src={settings.seoSettings.ogImage}
                          alt="OG Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                        No social preview image set
                      </div>
                    )}
                    <div className="p-3.5 space-y-1">
                      <span className="text-[10px] uppercase text-slate-400 font-semibold">
                        www.fazilnagar.me
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {settings.seoSettings.metaTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {settings.seoSettings.metaDescription}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </FormSection>
        )}

        {/* SUBTAB 6: FOOTER & LEGAL */}
        {activeTab === "footer" && (
          <FormSection
            title="Footer Notice & Municipal Copyright"
            description="Manage legal notices, copyright year, and civic disclosures."
            icon={FileText}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Footer Description Text
                </label>
                <textarea
                  rows={2}
                  value={settings.footerText || ""}
                  onChange={(e) => updateField("footerText", e.target.value)}
                  placeholder="Fazilnagar's civic digital platform offering verified town directory, emergency helplines, public utilities, and community updates."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Copyright Notice
                </label>
                <input
                  type="text"
                  value={settings.copyright || ""}
                  onChange={(e) => updateField("copyright", e.target.value)}
                  placeholder="Fazilnagar Town Portal • Modern Civic & Editorial System. All rights reserved."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>
            </div>
          </FormSection>
        )}
      </form>
      )}

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={Boolean(mediaPickerTarget)}
        onClose={() => setMediaPickerTarget(null)}
        onSelect={(url) => {
          if (mediaPickerTarget === "logoUrl") updateField("logoUrl", url);
          if (mediaPickerTarget === "ogImage") updateField("seoSettings.ogImage", url);
          setMediaPickerTarget(null);
        }}
        title={mediaPickerTarget === "logoUrl" ? "Select Portal Logo" : "Select Social Share Image"}
      />

      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetDialogOpen}
        title="Discard Unsaved Changes?"
        message="Are you sure you want to revert all unsaved adjustments to their last saved state?"
        confirmText="Discard Changes"
        confirmVariant="warning"
        onConfirm={handleReset}
        onCancel={() => setResetDialogOpen(false)}
      />

      {/* Floating Toast Notification */}
      {toast.message && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: "", type: "success" })}
        />
      )}
    </div>
  );
}
