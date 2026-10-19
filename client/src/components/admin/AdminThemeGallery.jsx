import { useState, useEffect } from "react";
import { THEMES, getThemeById, DEFAULT_THEME_ID } from "../../constants/themes";
import { useTheme } from "../../context/ThemeContext";
import {
  Palette,
  Check,
  Sun,
  Moon,
  Sparkles,
  Save,
  RotateCcw,
  ShieldCheck,
  Eye,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function AdminThemeGallery({ onSaveSuccess }) {
  const { themeConfig, applyAdminTheme, previewTheme } = useTheme();

  // Current active configuration from backend/context
  const activeThemeId = themeConfig?.themeId || DEFAULT_THEME_ID;
  const activeMode = themeConfig?.mode || "light";

  // Admin selection state for preview & staging
  const [selectedThemeId, setSelectedThemeId] = useState(activeThemeId);
  const [selectedMode, setSelectedMode] = useState(activeMode);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [filterCategory, setFilterCategory] = useState("all");

  // Keep state synchronized if external changes occur
  useEffect(() => {
    setSelectedThemeId(activeThemeId);
    setSelectedMode(activeMode);
  }, [activeThemeId, activeMode]);

  const selectedTheme = getThemeById(selectedThemeId);
  const previewPalette = selectedMode === "dark" ? selectedTheme.dark : selectedTheme.light;

  const isDirty = selectedThemeId !== activeThemeId || selectedMode !== activeMode;

  const handleSelectTheme = (themeId) => {
    setSelectedThemeId(themeId);
    previewTheme({ themeId, mode: selectedMode });
  };

  const handleSelectMode = (mode) => {
    setSelectedMode(mode);
    previewTheme({ themeId: selectedThemeId, mode });
  };

  const handleReset = () => {
    setSelectedThemeId(activeThemeId);
    setSelectedMode(activeMode);
    previewTheme({ themeId: activeThemeId, mode: activeMode });
    showToast("Reverted to currently active global theme.", "info");
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "success" });
    }, 4000);
  };

  const handleApplyGlobally = async () => {
    setSaving(true);
    try {
      await applyAdminTheme({
        themeId: selectedThemeId,
        mode: selectedMode,
      });
      showToast(
        `Theme successfully applied globally: "${selectedTheme.name}" (${selectedMode.toUpperCase()} mode). All public visitors will now experience this visual identity.`,
        "success"
      );
      if (onSaveSuccess) {
        onSaveSuccess({ themeId: selectedThemeId, mode: selectedMode });
      }
    } catch (err) {
      console.error("Failed to apply theme:", err);
      showToast(err.message || "Failed to update global theme.", "error");
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: "all", label: "All 12 Themes" },
    { id: "Heritage & Sacred", label: "Heritage & Sacred" },
    { id: "Civic & Royal", label: "Civic & Royal" },
    { id: "Nature & Landscapes", label: "Nature & Landscapes" },
    { id: "Classic Monolithic", label: "Classic Monolithic" },
  ];

  const filteredThemes =
    filterCategory === "all"
      ? THEMES
      : THEMES.filter((t) => t.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.message && (
        <div
          className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between gap-3 shadow-md transition-all ${
            toast.type === "success"
              ? "bg-emerald-50 text-emerald-950 border-emerald-300"
              : toast.type === "error"
              ? "bg-red-50 text-red-950 border-red-300"
              : "bg-blue-50 text-blue-950 border-blue-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{toast.type === "success" ? "✔" : "ℹ"}</span>
            <span>{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast({ message: "", type: "success" })}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner: Current Live Status & Save Action */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 font-heading flex items-center gap-2">
                <span>Theme Gallery &amp; Global Visual Identity</span>
                <span className="text-[10px] bg-slate-900 text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Admin Only
                </span>
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Select from 12 curated themes and configure Light/Dark appearance. The selected configuration is saved to the database and applies across all public routes for all visitors.
          </p>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-end">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyGlobally}
            disabled={saving || !isDirty}
            className={`px-5 py-2.5 rounded-xl font-black text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              isDirty
                ? "bg-[#A83D32] hover:bg-[#873027] text-white ring-2 ring-[#A83D32]/30"
                : "bg-slate-900 text-white"
            }`}
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? "Applying..." : isDirty ? "Apply Theme Globally" : "Theme Active & Synced"}</span>
          </button>
        </div>
      </div>

      {/* Currently Live Theme vs Staged Preview Badge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
              Currently Live for Public Visitors
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-extrabold text-slate-900">
                {getThemeById(activeThemeId).name}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {activeMode === "dark" ? "🌙 Dark" : "☀️ Light"} Mode
              </span>
            </div>
          </div>
          <span className="w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
        </div>

        <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
          isDirty ? "bg-amber-50/70 border-amber-300" : "bg-slate-50 border-slate-200"
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
              Staged / Live Preview in Admin
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-extrabold text-slate-900">
                {selectedTheme.name}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {selectedMode === "dark" ? "🌙 Dark" : "☀️ Light"} Mode
              </span>
              {isDirty && (
                <span className="text-[10px] font-black text-amber-700 animate-pulse">
                  ● Unapplied
                </span>
              )}
            </div>
          </div>
          <Eye className={`w-4 h-4 ${isDirty ? "text-amber-600" : "text-slate-400"}`} />
        </div>
      </div>

      {/* Mode Switcher: Light / Dark Toggle */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2.5">
        <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
          Appearance Mode for Public Portal (थीम का मोड)
        </label>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => handleSelectMode("light")}
            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
              selectedMode === "light"
                ? "bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-xs"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              selectedMode === "light" ? "bg-amber-500 text-white" : "bg-white text-slate-700 border"
            }`}>
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-slate-900 block">Light Mode</span>
              <span className="text-[10px] text-slate-500 block">Warm daylight surfaces</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode("dark")}
            className={`p-3 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
              selectedMode === "dark"
                ? "bg-slate-900 border-slate-900 text-white shadow-xs ring-2 ring-slate-900/20"
                : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
            }`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              selectedMode === "dark" ? "bg-amber-400 text-slate-950" : "bg-white text-slate-700 border"
            }`}>
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <span className={`text-xs font-extrabold block ${selectedMode === "dark" ? "text-white" : "text-slate-900"}`}>
                Dark Mode
              </span>
              <span className={`text-[10px] block ${selectedMode === "dark" ? "text-slate-300" : "text-slate-500"}`}>
                Coordinated night theme
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Live Visual Card Component Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎨</span> Live Visual Simulation ({selectedTheme.name} • {selectedMode.toUpperCase()})
            </h3>
            <p className="text-[11px] text-slate-500">
              Interactive preview of hero buttons, place cards, badges, and background surfaces under the selected theme.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            Real-time Token Preview
          </span>
        </div>

        {/* Mock Portal Preview Box */}
        <div
          className="rounded-xl border p-4 sm:p-6 transition-all duration-300 space-y-4"
          style={{
            backgroundColor: previewPalette.bg,
            borderColor: previewPalette.border,
            color: previewPalette.textPrimary,
          }}
        >
          {/* Mock Navigation Header */}
          <div
            className="flex items-center justify-between p-3 rounded-xl border transition-colors shadow-2xs"
            style={{
              backgroundColor: previewPalette.surface,
              borderColor: previewPalette.border,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center shadow-xs"
                style={{ backgroundColor: previewPalette.action }}
              >
                F
              </div>
              <span className="font-extrabold text-xs tracking-tight" style={{ color: previewPalette.textPrimary }}>
                FAZIL<span style={{ color: previewPalette.action }}>NAGAR</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white shadow-xs"
                style={{ backgroundColor: previewPalette.action }}
              >
                + Add Story
              </span>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border"
                style={{
                  backgroundColor: previewPalette.surfaceSecondary,
                  borderColor: previewPalette.border,
                  color: previewPalette.textSecondary,
                }}
              >
                Directory
              </span>
            </div>
          </div>

          {/* Mock Hero Heading & Action Buttons */}
          <div className="space-y-2 py-2">
            <div
              className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: previewPalette.surfaceSecondary,
                borderColor: previewPalette.border,
                color: previewPalette.action,
              }}
            >
              <span>🏛️</span> {selectedTheme.tagline}
            </div>
            <h4 className="text-base sm:text-lg font-black tracking-tight" style={{ color: previewPalette.textPrimary }}>
              Explore Fazilnagar: {selectedTheme.nameHindi}
            </h4>
            <p className="text-xs max-w-lg leading-relaxed" style={{ color: previewPalette.textSecondary }}>
              {selectedTheme.description}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition"
                style={{ backgroundColor: previewPalette.action }}
              >
                Primary Civic Action
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-xl font-bold text-xs border transition"
                style={{
                  backgroundColor: previewPalette.surfaceSecondary,
                  borderColor: previewPalette.border,
                  color: previewPalette.textPrimary,
                }}
              >
                Secondary Surface
              </button>
              <span
                className="text-xs font-bold underline cursor-pointer"
                style={{ color: previewPalette.accent }}
              >
                Sandstone Accent Link &rarr;
              </span>
            </div>
          </div>

          {/* Mock Place Card */}
          <div
            className="p-3.5 rounded-xl border max-w-sm shadow-xs transition-colors"
            style={{
              backgroundColor: previewPalette.surface,
              borderColor: previewPalette.border,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: previewPalette.surfaceSecondary,
                  color: previewPalette.action,
                }}
              >
                24/7 Healthcare Facility
              </span>
              <span className="text-[10px]" style={{ color: previewPalette.accent }}>★ 4.9 Verified</span>
            </div>
            <h5 className="text-xs font-bold" style={{ color: previewPalette.textPrimary }}>
              Community Health Centre (CHC Fazilnagar)
            </h5>
            <p className="text-[11px] mt-0.5" style={{ color: previewPalette.textSecondary }}>
              Hospital Road, Ward No. 4, Fazilnagar - 274401
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
              filterCategory === cat.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Theme Cards Grid (12 Themes) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredThemes.map((theme) => {
          const isSelected = selectedThemeId === theme.id;
          const isLive = activeThemeId === theme.id && activeMode === selectedMode;
          const palette = selectedMode === "dark" ? theme.dark : theme.light;

          return (
            <div
              key={theme.id}
              onClick={() => handleSelectTheme(theme.id)}
              className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer relative flex flex-col justify-between gap-3 shadow-xs hover:shadow-md ${
                isSelected
                  ? "bg-white border-[#A83D32] ring-2 ring-[#A83D32]/20"
                  : "bg-white border-slate-200/90 hover:border-slate-300"
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      {theme.category}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <span>{theme.name}</span>
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {theme.nameHindi}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {theme.isDefault && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        Default
                      </span>
                    )}
                    {isLive && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <span>✔</span> Live
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2 mt-1">
                  {theme.description}
                </p>
              </div>

              {/* Color Swatches Palette */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 block">
                  {selectedMode === "dark" ? "Dark Palette Tokens" : "Light Palette Tokens"}:
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-lg border shadow-2xs"
                    title={`Background: ${palette.bg}`}
                    style={{ backgroundColor: palette.bg, borderColor: palette.border }}
                  />
                  <div
                    className="w-6 h-6 rounded-lg border shadow-2xs"
                    title={`Surface: ${palette.surface}`}
                    style={{ backgroundColor: palette.surface, borderColor: palette.border }}
                  />
                  <div
                    className="w-6 h-6 rounded-lg border shadow-2xs"
                    title={`Action: ${palette.action}`}
                    style={{ backgroundColor: palette.action }}
                  />
                  <div
                    className="w-6 h-6 rounded-lg border shadow-2xs"
                    title={`Accent: ${palette.accent}`}
                    style={{ backgroundColor: palette.accent }}
                  />
                  <div
                    className="w-6 h-6 rounded-lg border shadow-2xs"
                    title={`Text: ${palette.textPrimary}`}
                    style={{ backgroundColor: palette.textPrimary }}
                  />
                </div>
              </div>

              {/* Selection Status Button */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">
                  {isSelected ? "● Previewing in Admin" : "Click to Preview"}
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                    isSelected
                      ? "bg-[#A83D32] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {isSelected ? "Selected" : "Select"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
