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
        className={`w-8 h-8 rounded-full flex items-center justify-center transition border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A83D32]/50 ${
          isDark
            ? "bg-[#302D27] text-[#C5A66A] border-[#484238] hover:bg-[#3D3932]"
            : "bg-[#EEE7DA] hover:bg-[#E5DDD0] text-[#292722] border-[#DED5C7]"
        }`}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode / लाइट मोड" : "Switch to dark mode / डार्क मोड"}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-[#C5A66A]" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4 text-[#292722]" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#A83D32]/40 cursor-pointer ${
        isDark
          ? "bg-[#302D27] text-[#C5A66A] border-[#484238] hover:bg-[#3D3932]"
          : "bg-[#EEE7DA] hover:bg-[#E5DDD0] text-[#292722] border-[#DED5C7]"
      }`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode / लाइट मोड" : "Switch to dark mode / डार्क मोड"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-[#C5A66A]" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5 text-[#292722]" aria-hidden="true" />
      )}
    </button>
  );
}
