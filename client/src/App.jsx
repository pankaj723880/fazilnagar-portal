

import { useState, useEffect } from "react";
import { Routes, Route, NavLink, Link, useNavigate, useLocation } from "react-router-dom";

// Existing Page Imports
import News from "./pages/News";
import EmergencyHub from "./pages/EmergencyHub";
import HealthcareDirectory from "./pages/HealthcareDirectory";
import EducationHub from "./pages/EducationHub";
import JobsAndBusiness from "./pages/JobsAndBusiness";
import Tourism from "./pages/Tourism";
import FoodGuide from "./pages/FoodGuide";
import Marketplace from "./pages/Marketplace";
import Transportation from "./pages/Transportation";
import GovtServices from "./pages/GovtServices";

// New Auth & Admin Page Imports
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreateNews from "./pages/CreateNews";
import TownPortal from "./pages/TownPortal";
import Directory from "./pages/Directory";
import About from "./pages/About";
import AdminReview from "./pages/AdminReview";

const MAIN_NAV_ITEMS = [
  { path: "/", label: "Home" },
  { path: "/#explore-categories", label: "Explore", isHash: true },
  { path: "/directory", label: "Directory", count: "37" },
  { path: "/#town-map-section", label: "Map", isHash: true },
  { path: "/news", label: "Local Updates" },
  { path: "/#about-fazilnagar-section", label: "About", isHash: true },
];

const DIRECTORY_SUB_NAV = [
  { path: "/directory", label: "Town Directory", icon: "🗺️", badge: "Verified" },
  { path: "/education", label: "Education", icon: "🎓" },
  { path: "/emergency", label: "Emergency", icon: "🚨", badge: "24/7" },
  { path: "/healthcare", label: "Healthcare", icon: "🏥" },
  { path: "/news", label: "News", icon: "📰" },
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
  "/news",
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

  // If on the Town Portal homepage, it renders its own complete 11-section layout
  const isPortalPage =
    location.pathname === "/" ||
    location.pathname === "/town" ||
    location.pathname === "/portal" ||
    location.pathname === "/fazilnagar";

  // Persistent user synchronization from LocalStorage and JWT token
  useEffect(() => {
    const syncUser = () => {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          return;
        } catch (e) {
          // continue to token decode
        }
      }

      if (token) {
        try {
          const payloadBase64 = token.split(".")[1];
          if (payloadBase64) {
            const decoded = JSON.parse(
              atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"))
            );
            if (decoded) {
              const u = {
                id: decoded.id,
                name: decoded.name || decoded.email?.split("@")[0] || "Citizen",
                email: decoded.email,
              };
              setUser(u);
              localStorage.setItem("user", JSON.stringify(u));
              return;
            }
          }
        } catch (err) {
          console.error("Token decode error:", err);
        }
      }

      setUser(null);
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    window.addEventListener("auth-change", syncUser);
    return () => {
      window.removeEventListener("storage", syncUser);
      window.removeEventListener("auth-change", syncUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
    window.dispatchEvent(new Event("storage"));
  };

  if (isPortalPage) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F5F7F8] text-[#18232E] font-sans selection:bg-[#B8323C] selection:text-white">
        <Routes>
          <Route path="/" element={<TownPortal />} />
          <Route path="/town" element={<TownPortal />} />
          <Route path="/portal" element={<TownPortal />} />
          <Route path="/fazilnagar" element={<TownPortal />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#F5F7F8] text-[#18232E] flex flex-col font-sans selection:bg-[#B8323C] selection:text-white">
      {/* Top Alert & User Status Bar - Modern Civic Deep Slate & Crimson */}
      <div className="bg-[#18232E] text-slate-300 text-[11px] font-semibold py-1.5 px-4 flex justify-between items-center border-b border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
          <span className="bg-[#B8323C] text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-xs">
            LIVE CIVIC
          </span>
          <span className="truncate text-slate-300">
            Fazilnagar Town Official Civic & Local Directory Portal (PIN 274401)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="tel:112"
            className="hidden sm:inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-bold whitespace-nowrap"
          >
            <span>📞 Helpline: 112</span>
          </a>
          {user && (
            <span className="text-[#168568] font-bold hidden md:inline">
              👤 Logged in as: {user.name || user.email}
            </span>
          )}
        </div>
      </div>

      {/* Main Header & Navigation - Exact Match to Civic Navbar in Image 1 */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-md border-b border-[#E1E6EA] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-[#18232E] flex items-center justify-center text-white font-extrabold text-base border border-slate-700 shadow-xs group-hover:scale-105 transition-transform">
              F
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight text-[#18232E] leading-none block font-heading">
                FAZIL<span className="text-[#B8323C]">NAGAR</span>
              </span>
              <span className="text-[10px] font-medium text-[#647180] tracking-wider block">
                Your Town. Your Community.
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links - Home, Explore, Directory [37], Map, Local Updates, About */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#18232E]">
            <Link
              to="/"
              className={`transition ${location.pathname === "/" ? "text-[#B8323C] font-bold" : "text-[#647180] hover:text-[#18232E]"}`}
            >
              Home
            </Link>
            <a
              href="/#explore-categories"
              className="text-[#647180] hover:text-[#18232E] transition"
            >
              Explore
            </a>
            <Link
              to="/directory"
              className={`transition flex items-center gap-1 ${location.pathname === "/directory" ? "text-[#B8323C] font-bold" : "text-[#647180] hover:text-[#18232E]"}`}
            >
              <span>Directory</span>
              <span className="text-[9px] bg-[#168568] text-white px-1.5 py-0.2 rounded-full font-bold">37</span>
            </Link>
            <a
              href="/#town-map-section"
              className="text-[#647180] hover:text-[#18232E] transition"
            >
              Map
            </a>
            <Link
              to="/news"
              className={`transition ${location.pathname === "/news" ? "text-[#B8323C] font-bold" : "text-[#647180] hover:text-[#18232E]"}`}
            >
              Local Updates
            </Link>
            <a
              href="/#about-fazilnagar-section"
              className="text-[#647180] hover:text-[#18232E] transition"
            >
              About
            </a>
          </nav>

          {/* Auth & Post Actions Bar */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link
                    to="/admin/review"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold px-3 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
                  >
                    <span>🛡️ Review Desk</span>
                  </Link>
                )}
                <span className="text-xs font-bold text-[#168568] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  {user.role === "admin" ? "👑 Admin: " : "👤 "}
                  {user.name || user.email}
                </span>
                <Link
                  to="/create-news"
                  className="bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs flex items-center gap-1"
                >
                  <span>✍️ Post News</span>
                </Link>
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
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs"
                >
                  Register
                </Link>
                <Link
                  to="/directory"
                  className="bg-[#B8323C] hover:bg-[#991B1B] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs"
                >
                  Explore Town
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Secondary Sub-Navbar - Visible across Directory & all Civic Hub pages */}
        {DIRECTORY_SUB_NAV_PATHS.includes(location.pathname) && (
          <div className="bg-[#FFFFFF] border-t border-[#E1E6EA] py-1.5 px-4 shadow-2xs">
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

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-3 shadow-lg">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>🏛️</span>
                <span>Home</span>
              </Link>
              <a
                href="/#explore-categories"
                onClick={() => setMobileMenuOpen(false)}
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
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>📍</span>
                <span>Map</span>
              </a>
              <Link
                to="/news"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>📰</span>
                <span>Local Updates</span>
              </Link>
              <a
                href="/#about-fazilnagar-section"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
              >
                <span>ℹ️</span>
                <span>About</span>
              </a>
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

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              {user ? (
                <>
                  <Link
                    to="/create-news"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 bg-[#B8323C] text-white text-xs font-bold py-2 rounded-xl text-center shadow-xs"
                  >
                    ✍️ Post News
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Logout
                  </button>
                </>
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
        )}
      </header>

      {/* Main Body Routes */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6">
        <Routes>
          <Route path="/" element={<TownPortal />} />
          <Route path="/news" element={<News />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/local-directory" element={<Directory />} />
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
      </main>

      {/* Footer - Modern Civic Deep Slate with Crimson & Emerald Accents */}
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
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Civic Navigation</h4>
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
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Community Actions</h4>
            <ul className="space-y-1.5">
              <li><Link to="/create-news" className="hover:text-white">Submit Local News</Link></li>
              <li><Link to="/login" className="hover:text-white">Citizen / Reporter Login</Link></li>
              <li><Link to="/register" className="hover:text-white">Register Resident Account</Link></li>
              <li><Link to="/admin/review" className="hover:text-amber-400 text-amber-300 font-bold flex items-center gap-1"><span>🛡️</span> Admin Review Desk</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] font-heading">Emergency Hotline</h4>
            <p className="text-xs text-slate-300">Police Outpost: <strong className="text-[#B8323C]">112</strong></p>
            <p className="text-xs text-slate-300">Ambulance Emergency: <strong className="text-[#168568]">108</strong></p>
            <p className="text-xs text-slate-300">Women Helpline: <strong className="text-amber-400">1090</strong></p>
          </div>
        </div>

        <div className="border-t border-slate-800 py-4 text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} Fazilnagar Town Portal • Modern Civic & Editorial System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}