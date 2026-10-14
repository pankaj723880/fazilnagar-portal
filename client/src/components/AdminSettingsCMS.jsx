import { useState, useEffect } from "react";
import API from "../api";
import { getAuthToken } from "../utils/authStorage";
import {
  Sliders,
  Save,
  CheckCircle,
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
} from "lucide-react";

export default function AdminSettingsCMS({ onSaveSuccess }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("general"); // general | announcement | contact | sections | seo | footer

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await API.get("/settings");
      if (res.data?.success && res.data?.settings) {
        setSettings(res.data.settings);
      }
    } catch (err) {
      console.warn("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
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
        setToast("Website settings saved successfully!");
        if (onSaveSuccess) onSaveSuccess(res.data.settings);
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setToast("Failed to save settings: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(""), 4000);
    }
  };

  const updateField = (path, value) => {
    setSettings((prev) => {
      const copy = { ...prev };
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

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-xs font-semibold">Loading portal configuration...</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Centralized Portal CMS</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-[#18232E]">
            Website Settings & Layout Controls
          </h2>
          <p className="text-xs text-slate-500">
            Configure portal title, official contacts, announcement banner, and homepage section toggles.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
        {[
          { id: "general", label: "General & Branding", icon: Globe },
          { id: "announcement", label: "Announcement Banner", icon: Megaphone },
          { id: "contact", label: "Office & Helplines", icon: Phone },
          { id: "sections", label: "Section Visibility", icon: Eye },
          { id: "seo", label: "SEO & Social Sharing", icon: Share2 },
          { id: "footer", label: "Footer & Legal", icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                isActive
                  ? "bg-white text-[#18232E] shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
        {/* 1. GENERAL & BRANDING */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#18232E] border-b pb-2">
              General Identity & Municipal Tagline
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Portal Title (पूरा नाम)
                </label>
                <input
                  type="text"
                  value={settings.siteName || ""}
                  onChange={(e) => updateField("siteName", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Short Brand Name (संक्षिप्त नाम)
                </label>
                <input
                  type="text"
                  value={settings.shortName || ""}
                  onChange={(e) => updateField("shortName", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sub-heading / Municipal Tagline (English)
                </label>
                <input
                  type="text"
                  value={settings.tagline || ""}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sub-heading / Municipal Tagline (Hindi)
                </label>
                <input
                  type="text"
                  value={settings.taglineHindi || ""}
                  onChange={(e) => updateField("taglineHindi", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Logo URL (Primary Branding Icon)
                </label>
                <input
                  type="text"
                  value={settings.logoUrl || ""}
                  onChange={(e) => updateField("logoUrl", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Favicon URL
                </label>
                <input
                  type="text"
                  value={settings.faviconUrl || ""}
                  onChange={(e) => updateField("faviconUrl", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. ANNOUNCEMENT BANNER */}
        {activeTab === "announcement" && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#18232E] border-b pb-2 flex items-center justify-between">
              <span>Top Announcement Ticker Banner</span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-normal">
                <input
                  type="checkbox"
                  checked={settings.announcement?.enabled || false}
                  onChange={(e) => updateField("announcement.enabled", e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-bold text-slate-700">Enable Announcement Banner</span>
              </label>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Announcement Message (सूचना टेक्स्ट)
              </label>
              <textarea
                rows={2}
                value={settings.announcement?.text || ""}
                onChange={(e) => updateField("announcement.text", e.target.value)}
                placeholder="Important civic notice, helpline update, or festival greeting..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Destination Link
                </label>
                <input
                  type="text"
                  value={settings.announcement?.link || ""}
                  onChange={(e) => updateField("announcement.link", e.target.value)}
                  placeholder="/directory or https://..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.announcement?.bgColor || "#0D5E49"}
                    onChange={(e) => updateField("announcement.bgColor", e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.announcement?.bgColor || "#0D5E49"}
                    onChange={(e) => updateField("announcement.bgColor", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Text Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.announcement?.textColor || "#FFFFFF"}
                    onChange={(e) => updateField("announcement.textColor", e.target.value)}
                    className="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.announcement?.textColor || "#FFFFFF"}
                    onChange={(e) => updateField("announcement.textColor", e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Live Banner Preview */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold uppercase text-slate-400 block mb-1.5">
                Live Banner Preview:
              </span>
              <div
                style={{
                  backgroundColor: settings.announcement?.bgColor || "#0D5E49",
                  color: settings.announcement?.textColor || "#FFFFFF",
                }}
                className="py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs"
              >
                <span>📢 {settings.announcement?.text || "Announcement text appears here"}</span>
                <span className="text-[10px] underline font-medium">Click to view &rarr;</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. CONTACT & HELPLINES */}
        {activeTab === "contact" && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#18232E] border-b pb-2">
              Official Administration & 24/7 Helplines
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Municipal Phone (कार्यालय फोन)
                </label>
                <input
                  type="text"
                  value={settings.contact?.officialPhone || ""}
                  onChange={(e) => updateField("contact.officialPhone", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  24x7 Emergency Helplines (Police / Ambulance)
                </label>
                <input
                  type="text"
                  value={settings.contact?.emergencyPhone || ""}
                  onChange={(e) => updateField("contact.emergencyPhone", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Community Health Centre (CHC) Direct Phone
                </label>
                <input
                  type="text"
                  value={settings.contact?.chcPhone || ""}
                  onChange={(e) => updateField("contact.chcPhone", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={settings.contact?.email || ""}
                  onChange={(e) => updateField("contact.email", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nagar Panchayat Office Address
                </label>
                <input
                  type="text"
                  value={settings.contact?.officeAddress || ""}
                  onChange={(e) => updateField("contact.officeAddress", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Office Public Working Hours
                </label>
                <input
                  type="text"
                  value={settings.contact?.workingHours || ""}
                  onChange={(e) => updateField("contact.workingHours", e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <h3 className="text-sm font-extrabold text-[#18232E] border-b pb-2 pt-4">
              Social Media Channels
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Group / Channel</label>
                <input
                  type="text"
                  value={settings.socialLinks?.whatsappGroup || ""}
                  onChange={(e) => updateField("socialLinks.whatsappGroup", e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Facebook Page</label>
                <input
                  type="text"
                  value={settings.socialLinks?.facebook || ""}
                  onChange={(e) => updateField("socialLinks.facebook", e.target.value)}
                  placeholder="https://facebook.com/..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">YouTube Channel</label>
                <input
                  type="text"
                  value={settings.socialLinks?.youtube || ""}
                  onChange={(e) => updateField("socialLinks.youtube", e.target.value)}
                  placeholder="https://youtube.com/@..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. SECTION VISIBILITY SWITCHES */}
        {activeTab === "sections" && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#18232E] border-b pb-2">
              Homepage Module Display Controls (Show / Hide Sections)
            </h3>
            <p className="text-xs text-slate-500">
              Toggle which sections appear on the live homepage without code modifications.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: "heroCarousel", label: "Hero Banner & Carousel", desc: "Top animated image carousel" },
                { key: "announcementBanner", label: "Top Announcement Strip", desc: "Notice ticker bar" },
                { key: "statsCounters", label: "Town Statistics Grid", desc: "Institution counters and numbers" },
                { key: "quickCategories", label: "Quick Category Hubs", desc: "Schools, Hospitals, Fuel buttons" },
                { key: "interactiveMap", label: "Interactive Leaflet Map", desc: "Interactive geographic town map" },
                { key: "featuredDirectory", label: "Curated Directory Cards", desc: "Town institutions preview" },
                { key: "heritageSpotlight", label: "Sacred Twin Heritage", desc: "Pawapuri and Kushinagar narrative" },
                { key: "emergencyStrip", label: "Emergency Dialer Strip", desc: "One-touch 24/7 call buttons" },
                { key: "latestNews", label: "Latest News & Reels", desc: "Community update carousel" },
                { key: "publicServices", label: "Civic Public Services", desc: "e-District and government schemes" },
                { key: "citizenCorner", label: "Citizen Submission Desk", desc: "Public place submission callout" },
                { key: "advertisements", label: "Live Advertisements", desc: "Banner ads and sponsor slots" },
              ].map((sec) => {
                const isEnabled = settings.sections?.[sec.key] !== false;
                return (
                  <div
                    key={sec.key}
                    onClick={() => updateField(`sections.${sec.key}`, !isEnabled)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isEnabled
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}
                  >
                    <div>
                      <h4 className="text-xs font-bold">{sec.label}</h4>
                      <p className="text-[11px] opacity-80">{sec.desc}</p>
                    </div>
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold ${
                        isEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-white"
                      }`}
                    >
                      {isEnabled ? "✓" : "✕"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. SEO & SOCIAL SHARING */}
        {activeTab === "seo" && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#18232E] border-b pb-2">
              Default SEO Metadata & OpenGraph Social Sharing
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Meta Title (Browser Tab & Search Results)
              </label>
              <input
                type="text"
                value={settings.seo?.metaTitle || ""}
                onChange={(e) => updateField("seo.metaTitle", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Default Meta Description (Google Search Snippet)
              </label>
              <textarea
                rows={3}
                value={settings.seo?.metaDescription || ""}
                onChange={(e) => updateField("seo.metaDescription", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Social Share Image URL (WhatsApp, Facebook, Twitter Preview)
              </label>
              <input
                type="text"
                value={settings.seo?.ogImageUrl || ""}
                onChange={(e) => updateField("seo.ogImageUrl", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* 6. FOOTER */}
        {activeTab === "footer" && (
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[#18232E] border-b pb-2">
              Footer Copyright & Disclaimer
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Copyright Notice
              </label>
              <input
                type="text"
                value={settings.footer?.copyrightText || ""}
                onChange={(e) => updateField("footer.copyrightText", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Public Disclaimer Text
              </label>
              <textarea
                rows={2}
                value={settings.footer?.disclaimer || ""}
                onChange={(e) => updateField("footer.disclaimer", e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
