import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";
import API from "../api";
import { getAuthToken, isUserAdmin } from "../utils/authStorage";
import { THEMES, getThemeById, DEFAULT_THEME_ID, DEFAULT_THEME_MODE } from "../constants/themes";

const ThemeContext = createContext({
  theme: "light",
  themeId: DEFAULT_THEME_ID,
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
const USER_MODE_STORAGE_KEY = "fazilnagar_user_mode";
const GLOBAL_THEME_STORAGE_KEY = "fazilnagar_global_theme";

const THEME_BROADCAST_CHANNEL = "fazilnagar_portal_theme_sync";

function broadcastThemeUpdate(config) {
  if (typeof window === "undefined") return;
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL);
      channel.postMessage({ type: "THEME_UPDATED", config });
      channel.close();
    }
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent("fazilnagar-theme-sync", { detail: config }));
  } catch {}
}

export function ThemeProvider({ children }) {
  const [themeConfig, setThemeConfig] = useState(() => {
    try {
      // Check for user-selected personal appearance mode first (light/dark preference)
      const userSavedMode = localStorage.getItem(USER_MODE_STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      const initialMode = userSavedMode === "dark" || userSavedMode === "light" ? userSavedMode : null;

      // Check for admin-configured global themeId
      const globalStored = localStorage.getItem(GLOBAL_THEME_STORAGE_KEY);
      if (globalStored) {
        const parsed = JSON.parse(globalStored);
        if (parsed && parsed.themeId) {
          return {
            themeId: parsed.themeId,
            mode: initialMode || (parsed.mode === "dark" ? "dark" : "light"),
          };
        }
      }

      return {
        themeId: DEFAULT_THEME_ID,
        mode: initialMode || DEFAULT_THEME_MODE,
      };
    } catch {
      return {
        themeId: DEFAULT_THEME_ID,
        mode: DEFAULT_THEME_MODE,
      };
    }
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const isTransitioningRef = useRef(false);

  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");

  // Synchronize DOM attributes and inject CSS Custom Property tokens across documentElement
  const applyThemeToDOM = useCallback((cfg) => {
    const root = document.documentElement;
    const activeThemeId = cfg?.themeId || DEFAULT_THEME_ID;
    const activeMode = cfg?.mode === "dark" ? "dark" : "light";

    // Set canonical semantic attributes for selectors
    root.setAttribute("data-theme-id", activeThemeId);
    root.setAttribute("data-public-theme", activeMode);

    if (activeMode === "dark") {
      root.classList.add("dark", "theme-dark");
      root.classList.remove("theme-light");
    } else {
      root.classList.add("theme-light");
      root.classList.remove("dark", "theme-dark");
    }

    // Dynamic CSS Custom Properties injection directly to root style
    // Ensures real-time application of all 12 themes without stale stylesheets
    const themeObj = getThemeById(activeThemeId);
    if (themeObj) {
      const palette = activeMode === "dark" ? themeObj.dark : themeObj.light;

      root.style.setProperty("--heritage-bg", palette.bg);
      root.style.setProperty("--heritage-surface", palette.surface);
      root.style.setProperty("--heritage-surface-secondary", palette.surfaceSecondary);
      root.style.setProperty("--heritage-text-primary", palette.textPrimary);
      root.style.setProperty("--heritage-text-secondary", palette.textSecondary);
      root.style.setProperty("--heritage-action", palette.action);
      root.style.setProperty("--heritage-action-hover", palette.actionHover);
      root.style.setProperty("--heritage-accent", palette.accent);
      root.style.setProperty("--heritage-border", palette.border);

      // WCAG 2.2 AA Core Theme Tokens (Requirement B)
      root.style.setProperty("--background-primary", palette.bg);
      root.style.setProperty("--background-secondary", palette.surfaceSecondary);
      root.style.setProperty("--surface-card", palette.surface);
      root.style.setProperty("--surface-input", activeMode === "dark" ? palette.surfaceSecondary : "#FFFFFF");
      root.style.setProperty("--text-primary", palette.textPrimary);
      root.style.setProperty("--text-secondary", palette.textSecondary);
      root.style.setProperty("--text-muted", activeMode === "dark" ? "#A39B8F" : "#6B655B");
      root.style.setProperty("--text-inverse", activeMode === "dark" ? "#191916" : "#FFFFFF");
      root.style.setProperty("--border-color", palette.border);
      root.style.setProperty("--placeholder-color", activeMode === "dark" ? "#8A8275" : "#6B655B");
      root.style.setProperty("--link-color", palette.action);
      root.style.setProperty("--focus-ring", palette.action);
      root.style.setProperty("--success-text", activeMode === "dark" ? "#4ADE80" : "#166534");
      root.style.setProperty("--warning-text", activeMode === "dark" ? "#FBBF24" : "#92400E");
      root.style.setProperty("--error-text", activeMode === "dark" ? "#F87171" : "#B91C1C");

      // Aliased tokens for complete backward compatibility
      root.style.setProperty("--gr-bg-main", palette.bg);
      root.style.setProperty("--gr-navbar-bg", palette.bg);
      root.style.setProperty("--gr-section-secondary", palette.surfaceSecondary);
      root.style.setProperty("--gr-card-bg", palette.surface);
      root.style.setProperty("--gr-input-bg", activeMode === "dark" ? palette.surfaceSecondary : "#FFFFFF");
      root.style.setProperty("--gr-text-primary", palette.textPrimary);
      root.style.setProperty("--gr-text-secondary", palette.textSecondary);
      root.style.setProperty("--gr-border", palette.border);
      root.style.setProperty("--gr-accent", palette.action);
      root.style.setProperty("--gr-accent-hover", palette.actionHover);

      root.style.setProperty("--civic-bg", palette.bg);
      root.style.setProperty("--civic-surface", palette.surface);
      root.style.setProperty("--civic-surface-secondary", palette.surfaceSecondary);
      root.style.setProperty("--civic-text-primary", palette.textPrimary);
      root.style.setProperty("--civic-text-secondary", palette.textSecondary);
      root.style.setProperty("--civic-border", palette.border);
      root.style.setProperty("--civic-accent", palette.action);
    }
  }, []);

  // Fetch the active admin-configured global theme from backend on launch
  useEffect(() => {
    let isMounted = true;
    async function fetchGlobalTheme() {
      try {
        const res = await API.get("/settings");
        if (res.data?.success && res.data?.settings?.themeConfig && isMounted) {
          const serverConfig = res.data.settings.themeConfig;
          const serverThemeId = serverConfig.themeId || DEFAULT_THEME_ID;
          const serverDefaultMode = serverConfig.mode === "dark" ? "dark" : "light";

          // Check if user has explicitly chosen a personal light/dark preference
          const userSavedMode = localStorage.getItem(USER_MODE_STORAGE_KEY);
          const effectiveMode = userSavedMode ? (userSavedMode === "dark" ? "dark" : "light") : serverDefaultMode;

          const mergedConfig = {
            themeId: serverThemeId,
            mode: effectiveMode,
          };

          setThemeConfig(mergedConfig);
          applyThemeToDOM(mergedConfig);

          try {
            localStorage.setItem(
              GLOBAL_THEME_STORAGE_KEY,
              JSON.stringify({ themeId: serverThemeId, mode: serverDefaultMode })
            );
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

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyThemeToDOM(themeConfig);
  }, [themeConfig, applyThemeToDOM]);

  // Admin-only preview function (instant DOM preview across portal without requiring DB commit yet)
  const previewTheme = useCallback(
    (cfg) => {
      const previewCfg = {
        themeId: cfg.themeId || themeConfig.themeId,
        mode: cfg.mode === "dark" ? "dark" : "light",
      };
      setThemeConfig(previewCfg);
      applyThemeToDOM(previewCfg);
      try {
        localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, JSON.stringify(previewCfg));
        broadcastThemeUpdate(previewCfg);
      } catch {}
    },
    [themeConfig, applyThemeToDOM]
  );

  // Admin-only persistent update function (saves to backend database)
  const applyAdminTheme = useCallback(
    async (newConfig) => {
      if (!isUserAdmin()) {
        throw new Error("Unauthorized: Only administrators can modify the global portal theme.");
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
          localStorage.setItem(GLOBAL_THEME_STORAGE_KEY + "_time", String(Date.now()));
          localStorage.setItem(USER_MODE_STORAGE_KEY, updated.mode);
          localStorage.setItem(STORAGE_KEY, updated.mode);
          broadcastThemeUpdate(updated);
        } catch {}
        return res.data;
      } else {
        throw new Error(res.data?.message || "Failed to update global theme");
      }
    },
    [applyThemeToDOM]
  );

  // Universal Light/Dark mode toggle (Available to ALL users: visitors, citizens, and admins)
  const toggleTheme = useCallback(
    (event) => {
      const nextMode = themeConfig.mode === "dark" ? "light" : "dark";
      const nextCfg = { ...themeConfig, mode: nextMode };

      // Optional smooth View Transition if supported
      if (typeof document !== "undefined" && document.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIsTransitioning(true);
        isTransitioningRef.current = true;
        document.documentElement.setAttribute("data-theme-transition", "active");

        const transition = document.startViewTransition(() => {
          flushSync(() => {
            setThemeConfig(nextCfg);
            applyThemeToDOM(nextCfg);
          });
        });

        transition.finished.finally(() => {
          document.documentElement.removeAttribute("data-theme-transition");
          setIsTransitioning(false);
          isTransitioningRef.current = false;
        });
      } else {
        setThemeConfig(nextCfg);
        applyThemeToDOM(nextCfg);
      }

      // Store personal preference locally & broadcast
      try {
        localStorage.setItem(USER_MODE_STORAGE_KEY, nextMode);
        localStorage.setItem(STORAGE_KEY, nextMode);
        broadcastThemeUpdate(nextCfg);
      } catch {}
    },
    [themeConfig, applyThemeToDOM]
  );

  const setTheme = useCallback(
    (nextMode) => {
      const val = nextMode === "dark" ? "dark" : "light";
      const nextCfg = { ...themeConfig, mode: val };
      setThemeConfig(nextCfg);
      applyThemeToDOM(nextCfg);
      try {
        localStorage.setItem(USER_MODE_STORAGE_KEY, val);
        localStorage.setItem(STORAGE_KEY, val);
        broadcastThemeUpdate(nextCfg);
      } catch {}
    },
    [themeConfig, applyThemeToDOM]
  );

  // Synchronize across browser tabs and same-window components in real time
  useEffect(() => {
    let channel;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL);
        channel.onmessage = (e) => {
          if (e.data?.type === "THEME_UPDATED" && e.data.config) {
            const next = {
              themeId: e.data.config.themeId || DEFAULT_THEME_ID,
              mode: e.data.config.mode === "dark" ? "dark" : "light",
            };
            setThemeConfig(next);
            applyThemeToDOM(next);
          }
        };
      }
    } catch {}

    const handleCustomSync = (e) => {
      if (e.detail) {
        const next = {
          themeId: e.detail.themeId || DEFAULT_THEME_ID,
          mode: e.detail.mode === "dark" ? "dark" : "light",
        };
        setThemeConfig(next);
        applyThemeToDOM(next);
      }
    };
    window.addEventListener("fazilnagar-theme-sync", handleCustomSync);

    const handleStorage = (e) => {
      if (e.key === GLOBAL_THEME_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.themeId) {
            const next = {
              themeId: parsed.themeId,
              mode: parsed.mode === "dark" ? "dark" : "light",
            };
            setThemeConfig(next);
            applyThemeToDOM(next);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      if (channel) channel.close();
      window.removeEventListener("fazilnagar-theme-sync", handleCustomSync);
      window.removeEventListener("storage", handleStorage);
    };
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
      isDark: themeConfig.mode === "dark",
      isAdminPage,
      isTransitioning,
      themeConfig,
    }),
    [themeConfig, isAdminPage, toggleTheme, setTheme, applyAdminTheme, previewTheme, isTransitioning]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
