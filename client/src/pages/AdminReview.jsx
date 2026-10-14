import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import API from "../api";
import { getAuthToken, getAuthUser, setAuthSession, clearAuthSession } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";

// Master Layout & Design System
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboardOverview from "../components/admin/AdminDashboardOverview";

// 11 Core Admin Modules + Subsystems
import AdminSettingsCMS from "../components/AdminSettingsCMS";         // Module 1: Site Settings
import AdminHeroCMS from "../components/AdminHeroCMS";                 // Module 2: Hero Carousel
import AdminServicesCMS from "../components/AdminServicesCMS";         // Module 3: Public Services
import AdminEventsCMS from "../components/AdminEventsCMS";             // Module 4: Events & Melas
import AdminHeritageCMS from "../components/AdminHeritageCMS";         // Module 5: Twin Heritage
import AdminMediaLibrary from "../components/AdminMediaLibrary";       // Module 6: Media Library
import AdminAuditLogs from "../components/AdminAuditLogs";             // Module 7: Audit Logs
import AdminManageEntities from "../components/AdminManageEntities";   // Module 8: Entities (19)
import AdminAdvertisementsCMS from "../components/AdminAdvertisementsCMS"; // Module 9: Advertisements
import AdminNewsCMS from "../components/AdminNewsCMS";                 // Module 10: News & Reels
import AdminCommunityPlaces from "../components/AdminCommunityPlaces"; // Module 11: Community Submissions
import AdminManageUsers from "../components/AdminManageUsers";         // User Administration
import AdminDriveStorage from "../components/AdminDriveStorage";       // Google Drive Cloud Storage
import AdminHomepageCMS from "../components/AdminHomepageCMS";         // Module 12: Homepage CMS

import {
  ShieldCheck,
  Lock,
  LogIn,
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  ExternalLink
} from "lucide-react";

export default function AdminReview({ user: propUser }) {
  usePageSEO({
    title: "Admin Civic CMS | Fazilnagar Town Portal",
    description: "Town administration, citizen moderation, and content management desk for Fazilnagar.",
    canonicalPath: "/admin/review",
    noIndex: true,
  });

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(propUser || null);

  // Read active tab from URL query param, default to "dashboard"
  const urlTab = searchParams.get("tab") || "dashboard";
  const [activeTab, setActiveTabState] = useState(urlTab);

  // Live real data metric counters for sidebar badges
  const [pendingCount, setPendingCount] = useState(0);
  const [entitiesCount, setEntitiesCount] = useState(0);
  const [liveAdsCount, setLiveAdsCount] = useState(0);
  const [newsCount, setNewsCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);

  // Authentication State
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Synchronize Tab with URL
  const setActiveTab = (tabId) => {
    setActiveTabState(tabId);
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab && currentTab !== activeTab) {
      setActiveTabState(currentTab);
    }
  }, [searchParams]);

  // Auth synchronization listener
  useEffect(() => {
    const resolveUser = () => {
      const u = getAuthUser();
      if (u) {
        setCurrentUser(u);
      } else if (propUser) {
        setCurrentUser(propUser);
      }
    };

    resolveUser();
    window.addEventListener("auth-change", resolveUser);
    window.addEventListener("storage", resolveUser);
    return () => {
      window.removeEventListener("auth-change", resolveUser);
      window.removeEventListener("storage", resolveUser);
    };
  }, [propUser]);

  const isAdmin =
    currentUser?.role === "admin" ||
    currentUser?.email === "admin@fazilnagar.com" ||
    currentUser?.email === "pankaj723880@gmail.com";

  // Fetch real count badges for sidebar
  const fetchBadgeCounts = async () => {
    if (!isAdmin) return;
    const token = getAuthToken();

    try {
      // 1. Pending submissions
      const subRes = await API.get("/submissions?status=pending", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (Array.isArray(subRes?.data)) {
        setPendingCount(subRes.data.length);
      }

      // 2. Entities count
      const placesRes = await API.get("/places/admin?archived=all", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (Array.isArray(placesRes?.data)) {
        setEntitiesCount(placesRes.data.length);
      }

      // 3. Live Ads
      const adsRes = await API.get("/advertisements/admin", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (Array.isArray(adsRes?.data)) {
        const now = new Date();
        const active = adsRes.data.filter((a) => {
          if (!a.isActive || !a.isPublished) return false;
          if (a.startDate && new Date(a.startDate) > now) return false;
          if (a.endDate && new Date(a.endDate) < now) return false;
          return true;
        }).length;
        setLiveAdsCount(active);
      }

      // 4. News count
      const newsRes = await API.get("/news/admin/all", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (Array.isArray(newsRes?.data)) {
        setNewsCount(newsRes.data.length);
      }

      // 5. Registered users count
      const usersRes = await API.get("/users?limit=1", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (usersRes?.data) {
        const totalU =
          usersRes.data.pagination?.total ??
          (Array.isArray(usersRes.data.users) ? usersRes.data.users.length : 0);
        setUsersCount(totalU);
      }
    } catch (err) {
      console.warn("Failed to load sidebar badge counts:", err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchBadgeCounts();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginSubmitting(true);
    setLoginError("");

    try {
      const res = await API.post("/auth/login", {
        email: adminEmail.trim(),
        password: adminPassword,
      });

      if (res.data?.token && res.data?.user) {
        setAuthSession(res.data.token, res.data.user);
        setCurrentUser(res.data.user);
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || "Invalid Administrator Email or Password.");
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession(false);
    setCurrentUser(null);
    navigate("/login");
  };

  // If user is not authenticated as admin, show civic admin login screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header Banner */}
          <div className="bg-[#14233B] text-white p-6 text-center relative overflow-hidden">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-400/30 text-blue-300 mb-3 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold font-heading tracking-tight">Fazilnagar Civic Portal</h1>
            <p className="text-xs text-slate-300 mt-1">
              Municipal CMS & Content Review Desk
            </p>
          </div>

          {/* Form Area */}
          <div className="p-6 space-y-5">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@fazilnagar.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={loginSubmitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loginSubmitting ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Access Admin Console</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <Link to="/" className="hover:text-blue-600 flex items-center gap-1 transition">
                ← Return to Public Portal
              </Link>
              <span className="text-[11px] font-mono text-slate-400">JWT Protected</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to render the active module based on tab ID or alias
  const renderActiveModule = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <AdminDashboardOverview
            setActiveTab={setActiveTab}
            onNavigateTab={setActiveTab}
            stats={{
              entitiesCount,
              pendingSubmissionsCount: pendingCount,
              liveAdsCount,
              totalAdsCount: liveAdsCount,
              publishedNewsCount: newsCount,
              totalNewsCount: newsCount,
              usersCount,
            }}
            onOpenCreateAd={() => setActiveTab("ads")}
            onOpenCreateNews={() => setActiveTab("news-manage")}
            onRefresh={fetchBadgeCounts}
          />
        );

      // B. Website & Content
      case "cms-homepage":
        return <AdminHomepageCMS />;

      case "cms-settings":
      case "settings":
        return <AdminSettingsCMS />;

      case "cms-hero":
      case "hero":
        return <AdminHeroCMS />;

      case "cms-services":
      case "services":
        return <AdminServicesCMS />;

      case "cms-events":
      case "events":
        return <AdminEventsCMS />;

      case "cms-heritage":
      case "heritage":
        return <AdminHeritageCMS />;

      case "news-manage":
      case "news":
        return <AdminNewsCMS onStatsChange={fetchBadgeCounts} />;

      case "cms-media":
      case "media":
        return <AdminMediaLibrary />;

      // C. Directory Management
      case "manage-entities":
      case "entities":
        return <AdminManageEntities token={getAuthToken()} onStatsChange={fetchBadgeCounts} />;

      case "community-places":
      case "submissions":
        return <AdminCommunityPlaces token={getAuthToken()} onStatsChange={fetchBadgeCounts} />;

      case "ads":
      case "advertisements":
        return <AdminAdvertisementsCMS onStatsChange={fetchBadgeCounts} />;

      case "manage-users":
      case "users":
        return <AdminManageUsers token={getAuthToken()} currentAdminUser={currentUser} />;

      case "drive":
        return <AdminDriveStorage />;

      // D. Security & Administration
      case "cms-audit":
      case "audit":
        return <AdminAuditLogs />;

      default:
        return (
          <AdminDashboardOverview
            setActiveTab={setActiveTab}
            onNavigateTab={setActiveTab}
            stats={{
              entitiesCount,
              pendingSubmissionsCount: pendingCount,
              liveAdsCount,
              totalAdsCount: liveAdsCount,
              publishedNewsCount: newsCount,
              totalNewsCount: newsCount,
              usersCount,
            }}
            onOpenCreateAd={() => setActiveTab("ads")}
            onOpenCreateNews={() => setActiveTab("news-manage")}
            onRefresh={fetchBadgeCounts}
          />
        );
    }
  };

  return (
    <AdminLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      pendingCount={pendingCount}
      entitiesCount={entitiesCount}
      liveAdsCount={liveAdsCount}
      newsCount={newsCount}
      currentUser={currentUser}
      onLogout={handleLogout}
      onRefresh={fetchBadgeCounts}
    >
      {renderActiveModule()}
    </AdminLayout>
  );
}
