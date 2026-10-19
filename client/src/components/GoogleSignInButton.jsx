import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { setAuthSession } from "../utils/authStorage";

export default function GoogleSignInButton({ setUser, redirectPath = "/", onError }) {
  const buttonRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [googleScriptReady, setGoogleScriptReady] = useState(false);
  const navigate = useNavigate();

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      if (onError) onError("Google authentication failed. No credential received.");
      return;
    }

    setLoading(true);
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
  };

  useEffect(() => {
    let checkInterval = null;

    const initGsi = () => {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
            context: "signin",
            ux_mode: "popup",
          });

          if (buttonRef.current) {
            buttonRef.current.innerHTML = "";
            window.google.accounts.id.renderButton(buttonRef.current, {
              type: "standard",
              shape: "rectangular",
              theme: "outline",
              text: "continue_with",
              size: "large",
              logo_alignment: "left",
              width: 380,
            });
          }
          setGoogleScriptReady(true);
        } catch (e) {
          console.warn("Google Sign-In initialization:", e.message);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGsi();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(checkInterval);
          initGsi();
        }
      }, 200);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [googleClientId]);

  const handleFallbackClick = () => {
    if (!googleClientId) {
      if (onError) {
        onError("Google OAuth Client ID is not configured (VITE_GOOGLE_CLIENT_ID).");
      }
      return;
    }
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    } else {
      if (onError) {
        onError("Google Sign-In script is still loading. Please wait a moment.");
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {loading && (
        <div className="text-xs text-slate-500 font-medium my-2 animate-pulse">
          Authenticating with Google...
        </div>
      )}

      {/* Official Google Button Container */}
      <div
        ref={buttonRef}
        className={`w-full flex justify-center ${loading ? "opacity-50 pointer-events-none" : ""}`}
      />

      {/* Fallback Custom Button if GIS standard button has not mounted */}
      {(!googleScriptReady || !googleClientId) && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 transition shadow-sm hover:shadow"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          <span>Continue with Google / गूगल से जारी रखें</span>
        </button>
      )}
    </div>
  );
}
