import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, HelpCircle, RefreshCw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import API from "../api";
import { setAuthSession } from "../utils/authStorage";

// Singleton tracking across component mounts to prevent duplicate GIS initialize() calls
let gsiInitializedClientId = null;
let activeCredentialCallback = null;

function handleGlobalCredential(response) {
  if (typeof activeCredentialCallback === "function") {
    activeCredentialCallback(response);
  }
}

export default function GoogleSignInButton({ setUser, redirectPath = "/", onError }) {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (!response || !response.credential) {
        if (onError) onError("Google authentication failed. No credential received.");
        return;
      }

      setLoading(true);
      setPopupBlocked(false);
      if (onError) onError("");

      try {
        const res = await API.post("/auth/google", {
          credential: response.credential,
        });

        const userData = res.data.user;
        setAuthSession(res.data.token, userData);
        if (setUser) setUser(userData);

        navigate(redirectPath, { replace: true });
      } catch (err) {
        const msg =
          err.response?.data?.message ||
          err.message ||
          "Google sign-in failed. Please try again.";
        if (onError) onError(msg);
      } finally {
        setLoading(false);
      }
    },
    [navigate, onError, redirectPath, setUser]
  );

  // Keep active callback handler pointing to currently mounted component instance
  useEffect(() => {
    activeCredentialCallback = handleCredentialResponse;
    return () => {
      if (activeCredentialCallback === handleCredentialResponse) {
        activeCredentialCallback = null;
      }
    };
  }, [handleCredentialResponse]);

  // Intercept window.open & console to detect browser popup blocker
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function (url, ...args) {
      const win = originalOpen ? originalOpen.call(this, url, ...args) : null;
      if (url && typeof url === "string" && url.includes("accounts.google.com")) {
        if (!win || win.closed || typeof win.closed === "undefined") {
          setPopupBlocked(true);
        } else {
          setPopupBlocked(false);
        }
      }
      return win;
    };

    const originalWarn = console.warn;
    const originalError = console.error;

    const checkGsiLog = (...args) => {
      const message = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a || ""))).join(" ");
      if (
        message.includes("[GSI_LOGGER]") &&
        (message.includes("Failed to open popup window") || message.includes("Maybe blocked by the browser"))
      ) {
        setPopupBlocked(true);
      }
    };

    console.warn = function (...args) {
      checkGsiLog(...args);
      originalWarn.apply(console, args);
    };

    console.error = function (...args) {
      checkGsiLog(...args);
      originalError.apply(console, args);
    };

    return () => {
      window.open = originalOpen;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    let checkInterval = null;
    let isMounted = true;

    const setupButton = () => {
      if (!isMounted || !window.google?.accounts?.id || !googleClientId) return;

      try {
        // Initialize once per unique client ID
        if (gsiInitializedClientId !== googleClientId) {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGlobalCredential,
            context: "signin",
            ux_mode: "popup",
            auto_select: false,
            itp_support: true,
          });
          gsiInitializedClientId = googleClientId;
        }

        if (buttonRef.current) {
          buttonRef.current.innerHTML = "";
          const containerWidth = buttonRef.current.offsetWidth || (window.innerWidth ? Math.min(360, window.innerWidth - 64) : 340);
          const computedWidth = Math.min(380, Math.max(220, containerWidth));
          const isDark = document.documentElement.classList.contains("theme-dark");

          window.google.accounts.id.renderButton(buttonRef.current, {
            type: "standard",
            shape: "rectangular",
            theme: isDark ? "filled_black" : "outline",
            text: "continue_with",
            size: "large",
            logo_alignment: "left",
            width: computedWidth,
          });
        }
        setGoogleScriptReady(true);
      } catch (e) {
        console.warn("Google Sign-In setup:", e.message);
      }
    };

    if (window.google?.accounts?.id) {
      setupButton();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          setupButton();
        }
      }, 150);
    }

    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [googleClientId]);

  const handleRetry = () => {
    setPopupBlocked(false);
    if (buttonRef.current) {
      const btn = buttonRef.current.querySelector('div[role="button"]') || buttonRef.current.querySelector("iframe");
      if (btn) {
        btn.focus();
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {loading && (
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium my-2 animate-pulse flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-700 animate-ping" />
          <span>Authenticating with Google...</span>
        </div>
      )}

      {/* Official Google Button Container */}
      <div
        ref={buttonRef}
        className={`w-full flex justify-center max-w-full overflow-hidden ${loading ? "opacity-50 pointer-events-none" : ""}`}
      />

      {/* Fallback Custom Button if GIS standard button has not mounted */}
      {(!googleScriptReady || !googleClientId) && (
        <button
          type="button"
          onClick={() => {
            if (!googleClientId && onError) {
              onError("Google OAuth Client ID is not configured (VITE_GOOGLE_CLIENT_ID).");
            } else {
              setPopupBlocked(true);
            }
          }}
          disabled={loading}
          className="w-full h-11 flex items-center justify-center gap-3 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 transition shadow-xs hover:shadow-sm active:scale-[0.99] cursor-pointer"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>
      )}

      {/* Pop-up Blocked Notification Banner */}
      {popupBlocked && (
        <div className="w-full mt-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-left shadow-xs transition-all animate-fadeIn">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                Pop-up Blocked by Browser
              </p>
              <p className="mt-1 text-amber-800 dark:text-amber-300/90 leading-relaxed text-[11.5px]">
                Your browser or an ad-blocker prevented the Google login window from opening.
              </p>
              <ol className="mt-2 space-y-1 list-decimal list-inside text-amber-900/90 dark:text-amber-300/80 text-[11px] font-medium">
                <li>Look for the <strong>pop-up blocked icon (🚫)</strong> in your address/URL bar.</li>
                <li>Click it and select <strong>&quot;Always allow pop-ups from fazilnagar.vercel.app&quot;</strong>.</li>
                <li>If using Brave or uBlock, turn shields off for this domain.</li>
              </ol>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-medium rounded-lg text-xs transition shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discrete Troubleshooting Helper Toggle */}
      <div className="w-full mt-2 text-center">
        <button
          type="button"
          onClick={() => setShowHelp((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition underline underline-offset-2 cursor-pointer"
        >
          <HelpCircle className="w-3 h-3" />
          <span>Trouble signing in with Google?</span>
          {showHelp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showHelp && (
          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-left text-[11.5px] text-slate-600 dark:text-slate-300 space-y-1.5 animate-fadeIn">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Tips to resolve Google Sign-In issues:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
              <li><strong>Allow Popups:</strong> Check the URL bar for a 🚫 or lock 🔒 icon &rarr; Site Settings &rarr; Pop-ups &rarr; Allow.</li>
              <li><strong>Ad-blockers:</strong> Whitelist <code className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">fazilnagar.vercel.app</code> in Brave Shields, uBlock Origin, or AdGuard.</li>
              <li><strong>Third-party cookies:</strong> In Chrome/Safari settings, ensure third-party cookies or storage access is allowed for Google Identity.</li>
              <li><strong>Alternative:</strong> You can always register or sign in directly with your <strong>Email &amp; Password</strong> below.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
