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
} from "lucide-react";

export default function AdminTopbar({
  activeTab,
  setActiveTab,
  onToggleSidebar = () => {},
  isCollapsed = false,
  currentUser = null,
  onLogout = () => {},
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
      default:
        return { group: "Administration", label: activeTab };
    }
  };

  const breadcrumb = getBreadcrumb();
  const pendingCount = pendingSubmissions.filter((s) => s.status === "pending").length;

  // Search shortcuts index
  const quickJumpModules = [
    { label: "Site Settings", tab: "cms-settings", group: "Website & Content", icon: Settings },
    { label: "Hero Carousel", tab: "cms-hero", group: "Website & Content", icon: Layers },
    { label: "Public Services", tab: "cms-services", group: "Website & Content", icon: Compass },
    { label: "Events & Melas", tab: "cms-events", group: "Website & Content", icon: Calendar },
    { label: "Twin Heritage (Pawa & Kushinagar)", tab: "cms-heritage", group: "Website & Content", icon: Compass },
    { label: "News & Reels Studio", tab: "news-manage", group: "Website & Content", icon: Newspaper },
    { label: "Media Library", tab: "cms-media", group: "Website & Content", icon: Sparkles },
    { label: "Entities (19 Verified)", tab: "manage-entities", group: "Directory Management", icon: Building2 },
    { label: "Community Submissions", tab: "community-places", group: "Directory Management", icon: ShieldCheck },
    { label: "Homepage Advertisements", tab: "ads", group: "Directory Management", icon: Megaphone },
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
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200/90 shadow-2xs px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Sidebar Toggle + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-2 text-xs truncate">
          <span className="font-semibold text-slate-400">Fazilnagar Portal</span>
          <span className="text-slate-300">/</span>
          <span className="font-medium text-slate-500">{breadcrumb.group}</span>
          <span className="text-slate-300">/</span>
          <span className="font-extrabold text-[#18232E] truncate">{breadcrumb.label}</span>
        </nav>
      </div>

      {/* Middle: Global Quick Search with Command Palette */}
      <div className="flex-1 max-w-md hidden md:block" ref={searchContainerRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder="Search portal modules (press Ctrl + K)..."
            className="w-full pl-9 pr-14 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition outline-none"
          />
          <div className="absolute right-2.5 top-2 flex items-center">
            <kbd className="text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded shadow-2xs">
              Ctrl + K
            </kbd>
          </div>

          {/* Quick jump search dropdown */}
          {searchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{searchQuery ? "Search Results" : "Quick Module Jump"}</span>
                <span className="text-[10px] font-normal text-slate-400">Press ESC to close</span>
              </div>
              <div className="max-h-64 overflow-y-auto p-1 space-y-0.5">
                {(searchQuery ? searchResults : quickJumpModules.slice(0, 6)).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.tab}
                      onClick={() => {
                        handleTabChange(item.tab);
                        setSearchFocused(false);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-slate-800">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {item.group}
                      </span>
                    </button>
                  );
                })}
                {searchQuery && searchResults.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No matching modules found for "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions, Refresh, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Refresh Action Button */}
        <button
          onClick={() => {
            if (typeof onRefresh === "function") onRefresh();
          }}
          disabled={loading}
          className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          title="Refresh Data from Server"
          aria-label="Refresh Data from Server"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
        </button>

        {/* View Public Site (Desktop) */}
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition"
          title="Open Public Town Portal in New Tab"
        >
          <span>View Website</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifDropdownOpen((prev) => !prev)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            title="Notifications & Review Queue"
            aria-label="Notifications & Review Queue"
          >
            <Bell className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center border-2 border-white shadow-2xs">
                {pendingCount}
              </span>
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="font-extrabold text-[#18232E]">Review Queue Notifications</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {pendingCount} Pending
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {pendingSubmissions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-1.5" />
                    <p className="font-semibold text-slate-700">Review queue is clear!</p>
                    <p className="text-[11px] text-slate-400">All citizen submissions have been audited.</p>
                  </div>
                ) : (
                  pendingSubmissions.slice(0, 6).map((sub) => (
                    <div
                      key={sub._id || sub.id}
                      onClick={() => {
                        handleTabChange("community-places");
                        setNotifDropdownOpen(false);
                      }}
                      className="p-3 hover:bg-slate-50 transition cursor-pointer flex items-start gap-2.5"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#18232E] truncate">
                          {sub.title || sub.name || "Place Submission"}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {sub.category || "Listing"} •{" "}
                          {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : "Recent"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {pendingSubmissions.length > 0 && (
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      handleTabChange("community-places");
                      setNotifDropdownOpen(false);
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    Open Community Review Desk ({pendingSubmissions.length} Total) →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Admin Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#2563EB] to-indigo-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
              {(currentUser?.name || currentUser?.email || "Admin")[0].toUpperCase()}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <span className="text-xs font-bold text-[#18232E] block truncate max-w-[110px]">
                {currentUser?.name || "Town Admin"}
              </span>
              <span className="text-[10px] text-slate-400 block truncate max-w-[110px]">
                {currentUser?.email || "admin@fazilnagar.com"}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[260px] sm:w-60 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 text-xs animate-in fade-in slide-in-from-top-2">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Civic Administrator
                </span>
                <p className="font-extrabold text-[#18232E] truncate mt-0.5">
                  {currentUser?.email || "admin@fazilnagar.com"}
                </p>
                <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>Authorized Official</span>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => {
                    handleTabChange("cms-settings");
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Portal Settings</span>
                </button>

                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold cursor-pointer text-left"
                >
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <span>View Public Portal</span>
                </a>

                <div className="border-t border-slate-100 my-1" />

                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    if (typeof onLogout === "function") onLogout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold cursor-pointer text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
