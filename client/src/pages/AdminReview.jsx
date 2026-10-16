import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import API, { performLogout } from "../api";
import { getAuthToken, getAuthUser, clearAuthSession, isUserAdmin } from "../utils/authStorage";
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
import AdminCustomNotifications from "../components/admin/AdminCustomNotifications"; // Module 13: Notifications & Alerts
import AdminCivicDirectoryCMS from "../components/AdminCivicDirectoryCMS"; // Civic Directory Index CMS
import AdminModerationCMS from "../components/admin/AdminModerationCMS"; // Citizen Messaging Moderation CMS

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

      // 6. Civic Directory Index listings count
      const civicRes = await API.get("/civic-directory?all=true", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (civicRes?.data) {
        const count =
          civicRes.data.count ??
          (Array.isArray(civicRes.data.items)
            ? civicRes.data.items.length
            : Array.isArray(civicRes.data)
            ? civicRes.data.length
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
      {renderActiveModule()}
    </AdminLayout>
  );
}
