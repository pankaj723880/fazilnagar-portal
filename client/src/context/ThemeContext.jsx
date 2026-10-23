import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "react-router-dom";
import API from "../api";
import { getAuthToken, getAuthUser, isUserAdmin } from "../utils/authStorage";
import { THEMES, getThemeById, DEFAULT_THEME_ID, DEFAULT_THEME_MODE } from "../constants/themes";

export const DEFAULT_BG_ANIMATIONS = {
  enabled: true,
  scope: "global", // 'global' | 'public-only' | 'admin-only'
  speed: "normal", // 'slow' | 'normal' | 'fast'
  opacity: 0.6,
  density: "medium", // 'low' | 'medium' | 'high'
  autoMatchTheme: true,
  customColor: "",
  effects: {
    orbs: true,
    aurora: true,
    ribbons: false,
    grid: true,
    orbitalRings: false,
    sparkles: false,
    cardBorders: false,
    heroShimmer: true,
  },
};

const ThemeContext = createContext({
  theme: "light",
  themeId: DEFAULT_THEME_ID,
  mode: "light",
  bgAnimations: DEFAULT_BG_ANIMATIONS,
  publishedThemeConfig: null,
  toggleTheme: () => {},
  setTheme: () => {},
  applyAdminTheme: async () => {},
  previewTheme: () => {},
  isDark: false,
  isAdminPage: false,
  isTransitioning: false,
});

export const DEDICATED_THEME_KEY = "fazilnagar-theme";
const LEGACY_MODE_KEY = "fazilnagar_user_mode";
const LEGACY_STORAGE_KEY = "fazilnagar_theme";
const GLOBAL_THEME_STORAGE_KEY = "fazilnagar_global_theme";

const THEME_BROADCAST_CHANNEL = "fazilnagar_portal_theme_sync";

/**
 * Resolves the user's personal appearance mode (light or dark).
 * Precedence:
 * 1. User-specific localStorage key (`fazilnagar-theme_<userId>`) if authenticated
 * 2. Dedicated browser-level localStorage key (`fazilnagar-theme`)
 * 3. Legacy localStorage keys for backward compatibility
 * 4. Default fallback ("light")
 */
export function getStoredPersonalMode(userId = null) {
  if (typeof window === "undefined") return "light";
  try {
    const activeUserId = userId || (typeof getAuthUser === "function" ? getAuthUser()?.id : null);
    if (activeUserId) {
      const userSaved = localStorage.getItem(`${DEDICATED_THEME_KEY}_${activeUserId}`);
      if (userSaved === "dark" || userSaved === "light") {
        return userSaved;
      }
    }
    const browserSaved = localStorage.getItem(DEDICATED_THEME_KEY);
    if (browserSaved === "dark" || browserSaved === "light") {
      return browserSaved;
    }
    const legacyUserMode = localStorage.getItem(LEGACY_MODE_KEY);
    if (legacyUserMode === "dark" || legacyUserMode === "light") {
      return legacyUserMode;
    }
    const legacyTheme = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyTheme === "dark" || legacyTheme === "light") {
      return legacyTheme;
    }
  } catch {}
  return "light";
}

/**
 * Saves personal appearance mode strictly to local storage and mirrors for legacy keys.
 * Does NOT broadcast mode or save to global shared records.
 */
export function saveStoredPersonalMode(mode, userId = null) {
  if (typeof window === "undefined") return;
  const val = mode === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(DEDICATED_THEME_KEY, val);
    const activeUserId = userId || (typeof getAuthUser === "function" ? getAuthUser()?.id : null);
    if (activeUserId) {
      localStorage.setItem(`${DEDICATED_THEME_KEY}_${activeUserId}`, val);
    }
    localStorage.setItem(LEGACY_MODE_KEY, val);
    localStorage.setItem(LEGACY_STORAGE_KEY, val);
  } catch {}
}

/**
 * Broadcasts only global palette/visual identity updates (themeId, bgAnimations).
 * NEVER broadcasts or forces personal light/dark mode.
 */
function broadcastPaletteUpdate(config) {
  if (typeof window === "undefined") return;
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL);
      channel.postMessage({
        type: "PALETTE_UPDATED",
        themeId: config.themeId,
        bgAnimations: config.bgAnimations,
      });
      channel.close();
    }
  } catch {}
  try {
    window.dispatchEvent(
      new CustomEvent("fazilnagar-palette-sync", {
        detail: { themeId: config.themeId, bgAnimations: config.bgAnimations },
      })
    );
  } catch {}
}

export function mergeBgAnimations(bg) {
  if (!bg || typeof bg !== "object") return DEFAULT_BG_ANIMATIONS;
  return {
    ...DEFAULT_BG_ANIMATIONS,
    ...bg,
    effects: {
      ...DEFAULT_BG_ANIMATIONS.effects,
      ...(bg.effects || {}),
    },
  };
}

export function ThemeProvider({ children }) {
  const [publishedThemeConfig, setPublishedThemeConfig] = useState(() => {
    try {
      const globalStored = localStorage.getItem(GLOBAL_THEME_STORAGE_KEY);
      if (globalStored) {
        const parsed = JSON.parse(globalStored);
        if (parsed && parsed.themeId) {
          return {
            themeId: parsed.themeId,
            mode: parsed.mode === "dark" ? "dark" : "light",
            bgAnimations: mergeBgAnimations(parsed.bgAnimations),
          };
        }
      }
    } catch {}
    return {
      themeId: DEFAULT_THEME_ID,
      mode: DEFAULT_THEME_MODE,
      bgAnimations: DEFAULT_BG_ANIMATIONS,
    };
  });

  const [themeConfig, setThemeConfig] = useState(() => {
    try {
      // 1. Every user has an independent personal theme preference
      const personalMode = getStoredPersonalMode();

      // 2. Check for cached global visual palette (themeId) and bg animations
      const globalStored = localStorage.getItem(GLOBAL_THEME_STORAGE_KEY);
      if (globalStored) {
        const parsed = JSON.parse(globalStored);
        if (parsed && parsed.themeId) {
          return {
            themeId: parsed.themeId,
            mode: personalMode, // Always personal, never overridden by global mode
            bgAnimations: mergeBgAnimations(parsed.bgAnimations),
          };
        }
      }

      return {
        themeId: DEFAULT_THEME_ID,
        mode: personalMode,
        bgAnimations: DEFAULT_BG_ANIMATIONS,
      };
    } catch {
      return {
        themeId: DEFAULT_THEME_ID,
        mode: "light",
        bgAnimations: DEFAULT_BG_ANIMATIONS,
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

    // Configure background animations system tokens
    const anim = mergeBgAnimations(cfg?.bgAnimations);
    const speedFactor = anim.speed === "slow" ? "1.8" : anim.speed === "fast" ? "0.6" : "1.0";
    root.style.setProperty("--fzn-anim-speed-factor", speedFactor);
    root.style.setProperty("--fzn-anim-opacity", String(anim.opacity ?? 0.6));

    if (!anim.autoMatchTheme && anim.customColor) {
      root.style.setProperty("--fzn-anim-color-primary", anim.customColor);
      root.style.setProperty("--fzn-anim-color-accent", anim.customColor);
    } else {
      root.style.removeProperty("--fzn-anim-color-primary");
      root.style.removeProperty("--fzn-anim-color-accent");
    }

    if (anim.enabled && anim.effects?.cardBorders) {
      root.classList.add("fzn-card-glow-active");
    } else {
      root.classList.remove("fzn-card-glow-active");
    }
  }, []);

  // Fetch the active admin-configured visual palette & animations from backend
  useEffect(() => {
    let isMounted = true;
    async function fetchGlobalTheme() {
      try {
        const res = await API.get("/settings");
        if (res.data?.success && res.data?.settings?.themeConfig && isMounted) {
          const serverConfig = res.data.settings.themeConfig;
          const serverThemeId = serverConfig.themeId || DEFAULT_THEME_ID;
          const serverBg = mergeBgAnimations(serverConfig.bgAnimations);

          const publishedConfig = {
            themeId: serverThemeId,
            mode: serverConfig.mode === "dark" ? "dark" : "light",
            bgAnimations: serverBg,
          };
          setPublishedThemeConfig(publishedConfig);

          // User appearance mode is ALWAYS resolved personally.
          // Never let serverConfig.mode override the user's personal selection!
          const activePersonalMode = getStoredPersonalMode();

          const mergedConfig = {
            themeId: serverThemeId,
            mode: activePersonalMode,
            bgAnimations: serverBg,
          };

          setThemeConfig(mergedConfig);
          applyThemeToDOM(mergedConfig);

          try {
            localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, JSON.stringify(publishedConfig));
          } catch {}
        }
      } catch (err) {
        // Fallback gracefully to cached configuration
      }

      // If user is authenticated, check account-based preference
      try {
        const activeUser = getAuthUser();
        if (activeUser && activeUser.id && isMounted) {
          const profileRes = await API.get("/profile/me");
          if (profileRes.data?.success && profileRes.data?.profile?.themePreference && isMounted) {
            const accountPref = profileRes.data.profile.themePreference;
            if (accountPref === "dark" || accountPref === "light") {
              const currentMode = getStoredPersonalMode(activeUser.id);
              // If account preference differs and user hasn't set an explicit browser preference, apply account pref
              const hasExplicitBrowserPref = Boolean(localStorage.getItem(DEDICATED_THEME_KEY));
              if (!hasExplicitBrowserPref || currentMode !== accountPref) {
                saveStoredPersonalMode(accountPref, activeUser.id);
                setThemeConfig((prev) => {
                  const next = { ...prev, mode: accountPref };
                  applyThemeToDOM(next);
                  return next;
                });
              }
            }
          }
        }
      } catch {}
    }
    fetchGlobalTheme();
    return () => {
      isMounted = false;
    };
  }, [applyThemeToDOM]);

  // Synchronize personal mode when user logs in or out
  useEffect(() => {
    const handleAuthChange = () => {
      const activeUser = getAuthUser();
      const userMode = getStoredPersonalMode(activeUser?.id);
      setThemeConfig((prev) => {
        if (prev.mode !== userMode) {
          const next = { ...prev, mode: userMode };
          applyThemeToDOM(next);
          return next;
        }
        return prev;
      });
    };
    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, [applyThemeToDOM]);

  // Apply on mount and whenever theme changes
  useEffect(() => {
    applyThemeToDOM(themeConfig);
  }, [themeConfig, applyThemeToDOM]);

  // Admin-only preview function (instant DOM preview without overwriting published settings)
  const previewTheme = useCallback(
    (cfg) => {
      const previewCfg = {
        themeId: cfg.themeId || themeConfig.themeId,
        mode: cfg.mode === "dark" ? "dark" : "light",
        bgAnimations: cfg.bgAnimations !== undefined ? mergeBgAnimations(cfg.bgAnimations) : (themeConfig.bgAnimations || DEFAULT_BG_ANIMATIONS),
      };
      setThemeConfig(previewCfg);
      applyThemeToDOM(previewCfg);
    },
    [themeConfig, applyThemeToDOM]
  );

  // Admin-only persistent update function (saves global palette to backend database)
  const applyAdminTheme = useCallback(
    async (newConfig) => {
      if (!isUserAdmin()) {
        throw new Error("Unauthorized: Only administrators can modify the global portal theme.");
      }
      const token = getAuthToken();
      const payload = {
        themeId: newConfig.themeId,
        mode: newConfig.mode === "dark" ? "dark" : "light",
        bgAnimations: newConfig.bgAnimations !== undefined ? mergeBgAnimations(newConfig.bgAnimations) : (themeConfig.bgAnimations || DEFAULT_BG_ANIMATIONS),
      };

      const res = await API.put("/settings/theme", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        const serverConfig = res.data.themeConfig;
        const updatedPublished = {
          themeId: serverConfig.themeId,
          mode: serverConfig.mode,
          bgAnimations: mergeBgAnimations(serverConfig.bgAnimations || payload.bgAnimations),
        };
        setPublishedThemeConfig(updatedPublished);

        // Keep the administrator's personal mode preference untouched
        const currentPersonalMode = getStoredPersonalMode();
        const updatedLocal = {
          themeId: serverConfig.themeId,
          mode: currentPersonalMode,
          bgAnimations: mergeBgAnimations(serverConfig.bgAnimations || payload.bgAnimations),
        };
        setThemeConfig(updatedLocal);
        applyThemeToDOM(updatedLocal);

        try {
          localStorage.setItem(GLOBAL_THEME_STORAGE_KEY, JSON.stringify(updatedPublished));
          localStorage.setItem(GLOBAL_THEME_STORAGE_KEY + "_time", String(Date.now()));
          broadcastPaletteUpdate(updatedPublished);
        } catch {}
        return res.data;
      } else {
        throw new Error(res.data?.message || "Failed to update global theme");
      }
    },
    [themeConfig, applyThemeToDOM]
  );

  // Universal Light/Dark mode toggle (Strictly personal to the current user/browser)
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

      // Store personal preference strictly in localStorage (and user account if logged in)
      saveStoredPersonalMode(nextMode);

      // Asynchronously sync to user account if authenticated
      const activeUser = getAuthUser();
      if (activeUser && activeUser.id) {
        API.patch("/profile/me", { themePreference: nextMode }).catch(() => {});
      }
    },
    [themeConfig, applyThemeToDOM]
  );

  const setTheme = useCallback(
    (nextMode) => {
      const val = nextMode === "dark" ? "dark" : "light";
      const nextCfg = { ...themeConfig, mode: val };
      setThemeConfig(nextCfg);
      applyThemeToDOM(nextCfg);
      saveStoredPersonalMode(val);

      const activeUser = getAuthUser();
      if (activeUser && activeUser.id) {
        API.patch("/profile/me", { themePreference: val }).catch(() => {});
      }
    },
    [themeConfig, applyThemeToDOM]
  );

  // Synchronize global palette across tabs without touching personal light/dark preference
  useEffect(() => {
    let channel;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL);
        channel.onmessage = (e) => {
          if (e.data?.type === "PALETTE_UPDATED" && e.data.themeId) {
            const currentMode = getStoredPersonalMode();
            const next = {
              themeId: e.data.themeId || DEFAULT_THEME_ID,
              mode: currentMode,
              bgAnimations: e.data.bgAnimations || DEFAULT_BG_ANIMATIONS,
            };
            setThemeConfig(next);
            applyThemeToDOM(next);
          }
        };
      }
    } catch {}

    const handleCustomPaletteSync = (e) => {
      if (e.detail?.themeId) {
        const currentMode = getStoredPersonalMode();
        const next = {
          themeId: e.detail.themeId || DEFAULT_THEME_ID,
          mode: currentMode,
          bgAnimations: e.detail.bgAnimations || DEFAULT_BG_ANIMATIONS,
        };
        setThemeConfig(next);
        applyThemeToDOM(next);
      }
    };
    window.addEventListener("fazilnagar-palette-sync", handleCustomPaletteSync);

    const handleStorage = (e) => {
      if (e.key === GLOBAL_THEME_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.themeId) {
            const currentMode = getStoredPersonalMode();
            const next = {
              themeId: parsed.themeId,
              mode: currentMode,
              bgAnimations: parsed.bgAnimations || DEFAULT_BG_ANIMATIONS,
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
      window.removeEventListener("fazilnagar-palette-sync", handleCustomPaletteSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [applyThemeToDOM]);

  const value = useMemo(
    () => ({
      theme: themeConfig.mode,
      themeId: themeConfig.themeId,
      mode: themeConfig.mode,
      rawTheme: themeConfig.mode,
      bgAnimations: themeConfig.bgAnimations || DEFAULT_BG_ANIMATIONS,
      publishedThemeConfig,
      toggleTheme,
      setTheme,
      applyAdminTheme,
      previewTheme,
      isDark: themeConfig.mode === "dark",
      isAdminPage,
      isTransitioning,
      themeConfig,
    }),
    [themeConfig, publishedThemeConfig, isAdminPage, toggleTheme, setTheme, applyAdminTheme, previewTheme, isTransitioning]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
