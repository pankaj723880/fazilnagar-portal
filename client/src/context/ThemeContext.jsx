import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";
import API from "../api";
import { getAuthToken, isUserAdmin } from "../utils/authStorage";

const ThemeContext = createContext({
  theme: "light",
  themeId: "heritage-terracotta",
  mode: "light",
  toggleTheme: () => {},
  setTheme: () => {},
  applyAdminTheme: async () => {},
  previewTheme: () => {},
  isDark: false,
  isAdminPage: false,
  isTransitioning: false,
});

const STORAGE_KEY = "fazilnagar_theme";
const GLOBAL_THEME_STORAGE_KEY = "fazilnagar_global_theme";

export function ThemeProvider({ children }) {
  const [themeConfig, setThemeConfig] = useState(() => {
    try {
      const globalStored = localStorage.getItem(GLOBAL_THEME_STORAGE_KEY);
      if (globalStored) {
        const parsed = JSON.parse(globalStored);
        if (parsed && parsed.themeId) {
          return {
            themeId: parsed.themeId,
            mode: parsed.mode === "dark" ? "dark" : "light",
          };
        }
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      const initialMode = stored === "dark" ? "dark" : "light";
      return {
        themeId: "heritage-terracotta",
        mode: initialMode,
      };
    } catch {
      return {
        themeId: "heritage-terracotta",
        mode: "light",
      };
    }
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);

  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  // Synchronize DOM attributes and ensure zero leakage into Admin
  const applyThemeToDOM = useCallback((cfg) => {
    const root = document.documentElement;
    if (isAdminPage) {
      root.removeAttribute("data-public-theme");
      root.removeAttribute("data-theme-id");
      root.classList.remove("theme-dark", "theme-light", "dark");
    } else {
      const activeThemeId = cfg?.themeId || "heritage-terracotta";
      const activeMode = cfg?.mode === "dark" ? "dark" : "light";

      root.setAttribute("data-theme-id", activeThemeId);
      root.setAttribute("data-public-theme", activeMode);
      if (activeMode === "dark") {
        root.classList.add("dark", "theme-dark");
        root.classList.remove("theme-light");
      } else {
        root.classList.add("theme-light");
        root.classList.remove("dark", "theme-dark");
      }
    }
  }, [isAdminPage]);

  // Fetch the active admin-configured global theme from backend on launch
  useEffect(() => {
    let isMounted = true;
    async function fetchGlobalTheme() {
      try {
        const res = await API.get("/settings");
        if (res.data?.success && res.data?.settings?.themeConfig && isMounted) {
          const serverConfig = {
            themeId: res.data.settings.themeConfig.themeId || "heritage-terracotta",
            mode: res.data.settings.themeConfig.mode === "dark" ? "dark" : "light",
          };
          setThemeConfig(serverConfig);
          applyThemeToDOM(serverConfig);
          try {
            localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, JSON.stringify(serverConfig));
            localStorage.setItem(STORAGE_KEY, serverConfig.mode);
          } catch {}
        }
      } catch (err) {
        // Fallback gracefully to cached configuration
      }
    }
    fetchGlobalTheme();
    return () => {
      isMounted = false;
    };
  }, [applyThemeToDOM]);

  // Apply on mount and whenever theme or page changes
  useEffect(() => {
    applyThemeToDOM(themeConfig);
  }, [themeConfig, applyThemeToDOM]);

  // Admin-only preview function (instant DOM preview without saving yet)
  const previewTheme = useCallback((cfg) => {
    if (!isAdminPage || !isUserAdmin()) return;
    const previewCfg = {
      themeId: cfg.themeId || themeConfig.themeId,
      mode: cfg.mode === "dark" ? "dark" : "light",
    };
    applyThemeToDOM(previewCfg);
  }, [isAdminPage, themeConfig, applyThemeToDOM]);

  // Admin-only persistent update function (saves to backend database)
  const applyAdminTheme = useCallback(async (newConfig) => {
    if (!isAdminPage || !isUserAdmin()) {
      throw new Error("Unauthorized: Only administrators can modify website theme.");
    }
    const token = getAuthToken();
    const payload = {
      themeId: newConfig.themeId,
      mode: newConfig.mode === "dark" ? "dark" : "light",
    };

    const res = await API.put("/settings/theme", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.data?.success) {
      const updated = {
        themeId: res.data.themeConfig.themeId,
        mode: res.data.themeConfig.mode,
      };
      setThemeConfig(updated);
      applyThemeToDOM(updated);
      try {
        localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(STORAGE_KEY, updated.mode);
      } catch {}
      return res.data;
    } else {
      throw new Error(res.data?.message || "Failed to update theme");
    }
  }, [isAdminPage, applyThemeToDOM]);

  // Restricted public toggle (public users cannot modify theme)
  const toggleTheme = useCallback((event) => {
    if (!isAdminPage || !isUserAdmin()) {
      // Strictly prevent public manipulation
      return;
    }
    const nextMode = themeConfig.mode === "dark" ? "light" : "dark";
    const nextCfg = { ...themeConfig, mode: nextMode };
    setThemeConfig(nextCfg);
    applyThemeToDOM(nextCfg);
  }, [isAdminPage, themeConfig, applyThemeToDOM]);

  const setTheme = useCallback((nextTheme) => {
    if (!isAdminPage || !isUserAdmin()) return;
    const val = nextTheme === "dark" ? "dark" : "light";
    const nextCfg = { ...themeConfig, mode: val };
    setThemeConfig(nextCfg);
    applyThemeToDOM(nextCfg);
  }, [isAdminPage, themeConfig, applyThemeToDOM]);

  // Synchronize across browser tabs if admin changes theme in another tab
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === GLOBAL_THEME_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.themeId) {
            setThemeConfig(parsed);
            applyThemeToDOM(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [applyThemeToDOM]);

  const value = useMemo(
    () => ({
      theme: themeConfig.mode,
      themeId: themeConfig.themeId,
      mode: themeConfig.mode,
      rawTheme: themeConfig.mode,
      toggleTheme,
      setTheme,
      applyAdminTheme,
      previewTheme,
      isDark: !isAdminPage && themeConfig.mode === "dark",
      isAdminPage,
      isTransitioning,
    }),
    [themeConfig, isAdminPage, toggleTheme, setTheme, applyAdminTheme, previewTheme, isTransitioning]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
