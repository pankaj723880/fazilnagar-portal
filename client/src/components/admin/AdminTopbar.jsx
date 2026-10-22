import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Menu,
  Search,
  Bell,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Clock,
  ShieldCheck,
  Settings,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Compass,
  Building2,
  Newspaper,
  Calendar,
  Layers,
  Megaphone,
  LayoutDashboard,
  Users,
  HardDrive,
  Wrench,
} from "lucide-react";

export default function AdminTopbar({
  activeTab,
  setActiveTab,
  onToggleSidebar = () => {},
  isCollapsed = false,
  currentUser = null,
  onLogout = () => {},
  pendingCount: propPendingCount,
  pendingSubmissions = [],
  onRefresh = () => {},
  loading = false,
  onOpenCreateAd,
  onOpenCreateNews,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  const handleTabChange = (tabId) => {
    if (typeof setActiveTab === "function") {
      setActiveTab(tabId);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl + K / Cmd + K to focus search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === "Escape") {
        setSearchFocused(false);
        searchInputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute Breadcrumb based on active tab
  const getBreadcrumb = () => {
    switch (activeTab) {
      case "dashboard":
        return { group: "Overview", label: "Dashboard" };
      case "cms-settings":
        return { group: "Website & Content", label: "Site Settings" };
      case "cms-hero":
        return { group: "Website & Content", label: "Hero Carousel" };
      case "cms-services":
        return { group: "Website & Content", label: "Public Services" };
      case "cms-events":
        return { group: "Website & Content", label: "Events & Melas" };
      case "cms-heritage":
        return { group: "Website & Content", label: "Twin Heritage" };
      case "news-manage":
        return { group: "Website & Content", label: "News & Reels" };
      case "cms-media":
        return { group: "Website & Content", label: "Media Library" };
      case "manage-entities":
        return { group: "Directory Management", label: "Entities (19)" };
      case "ads":
        return { group: "Directory Management", label: "Advertisements" };
      case "community-places":
        return { group: "Directory Management", label: "Community Submissions" };
      case "manage-users":
        return { group: "Directory Management", label: "Users & Accounts" };
      case "drive":
        return { group: "Directory Management", label: "Google Drive Storage" };
      case "cms-audit":
        return { group: "Security & Administration", label: "Audit Logs" };
      case "maintenance":
      case "cms-maintenance":
        return { group: "Security & Administration", label: "Maintenance Mode" };
      default:
        return { group: "Administration", label: activeTab };
    }
  };

  const breadcrumb = getBreadcrumb();
  const pendingCount =
    typeof propPendingCount === "number"
      ? propPendingCount
      : pendingSubmissions.filter((s) => s.status === "pending").length;

  // Search shortcuts index
  const quickJumpModules = [
    { label: "Dashboard", tab: "dashboard", group: "Overview", icon: LayoutDashboard },
    { label: "Site Settings", tab: "cms-settings", group: "Website & Content", icon: Settings },
    { label: "Maintenance Mode", tab: "maintenance", group: "Security & Administration", icon: Wrench },
    { label: "Hero Carousel", tab: "cms-hero", group: "Website & Content", icon: Layers },
    { label: "Public Services", tab: "cms-services", group: "Website & Content", icon: Compass },
    { label: "Ad Registry", tab: "ads", group: "Directory Management", icon: Megaphone },
    { label: "Entities (19)", tab: "manage-entities", group: "Directory Management", icon: Building2 },
    { label: "News & Reels", tab: "news-manage", group: "Website & Content", icon: Newspaper },
    { label: "Submissions", tab: "community-places", group: "Directory Management", icon: ShieldCheck },
    { label: "Events & Melas", tab: "cms-events", group: "Website & Content", icon: Calendar },
    { label: "Twin Heritage", tab: "cms-heritage", group: "Website & Content", icon: Compass },
    { label: "Media Library", tab: "cms-media", group: "Website & Content", icon: Sparkles },
    { label: "Users & Accounts", tab: "manage-users", group: "Directory Management", icon: Users },
    { label: "Google Drive", tab: "drive", group: "Directory Management", icon: HardDrive },
    { label: "Audit Logs", tab: "cms-audit", group: "Security & Administration", icon: ShieldCheck },
  ];

  const searchResults = searchQuery.trim()
    ? quickJumpModules.filter(
        (m) =>
          m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.group.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="sticky top-0 z-30">
      {/* SECTION 1: COMMON ADMIN HEADER (Sticky, 54px h) */}
      <header className="h-[54px] bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-3 sm:px-4 flex items-center justify-between shadow-2xs">
        {/* Left: Hamburger Menu trigger (for mobile), Brand mark [F], and Admin ⚙️ badge */}
        <div className="flex items-center gap-2 min-w-0">
          {/* Mobile Explicit Sidebar Drawer Button with Hamburger Icon */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 -ml-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#111827] flex items-center justify-center active:scale-95 transition cursor-pointer shrink-0"
            title="Open Admin Sidebar Navigation"
            aria-label="Open Admin Sidebar Navigation"
          >
            <Menu className="w-5 h-5 text-[#111827]" />
          </button>

          <button
            type="button"
            onClick={onToggleSidebar}
            className="w-8 h-8 rounded-xl bg-[#111827] hover:bg-[#1E293B] text-white font-black text-sm flex items-center justify-center shadow-xs active:scale-95 transition cursor-pointer shrink-0"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            F
          </button>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-extrabold text-[14px] text-[#111827] tracking-tight font-heading truncate">
              FAZIL<span className="text-[#B8323C]">NAGAR</span>
            </span>
            <span className="text-[10px] font-bold text-[#1E293B] bg-slate-100 border border-[#E5E7EB] px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
              Admin ⚙️
            </span>
          </div>
        </div>

        {/* Right: Notification Bell with alert dot and tiny red Logout button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Action Button */}
          <button
            onClick={() => {
              if (typeof onRefresh === "function") onRefresh();
            }}
            disabled={loading}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#111827] hover:bg-slate-100 transition cursor-pointer"
            title="Refresh Data"
            aria-label="Refresh Data from Server"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#B8323C]" : ""}`} />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setNotifDropdownOpen((prev) => !prev)}
              className="relative p-1.5 rounded-lg text-[#64748B] hover:text-[#111827] hover:bg-slate-100 transition cursor-pointer"
              title="Notifications & Review Queue"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {pendingCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#B8323C] animate-pulse" />
              )}
            </button>

            {notifDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-[#E5E7EB] overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-[#E5E7EB] flex items-center justify-between">
                  <span className="font-extrabold text-[#111827]">Review Queue</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {pendingCount} Pending
                  </span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#E5E7EB]">
                  {pendingSubmissions.length === 0 ? (
                    <div className="p-6 text-center text-[#64748B]">
                      <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-1.5" />
                      <p className="font-semibold text-[#111827]">Queue is clear</p>
                      <p className="text-[11px] text-[#64748B]">All submissions have been verified.</p>
                    </div>
                  ) : (
                    pendingSubmissions.slice(0, 6).map((sub) => (
                      <div
                        key={sub._id || sub.id}
                        onClick={() => {
                          handleTabChange("community-places");
                          setNotifDropdownOpen(false);
                        }}
                        className="p-3 hover:bg-[#F8FAFC] transition cursor-pointer flex items-start gap-2.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#111827] truncate">
                            {sub.title || sub.name || "Place Submission"}
                          </p>
                          <p className="text-[10px] text-[#64748B]">
                            {sub.category || "Listing"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logout button */}
          <button
            onClick={() => {
              if (typeof onLogout === "function") onLogout();
            }}
            className="text-[#B8323C] hover:text-[#991B1B] active:scale-95 text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-red-50 transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Breadcrumb Area (Immediately below header, 32px h) */}
      <div className="h-8 bg-[#F8FAFC] border-b border-[#E5E7EB] px-3 sm:px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] truncate">
          <span className="font-medium text-slate-400 hidden sm:inline">Fazilnagar Portal</span>
          <span className="text-slate-300 hidden sm:inline">/</span>
          <span className="font-semibold text-[#1E293B] truncate">{breadcrumb.group || "Website"}</span>
          <span className="text-slate-300">/</span>
          <span className="font-extrabold text-[#111827] truncate">{breadcrumb.label}</span>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[11px] font-bold text-[#B8323C] hover:text-[#991B1B] shrink-0 cursor-pointer pl-2"
          title="Open Public Town Portal in New Tab"
        >
          <span>View Website</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Mobile Fast-Switch Module Ribbon (lg:hidden) */}
      <div className="lg:hidden bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xs">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#111827] text-white flex items-center shrink-0 active:scale-95 transition shadow-xs cursor-pointer"
        >
          <span>All Modules</span>
        </button>
        {quickJumpModules.map((item) => {
          const isActive = activeTab === item.tab || (item.tab === "dashboard" && (activeTab === "overview" || !activeTab));
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => handleTabChange(item.tab)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition active:scale-95 cursor-pointer ${
                isActive
                  ? "bg-[#111827] text-white shadow-xs font-black border-b-2 border-[#B8323C]"
                  : "bg-slate-100 text-[#1E293B] hover:bg-slate-200 border border-[#E5E7EB]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
