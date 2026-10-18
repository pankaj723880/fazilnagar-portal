import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, toggleTheme, isDark, isAdminPage } = useTheme();

  // Completely exclude theme toggle from admin pages
  if (isAdminPage) {
    return null;
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B8323C]/50 ${
          isDark
            ? "bg-[#1E293B] text-amber-400 border-[#334155] hover:bg-[#334155]"
            : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200/80"
        }`}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode / लाइट मोड" : "Switch to dark mode / डार्क मोड"}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B8323C]/30 cursor-pointer ${
        isDark
          ? "bg-[#1E293B] text-amber-400 border-[#334155] hover:bg-[#334155]"
          : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200"
      }`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode / लाइट मोड" : "Switch to dark mode / डार्क मोड"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700" aria-hidden="true" />
      )}
    </button>
  );
}
