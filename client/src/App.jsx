import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, NavLink, Link, useNavigate, useLocation } from "react-router-dom";

// Code-split TownPortal to eliminate massive entry chunk bloat
const TownPortal = lazy(() => import("./pages/TownPortal"));
import { getAuthUser, clearAuthSession, isUserAdmin } from "./utils/authStorage";
import { performLogout } from "./api";
import { getCachedSettings, getSiteSettings, DEFAULT_SITE_SETTINGS, subscribeToCMSLiveUpdates } from "./services/cmsService";

// Lazy-Loaded Route Components (Code-split to reduce initial unused JS)
const News = lazy(() => import("./pages/News"));
const ReelsNewsFeed = lazy(() => import("./pages/ReelsNewsFeed"));
const EmergencyHub = lazy(() => import("./pages/EmergencyHub"));
const HealthcareDirectory = lazy(() => import("./pages/HealthcareDirectory"));
const EducationHub = lazy(() => import("./pages/EducationHub"));
const JobsAndBusiness = lazy(() => import("./pages/JobsAndBusiness"));
const Tourism = lazy(() => import("./pages/Tourism"));
const FoodGuide = lazy(() => import("./pages/FoodGuide"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Transportation = lazy(() => import("./pages/Transportation"));
const GovtServices = lazy(() => import("./pages/GovtServices"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const CreateNews = lazy(() => import("./pages/CreateNews"));
const Directory = lazy(() => import("./pages/Directory"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AdminReview = lazy(() => import("./pages/AdminReview"));
const Messages = lazy(() => import("./pages/Messages"));
const ProfileEdit = lazy(() => import("./pages/ProfileEdit"));
import AdminRoute from "./components/AdminRoute";
import RequireMessagingAuth from "./components/RequireMessagingAuth";
import InstallButton from "./components/InstallButton";
const DirectionsModal = lazy(() => import("./components/DirectionsModal"));
const NotificationCenter = lazy(() => import("./components/NotificationCenter"));
const GlobalFloatingAndStickyAds = lazy(() =>
  import("./components/AdvertisementSlot").then((m) => ({ default: m.GlobalFloatingAndStickyAds }))
);
import { Home, Compass, PhoneCall, Newspaper, Menu, X, ShieldAlert, MessageSquare } from "lucide-react";
import { prefetchRoute } from "./utils/routePrefetch";

const VERIFIED_DIRECTORY_COUNT = "37";

const MAIN_NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/#explore-categories", label: "Explore", isHash: true },
  { path: "/directory", label: "Directory", count: VERIFIED_DIRECTORY_COUNT },
  { path: "/#regional-connectivity-section", label: "Map", isHash: true },
  { path: "/news", label: "Local Updates" },
];

const isExcludedNavItem = (item) => {
  if (!item) return true;
  const p = (item.path || "").toLowerCase();
  const l = (item.label || "").toLowerCase();
  const id = (item.id || "").toLowerCase();
  return (
    p.includes("events-melas-section") ||
    p.includes("about-fazilnagar-section") ||
    l.includes("events & melas") ||
    l.includes("events and melas") ||
    l.includes("twin heritage") ||
    id === "events" ||
    id === "heritage"
  );
};

const DIRECTORY_SUB_NAV = [
  { path: "/directory", label: "Town Directory", icon: "🗺️", badge: "Verified" },
  { path: "/education", label: "Education", icon: "🎓" },
  { path: "/emergency", label: "Emergency", icon: "🚨", badge: "24/7" },
  { path: "/healthcare", label: "Healthcare", icon: "🏥" },
  { path: "/jobs", label: "Jobs & Directory", icon: "💼" },
  { path: "/tourism", label: "Tourism", icon: "🏨" },
  { path: "/food", label: "Food Guide", icon: "🍛" },
  { path: "/marketplace", label: "Marketplace", icon: "🛍️" },
  { path: "/transport", label: "Transport", icon: "🚌" },
  { path: "/govt", label: "Govt Services", icon: "🏛️" },
];

const DIRECTORY_SUB_NAV_PATHS = [
  "/directory",
  "/local-directory",
  "/education",
  "/emergency",
  "/healthcare",
  "/jobs",
  "/tourism",
  "/food",
  "/marketplace",
  "/transport",
  "/govt",
  "/about",
];

function CivicRouteSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 animate-pulse space-y-6" role="status" aria-label="Loading civic section">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <div className="h-7 bg-slate-200/90 rounded-xl w-48 sm:w-64" />
          <div className="h-3.5 bg-slate-200/60 rounded-lg w-72 max-w-full" />
        </div>
        <div className="hidden sm:block h-9 bg-slate-200/70 rounded-xl w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-40 bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-2xs">
            <div className="flex justify-between items-center">
              <div className="h-3.5 bg-slate-200/80 rounded-md w-24" />
              <div className="h-3 bg-emerald-100 rounded-md w-16" />
            </div>
            <div className="h-5 bg-slate-300/80 rounded-md w-3/4" />
            <div className="h-3 bg-slate-200/60 rounded-md w-full" />
            <div className="h-3 bg-slate-200/40 rounded-md w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // If on the Town Portal homepage, it renders full-width sections
  const isPortalPage =
    location.pathname === "/" ||
    location.pathname === "/town" ||
    location.pathname === "/portal" ||
    location.pathname === "/fazilnagar";

  const isMobilePreview = location.search.includes("view=mobile");

  const isNewsPage =
    location.pathname === "/news" ||
    location.pathname === "/local-updates" ||
    location.pathname === "/directory/news";

  const isDirectoryPage =
    location.pathname === "/directory" ||
    location.pathname === "/local-directory";

  const isAdminPage = location.pathname.startsWith("/admin");
  const isMessagesPage = location.pathname.startsWith("/messages");

  const hasSubNav = DIRECTORY_SUB_NAV_PATHS.includes(location.pathname) && !isNewsPage;
  const isAdmin = Boolean(user && user.role === "admin") && isUserAdmin();

  const [mobileFooterNavOpen, setMobileFooterNavOpen] = useState(false);
  const [mobileFooterActionsOpen, setMobileFooterActionsOpen] = useState(false);
  const [mobileFooterEmergencyOpen, setMobileFooterEmergencyOpen] = useState(false);
  const [mobileFooterLegalOpen, setMobileFooterLegalOpen] = useState(false);

  // Smooth scroll and route switch effect
  useEffect(() => {
    setMobileMenuOpen(false);
    if (location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 150);
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname, location.hash]);

  // Handle in-page hash links (like Explore, Map, About) smoothly from any page
  const handleNavClick = (e, path, isHash) => {
    if (isHash) {
      e.preventDefault();
      const hashTarget = path.split("#")[1];
      if (isPortalPage) {
        const el = document.getElementById(hashTarget);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          window.dispatchEvent(new CustomEvent("townportal-reveal-below-fold"));
          window.setTimeout(() => {
            document.getElementById(hashTarget)?.scrollIntoView({ behavior: "smooth" });
          }, 0);
        }
      } else {
        navigate(path);
        setTimeout(() => {
          const el = document.getElementById(hashTarget);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 150);
      }
    }
  };

  // Persistent user synchronization (tab-isolated)
  useEffect(() => {
    const syncUser = () => {
      setUser(getAuthUser());
    };

    syncUser();
    window.addEventListener("auth-change", syncUser);
    return () => {
      window.removeEventListener("auth-change", syncUser);
    };
  }, []);

  // Synchronize dynamic site settings for top civic alert bar & live navigation
  const [siteSettings, setSiteSettings] = useState(() => getCachedSettings() || DEFAULT_SITE_SETTINGS);
  useEffect(() => {
    getSiteSettings().then((s) => {
      if (s) setSiteSettings(s);
    });

    const unsubscribe = subscribeToCMSLiveUpdates(() => {
      getSiteSettings().then((s) => {
        if (s) setSiteSettings(s);
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Coordinated launch transition: notify HTML overlay that React app is mounted
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (typeof window.__dismissSplash === "function") {
        window.__dismissSplash();
      }
      if (window.__STARTUP_METRICS__) {
        window.__STARTUP_METRICS__.interactive = performance.now();
        try { performance.mark("app-interactive"); } catch (e) {}
      }
    }
  }, []);

  const handleLogout = () => {
    performLogout();
    setUser(null);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F5F7F8] text-[#18232E] flex flex-col font-sans selection:bg-[#B8323C] selection:text-white">
      {/* Skip to Main Content Link for WCAG 2.2 AA Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2.5 focus:bg-[#18232E] focus:text-white focus:rounded-xl focus:shadow-2xl focus:ring-2 focus:ring-[#B8323C] text-xs font-bold"
      >
        Skip to main content / मुख्य सामग्री पर जाएं
      </a>

      {/* ========================================================
          PERMANENT FIXED TOP SHELL (Desktop / Non-Portal Pages)
          ======================================================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-[#FFFFFF] shadow-xs ${isAdminPage ? "hidden" : isPortalPage || isMobilePreview ? "hidden md:block" : ""}`}>
        {/* Top Alert & User Status Bar - Modern Civic Deep Slate & Crimson (Desktop / Tablet) */}
        {siteSettings?.topAlertBar?.enabled !== false && (
          <div className="hidden sm:flex h-8 bg-[#18232E] text-slate-300 text-[11px] font-semibold px-4 justify-between items-center border-b border-slate-800 shadow-xs">
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
              <span className="bg-[#B8323C] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs">
                {siteSettings?.topAlertBar?.badgeText || "LIVE CIVIC"}
              </span>
              <span className="truncate text-slate-300">
                {siteSettings?.topAlertBar?.text || siteSettings?.siteName || "Fazilnagar Town Official Civic & Local Directory Portal (PIN 274401)"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`tel:${siteSettings?.topAlertBar?.helplineNumber || (siteSettings?.contact?.emergencyPhone ? siteSettings.contact.emergencyPhone.split("/")[0].trim() : "112")}`}
                className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-bold whitespace-nowrap"
              >
                <span>{siteSettings?.topAlertBar?.helplineLabel || "📞 Helpline"}: {siteSettings?.topAlertBar?.helplineNumber || siteSettings?.contact?.emergencyPhone || "112"}</span>
              </a>
              {user && (
                <span className="text-[#168568] font-bold hidden md:inline">
                  👤 Logged in as: {user.role === "admin" ? "Admin" : (user.name || user.email)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main Header & Navigation */}
        <div className="bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E1E6EA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-[#18232E] flex items-center justify-center text-white font-extrabold text-base border border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
                {(siteSettings?.navigation?.brandFirst?.[0] || "F").toUpperCase()}
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-[#18232E] leading-none block font-heading">
                  {siteSettings?.navigation?.brandFirst || "FAZIL"}<span className="text-[#B8323C]">{siteSettings?.navigation?.brandSecond || "NAGAR"}</span>
                </span>
                <span className="text-[10px] font-medium text-[#647180] tracking-wider hidden min-[370px]:block truncate max-w-[170px]">
                  {siteSettings?.navigation?.tagline || "Your Town. Your Community."}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#18232E]">
              {(siteSettings?.navigation?.navItems && siteSettings.navigation.navItems.length > 0
                ? siteSettings.navigation.navItems.filter((i) => i.isActive !== false && !isExcludedNavItem(i))
                : MAIN_NAV_ITEMS.filter((i) => !isExcludedNavItem(i))
              ).map((item) => {
                const isHash = item.path.includes("#");
                const isActiveRoute = location.pathname === item.path || (isHash && location.hash === item.path.substring(item.path.indexOf("#")));
                if (isHash) {
                  return (
                    <a
                      key={item.id || item.path}
                      href={item.path}
                      onClick={(e) => handleNavClick(e, item.path, true)}
                      className="text-[#647180] hover:text-[#18232E] transition cursor-pointer"
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.id || item.path}
                    to={item.path}
                    onMouseEnter={() => prefetchRoute(item.path)}
                    onFocus={() => prefetchRoute(item.path)}
                    onTouchStart={() => prefetchRoute(item.path)}
                    onClick={() => {
                      if (item.path === "/") window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`transition flex items-center gap-1 ${
                      isActiveRoute ? "text-[#B8323C] font-bold" : "text-[#647180] hover:text-[#18232E]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] bg-[#168568] text-white px-1.5 py-0.2 rounded-full font-bold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Auth & Post Actions Bar */}
            <div className="hidden sm:flex items-center gap-2.5 shrink-0">
              <Suspense fallback={<div className="w-11 h-11 shrink-0" />}>
                <NotificationCenter />
              </Suspense>

              {/* Messages / नगर संवाद */}
              <Link
                to="/messages"
                onMouseEnter={() => prefetchRoute("/messages")}
                onFocus={() => prefetchRoute("/messages")}
                onTouchStart={() => prefetchRoute("/messages")}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B8323C]/30 cursor-pointer ${
                  location.pathname === "/messages"
                    ? "bg-[#B8323C] text-white border-[#B8323C]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200"
                }`}
                aria-label="Town Messages"
                title="Town Messages / नगर संवाद"
              >
                <MessageSquare className="w-5 h-5" />
              </Link>

              {/* Admin Review Desk Icon-Only Control (Exactly ONE on desktop) */}
              {isAdmin && (
                <Link
                  to="/admin/review"
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                    location.pathname.startsWith("/admin")
                      ? "bg-amber-600 text-white border-amber-600 shadow-amber-900/20"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300"
                  }`}
                  aria-label="Admin dashboard"
                  title="Admin dashboard"
                >
                  <ShieldAlert className="w-5 h-5 text-amber-950" aria-hidden="true" />
                </Link>
              )}

              {/* Add Story Icon-Only Control */}
              <Link
                to={user ? (siteSettings?.navigation?.actionButtonLink || "/create-news") : "/login"}
                state={!user ? { from: "/create-news", message: "Please log in to submit a local story." } : undefined}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#B8323C] hover:bg-[#991B1B] text-white flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B8323C]/50 cursor-pointer"
                aria-label="Add Story"
                title="Add Story"
              >
                <span className="text-base select-none" aria-hidden="true">✍️</span>
              </Link>

              {user ? (
                <>
                  <span className="text-xs font-bold text-[#168568] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    {user.role === "admin" ? "Admin" : (user.name || user.email)}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 px-2.5 py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Actions: Notification Bell + Messages + Review Desk + Add Story (Icon-Only Controls) */}
            <div className="flex sm:hidden items-center gap-1.5">
              <Suspense fallback={<div className="w-11 h-11 shrink-0" />}>
                <NotificationCenter />
              </Suspense>
              <Link
                to="/messages"
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B8323C]/30 cursor-pointer ${
                  location.pathname === "/messages"
                    ? "bg-[#B8323C] text-white border-[#B8323C]"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
                aria-label="Town Messages"
                title="Town Messages / नगर संवाद"
              >
                <MessageSquare className="w-5 h-5 text-slate-700" />
              </Link>
              {isAdmin && (
                <Link
                  to="/admin/review"
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                    location.pathname.startsWith("/admin")
                      ? "bg-amber-600 text-white border-amber-600 shadow-amber-900/20"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300"
                  }`}
                  aria-label="Admin dashboard"
                  title="Admin dashboard"
                >
                  <ShieldAlert className="w-5 h-5 text-amber-950" aria-hidden="true" />
                </Link>
              )}
              <Link
                to={user ? "/create-news" : "/login"}
                state={!user ? { from: "/create-news", message: "Please log in to submit a local story." } : undefined}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-[#B8323C]/50 cursor-pointer"
                aria-label="Add Story"
                title="Add Story"
              >
                <span className="text-base select-none" aria-hidden="true">✍️</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Secondary Sub-Navbar - Visible across Directory & all Civic Hub pages */}
        {hasSubNav && (
          <div className="bg-[#FFFFFF] border-b border-[#E1E6EA] py-1.5 px-4 shadow-2xs">
            <div className="max-w-7xl mx-auto flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#647180] shrink-0 mr-1 hidden sm:inline">
                Civic Hubs:
              </span>
              {DIRECTORY_SUB_NAV.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/directory"}
                  className={({ isActive }) =>
                    `px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                      isActive
                        ? "bg-[#B8323C] text-white shadow-xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/60 bg-slate-50/70"
                    }`
                  }
                >
                  <span className="text-xs">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="bg-[#168568] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          MAIN BODY: Dynamic Top Padding (Starts exactly below fixed navbar)
          WITH SMOOTH ROUTE TRANSITIONS (animate-page-enter)
          ======================================================== */}
      <main
        id="main-content"
        tabIndex="-1"
        className={`flex-1 w-full outline-none ${
          isAdminPage
            ? "pt-0 pb-0 p-0 m-0 w-full max-w-full"
            : isNewsPage
            ? "pt-16 sm:pt-[96px] pb-14 sm:pb-0 p-0 m-0 overflow-hidden"
            : isMessagesPage
            ? "pt-16 sm:pt-[96px] pb-0 p-0 m-0 overflow-hidden h-[100dvh] max-h-[100dvh] box-border flex flex-col"
            : isPortalPage
            ? (isMobilePreview ? "pt-0 pb-16" : "pt-0 md:pt-[96px] pb-16 sm:pb-8")
            : hasSubNav
            ? "pt-[110px] sm:pt-[144px] pb-24 sm:pb-8 max-w-7xl mx-auto px-3 sm:px-6"
            : "pt-[76px] sm:pt-[112px] pb-24 sm:pb-8 max-w-7xl mx-auto px-3 sm:px-6"
        }`}
      >
        <div className={isNewsPage || isMessagesPage ? "w-full flex-1 min-h-0 flex flex-col overflow-hidden" : isPortalPage ? "w-full" : "w-full"}>
          <Suspense fallback={<CivicRouteSkeleton />}>
            <Routes>
              <Route path="/" element={<TownPortal />} />
              <Route path="/news" element={<ReelsNewsFeed />} />
              <Route path="/news/:id" element={<ReelsNewsFeed />} />
              <Route path="/local-updates" element={<ReelsNewsFeed />} />
              <Route path="/directory/news" element={<ReelsNewsFeed />} />
              <Route path="/news/classic" element={<News />} />
              <Route path="/directory" element={<Directory user={user} />} />
              <Route path="/local-directory" element={<Directory user={user} />} />
              <Route path="/town" element={<TownPortal />} />
              <Route path="/portal" element={<TownPortal />} />
              <Route path="/fazilnagar" element={<TownPortal />} />
              <Route path="/emergency" element={<EmergencyHub />} />
              <Route path="/healthcare" element={<HealthcareDirectory />} />
              <Route path="/education" element={<EducationHub />} />
              <Route path="/jobs" element={<JobsAndBusiness />} />
              <Route path="/tourism" element={<Tourism />} />
              <Route path="/food" element={<FoodGuide />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/transport" element={<Transportation />} />
              <Route path="/govt" element={<GovtServices />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/report" element={<Contact />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/disclaimer" element={<TermsOfService />} />

              {/* Auth & Admin Routes */}
              <Route path="/login" element={<Login setUser={setUser} />} />
              <Route path="/register" element={<Register setUser={setUser} />} />
              <Route path="/create-news" element={<CreateNews user={user} />} />
              <Route path="/upload" element={<CreateNews user={user} />} />
              <Route
                path="/admin/review"
                element={
                  <AdminRoute>
                    <AdminReview user={user} />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminReview user={user} />
                  </AdminRoute>
                }
              />
              {/* Town Messaging & Profile Routes (Protected, noindex) */}
              <Route
                path="/messages"
                element={
                  <RequireMessagingAuth>
                    <Messages />
                  </RequireMessagingAuth>
                }
              />
              <Route
                path="/profile"
                element={
                  <RequireMessagingAuth>
                    <ProfileEdit />
                  </RequireMessagingAuth>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireMessagingAuth>
                    <ProfileEdit />
                  </RequireMessagingAuth>
                }
              />
            </Routes>
          </Suspense>
        </div>
      </main>

      {/* ========================================================
          FOOTER - Modern Civic Deep Slate with Crimson & Emerald Accents
          (Hidden on /news full-screen reels page and TownPortal homepage which has its own footer)
          ======================================================== */}
      {!isNewsPage && !isPortalPage && !isAdminPage && !isMessagesPage && (
        <footer className="bg-[#18232E] text-slate-400 text-xs mt-12 border-t border-slate-800 pb-28 sm:pb-8">
          {/* Mobile Collapsible Accordions (md:hidden) */}
          <div className="md:hidden max-w-lg mx-auto px-4 py-6 space-y-2.5">
            {/* Custom Brand Title Block */}
            <div className="border-b border-slate-800/80 pb-3">
              <h3 className="text-white font-extrabold text-sm tracking-tight font-heading">
                FAZIL<span className="text-[#B8323C]">NAGAR</span> Civic Portal
              </h3>
              <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                PIN 274401. NH-27 Corridor, Kushinagar, UP
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Admin Help / Complaints: <span className="text-slate-300 font-mono">+91 5564 222102</span> • Toll-Free: <span className="text-slate-300 font-mono">1800-180-5145</span>
              </p>
            </div>

            {/* Accordion 1: Civic Navigation */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                type="button"
                onClick={() => setMobileFooterNavOpen((prev) => !prev)}
                className="w-full p-3 text-left font-bold text-white text-xs flex items-center justify-between cursor-pointer"
              >
                <span>▶ Civic Navigation (Town Directory, News, Emergency)</span>
                <span className={`transform transition-transform text-slate-400 text-[10px] ${mobileFooterNavOpen ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>
              {mobileFooterNavOpen && (
                <ul className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/60 text-xs bg-slate-900/30">
                  <li><Link to="/directory" className="hover:text-red-300 font-bold text-[#B8323C] flex items-center gap-1.5"><span>📍</span> Town Directory (Map &amp; List)</Link></li>
                  <li><Link to="/news" className="hover:text-white flex items-center gap-1.5"><span>📰</span> Town News</Link></li>
                  <li><Link to="/emergency" className="hover:text-white flex items-center gap-1.5"><span>🚨</span> Emergency Helplines</Link></li>
                  <li><Link to="/healthcare" className="hover:text-white flex items-center gap-1.5"><span>🏥</span> Hospitals &amp; Clinics</Link></li>
                  <li><Link to="/jobs" className="hover:text-white flex items-center gap-1.5"><span>💼</span> Local Jobs &amp; Trade</Link></li>
                  <li><Link to="/govt" className="hover:text-white flex items-center gap-1.5"><span>🏛️</span> Government Services</Link></li>
                </ul>
              )}
            </div>

            {/* Accordion 2: Community Actions */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                type="button"
                onClick={() => setMobileFooterActionsOpen((prev) => !prev)}
                className="w-full p-3 text-left font-bold text-white text-xs flex items-center justify-between cursor-pointer"
              >
                <span>▶ Community Actions (Submit Local News, Citizen Login)</span>
                <span className={`transform transition-transform text-slate-400 text-[10px] ${mobileFooterActionsOpen ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>
              {mobileFooterActionsOpen && (
                <ul className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/60 text-xs bg-slate-900/30">
                  <li><Link to="/create-news" className="hover:text-white flex items-center gap-1.5"><span>✍️</span> Submit Local News</Link></li>
                  <li><Link to="/login" className="hover:text-white flex items-center gap-1.5"><span>👤</span> Citizen / Reporter Login</Link></li>
                  <li><Link to="/register" className="hover:text-white flex items-center gap-1.5"><span>📝</span> Register Resident Account</Link></li>
                  {isAdmin && (
                    <li><Link to="/admin/review" className="hover:text-amber-400 text-amber-300 font-bold flex items-center gap-1"><span>🛡️</span> Admin dashboard</Link></li>
                  )}
                </ul>
              )}
            </div>

            {/* Accordion 3: Emergency Hotline Numbers */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                type="button"
                onClick={() => setMobileFooterEmergencyOpen((prev) => !prev)}
                className="w-full p-3 text-left font-bold text-white text-xs flex items-center justify-between cursor-pointer"
              >
                <span>▶ Emergency Hotline Numbers (Police 112, CHC Ambulance 108)</span>
                <span className={`transform transition-transform text-slate-400 text-[10px] ${mobileFooterEmergencyOpen ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>
              {mobileFooterEmergencyOpen && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/60 text-xs bg-slate-900/30">
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-300">Police Chowki / Dial 112:</span>
                    <a href="tel:112" className="text-red-400 font-black font-mono">112</a>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-300">CHC Ambulance:</span>
                    <a href="tel:108" className="text-emerald-400 font-black font-mono">108</a>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                    <span className="text-slate-300">Women Powerline:</span>
                    <a href="tel:1090" className="text-amber-400 font-black font-mono">1090</a>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-300">Fazilnagar CHC Direct:</span>
                    <a href="tel:05564222108" className="text-blue-400 font-bold font-mono">+91 5564 222108</a>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion 4: Legal & Independent Portal Notice */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <button
                type="button"
                onClick={() => setMobileFooterLegalOpen((prev) => !prev)}
                className="w-full p-3 text-left font-bold text-white text-xs flex items-center justify-between cursor-pointer"
              >
                <span>▶ Legal &amp; Independent Portal Notice</span>
                <span className={`transform transition-transform text-slate-400 text-[10px] ${mobileFooterLegalOpen ? "rotate-90" : ""}`}>
                  ▶
                </span>
              </button>
              {mobileFooterLegalOpen && (
                <div className="px-3 pb-3 pt-1 space-y-2 border-t border-slate-800/60 text-[11px] text-slate-400 bg-slate-900/30">
                  <p className="leading-relaxed">
                    Fazilnagar Town Portal is an independent community and civic directory initiative serving Fazilnagar (PIN 274401, Kushinagar, Uttar Pradesh). Independent community directory notice: Not affiliated directly with any single commercial entity.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Desktop 4-Column Grid (hidden md:grid) */}
          <div className="hidden md:grid max-w-7xl mx-auto px-4 sm:px-6 py-10 grid-cols-4 gap-8">
            <div className="space-y-3">
              <h3 className="text-white font-extrabold text-base tracking-tight font-heading">
                FAZIL<span className="text-[#B8323C]">NAGAR</span> Civic Portal
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                An independent, community-operated civic digital directory offering verified local listings, emergency helplines, public utilities, and town news (PIN 274401, Kushinagar, UP).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] font-semibold text-emerald-400">Unofficial, Community-Run Resource</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Civic Navigation</h3>
              <ul className="space-y-1.5">
                <li><Link to="/directory" className="hover:text-red-300 font-bold text-[#B8323C] flex items-center gap-1.5"><span>📍</span> Town Directory (Map & List)</Link></li>
                <li><Link to="/news" className="hover:text-white">Town News</Link></li>
                <li><Link to="/emergency" className="hover:text-white">Emergency Helplines</Link></li>
                <li><Link to="/healthcare" className="hover:text-white">Hospitals & Clinics</Link></li>
                <li><Link to="/education" className="hover:text-white">Schools & Colleges</Link></li>
                <li><Link to="/govt" className="hover:text-white">Government Services</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Trust & Community</h3>
              <ul className="space-y-1.5">
                <li><Link to="/about" className="hover:text-white">About Fazilnagar</Link></li>
                <li><Link to="/about#verification-criteria" className="hover:text-white">How We Verify Listings</Link></li>
                <li><Link to="/contact" className="hover:text-white text-amber-300 font-semibold">🚨 Report Wrong Information</Link></li>
                <li><Link to="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white">Terms & Disclaimer</Link></li>
                <li><Link to="/create-news" className="hover:text-white">Submit Local Story</Link></li>
                {isAdmin && (
                  <li><Link to="/admin/review" className="hover:text-amber-400 text-amber-300 font-bold flex items-center gap-1"><span>🛡️</span> Admin Dashboard</Link></li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Emergency Hotline</h3>
              <p className="text-xs text-slate-300">National Emergency: <a href="tel:112" className="text-[#B8323C] font-bold">112</a></p>
              <p className="text-xs text-slate-300">Ambulance Emergency: <a href="tel:108" className="text-[#0D5E49] font-bold">108</a></p>
              <p className="text-xs text-slate-300">Women Helpline: <a href="tel:1090" className="text-amber-400 font-bold">1090</a></p>
              <p className="text-xs text-slate-300">Child Helpline: <a href="tel:1098" className="text-blue-400 font-bold">1098</a></p>
              <div className="pt-2">
                <Link to="/contact" className="text-[11px] text-slate-400 hover:text-white underline">Contact Portal Volunteers</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 py-4 px-4 text-center text-[11px] text-slate-400 space-y-1">
            <p>© {new Date().getFullYear()} Fazilnagar Town Portal • Unofficial, Community-Operated Civic Resource (PIN 274401).</p>
            <p className="text-[10px] text-slate-500">Notice: This independent portal is not affiliated with, operated by, or authorized by Nagar Panchayat Fazilnagar or any government body.</p>
          </div>
        </footer>
      )}

      {/* ========================================================
          MOBILE BOTTOM MENU DRAWER (Triggered by bottom nav Menu button)
          ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop with full blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet Drawer Container */}
          <div className="relative z-10 w-full max-w-[420px] mx-auto bg-white/95 backdrop-blur-md rounded-t-3xl shadow-2xl border-t border-slate-200 pb-20 animate-in slide-in-from-bottom duration-250 max-h-[85vh] flex flex-col overflow-hidden">
            {/* Drawer Header: 4.1 */}
            <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-white/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  F
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading leading-tight">
                    Fazilnagar Menu
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Quick Civic &amp; Directory Navigation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer active:scale-95 text-xs font-bold"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="overflow-y-auto p-4 space-y-3.5 no-scrollbar">
              {/* 4.1 Action App CTA: Install on Device (Teal Style) */}
              <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-between shadow-2xs">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <span>📱</span> Install on Device
                </span>
                <InstallButton compact={false} />
              </div>

              {/* 4.2 Grid layout 1: CORE NAVIGATION */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  CORE NAVIGATION
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/70 active:scale-95 transition"
                  >
                    <span>🏛️</span>
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/directory"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-[#B8323C] text-white shadow-xs active:scale-95 transition"
                  >
                    <span>🗺️</span>
                    <span>Directory ({VERIFIED_DIRECTORY_COUNT})</span>
                  </Link>
                  <Link
                    to="/emergency"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/70 active:scale-95 transition"
                  >
                    <span>🚨</span>
                    <span>Helplines</span>
                  </Link>
                  <Link
                    to="/news"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/70 active:scale-95 transition"
                  >
                    <span>📰</span>
                    <span>Updates</span>
                  </Link>
                  <Link
                    to="/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/70 active:scale-95 transition"
                  >
                    <span>ℹ️</span>
                    <span>About Town</span>
                  </Link>
                  <a
                    href="/#regional-connectivity-section"
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, "/#regional-connectivity-section", true);
                    }}
                    className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-800 hover:bg-slate-100 border border-slate-200/70 active:scale-95 transition"
                  >
                    <span>📍</span>
                    <span>Town Map</span>
                  </a>
                  <Link
                    to="/messages"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-200/80 active:scale-95 transition"
                  >
                    <span>💬</span>
                    <span>Chat / संवाद</span>
                  </Link>
                </div>

                {/* Highlighted Banner: Admin Dashboard 🛡️ ADMIN DESK (Strictly Admin-Only) */}
                {isAdmin && (
                  <Link
                    to="/admin/review"
                    onClick={() => setMobileMenuOpen(false)}
                    className="mt-2 w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between bg-amber-100/90 hover:bg-amber-200/90 text-amber-950 border border-amber-300 shadow-2xs active:scale-95 transition"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <span className="font-extrabold">Admin Dashboard</span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-300 text-amber-950 border border-amber-400/80">
                      ADMIN DESK
                    </span>
                  </Link>
                )}
              </div>

              {/* 4.2 Grid layout 2: CIVIC HUBS (9 Colorful Tiles) */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  CIVIC HUBS
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <Link
                    to="/education"
                    onMouseEnter={() => prefetchRoute("/education")}
                    onTouchStart={() => prefetchRoute("/education")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-blue-50/70 hover:bg-blue-100 text-blue-950 flex items-center gap-1.5 border border-blue-200/60 active:scale-95 transition"
                  >
                    <span>🎓</span>
                    <span className="truncate">Education</span>
                  </Link>
                  <Link
                    to="/emergency"
                    onMouseEnter={() => prefetchRoute("/emergency")}
                    onTouchStart={() => prefetchRoute("/emergency")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-rose-50/70 hover:bg-rose-100 text-rose-950 flex items-center gap-1.5 border border-rose-200/60 active:scale-95 transition"
                  >
                    <span>🚨</span>
                    <span className="truncate">Emergency</span>
                  </Link>
                  <Link
                    to="/healthcare"
                    onMouseEnter={() => prefetchRoute("/healthcare")}
                    onTouchStart={() => prefetchRoute("/healthcare")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 flex items-center gap-1.5 border border-emerald-200/60 active:scale-95 transition"
                  >
                    <span>🏥</span>
                    <span className="truncate">Healthcare</span>
                  </Link>
                  <Link
                    to="/jobs"
                    onMouseEnter={() => prefetchRoute("/jobs")}
                    onTouchStart={() => prefetchRoute("/jobs")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-indigo-50/70 hover:bg-indigo-100 text-indigo-950 flex items-center gap-1.5 border border-indigo-200/60 active:scale-95 transition"
                  >
                    <span>💼</span>
                    <span className="truncate">Jobs &amp; Directory</span>
                  </Link>
                  <Link
                    to="/tourism"
                    onMouseEnter={() => prefetchRoute("/tourism")}
                    onTouchStart={() => prefetchRoute("/tourism")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-purple-50/70 hover:bg-purple-100 text-purple-950 flex items-center gap-1.5 border border-purple-200/60 active:scale-95 transition"
                  >
                    <span>🏨</span>
                    <span className="truncate">Tourism</span>
                  </Link>
                  <Link
                    to="/food"
                    onMouseEnter={() => prefetchRoute("/food")}
                    onTouchStart={() => prefetchRoute("/food")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-amber-50/70 hover:bg-amber-100 text-amber-950 flex items-center gap-1.5 border border-amber-200/60 active:scale-95 transition"
                  >
                    <span>🍛</span>
                    <span className="truncate">Food Guide</span>
                  </Link>
                  <Link
                    to="/marketplace"
                    onMouseEnter={() => prefetchRoute("/marketplace")}
                    onTouchStart={() => prefetchRoute("/marketplace")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-orange-50/70 hover:bg-orange-100 text-orange-950 flex items-center gap-1.5 border border-orange-200/60 active:scale-95 transition"
                  >
                    <span>🛍️</span>
                    <span className="truncate">Marketplace</span>
                  </Link>
                  <Link
                    to="/transport"
                    onMouseEnter={() => prefetchRoute("/transport")}
                    onTouchStart={() => prefetchRoute("/transport")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-semibold bg-cyan-50/70 hover:bg-cyan-100 text-cyan-950 flex items-center gap-1.5 border border-cyan-200/60 active:scale-95 transition"
                  >
                    <span>🚌</span>
                    <span className="truncate">Transport</span>
                  </Link>
                  <Link
                    to="/govt"
                    onMouseEnter={() => prefetchRoute("/govt")}
                    onTouchStart={() => prefetchRoute("/govt")}
                    onClick={() => setMobileMenuOpen(false)}
                    className="col-span-2 p-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center gap-1.5 border border-slate-200 active:scale-95 transition"
                  >
                    <span>🏛️</span>
                    <span>Govt Services</span>
                  </Link>
                </div>
              </div>

              {/* Bottom: ✍️ + Add Story & Red Logout Button */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Link
                  to={user ? "/create-news" : "/login"}
                  state={!user ? { from: "/create-news", message: "Please log in to submit a local story." } : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-[#B8323C] hover:bg-red-700 text-white text-xs font-black py-2.5 rounded-xl text-center shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition"
                >
                  <span>✍️</span>
                  <span>+ Add Story / समाचार जोड़ें</span>
                </Link>

                <div className="flex items-center justify-between gap-2">
                  {user ? (
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black py-2 rounded-xl cursor-pointer hover:bg-rose-100 transition active:scale-95"
                    >
                      Logout ({user.role === "admin" ? "Admin" : user.name || "User"})
                    </button>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl text-center hover:bg-slate-100 transition"
                      >
                        Sign In
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-xl text-center shadow-xs hover:bg-slate-800 transition"
                      >
                        Register
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MOBILE NATIVE BOTTOM APP BAR (Fixed at bottom for phones < 640px)
          Provides effortless 1-thumb native app navigation across the portal
          ======================================================== */}
      {!isAdminPage && !isMessagesPage && (
        <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] pb-[max(0.5rem,env(safe-area-inset-bottom))] ${isMobilePreview ? "block" : "sm:hidden"}`}>
          <div className="max-w-[420px] mx-auto w-full px-2 py-1 flex items-center justify-around">
            <NavLink
              to="/"
              end
              onMouseEnter={() => prefetchRoute("/")}
              onTouchStart={() => prefetchRoute("/")}
              onClick={() => {
                if (location.pathname === "/") {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 px-2 rounded-xl transition text-[10px] font-bold touch-manipulation ${
                  isActive && location.pathname === "/"
                    ? "text-[#B8323C]"
                    : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              <Home className="w-5 h-5 mb-0.5" />
              <span>Home</span>
            </NavLink>

            <NavLink
              to="/directory"
              onMouseEnter={() => prefetchRoute("/directory")}
              onTouchStart={() => prefetchRoute("/directory")}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 px-2 rounded-xl transition text-[10px] font-bold relative touch-manipulation ${
                  isActive || location.pathname.startsWith("/directory")
                    ? "text-[#B8323C]"
                    : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              <Compass className="w-5 h-5 mb-0.5" />
              <span>Directory</span>
              <span className="absolute top-1.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#0D5E49]"></span>
            </NavLink>

            <NavLink
              to="/emergency"
              onMouseEnter={() => prefetchRoute("/emergency")}
              onTouchStart={() => prefetchRoute("/emergency")}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 px-2 rounded-xl transition text-[10px] font-bold touch-manipulation ${
                  isActive
                    ? "text-[#B8323C]"
                    : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              <PhoneCall className="w-5 h-5 mb-0.5 text-red-500" />
              <span>24/7 Aid</span>
            </NavLink>

            <NavLink
              to="/news"
              onMouseEnter={() => prefetchRoute("/news")}
              onTouchStart={() => prefetchRoute("/news")}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 px-2 rounded-xl transition text-[10px] font-bold touch-manipulation ${
                  isActive
                    ? "text-[#B8323C]"
                    : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              <Newspaper className="w-5 h-5 mb-0.5" />
              <span>Updates</span>
            </NavLink>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`flex flex-col items-center justify-center min-w-[52px] min-h-[44px] py-1 px-2 rounded-xl transition text-[10px] font-bold cursor-pointer touch-manipulation ${
                mobileMenuOpen
                  ? "text-[#B8323C]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 mb-0.5 text-[#B8323C]" />
              ) : (
                <Menu className="w-5 h-5 mb-0.5" />
              )}
              <span>{mobileMenuOpen ? "Close" : "Menu"}</span>
            </button>
          </div>
        </nav>
      )}

      {/* Global Floating Overlay & Sticky Banner Advertisements (Cancellable) */}
      <Suspense fallback={null}>
        <GlobalFloatingAndStickyAds />
      </Suspense>

      {/* Global Turn-by-Turn GPS Directions Modal */}
      <Suspense fallback={null}>
        <DirectionsModal />
      </Suspense>
    </div>
  );
}