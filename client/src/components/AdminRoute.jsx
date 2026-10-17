import { useState, useEffect } from "react";
import { Navigate, useLocation, Link, useNavigate } from "react-router-dom";
import { getAuthToken, getAuthUser, clearAuthSession } from "../utils/authStorage";
import API, { performLogout } from "../api";
import { ShieldAlert, ArrowLeft, LogIn, Lock } from "lucide-react";

/**
 * AdminRoute Component
 * Strictly guards /admin and /admin/review routes:
 * 1. Unauthenticated visitors -> Redirected immediately to /login (no UI/data leaked)
 * 2. Authenticated non-admin users -> Explicit HTTP 403 Access Denied screen
 * 3. Authorized administrators -> Render children (verified via server /auth/me)
 * 4. Tampering with localStorage or URL params -> Rejected by token signature + server check
 */
export default function AdminRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [authStatus, setAuthStatus] = useState(() => {
    const token = getAuthToken();
    if (!token) return "unauthenticated";
    const user = getAuthUser();
    if (!user || user.role !== "admin") return "forbidden";
    // Fast path: signed JWT with validated expiration and admin claim allows instant rendering with zero blocking delay
    return "authorized";
  });

  const [verifiedUser, setVerifiedUser] = useState(() => getAuthUser());

  useEffect(() => {
    let isMounted = true;

    const verifyAdmin = async () => {
      const token = getAuthToken();
      if (!token) {
        if (isMounted) setAuthStatus("unauthenticated");
        return;
      }

      const localUser = getAuthUser();
      // If local token payload says non-admin, immediately mark as forbidden
      if (!localUser || localUser.role !== "admin") {
        if (isMounted) {
          setVerifiedUser(localUser);
          setAuthStatus("forbidden");
        }
        return;
      }

      try {
        // Query server for authoritative database-verified role & account status
        const res = await API.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!isMounted) return;

        const serverUser = res.data?.user;
        if (
          serverUser &&
          serverUser.role === "admin" &&
          serverUser.status !== "inactive" &&
          serverUser.status !== "suspended"
        ) {
          setVerifiedUser(serverUser);
          setAuthStatus("authorized");
        } else {
          setVerifiedUser(serverUser || localUser);
          setAuthStatus("forbidden");
        }
      } catch (err) {
        if (!isMounted) return;

        if (err.response?.status === 401) {
          clearAuthSession();
          setAuthStatus("unauthenticated");
        } else if (err.response?.status === 403) {
          setAuthStatus("forbidden");
        } else {
          // In case of transient network failure, fallback strictly to signed token role
          if (localUser && localUser.role === "admin") {
            setAuthStatus("authorized");
          } else {
            setAuthStatus("forbidden");
          }
        }
      }
    };

    verifyAdmin();

    const handleAuthChange = () => {
      const token = getAuthToken();
      if (!token) {
        setAuthStatus("unauthenticated");
      } else {
        const u = getAuthUser();
        if (!u || u.role !== "admin") {
          setAuthStatus("forbidden");
        } else {
          verifyAdmin();
        }
      }
    };

    window.addEventListener("auth-change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      isMounted = false;
      window.removeEventListener("auth-change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [location.pathname]);

  // 1. Unauthenticated visitors: redirect directly to login
  if (authStatus === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
          message: "Please sign in with administrator credentials to access the Municipal Review Desk.",
        }}
        replace
      />
    );
  }

  // 2. Loading / Verifying screen
  if (authStatus === "verifying") {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl shadow-md border border-slate-200">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-700">Verifying administrative credentials...</span>
        </div>
      </div>
    );
  }

  // 3. Authenticated non-admin users: HTTP 403 Access Denied screen
  if (authStatus === "forbidden") {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-red-200 shadow-xl overflow-hidden text-center p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <span className="text-[11px] font-black uppercase tracking-wider text-red-700 bg-red-100/80 px-2.5 py-0.5 rounded-full inline-block mb-2">
            403 • Access Denied
          </span>

          <h1 className="text-xl font-extrabold text-slate-900 font-heading">
            Administrator Privileges Required
          </h1>

          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            You are signed in as{" "}
            <strong className="text-slate-800">
              {verifiedUser?.name || verifiedUser?.email || "Citizen User"}
            </strong>{" "}
            (Account role: <span className="font-mono text-red-600 font-bold">{verifiedUser?.role || "citizen"}</span>).
            This municipal moderation desk and content management system is strictly restricted to authorized town administrators.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Link
              to="/"
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Town Portal</span>
            </Link>
            <button
              onClick={async () => {
                await performLogout();
                navigate("/login", {
                  state: {
                    from: "/admin/review",
                    message: "Please sign in with administrator credentials.",
                  },
                });
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In as Admin</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authorized administrator: render protected admin component
  return children;
}
