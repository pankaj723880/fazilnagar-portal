import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Universal ThemeToggle Component
 * Allows all visitors, citizens, and administrators to toggle between Light and Dark mode.
 */
export default function ThemeToggle({ compact = false, className = "" }) {
  const { toggleTheme, isDark } = useTheme();

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer border shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A83D32] active:scale-95 touch-manipulation ${
          isDark
            ? "bg-[#302D27] text-amber-400 hover:text-amber-300 border-[#484238] hover:bg-[#3D3932]"
            : "bg-[#EEE7DA] hover:bg-[#E5DDD0] text-slate-800 border-[#DED5C7]"
        } ${className}`}
        aria-label={isDark ? "Switch to light mode / लाइट मोड चालू करें" : "Switch to dark mode / डार्क मोड चालू करें"}
        title={isDark ? "Light Mode / लाइट मोड (क्लिक करें)" : "Dark Mode / डार्क मोड (क्लिक करें)"}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4 text-slate-800 transition-transform hover:-rotate-12" aria-hidden="true" />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`min-w-[38px] min-h-[38px] w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center transition-all shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A83D32] active:scale-95 cursor-pointer touch-manipulation ${
        isDark
          ? "bg-[#302D27] text-amber-400 hover:text-amber-300 border-[#484238] hover:bg-[#3D3932]"
          : "bg-[#EEE7DA] hover:bg-[#E5DDD0] text-slate-800 border-[#DED5C7]"
      } ${className}`}
      aria-label={isDark ? "Switch to light mode / लाइट मोड चालू करें" : "Switch to dark mode / डार्क मोड चालू करें"}
      title={isDark ? "Light Mode / लाइट मोड चालू करें" : "Dark Mode / डार्क मोड चालू करें"}
    >
      {isDark ? (
        <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 transition-transform hover:rotate-45" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-800 transition-transform hover:-rotate-12" aria-hidden="true" />
      )}
    </button>
  );
}
