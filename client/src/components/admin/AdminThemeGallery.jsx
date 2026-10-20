import { useState, useEffect } from "react";
import { THEMES, getThemeById, DEFAULT_THEME_ID } from "../../constants/themes";
import { useTheme, DEFAULT_BG_ANIMATIONS } from "../../context/ThemeContext";
import BackgroundAnimations from "../BackgroundAnimations";
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
  Sliders,
  Layers,
  Power,
  Activity,
  Play,
} from "lucide-react";

export default function AdminThemeGallery({ onSaveSuccess }) {
  const { themeConfig, publishedThemeConfig, applyAdminTheme, previewTheme } = useTheme();

  // Published authoritative configuration from database/context
  const published = publishedThemeConfig || themeConfig;
  const activeThemeId = published?.themeId || DEFAULT_THEME_ID;
  const activeMode = published?.mode || "light";
  const activeBgAnim = published?.bgAnimations || DEFAULT_BG_ANIMATIONS;

  // Admin selection state for preview & staging
  const [selectedThemeId, setSelectedThemeId] = useState(activeThemeId);
  const [selectedMode, setSelectedMode] = useState(activeMode);
  const [bgAnim, setBgAnim] = useState(activeBgAnim);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [filterCategory, setFilterCategory] = useState("all");

  // Keep state synchronized when published settings update from database
  useEffect(() => {
    setSelectedThemeId(activeThemeId);
    setSelectedMode(activeMode);
    setBgAnim(activeBgAnim);
  }, [activeThemeId, activeMode, activeBgAnim]);

  const selectedTheme = getThemeById(selectedThemeId);
  const previewPalette = selectedMode === "dark" ? selectedTheme.dark : selectedTheme.light;

  const isBgDirty = JSON.stringify(bgAnim) !== JSON.stringify(activeBgAnim);
  const isDirty = selectedThemeId !== activeThemeId || selectedMode !== activeMode || isBgDirty;

  const handleSelectTheme = (themeId) => {
    setSelectedThemeId(themeId);
    previewTheme({ themeId, mode: selectedMode, bgAnimations: bgAnim });
  };

  const handleSelectMode = (mode) => {
    setSelectedMode(mode);
    previewTheme({ themeId: selectedThemeId, mode, bgAnimations: bgAnim });
  };

  const handleToggleBgEnabled = () => {
    const updated = { ...bgAnim, enabled: !bgAnim.enabled };
    setBgAnim(updated);
    previewTheme({ themeId: selectedThemeId, mode: selectedMode, bgAnimations: updated });
  };

  const handleToggleEffect = (key) => {
    const updated = {
      ...bgAnim,
      effects: {
        ...bgAnim.effects,
        [key]: !bgAnim.effects[key],
      },
    };
    setBgAnim(updated);
    previewTheme({ themeId: selectedThemeId, mode: selectedMode, bgAnimations: updated });
  };

  const handleUpdateBgField = (field, value) => {
    const updated = { ...bgAnim, [field]: value };
    setBgAnim(updated);
    previewTheme({ themeId: selectedThemeId, mode: selectedMode, bgAnimations: updated });
  };

  const handlePreviewCurrentConfig = () => {
    previewTheme({ themeId: selectedThemeId, mode: selectedMode, bgAnimations: bgAnim });
    showToast("Live preview updated across portal without saving yet!", "info");
  };

  // Direct 1-click application of a specific theme from card
  const handleApplySpecificTheme = async (themeId, targetMode) => {
    const modeToUse = targetMode || selectedMode;
    setSelectedThemeId(themeId);
    if (targetMode) setSelectedMode(targetMode);
    setSaving(true);
    try {
      await applyAdminTheme({
        themeId,
        mode: modeToUse,
        bgAnimations: bgAnim,
      });
      const targetTheme = getThemeById(themeId);
      showToast(
        `Theme successfully applied to portal: "${targetTheme.name}" (${modeToUse.toUpperCase()} mode)!`,
        "success"
      );
      if (onSaveSuccess) {
        onSaveSuccess({ themeId, mode: modeToUse, bgAnimations: bgAnim });
      }
    } catch (err) {
      console.error("Failed to apply theme:", err);
      showToast(err.message || "Failed to update theme.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedThemeId(activeThemeId);
    setSelectedMode(activeMode);
    setBgAnim(activeBgAnim);
    previewTheme({ themeId: activeThemeId, mode: activeMode, bgAnimations: activeBgAnim });
    showToast("Reverted to currently active appearance & animation settings.", "info");
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
        bgAnimations: bgAnim,
      });
      showToast(
        `Appearance & Background Animations successfully published globally!`,
        "success"
      );
      if (onSaveSuccess) {
        onSaveSuccess({ themeId: selectedThemeId, mode: selectedMode, bgAnimations: bgAnim });
      }
    } catch (err) {
      console.error("Failed to apply theme:", err);
      showToast(err.message || "Failed to update global appearance.", "error");
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

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="View public website in a new tab"
          >
            <span>Live Portal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

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
            <span>{saving ? "Publishing..." : isDirty ? "Publish Appearance & Animations" : "Appearance Synced & Published"}</span>
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

      {/* ========================================================
          AMBIENT BACKGROUND & MOTION ARCHITECTURE CONTROLS
          ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Header & Global Master Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Layers className="w-4 h-4" />
              </span>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider font-heading flex items-center gap-2">
                <span>Ambient Background &amp; Motion Architecture</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  GPU Accelerated
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Layer multiple lightweight effects simultaneously. Automatically matches active theme palette with optional color override.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleBgEnabled}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs ${
                bgAnim.enabled
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-500/20"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-700"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{bgAnim.enabled ? "Animations ON" : "Animations OFF"}</span>
            </button>

            <button
              type="button"
              onClick={handlePreviewCurrentConfig}
              className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Preview changes in live DOM immediately"
            >
              <Play className="w-3.5 h-3.5 text-amber-600 fill-amber-600" />
              <span>Live Preview</span>
            </button>
          </div>
        </div>

        {/* Effect Toggles Matrix (8 Concurrent Effects) */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
            Concurrent Visual Effects (बहु-प्रभाव सक्षम करें)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { id: "orbs", label: "Floating Orbs", icon: "🔮", desc: "Glowing radial spheres drifting smoothly" },
              { id: "aurora", label: "Aurora Gradients", icon: "🌌", desc: "Multi-stop liquid organic mesh" },
              { id: "ribbons", label: "Flowing Ribbons", icon: "🌊", desc: "Diagonal light beams sweeping across" },
              { id: "grid", label: "Moving Grids & Hex", icon: "📐", desc: "Dynamic isometric & honeycomb grid" },
              { id: "orbitalRings", label: "Orbital Rings", icon: "🪐", desc: "Concentric dashed rings in orbit" },
              { id: "sparkles", label: "Twinkling Sparkles", icon: "✨", desc: "Pulsing micro-accents and glass stars" },
              { id: "cardBorders", label: "Card Border Glow", icon: "🔲", desc: "Subtle interactive border glow on hover" },
              { id: "heroShimmer", label: "Hero Light Shimmer", icon: "⚡", desc: "Ambient diagonal light sweep across hero" },
            ].map((eff) => {
              const isChecked = Boolean(bgAnim.effects?.[eff.id]);
              return (
                <button
                  key={eff.id}
                  type="button"
                  onClick={() => handleToggleEffect(eff.id)}
                  disabled={!bgAnim.enabled}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isChecked && bgAnim.enabled
                      ? "bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-400/20 text-slate-900 shadow-2xs"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base">{eff.icon}</span>
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black transition ${
                        isChecked && bgAnim.enabled
                          ? "bg-indigo-600 text-white"
                          : "border border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && bgAnim.enabled ? "✔" : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-black block leading-tight text-slate-900">
                      {eff.label}
                    </span>
                    <span className="text-[10px] text-slate-500 line-clamp-1 block">
                      {eff.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope, Speed, Opacity, Density & Theme Auto-Match Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Scope Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Application Scope
            </label>
            <select
              value={bgAnim.scope || "global"}
              onChange={(e) => handleUpdateBgField("scope", e.target.value)}
              disabled={!bgAnim.enabled}
              className="w-full text-xs font-semibold px-2.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            >
              <option value="global">Global (All Pages)</option>
              <option value="public-only">Public Portal Only</option>
              <option value="admin-only">Admin Dashboard Only</option>
            </select>
          </div>

          {/* Speed Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Animation Speed
            </label>
            <div className="grid grid-cols-3 gap-1">
              {["slow", "normal", "fast"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleUpdateBgField("speed", s)}
                  disabled={!bgAnim.enabled}
                  className={`py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer border disabled:opacity-50 ${
                    bgAnim.speed === s
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Density Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
              Visual Density
            </label>
            <div className="grid grid-cols-3 gap-1">
              {["low", "medium", "high"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleUpdateBgField("density", d)}
                  disabled={!bgAnim.enabled}
                  className={`py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer border disabled:opacity-50 ${
                    bgAnim.density === d
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                Opacity
              </label>
              <span className="text-xs font-mono font-bold text-slate-700">
                {Math.round((bgAnim.opacity ?? 0.6) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={bgAnim.opacity ?? 0.6}
              onChange={(e) => handleUpdateBgField("opacity", parseFloat(e.target.value))}
              disabled={!bgAnim.enabled}
              className="w-full accent-indigo-600 cursor-pointer disabled:opacity-50 h-2 bg-slate-200 rounded-lg mt-2"
            />
          </div>
        </div>

        {/* Theme Colour Auto-Match & Manual Colour Overrides */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="fzn-auto-match-theme"
              checked={bgAnim.autoMatchTheme !== false}
              onChange={(e) => handleUpdateBgField("autoMatchTheme", e.target.checked)}
              disabled={!bgAnim.enabled}
              className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 cursor-pointer disabled:opacity-50"
            />
            <label htmlFor="fzn-auto-match-theme" className="cursor-pointer text-xs font-bold text-slate-900 select-none">
              Auto-match colours from active theme ({selectedTheme.name})
              <span className="block text-[10px] font-normal text-slate-500">
                Dynamically blends with CSS tokens (--heritage-action, --heritage-accent) across all 12 themes instantly.
              </span>
            </label>
          </div>

          {/* Manual Color Override (If Auto-Match is OFF) */}
          {bgAnim.autoMatchTheme === false && (
            <div className="flex items-center gap-2 shrink-0 animate-in fade-in duration-200">
              <span className="text-[11px] font-bold text-slate-600">Manual Override:</span>
              <input
                type="color"
                value={bgAnim.customColor || "#A83D32"}
                onChange={(e) => handleUpdateBgField("customColor", e.target.value)}
                disabled={!bgAnim.enabled}
                className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5 bg-white"
                title="Choose custom animation color"
              />
              <input
                type="text"
                value={bgAnim.customColor || ""}
                placeholder="#A83D32"
                onChange={(e) => handleUpdateBgField("customColor", e.target.value)}
                disabled={!bgAnim.enabled}
                className="w-24 px-2 py-1 text-xs font-mono rounded-lg border border-slate-300 bg-white"
              />
            </div>
          )}
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
          className="rounded-xl border p-4 sm:p-6 transition-all duration-300 relative overflow-hidden"
          style={{
            backgroundColor: previewPalette.bg,
            borderColor: previewPalette.border,
            color: previewPalette.textPrimary,
          }}
        >
          {/* Real-time Ambient Background & Motion Architecture Canvas Preview */}
          <BackgroundAnimations config={bgAnim} isPreview={true} />

          <div className="relative z-10 space-y-4">
            {/* Mock Navigation Header */}
            <div
              className="flex items-center justify-between p-3 rounded-xl border transition-colors shadow-2xs backdrop-blur-xs"
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
                className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border backdrop-blur-xs"
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
                  className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  style={{ backgroundColor: previewPalette.action }}
                >
                  Primary Civic Action
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl font-bold text-xs border transition cursor-pointer"
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
              className="p-3.5 rounded-xl border max-w-sm shadow-xs transition-colors backdrop-blur-xs"
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

              {/* Selection Status & Direct Apply Button */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-500">
                  {isLive ? "✔ Active on Portal" : isSelected ? "● Previewing" : "Click to Preview"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApplySpecificTheme(theme.id);
                  }}
                  disabled={saving}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${
                    isLive
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : isSelected
                      ? "bg-[#A83D32] hover:bg-[#873027] text-white ring-2 ring-[#A83D32]/30"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  {saving && selectedThemeId === theme.id ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Applying...</span>
                    </>
                  ) : isLive ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Active Theme</span>
                    </>
                  ) : isSelected ? (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Apply Theme</span>
                    </>
                  ) : (
                    <span>Select &amp; Apply</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
