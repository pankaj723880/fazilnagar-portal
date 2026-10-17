import { useState, useEffect, lazy, Suspense } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import API, { performLogout } from "../api";
import { getAuthToken, getAuthUser, clearAuthSession, isUserAdmin } from "../utils/authStorage";
import { usePageSEO } from "../utils/seo";

// Master Layout & Design System
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboardOverview from "../components/admin/AdminDashboardOverview";

// Code-Split 11 Core Admin Modules + Subsystems (Loads on demand when tab selected)
const AdminSettingsCMS = lazy(() => import("../components/AdminSettingsCMS"));         // Module 1: Site Settings
const AdminHeroCMS = lazy(() => import("../components/AdminHeroCMS"));                 // Module 2: Hero Carousel
const AdminServicesCMS = lazy(() => import("../components/AdminServicesCMS"));         // Module 3: Public Services
const AdminEventsCMS = lazy(() => import("../components/AdminEventsCMS"));             // Module 4: Events & Melas
const AdminHeritageCMS = lazy(() => import("../components/AdminHeritageCMS"));         // Module 5: Twin Heritage
const AdminMediaLibrary = lazy(() => import("../components/AdminMediaLibrary"));       // Module 6: Media Library
const AdminAuditLogs = lazy(() => import("../components/AdminAuditLogs"));             // Module 7: Audit Logs
const AdminManageEntities = lazy(() => import("../components/AdminManageEntities"));   // Module 8: Entities (19)
const AdminAdvertisementsCMS = lazy(() => import("../components/AdminAdvertisementsCMS")); // Module 9: Advertisements
const AdminNewsCMS = lazy(() => import("../components/AdminNewsCMS"));                 // Module 10: News & Reels
const AdminCommunityPlaces = lazy(() => import("../components/AdminCommunityPlaces")); // Module 11: Community Submissions
const AdminManageUsers = lazy(() => import("../components/AdminManageUsers"));         // User Administration
const AdminDriveStorage = lazy(() => import("../components/AdminDriveStorage"));       // Google Drive Cloud Storage
const AdminHomepageCMS = lazy(() => import("../components/AdminHomepageCMS"));         // Module 12: Homepage CMS
const AdminCustomNotifications = lazy(() => import("../components/admin/AdminCustomNotifications")); // Module 13: Notifications & Alerts
const AdminCivicDirectoryCMS = lazy(() => import("../components/AdminCivicDirectoryCMS")); // Civic Directory Index CMS
const AdminModerationCMS = lazy(() => import("../components/admin/AdminModerationCMS")); // Citizen Messaging Moderation CMS

function AdminTabSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse" role="status" aria-label="Loading admin module">
      <div className="h-8 bg-slate-200 rounded-xl w-48" />
      <div className="h-4 bg-slate-100 rounded-lg w-72" />
      <div className="h-64 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 space-y-3">
        <div className="h-6 bg-slate-200/60 rounded-md w-1/3" />
        <div className="h-4 bg-slate-100 rounded-md w-2/3" />
        <div className="h-10 bg-slate-200/50 rounded-xl w-full mt-4" />
      </div>
    </div>
  );
}

import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  LogIn,
  AlertTriangle,
  Building,
  CheckCircle,
  Clock,
  ExternalLink,
  ArrowLeft
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
  const [civicCount, setCivicCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);

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
      } else {
        setCurrentUser(null);
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

  const isAdmin = Boolean(currentUser && currentUser.role === "admin" && isUserAdmin());

  // Fetch real count badges for sidebar concurrently (eliminates sequential waterfall)
  const fetchBadgeCounts = async () => {
    if (!isAdmin) return;
    const token = getAuthToken();
    const authHeaders = { Authorization: `Bearer ${token}` };

    try {
      const [subRes, placesRes, adsRes, newsRes, usersRes, civicRes] = await Promise.allSettled([
        API.get("/submissions?status=pending", { headers: authHeaders }),
        API.get("/places/admin?archived=all", { headers: authHeaders }),
        API.get("/advertisements/admin", { headers: authHeaders }),
        API.get("/news/admin/all", { headers: authHeaders }),
        API.get("/users?limit=1", { headers: authHeaders }),
        API.get("/civic-directory?all=true", { headers: authHeaders }),
      ]);

      if (subRes.status === "fulfilled" && Array.isArray(subRes.value.data)) {
        setPendingCount(subRes.value.data.length);
      }
      if (placesRes.status === "fulfilled" && Array.isArray(placesRes.value.data)) {
        setEntitiesCount(placesRes.value.data.length);
      }
      if (adsRes.status === "fulfilled" && Array.isArray(adsRes.value.data)) {
        const now = new Date();
        const active = adsRes.value.data.filter((a) => {
          if (!a.isActive || !a.isPublished) return false;
          if (a.startDate && new Date(a.startDate) > now) return false;
          if (a.endDate && new Date(a.endDate) < now) return false;
          return true;
        }).length;
        setLiveAdsCount(active);
      }
      if (newsRes.status === "fulfilled" && Array.isArray(newsRes.value.data)) {
        setNewsCount(newsRes.value.data.length);
      }
      if (usersRes.status === "fulfilled" && usersRes.value.data) {
        const totalU =
          usersRes.value.data.pagination?.total ??
          (Array.isArray(usersRes.value.data.users) ? usersRes.value.data.users.length : 0);
        setUsersCount(totalU);
      }
      if (civicRes.status === "fulfilled" && civicRes.value.data) {
        const count =
          civicRes.value.data.count ??
          (Array.isArray(civicRes.value.data.items)
            ? civicRes.value.data.items.length
            : Array.isArray(civicRes.value.data)
            ? civicRes.value.data.length
            : 0);
        setCivicCount(count);
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

  const handleLogout = async () => {
    await performLogout();
    setCurrentUser(null);
    navigate("/login");
  };

  // If user is not authenticated as admin, show access denied or redirect
  if (!isAdmin) {
    if (!currentUser) {
      return (
        <Navigate
          to="/login"
          state={{
            from: "/admin/review",
            message: "Please log in with administrator credentials to access the Municipal Review Desk.",
          }}
          replace
        />
      );
    }

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
              {currentUser?.name || currentUser?.email || "Citizen User"}
            </strong>.
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
              onClick={handleLogout}
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
      case "civic-directory":
      case "directory-index":
        return <AdminCivicDirectoryCMS onStatsChange={fetchBadgeCounts} />;

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
      case "notifications-manage":
      case "notifications":
      case "alerts":
        return <AdminCustomNotifications token={getAuthToken()} currentAdminUser={currentUser} />;

      case "moderation-reports":
      case "moderation":
        return <AdminModerationCMS />;

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
      civicCount={civicCount}
      currentUser={currentUser}
      onLogout={handleLogout}
      onRefresh={fetchBadgeCounts}
    >
      <Suspense fallback={<AdminTabSkeleton />}>
        {renderActiveModule()}
      </Suspense>
    </AdminLayout>
  );
}
