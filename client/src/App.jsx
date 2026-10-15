import { useState, useEffect, lazy, Suspense } from "react";
import { Routes, Route, NavLink, Link, useNavigate, useLocation } from "react-router-dom";

import TownPortal from "./pages/TownPortal";
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
const AdminReview = lazy(() => import("./pages/AdminReview"));
import InstallButton from "./components/InstallButton";
import DirectionsModal from "./components/DirectionsModal";
import NotificationCenter from "./components/NotificationCenter";
import { GlobalFloatingAndStickyAds } from "./components/AdvertisementSlot";
import { Home, Compass, PhoneCall, Newspaper, Menu, X, ShieldAlert } from "lucide-react";

const MAIN_NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/#explore-categories", label: "Explore", isHash: true },
  { path: "/directory", label: "Directory", count: "37" },
  { path: "/#town-map-section", label: "Map", isHash: true },
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

  const hasSubNav = DIRECTORY_SUB_NAV_PATHS.includes(location.pathname) && !isNewsPage;
  const isAdmin = Boolean(user && (user.role === "admin" || user.email === "pankaj723880@gmail.com")) || isUserAdmin();

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
    getSiteSettings(true).then((s) => {
      if (s) setSiteSettings(s);
    });

    const unsubscribe = subscribeToCMSLiveUpdates(() => {
      getSiteSettings(true).then((s) => {
        if (s) setSiteSettings(s);
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = () => {
    performLogout();
    setUser(null);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F5F7F8] text-[#18232E] flex flex-col font-sans selection:bg-[#B8323C] selection:text-white">
      {/* ========================================================
          PERMANENT FIXED TOP SHELL (Desktop / Non-Portal Pages)
          ======================================================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-[#FFFFFF] shadow-xs ${isPortalPage || isMobilePreview ? "hidden md:block" : ""}`}>
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
              <NotificationCenter />

              {/* Admin Review Desk Icon-Only Control (Exactly ONE on desktop) */}
              {isAdmin && (
                <Link
                  to="/admin/review"
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                    location.pathname.startsWith("/admin")
                      ? "bg-amber-600 text-white border-amber-600 shadow-amber-900/20"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300"
                  }`}
                  aria-label="Review Desk"
                  title="Review Desk"
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

            {/* Mobile Actions: Notification Bell + Review Desk + Add Story (Icon-Only Controls) */}
            <div className="flex sm:hidden items-center gap-1.5">
              <NotificationCenter />
              {isAdmin && (
                <Link
                  to="/admin/review"
                  className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl border flex items-center justify-center transition shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer ${
                    location.pathname.startsWith("/admin")
                      ? "bg-amber-600 text-white border-amber-600 shadow-amber-900/20"
                      : "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300"
                  }`}
                  aria-label="Review Desk"
                  title="Review Desk"
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

        {/* Mobile Navigation Dropdown (Triggered from bottom navbar Menu) */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-3 shadow-lg">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Install on Device</span>
              <InstallButton compact={false} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/"
                onClick={() => {
                  setMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>🏛️</span>
                <span>Home</span>
              </Link>
              <a
                href="/#explore-categories"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavClick(e, "/#explore-categories", true);
                }}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>🔍</span>
                <span>Explore</span>
              </a>
              <Link
                to="/directory"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-[#B8323C] text-white shadow-sm"
              >
                <span>🗺️</span>
                <span>Directory (37)</span>
              </Link>
              <a
                href="/#town-map-section"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleNavClick(e, "/#town-map-section", true);
                }}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>📍</span>
                <span>Map</span>
              </a>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>ℹ️</span>
                <span>About</span>
              </Link>
            </div>

            {/* Mobile Civic Hubs Shortcuts */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Civic Hubs
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {DIRECTORY_SUB_NAV.slice(1).map((hub) => (
                  <Link
                    key={hub.path}
                    to={hub.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-1.5"
                  >
                    <span>{hub.icon}</span>
                    <span className="truncate">{hub.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Direct Add Story Button for All Users */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Link
                to={user ? "/create-news" : "/login"}
                state={!user ? { from: "/create-news", message: "Please log in to submit a local story." } : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full bg-[#B8323C] hover:bg-red-700 text-white text-xs font-black py-2.5 rounded-xl text-center shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>✍️</span>
                <span>+ Add News Story / समाचार जोड़ें</span>
              </Link>

              <div className="flex items-center justify-between gap-2">
                {user ? (
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full bg-slate-100 text-slate-700 text-xs font-bold py-2 rounded-xl"
                  >
                    Logout
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold py-2 rounded-xl text-center"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex-1 bg-slate-900 text-white text-xs font-bold py-2 rounded-xl text-center shadow-xs"
                    >
                      Register
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================
          MAIN BODY: Dynamic Top Padding (Starts exactly below fixed navbar)
          WITH SMOOTH ROUTE TRANSITIONS (animate-page-enter)
          ======================================================== */}
      <main
        className={`flex-1 w-full ${
          isNewsPage
            ? "pt-16 sm:pt-[96px] pb-14 sm:pb-0 p-0 m-0 overflow-hidden"
            : isPortalPage
            ? (isMobilePreview ? "pt-0 pb-16" : "pt-0 md:pt-[96px] pb-16 sm:pb-8")
            : hasSubNav
            ? "pt-[110px] sm:pt-[144px] pb-24 sm:pb-8 max-w-7xl mx-auto px-3 sm:px-6"
            : "pt-[76px] sm:pt-[112px] pb-24 sm:pb-8 max-w-7xl mx-auto px-3 sm:px-6"
        }`}
      >
        <div key={location.pathname} className={isNewsPage ? "h-full w-full" : isPortalPage ? "w-full" : "animate-page-enter"}>
          <Suspense
            fallback={
              <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 gap-3">
                <div className="w-8 h-8 border-3 border-[#B8323C] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-medium">Loading civic section...</span>
              </div>
            }
          >
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

              {/* Auth & Admin Routes */}
              <Route path="/login" element={<Login setUser={setUser} />} />
              <Route path="/register" element={<Register setUser={setUser} />} />
              <Route path="/create-news" element={<CreateNews user={user} />} />
              <Route path="/upload" element={<CreateNews user={user} />} />
              <Route path="/admin/review" element={<AdminReview user={user} />} />
              <Route path="/admin" element={<AdminReview user={user} />} />
            </Routes>
          </Suspense>
        </div>
      </main>

      {/* ========================================================
          FOOTER - Modern Civic Deep Slate with Crimson & Emerald Accents
          (Hidden on /news full-screen reels page and TownPortal homepage which has its own footer)
          ======================================================== */}
      {!isNewsPage && !isPortalPage && (
        <footer className="bg-[#18232E] text-slate-400 text-xs mt-12 border-t border-slate-800 pb-16 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <h3 className="text-white font-extrabold text-base tracking-tight font-heading">
                FAZIL<span className="text-[#B8323C]">NAGAR</span> Civic Portal
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Fazilnagar's civic digital platform offering verified town directory, emergency helplines, public utilities, and community updates (PIN 274401, Kushinagar, UP).
              </p>
              <div className="flex items-center gap-2 pt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-[#168568] animate-pulse"></span>
                <span className="text-[11px] font-semibold text-[#168568]">Verified Town Directory System</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Civic Navigation</h3>
              <ul className="space-y-1.5">
                <li><Link to="/directory" className="hover:text-red-300 font-bold text-[#B8323C] flex items-center gap-1.5"><span>📍</span> Town Directory (Map & List)</Link></li>
                <li><Link to="/news" className="hover:text-white">Town News</Link></li>
                <li><Link to="/emergency" className="hover:text-white">Emergency Helplines</Link></li>
                <li><Link to="/healthcare" className="hover:text-white">Hospitals & Clinics</Link></li>
                <li><Link to="/jobs" className="hover:text-white">Local Jobs & Trade</Link></li>
                <li><Link to="/govt" className="hover:text-white">Government Services</Link></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Community Actions</h3>
              <ul className="space-y-1.5">
                <li><Link to="/create-news" className="hover:text-white">Submit Local News</Link></li>
                <li><Link to="/login" className="hover:text-white">Citizen / Reporter Login</Link></li>
                <li><Link to="/register" className="hover:text-white">Register Resident Account</Link></li>
                {user?.role === "admin" && (
                  <li><Link to="/admin/review" className="hover:text-amber-400 text-amber-300 font-bold flex items-center gap-1"><span>🛡️</span> Admin Review Desk</Link></li>
                )}
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Emergency Hotline</h3>
              <p className="text-xs text-slate-300">Police Outpost: <strong className="text-[#B8323C]">112</strong></p>
              <p className="text-xs text-slate-300">Ambulance Emergency: <strong className="text-[#0D5E49]">108</strong></p>
              <p className="text-xs text-slate-300">Women Helpline: <strong className="text-amber-400">1090</strong></p>
            </div>
          </div>

          <div className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-400">
            © {new Date().getFullYear()} Fazilnagar Town Portal • Modern Civic & Editorial System. All rights reserved.
          </div>
        </footer>
      )}

      {/* ========================================================
          MOBILE NATIVE BOTTOM APP BAR (Fixed at bottom for phones < 640px)
          Provides effortless 1-thumb native app navigation across the portal
          ======================================================== */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.07)] pb-[max(0.5rem,env(safe-area-inset-bottom))] ${isMobilePreview ? "block" : "sm:hidden"}`}>
        <div className="max-w-[420px] mx-auto w-full px-2 py-1 flex items-center justify-around">
          <NavLink
            to="/"
            end
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

      {/* Global Floating Overlay & Sticky Banner Advertisements (Cancellable) */}
      <GlobalFloatingAndStickyAds />

      {/* Global Turn-by-Turn GPS Directions Modal */}
      <DirectionsModal />
    </div>
  );
}