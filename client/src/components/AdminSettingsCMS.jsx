import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import PageHeader from "./admin/PageHeader";
import FormSection from "./admin/FormSection";
import MediaPicker from "./admin/MediaPicker";
import StatusBadge from "./admin/StatusBadge";
import ConfirmDialog from "./admin/ConfirmDialog";
import ToastNotification from "./admin/ToastNotification";
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
} from "lucide-react";

export default function AdminSettingsCMS({ onSaveSuccess }) {
  const [settings, setSettings] = useState(null);
  const [initialSettings, setInitialSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [activeTab, setActiveTab] = useState("general"); // general | announcement | contact | sections | seo | footer
  const [isDirty, setIsDirty] = useState(false);

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
    { id: "announcement", label: "Announcement Ticker", icon: Megaphone },
    { id: "contact", label: "Official Contacts", icon: Phone },
    { id: "sections", label: "Homepage Visibility", icon: Eye },
    { id: "seo", label: "SEO & Social Sharing", icon: Share2 },
    { id: "footer", label: "Footer & Legal", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Site Settings & Controls"
        description="Centralized administration for town brand identity, emergency helplines, live announcement ticker, and 12 homepage section visibility switches."
        icon={Sliders}
        badge={
          isDirty ? (
            <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300">
              Unsaved Changes
            </span>
          ) : (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              Synced with Live Portal
            </span>
          )
        }
        actions={
          <>
            {isDirty && (
              <button
                type="button"
                onClick={() => setResetDialogOpen(true)}
                disabled={saving}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Changes</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
            </button>
          </>
        }
      />

      {/* Subtabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-[#2563EB] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Container */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* SUBTAB 1: GENERAL IDENTITY */}
        {activeTab === "general" && (
          <FormSection
            title="General Identity & Municipal Taglines"
            description="Manage the official portal branding, English & Hindi taglines, and town crest."
            icon={Globe}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Full Portal Name (पूरा नाम) *
                </label>
                <input
                  type="text"
                  value={settings.siteName || ""}
                  onChange={(e) => updateField("siteName", e.target.value)}
                  placeholder="Fazilnagar Town Portal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Short Brand Name (संक्षिप्त नाम) *
                </label>
                <input
                  type="text"
                  value={settings.shortName || ""}
                  onChange={(e) => updateField("shortName", e.target.value)}
                  placeholder="FAZILNAGAR"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Municipal Tagline (English)
                </label>
                <input
                  type="text"
                  value={settings.tagline || ""}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  placeholder="Town Directory, Public Utilities & Civic Digital Services"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1 font-hindi">
                  Municipal Tagline (हिंदी)
                </label>
                <input
                  type="text"
                  value={settings.taglineHi || ""}
                  onChange={(e) => updateField("taglineHi", e.target.value)}
                  placeholder="फाजिलनगर नगर पंचायत — डिजिटल नागरिक सेवा पोर्टल"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-hindi focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Portal Logo / Emblem URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={settings.logoUrl || ""}
                    onChange={(e) => updateField("logoUrl", e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setMediaPickerTarget("logoUrl")}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Media Library</span>
                  </button>
                </div>
              </div>
            </div>
          </FormSection>
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
          <FormSection
            title="Homepage Section Visibility Switches (12 Sections)"
            description="Control which sections appear on the live portal homepage without modifying codebase. Switches persist directly to database upon saving."
            icon={Eye}
          >
            <div className="space-y-6">
              {/* Group A: Hero & Alerts */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  A. Hero Carousel & Civic Alerts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: "heroCarousel", label: "Hero Banner & Carousel", desc: "Top animated photo slides" },
                    { key: "announcementBanner", label: "Top Announcement Strip", desc: "Live scrolling notification bar" },
                    { key: "emergencyStrip", label: "Emergency Dialer Strip", desc: "One-touch 24/7 call buttons" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-bold">{sec.label}</h5>
                          <p className="text-[11px] opacity-75">{sec.desc}</p>
                        </div>
                        <StatusBadge
                          status={isEnabled ? "active" : "inactive"}
                          label={isEnabled ? "Enabled" : "Hidden"}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group B: Directory & Discovery */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  B. Directory & Geographic Discovery
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: "statsCounters", label: "Town Statistics Grid", desc: "19+ Verified Institution counters" },
                    { key: "quickCategories", label: "Quick Category Hubs", desc: "Education, Hospitals, Fuel buttons" },
                    { key: "interactiveMap", label: "Interactive Leaflet Map", desc: "Verified geographic town map" },
                    { key: "featuredDirectory", label: "Curated Directory Cards", desc: "Town institutions preview" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-bold">{sec.label}</h5>
                          <p className="text-[11px] opacity-75">{sec.desc}</p>
                        </div>
                        <StatusBadge
                          status={isEnabled ? "active" : "inactive"}
                          label={isEnabled ? "Enabled" : "Hidden"}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group C: Public Services & Heritage */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  C. Content, Public Utilities & Heritage
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: "heritageSpotlight", label: "Sacred Twin Heritage", desc: "Pawapuri and Kushinagar narrative" },
                    { key: "publicServices", label: "Civic Public Services", desc: "e-District and government schemes" },
                    { key: "latestNews", label: "Latest News & Reels", desc: "Community update bulletin carousel" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-bold">{sec.label}</h5>
                          <p className="text-[11px] opacity-75">{sec.desc}</p>
                        </div>
                        <StatusBadge
                          status={isEnabled ? "active" : "inactive"}
                          label={isEnabled ? "Enabled" : "Hidden"}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group D: Citizen Corner & Sponsorship */}
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  D. Citizen Engagement & Commercial
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: "citizenCorner", label: "Citizen Submission Desk", desc: "Add local shop/place callout" },
                    { key: "advertisements", label: "Live Advertisements", desc: "Floating, banner and sponsor slots" },
                  ].map((sec) => {
                    const isEnabled = settings.sections?.[sec.key] !== false;
                    return (
                      <div
                        key={sec.key}
                        onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                        className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isEnabled
                            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                            : "bg-slate-50 border-slate-200 text-slate-400"
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-bold">{sec.label}</h5>
                          <p className="text-[11px] opacity-75">{sec.desc}</p>
                        </div>
                        <StatusBadge
                          status={isEnabled ? "active" : "inactive"}
                          label={isEnabled ? "Enabled" : "Hidden"}
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </FormSection>
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
                        fazilnagar.vercel.app
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
