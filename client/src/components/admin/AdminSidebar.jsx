import { useState } from "react";
import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  Layers,
  Landmark,
  Calendar,
  Compass,
  Newspaper,
  Image as ImageIcon,
  Building2,
  Megaphone,
  Store,
  Users,
  HardDrive,
  ShieldAlert,
  Bell,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Globe,
  Flag,
  FileText,
  CheckSquare,
  Palette,
  Wrench,
  Briefcase,
} from "lucide-react";

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  pendingCount = 0,
  contributionsCount = 0,
  entitiesCount = 19,
  liveAdsCount = 0,
  newsCount = 0,
  civicCount = 0,
  jobsCount = 0,
  isMobileOpen = false,
  setIsMobileOpen = () => {},
  isCollapsed = false,
  setIsCollapsed = () => {},
}) {
  const navGroups = [
    {
      title: "OVERVIEW",
      items: [
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "WEBSITE & CONTENT",
      items: [
        {
          id: "cms-homepage",
          label: "Homepage Content",
          icon: Globe,
          badge: "New CMS",
          badgeColor: "bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold",
        },
        {
          id: "cms-settings",
          label: "Site Settings",
          icon: Settings,
        },
        {
          id: "cms-themes",
          label: "Theme Gallery",
          icon: Palette,
          badge: "12 Themes",
          badgeColor: "bg-amber-950 text-amber-300 border border-amber-800/80 font-bold",
        },
        {
          id: "cms-hero",
          label: "Hero Carousel",
          icon: Layers,
        },
        {
          id: "cms-services",
          label: "Public Services",
          icon: Landmark,
        },
        {
          id: "cms-events",
          label: "Events & Melas",
          icon: Calendar,
        },
        {
          id: "cms-heritage",
          label: "Twin Heritage",
          icon: Compass,
        },
        {
          id: "news-manage",
          label: "News & Reels",
          icon: Newspaper,
          badge: newsCount > 0 ? newsCount : null,
          badgeColor: "bg-slate-700 text-slate-200",
        },
        {
          id: "cms-media",
          label: "Media Library",
          icon: ImageIcon,
        },
      ],
    },
    {
      title: "DIRECTORY MANAGEMENT",
      items: [
        {
          id: "civic-directory",
          label: "Civic Directory Index",
          icon: Store,
          badge: civicCount > 0 ? String(civicCount) : null,
          badgeColor: "bg-blue-950 text-blue-400 border border-blue-800/60 font-bold",
        },
        {
          id: "manage-entities",
          label: "Entities (20)",
          icon: Building2,
          badge: entitiesCount ? String(entitiesCount) : "20",
          badgeColor: "bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold",
        },
        {
          id: "community-places",
          label: "Community Submissions",
          icon: Store,
          badge: pendingCount > 0 ? `${pendingCount} New` : "New",
          badgeColor: "bg-amber-500 text-slate-950 font-black",
        },
        {
          id: "ads",
          label: "Advertisements",
          icon: Megaphone,
          badge: liveAdsCount > 0 ? `${liveAdsCount} live` : null,
          badgeColor: "bg-blue-950 text-blue-300 border border-blue-800/60",
        },
        {
          id: "jobs-manage",
          label: "Jobs & Careers",
          icon: Briefcase,
          badge: jobsCount > 0 ? `${jobsCount} active` : "Portal",
          badgeColor: "bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-bold",
        },
        {
          id: "manage-users",
          label: "Users & Accounts",
          icon: Users,
        },
        {
          id: "drive",
          label: "Google Drive Storage",
          icon: HardDrive,
        },
      ],
    },
    {
      title: "PUBLIC CONTRIBUTIONS",
      items: [
        {
          id: "form-builder",
          label: "Dynamic Form Builder",
          icon: FileText,
        },
        {
          id: "contributions-review",
          label: "Contribution Review",
          icon: CheckSquare,
          badge: contributionsCount > 0 ? `${contributionsCount} New` : null,
          badgeColor: "bg-amber-500 text-slate-950 font-black",
        },
      ],
    },
    {
      title: "SECURITY",
      items: [
        {
          id: "notifications-manage",
          label: "Notifications",
          icon: Bell,
          badge: "New",
          badgeColor: "bg-blue-900 text-blue-300 border border-blue-700/60 font-bold",
        },
        {
          id: "moderation-reports",
          label: "Citizen Moderation",
          icon: Flag,
        },
        {
          id: "cms-audit",
          label: "Audit Logs",
          icon: ShieldAlert,
        },
        {
          id: "maintenance",
          label: "Maintenance Mode",
          icon: Wrench,
          badge: "Live Control",
          badgeColor: "bg-rose-950 text-rose-300 border border-rose-800/80 font-bold",
        },
      ],
    },
  ];


  const handleSelect = (id) => {
    if (typeof setActiveTab === "function") {
      setActiveTab(id);
    }
    if (typeof setIsMobileOpen === "function" && isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between text-slate-300 font-sans select-none bg-[#111827]">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#1E293B] bg-[#0B0F19]">
          <Link
            to="/admin/review"
            onClick={() => handleSelect("dashboard")}
            className="flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-slate-700/80 flex items-center justify-center text-white shadow-md font-bold text-base shrink-0 group-hover:scale-105 transition">
              🏛️
            </div>
            {!isCollapsed && (
              <div className="leading-tight">
                <div className="text-sm font-extrabold text-white tracking-wide flex items-center gap-1 font-heading">
                  <span>FAZIL<span className="text-[#B8323C]">NAGAR</span></span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Civic Portal CMS
                </span>
              </div>
            )}
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden w-8 h-8 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-8.5rem)] civic-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-black tracking-wider text-slate-400 uppercase">
                  {group.title}
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      title={isCollapsed ? item.label : undefined}
                      className={`w-full flex items-center ${
                        isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
                      } rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer group relative ${
                        isActive
                          ? "bg-[#1E293B] text-white shadow-xs font-black border-l-4 border-[#B8323C]"
                          : "text-slate-300 hover:bg-[#1E293B]/70 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? "text-[#B8323C]"
                              : "text-slate-400 group-hover:text-slate-200"
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!isCollapsed && item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.badgeColor || "bg-slate-800 text-slate-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip on collapsed desktop view */}
                      {isCollapsed && (
                        <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Toggle & Public Site Link */}
      <div className="p-3 border-t border-[#1E293B] bg-[#0B0F19] space-y-2">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className={`flex items-center ${
            isCollapsed ? "justify-center p-2" : "justify-between px-3 py-2"
          } rounded-xl text-xs font-bold text-slate-300 hover:bg-[#1E293B] hover:text-white transition group`}
          title="Open Public Town Portal in New Tab"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🌐</span>
            {!isCollapsed && <span>View Public Site</span>}
          </div>
          {!isCollapsed && <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />}
        </a>

        {/* Desktop Collapse/Expand Control */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`hidden lg:flex w-full items-center ${
            isCollapsed ? "justify-center" : "justify-between px-3"
          } py-1.5 rounded-xl text-[11px] font-bold text-slate-400 hover:bg-[#1E293B] hover:text-slate-200 transition cursor-pointer`}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {!isCollapsed && <span>Collapse Sidebar</span>}
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:block fixed top-0 bottom-0 left-0 z-30 transition-all duration-200 border-r border-[#1E293B] shadow-md ${
          isCollapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (with Backdrop) */}
      {isMobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-[100] flex animate-in fade-in duration-200"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-[#111827]/80 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close sidebar backdrop"
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
