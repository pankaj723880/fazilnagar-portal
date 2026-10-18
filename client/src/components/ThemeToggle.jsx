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
        className={`w-8 h-8 rounded-full flex items-center justify-center transition border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#A78650]/50 ${
          isDark
            ? "bg-[#1C1C22] text-[#C5A46D] border-[#38383E] hover:bg-[#24242A]"
            : "bg-[#EFEEE9] hover:bg-[#E4E0D8] text-[#202124] border-[#E4E0D8]"
        }`}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Switch to light mode / लाइट मोड" : "Switch to dark mode / डार्क मोड"}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-[#C5A46D]" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4 text-[#202124]" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#A78650]/30 cursor-pointer ${
        isDark
          ? "bg-[#1C1C22] text-[#C5A46D] border-[#38383E] hover:bg-[#24242A]"
          : "bg-[#EFEEE9] hover:bg-[#E4E0D8] text-[#202124] border-[#E4E0D8]"
      }`}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode / लाइट मोड" : "Switch to dark mode / डार्क मोड"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-[#C5A46D]" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5 text-[#202124]" aria-hidden="true" />
      )}
    </button>
  );
}
