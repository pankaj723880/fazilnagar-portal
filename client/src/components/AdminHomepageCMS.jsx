import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  clearCMSCache,
  getSiteSettings,
  DEFAULT_SITE_SETTINGS,
} from "../services/cmsService";
import {
  Megaphone,
  Compass,
  Landmark,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  Save,
  CheckCircle,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  ExternalLink,
  Phone,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Clock,
  ChevronRight,
  BookOpen,
} from "lucide-react";

const APPROVED_ICONS = [
  "Compass",
  "Calendar",
  "Landmark",
  "Map",
  "PlusCircle",
  "ShieldCheck",
  "Navigation",
  "Sparkles",
  "PhoneCall",
  "Store",
  "GraduationCap",
  "Stethoscope",
  "Info",
  "Layers",
  "LayoutGrid",
];

const BUTTON_VARIANTS = [
  { id: "primary", label: "Crimson Red (Primary)" },
  { id: "amber", label: "Warm Amber (Festive)" },
  { id: "dark", label: "Dark Slate (Contrast)" },
  { id: "glass", label: "Frosted Glass (Subtle)" },
  { id: "emerald", label: "Emerald Green (Civic)" },
];

export default function AdminHomepageCMS() {
  const [activeTab, setActiveTab] = useState("announcement");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [isDirty, setIsDirty] = useState(false);

  // Form states reflecting siteSettings
  const [formData, setFormData] = useState(() => JSON.parse(JSON.stringify(DEFAULT_SITE_SETTINGS)));

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await API.get("/settings");
      if (res.data?.success && res.data?.settings) {
        const s = res.data.settings;
        // Merge deep with defaults
        setFormData((prev) => ({
          ...prev,
          ...s,
          topAlertBar: { ...prev.topAlertBar, ...(s.topAlertBar || {}) },
          navigation: {
            ...prev.navigation,
            ...(s.navigation || {}),
            navItems: s.navigation?.navItems || prev.navigation.navItems,
          },
          heroContent: {
            ...prev.heroContent,
            ...(s.heroContent || {}),
            actionButtons: s.heroContent?.actionButtons || prev.heroContent.actionButtons,
            trustBadges: s.heroContent?.trustBadges || prev.heroContent.trustBadges,
          },
          homepageSections: {
            ...prev.homepageSections,
            ...(s.homepageSections || {}),
            explore: { ...prev.homepageSections.explore, ...(s.homepageSections?.explore || {}) },
            publicServices: {
              ...prev.homepageSections.publicServices,
              ...(s.homepageSections?.publicServices || {}),
              cards: s.homepageSections?.publicServices?.cards || prev.homepageSections.publicServices.cards,
            },
            map: { ...prev.homepageSections.map, ...(s.homepageSections?.map || {}) },
            events: { ...prev.homepageSections.events, ...(s.homepageSections?.events || {}) },
            heritage: { ...prev.homepageSections.heritage, ...(s.homepageSections?.heritage || {}) },
          },
          footer: { ...prev.footer, ...(s.footer || {}) },
        }));
      }
    } catch (err) {
      console.error("Failed to fetch site settings:", err);
      showToast("Failed to load settings from server. Showing local cache.", "error");
    } finally {
      setLoading(false);
      setIsDirty(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "success" });
    }, 4000);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    const token = getAuthToken();

    try {
      const res = await API.put("/settings", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        clearCMSCache();
        showToast("Homepage content saved successfully! Visible publicly immediately.", "success");
        setIsDirty(false);
        // Refresh to confirm persistence
        fetchSettings();
      } else {
        throw new Error(res.data?.message || "Server rejected save request");
      }
    } catch (err) {
      console.error("Save error:", err);
      showToast(err.response?.data?.message || err.message || "Failed to save settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (section, field, value) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateSubSectionField = (section, subSection, field, value) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...prev[section][subSection],
          [field]: value,
        },
      },
    }));
  };

  // Nav Links Handlers
  const handleNavLinkChange = (idx, field, value) => {
    setIsDirty(true);
    const updated = [...(formData.navigation?.navItems || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData((prev) => ({
      ...prev,
      navigation: { ...prev.navigation, navItems: updated },
    }));
  };

  const handleMoveNavLink = (idx, direction) => {
    const updated = [...(formData.navigation?.navItems || [])];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      navigation: { ...prev.navigation, navItems: updated },
    }));
  };

  // Action Buttons Handlers
  const handleActionButtonChange = (idx, field, value) => {
    setIsDirty(true);
    const updated = [...(formData.heroContent?.actionButtons || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData((prev) => ({
      ...prev,
      heroContent: { ...prev.heroContent, actionButtons: updated },
    }));
  };

  const handleMoveActionButton = (idx, direction) => {
    const updated = [...(formData.heroContent?.actionButtons || [])];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    // update displayOrder
    updated.forEach((btn, i) => {
      btn.displayOrder = i + 1;
    });
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      heroContent: { ...prev.heroContent, actionButtons: updated },
    }));
  };

  // Essential Services Cards Handlers
  const handleServiceCardChange = (idx, field, value) => {
    setIsDirty(true);
    const updated = [...(formData.homepageSections?.publicServices?.cards || [])];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormData((prev) => ({
      ...prev,
      homepageSections: {
        ...prev.homepageSections,
        publicServices: {
          ...prev.homepageSections.publicServices,
          cards: updated,
        },
      },
    }));
  };

  const handleAddServiceCard = () => {
    setIsDirty(true);
    const newCard = {
      id: `svc-${Date.now()}`,
      badge: "Emergency Service",
      title: "New Public Service",
      address: "Fazilnagar - 274401",
      description: "Service details, timing, and contact coordinates.",
      phone: "+91 0000000000",
      phoneLabel: "Helpline",
      hours: "24x7 Control",
      directions: true,
      displayOrder: (formData.homepageSections?.publicServices?.cards || []).length + 1,
    };
    setFormData((prev) => ({
      ...prev,
      homepageSections: {
        ...prev.homepageSections,
        publicServices: {
          ...prev.homepageSections.publicServices,
          cards: [...(prev.homepageSections.publicServices?.cards || []), newCard],
        },
      },
    }));
  };

  const handleDeleteServiceCard = (idx) => {
    if (!window.confirm("Are you sure you want to remove this public service card?")) return;
    setIsDirty(true);
    const updated = [...(formData.homepageSections?.publicServices?.cards || [])];
    updated.splice(idx, 1);
    setFormData((prev) => ({
      ...prev,
      homepageSections: {
        ...prev.homepageSections,
        publicServices: {
          ...prev.homepageSections.publicServices,
          cards: updated,
        },
      },
    }));
  };

  const tabs = [
    { id: "announcement", label: "Announcement Bar", icon: Megaphone },
    { id: "navigation", label: "Header & Nav", icon: Compass },
    { id: "hero", label: "Hero Content", icon: Layers },
    { id: "buttons", label: "Action Buttons & Badges", icon: Sparkles },
    { id: "sections", label: "Section Headings", icon: BookOpen },
    { id: "services", label: "Public Service Cards", icon: ShieldCheck },
    { id: "footer", label: "Footer & Legal", icon: Landmark },
  ];

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-red-500" />
        <p className="text-sm font-semibold">Loading Homepage CMS Content…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.message && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white transition-all ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Actions */}
      <div className="bg-[#14233B] p-5 sm:p-6 rounded-2xl border border-slate-800 text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Authoritative Homepage CMS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
            Homepage Content Manager
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage all public homepage elements — announcement bar, brand, hero text, buttons, sections, cards, and footer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://fazilnagar.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition"
          >
            <span>Live Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={fetchSettings}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title="Reload from Server"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg transition cursor-pointer active:scale-95 ${
              isDirty
                ? "bg-[#B8323C] hover:bg-red-700 text-white animate-pulse"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes…" : isDirty ? "Save Changes *" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-[#B8323C] text-white shadow-md shadow-red-950/40"
                  : "bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Announcement & Top Status Bar */}
      {activeTab === "announcement" && (
        <div className="bg-[#14233B] p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#B8323C]" /> Top Announcement & Status Bar
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Controls the top thin banner above the main navigation bar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Civic Status Badge Label
              </label>
              <input
                type="text"
                value={formData.topAlertBar?.civicStatusLabel || ""}
                onChange={(e) => updateField("topAlertBar", "civicStatusLabel", e.target.value)}
                placeholder="Official Civic Portal"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Town Name & Location Text
              </label>
              <input
                type="text"
                value={formData.topAlertBar?.townName || ""}
                onChange={(e) => updateField("topAlertBar", "townName", e.target.value)}
                placeholder="Fazilnagar (PIN 274401), Kushinagar UP"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Helpline Label
              </label>
              <input
                type="text"
                value={formData.topAlertBar?.emergencyHelplineText || ""}
                onChange={(e) => updateField("topAlertBar", "emergencyHelplineText", e.target.value)}
                placeholder="Helplines: 112 (Police) • 108 (Ambulance)"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Direct Emergency Phone Number
              </label>
              <input
                type="text"
                value={formData.topAlertBar?.helplinePhone || ""}
                onChange={(e) => updateField("topAlertBar", "helplinePhone", e.target.value)}
                placeholder="112"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Top Announcement Ticker Text (Broadcast Alert)
            </label>
            <textarea
              rows="2"
              value={formData.topAlertBar?.alertText || ""}
              onChange={(e) => updateField("topAlertBar", "alertText", e.target.value)}
              placeholder="Important notice or welcome bulletin for all town residents..."
              className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-[#B8323C]"
            ></textarea>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="tickerActive"
              checked={formData.topAlertBar?.tickerActive !== false}
              onChange={(e) => updateField("topAlertBar", "tickerActive", e.target.checked)}
              className="w-4 h-4 rounded text-red-600 focus:ring-0 bg-slate-800 border-slate-700"
            />
            <label htmlFor="tickerActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Show Announcement Bar on Public Website
            </label>
          </div>
        </div>
      )}

      {/* TAB 2: Header & Navigation */}
      {activeTab === "navigation" && (
        <div className="bg-[#14233B] p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#B8323C]" /> Header & Navigation Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Customize the logo wordmark, sub-tagline, navigation items, and right-side CTA button.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Brand First Word (White)
              </label>
              <input
                type="text"
                value={formData.navigation?.brandFirst || ""}
                onChange={(e) => updateField("navigation", "brandFirst", e.target.value)}
                placeholder="FAZIL"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Brand Second Word (Red)
              </label>
              <input
                type="text"
                value={formData.navigation?.brandSecond || ""}
                onChange={(e) => updateField("navigation", "brandSecond", e.target.value)}
                placeholder="NAGAR"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Header Sub-Tagline
              </label>
              <input
                type="text"
                value={formData.navigation?.tagline || ""}
                onChange={(e) => updateField("navigation", "tagline", e.target.value)}
                placeholder="CIVIC PORTAL"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Header Action Button Text
              </label>
              <input
                type="text"
                value={formData.navigation?.actionButtonText || ""}
                onChange={(e) => updateField("navigation", "actionButtonText", e.target.value)}
                placeholder="+ Add Place"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Header Action Button Destination
              </label>
              <input
                type="text"
                value={formData.navigation?.actionButtonLink || ""}
                onChange={(e) => updateField("navigation", "actionButtonLink", e.target.value)}
                placeholder="/directory?add=true"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>
          </div>

          {/* Navigation Items List */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Navigation Menu Links ({formData.navigation?.navItems?.length || 0})
            </h4>

            <div className="space-y-2.5">
              {(formData.navigation?.navItems || []).map((link, idx) => (
                <div
                  key={link.id || idx}
                  className="bg-[#0F1B2F] p-3.5 rounded-xl border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Label</span>
                      <input
                        type="text"
                        value={link.label || ""}
                        onChange={(e) => handleNavLinkChange(idx, "label", e.target.value)}
                        className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Path / Route</span>
                      <input
                        type="text"
                        value={link.path || ""}
                        onChange={(e) => handleNavLinkChange(idx, "path", e.target.value)}
                        className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-0.5">Badge (Optional)</span>
                      <input
                        type="text"
                        value={link.badge || ""}
                        onChange={(e) => handleNavLinkChange(idx, "badge", e.target.value)}
                        placeholder="e.g. Melas, Live, Verified"
                        className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      type="button"
                      onClick={() => handleNavLinkChange(idx, "isActive", link.isActive === false)}
                      className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${
                        link.isActive !== false
                          ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                          : "bg-slate-800 border-slate-700 text-slate-400"
                      }`}
                      title={link.isActive !== false ? "Visible" : "Hidden"}
                    >
                      {link.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveNavLink(idx, "up")}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === (formData.navigation?.navItems?.length || 0) - 1}
                      onClick={() => handleMoveNavLink(idx, "down")}
                      className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Hero Section & Search */}
      {activeTab === "hero" && (
        <div className="bg-[#14233B] p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#B8323C]" /> Hero Section & Search Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Controls the main headline, Hindi subtitle, descriptive summary, pill badge, and directory search placeholder.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pill Badge Location
              </label>
              <input
                type="text"
                value={formData.heroContent?.badgeLocation || ""}
                onChange={(e) => updateField("heroContent", "badgeLocation", e.target.value)}
                placeholder="Official Civic Portal"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pill Badge Description Text
              </label>
              <input
                type="text"
                value={formData.heroContent?.badgeTitle || ""}
                onChange={(e) => updateField("heroContent", "badgeTitle", e.target.value)}
                placeholder="Nagar Panchayat Fazilnagar • Kushinagar (PIN 274401)"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Master Heading (English)
            </label>
            <input
              type="text"
              value={formData.heroContent?.heading || ""}
              onChange={(e) => updateField("heroContent", "heading", e.target.value)}
              placeholder="Fazilnagar Town Civic & Local Directory"
              className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-bold outline-none focus:border-[#B8323C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Hindi Subtitle / Slogan (Red Accent)
            </label>
            <input
              type="text"
              value={formData.heroContent?.subtitleHindi || ""}
              onChange={(e) => updateField("heroContent", "subtitleHindi", e.target.value)}
              placeholder="अपना फाजिलनगर, अपनी पहचान"
              className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-red-400 font-bold font-hindi outline-none focus:border-[#B8323C]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Hero Section Narrative Summary
            </label>
            <textarea
              rows="3"
              value={formData.heroContent?.description || ""}
              onChange={(e) => updateField("heroContent", "description", e.target.value)}
              placeholder="Fazilnagar Town Official Civic & Local Directory Portal (PIN 274401, Kushinagar, Uttar Pradesh)..."
              className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-[#B8323C]"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Search Bar Placeholder Text
              </label>
              <input
                type="text"
                value={formData.heroContent?.searchPlaceholder || ""}
                onChange={(e) => updateField("heroContent", "searchPlaceholder", e.target.value)}
                placeholder="Search schools, hospitals, medical stores, sweet shops…"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Search Button Label
              </label>
              <input
                type="text"
                value={formData.heroContent?.searchButtonText || ""}
                onChange={(e) => updateField("heroContent", "searchButtonText", e.target.value)}
                placeholder="Search"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Hero Action Buttons & Trust Badges */}
      {activeTab === "buttons" && (
        <div className="bg-[#14233B] p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B8323C]" /> Hero Action Buttons & Trust Badges
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure each button under the search bar: visible label, approved icon, destination URL or section ID, active state, and style variant.
            </p>
          </div>

          <div className="space-y-3">
            {(formData.heroContent?.actionButtons || []).map((btn, idx) => (
              <div
                key={btn.id || idx}
                className="bg-[#0F1B2F] p-4 rounded-xl border border-slate-700 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Button Label</label>
                    <input
                      type="text"
                      value={btn.label || ""}
                      onChange={(e) => handleActionButtonChange(idx, "label", e.target.value)}
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Icon</label>
                    <select
                      value={btn.icon || "Compass"}
                      onChange={(e) => handleActionButtonChange(idx, "icon", e.target.value)}
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      {APPROVED_ICONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Target / Link</label>
                    <input
                      type="text"
                      value={btn.target || ""}
                      onChange={(e) => handleActionButtonChange(idx, "target", e.target.value)}
                      placeholder="e.g. explore-categories or /directory"
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Style Variant</label>
                    <select
                      value={btn.variant || "primary"}
                      onChange={(e) => handleActionButtonChange(idx, "variant", e.target.value)}
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      {BUTTON_VARIANTS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <input
                      type="checkbox"
                      id={`btn-isLink-${idx}`}
                      checked={Boolean(btn.isLink)}
                      onChange={(e) => handleActionButtonChange(idx, "isLink", e.target.checked)}
                      className="w-4 h-4 rounded text-red-600 focus:ring-0 bg-slate-800 border-slate-700"
                    />
                    <label htmlFor={`btn-isLink-${idx}`} className="text-xs text-slate-300 cursor-pointer">
                      Route / Link (not scroll)
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-300">Order #{idx + 1}</span>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveActionButton(idx, "up")}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === (formData.heroContent?.actionButtons?.length || 0) - 1}
                      onClick={() => handleMoveActionButton(idx, "down")}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleActionButtonChange(idx, "isActive", btn.isActive === false)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        btn.isActive !== false
                          ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                          : "bg-slate-800 border border-slate-700 text-slate-400"
                      }`}
                    >
                      {btn.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{btn.isActive !== false ? "Visible" : "Hidden"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust Badges */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Town Trust Badges (Below Buttons)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(formData.heroContent?.trustBadges || []).map((badge, idx) => (
                <div key={badge.id || idx} className="bg-[#0F1B2F] p-3 rounded-xl border border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-slate-400 block">Badge #{idx + 1}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDirty(true);
                        const updated = [...(formData.heroContent?.trustBadges || [])];
                        updated[idx] = { ...updated[idx], isActive: updated[idx].isActive === false };
                        setFormData((prev) => ({
                          ...prev,
                          heroContent: { ...prev.heroContent, trustBadges: updated },
                        }));
                      }}
                      className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                        badge.isActive !== false
                          ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                          : "bg-slate-800 border border-slate-700 text-slate-400"
                      }`}
                    >
                      {badge.isActive !== false ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{badge.isActive !== false ? "Visible" : "Hidden"}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={badge.label ?? badge.text ?? ""}
                    onChange={(e) => {
                      setIsDirty(true);
                      const updated = [...(formData.heroContent?.trustBadges || [])];
                      updated[idx] = { ...updated[idx], label: e.target.value, text: e.target.value };
                      setFormData((prev) => ({
                        ...prev,
                        heroContent: { ...prev.heroContent, trustBadges: updated },
                      }));
                    }}
                    placeholder={`Badge #${idx + 1} Label`}
                    className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Homepage Section Headings */}
      {activeTab === "sections" && (
        <div className="bg-[#14233B] p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#B8323C]" /> Homepage Section Headings & Subtitles
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Edit the headings, badges, and explanatory text for sections below the fold. Dynamic items (places, events, heritage) stay in their respective authoritative collections.
            </p>
          </div>

          {/* Explore Fazilnagar */}
          <div className="bg-[#0F1B2F] p-4 rounded-xl border border-slate-700 space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
              1. Explore Fazilnagar Section
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Badge</label>
                <input
                  type="text"
                  value={formData.homepageSections?.explore?.badge || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "explore", "badge", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.homepageSections?.explore?.title || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "explore", "title", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Subtitle</label>
              <input
                type="text"
                value={formData.homepageSections?.explore?.subtitle || ""}
                onChange={(e) => updateSubSectionField("homepageSections", "explore", "subtitle", e.target.value)}
                className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
          </div>

          {/* Map Section */}
          <div className="bg-[#0F1B2F] p-4 rounded-xl border border-slate-700 space-y-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
              2. Explore Fazilnagar on Map
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Badge</label>
                <input
                  type="text"
                  value={formData.homepageSections?.map?.badge || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "map", "badge", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.homepageSections?.map?.title || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "map", "title", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Subtitle</label>
                <input
                  type="text"
                  value={formData.homepageSections?.map?.subtitle || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "map", "subtitle", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Coordinates Text</label>
                <input
                  type="text"
                  value={formData.homepageSections?.map?.coordinatesText || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "map", "coordinatesText", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>
          </div>

          {/* Events & Melas */}
          <div className="bg-[#0F1B2F] p-4 rounded-xl border border-slate-700 space-y-3">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider block">
              3. Upcoming Events & Town Melas
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Badge</label>
                <input
                  type="text"
                  value={formData.homepageSections?.events?.badge || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "events", "badge", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.homepageSections?.events?.title || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "events", "title", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Subtitle</label>
              <input
                type="text"
                value={formData.homepageSections?.events?.subtitle || ""}
                onChange={(e) => updateSubSectionField("homepageSections", "events", "subtitle", e.target.value)}
                className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
              />
            </div>
          </div>

          {/* Sacred Twin Heritage */}
          <div className="bg-[#0F1B2F] p-4 rounded-xl border border-slate-700 space-y-3">
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
              4. Sacred Twin Heritage Section
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Badge</label>
                <input
                  type="text"
                  value={formData.homepageSections?.heritage?.badge || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "heritage", "badge", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Title</label>
                <input
                  type="text"
                  value={formData.homepageSections?.heritage?.title || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "heritage", "title", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Subtitle</label>
              <textarea
                rows="2"
                value={formData.homepageSections?.heritage?.subtitle || ""}
                onChange={(e) => updateSubSectionField("homepageSections", "heritage", "subtitle", e.target.value)}
                className="w-full bg-[#14233B] border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tab 1 Label</label>
                <input
                  type="text"
                  value={formData.homepageSections?.heritage?.tab1Label || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "heritage", "tab1Label", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tab 2 Label</label>
                <input
                  type="text"
                  value={formData.homepageSections?.heritage?.tab2Label || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "heritage", "tab2Label", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Tab 3 Label</label>
                <input
                  type="text"
                  value={formData.homepageSections?.heritage?.tab3Label || ""}
                  onChange={(e) => updateSubSectionField("homepageSections", "heritage", "tab3Label", e.target.value)}
                  className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Essential Public Service Cards */}
      {activeTab === "services" && (
        <div className="bg-[#14233B] p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B8323C]" /> Essential Public Services (Civic Cards)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Edit the 4 primary public welfare cards (Hospital, Police, Post Office, Electricity, etc.) and emergency contact points.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddServiceCard}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service Card</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Section Badge
              </label>
              <input
                type="text"
                value={formData.homepageSections?.publicServices?.badge || ""}
                onChange={(e) => updateSubSectionField("homepageSections", "publicServices", "badge", e.target.value)}
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Section Title
              </label>
              <input
                type="text"
                value={formData.homepageSections?.publicServices?.title || ""}
                onChange={(e) => updateSubSectionField("homepageSections", "publicServices", "title", e.target.value)}
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-bold outline-none focus:border-[#B8323C]"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {(formData.homepageSections?.publicServices?.cards || []).map((card, idx) => (
              <div
                key={card.id || idx}
                className="bg-[#0F1B2F] p-4 rounded-xl border border-slate-700 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                    Card #{idx + 1}: {card.title || "Service Card"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteServiceCard(idx)}
                    className="p-1 rounded text-red-400 hover:bg-red-950/60"
                    title="Delete card"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Badge</label>
                    <input
                      type="text"
                      value={card.badge || ""}
                      onChange={(e) => handleServiceCardChange(idx, "badge", e.target.value)}
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Title</label>
                    <input
                      type="text"
                      value={card.title || ""}
                      onChange={(e) => handleServiceCardChange(idx, "title", e.target.value)}
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Address / Landmark</label>
                    <input
                      type="text"
                      value={card.address || ""}
                      onChange={(e) => handleServiceCardChange(idx, "address", e.target.value)}
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">Description / Services</label>
                  <input
                    type="text"
                    value={card.description || ""}
                    onChange={(e) => handleServiceCardChange(idx, "description", e.target.value)}
                    className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={card.phone || ""}
                      onChange={(e) => handleServiceCardChange(idx, "phone", e.target.value)}
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Phone Label</label>
                    <input
                      type="text"
                      value={card.phoneLabel || ""}
                      onChange={(e) => handleServiceCardChange(idx, "phoneLabel", e.target.value)}
                      placeholder="e.g. 📞 05564-222102"
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Operating Hours</label>
                    <input
                      type="text"
                      value={card.hours || ""}
                      onChange={(e) => handleServiceCardChange(idx, "hours", e.target.value)}
                      placeholder="e.g. 24x7 Control or 09:00-17:00"
                      className="w-full bg-[#14233B] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: Footer & Contact Information */}
      {activeTab === "footer" && (
        <div className="bg-[#14233B] p-6 rounded-2xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-[#B8323C]" /> Footer Text & Contact Coordinates
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure the bottom editorial disclaimer, about paragraph, copyright line, and administrative contact emails.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              About Fazilnagar Description Paragraph
            </label>
            <textarea
              rows="3"
              value={formData.footer?.aboutText || ""}
              onChange={(e) => updateField("footer", "aboutText", e.target.value)}
              className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-[#B8323C]"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Legal Disclaimer & Town Notice
            </label>
            <textarea
              rows="2"
              value={formData.footer?.disclaimerText || ""}
              onChange={(e) => updateField("footer", "disclaimerText", e.target.value)}
              className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-[#B8323C]"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Copyright Notice Line
            </label>
            <input
              type="text"
              value={formData.footer?.copyrightText || ""}
              onChange={(e) => updateField("footer", "copyrightText", e.target.value)}
              placeholder="© 2026 Fazilnagar Town Portal • Modern Civic & Editorial System. All rights reserved."
              className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Official Contact Email
              </label>
              <input
                type="email"
                value={formData.footer?.contactEmail || ""}
                onChange={(e) => updateField("footer", "contactEmail", e.target.value)}
                placeholder="contact@fazilnagar.in"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Public Support Phone
              </label>
              <input
                type="text"
                value={formData.footer?.contactPhone || ""}
                onChange={(e) => updateField("footer", "contactPhone", e.target.value)}
                placeholder="+91 5564 222102"
                className="w-full bg-[#0F1B2F] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[#B8323C]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save Bar (Sticky on Mobile) */}
      <div className="flex items-center justify-between p-4 bg-[#0F1B2F] rounded-2xl border border-slate-800">
        <span className="text-xs text-slate-400">
          {isDirty ? (
            <span className="text-amber-400 font-semibold">⚠️ Unsaved changes pending. Click Save Changes to publish.</span>
          ) : (
            <span className="text-emerald-400 font-semibold">✓ All changes saved and published to MongoDB Atlas.</span>
          )}
        </span>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#B8323C] hover:bg-red-700 text-white shadow-lg transition cursor-pointer flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Saving…" : "Save All Changes"}</span>
        </button>
      </div>
    </div>
  );
}
