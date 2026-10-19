import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  isDark: false,
  isAdminPage: false,
});

const STORAGE_KEY = "fazilnagar_theme";

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        return stored;
      }
      if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        return "dark";
      }
      return "light";
    } catch {
      return "light";
    }
  });

  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  const setTheme = (nextTheme) => {
    const val = nextTheme === "dark" ? "dark" : "light";
    setThemeState(val);
    try {
      localStorage.setItem(STORAGE_KEY, val);
    } catch {
      // safe fallback if storage is restricted
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  // Synchronize DOM attributes and ensure zero leakage into Admin
  useEffect(() => {
    const root = document.documentElement;
    if (isAdminPage) {
      // Completely exclude admin: strip public theme attributes and classes
      root.removeAttribute("data-public-theme");
      root.classList.remove("theme-dark", "theme-light", "dark");
    } else {
      // Apply strictly to public layout
      root.setAttribute("data-public-theme", theme);
      if (theme === "dark") {
        root.classList.add("dark", "theme-dark");
        root.classList.remove("theme-light");
      } else {
        root.classList.add("theme-light");
        root.classList.remove("dark", "theme-dark");
      }
    }
  }, [theme, isAdminPage]);

  // Synchronize across open browser tabs
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && (e.newValue === "light" || e.newValue === "dark")) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(
    () => ({
      theme: isAdminPage ? "light" : theme,
      rawTheme: theme,
      toggleTheme,
      setTheme,
      isDark: !isAdminPage && theme === "dark",
      isAdminPage,
    }),
    [theme, isAdminPage]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
