import { useState, useEffect } from "react";
import API from "../../api";
import { getAuthToken } from "../../utils/authStorage";
import StatCard from "./StatCard";
import PageHeader from "./PageHeader";
import StatusBadge from "./StatusBadge";
import EmptyState from "./EmptyState";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";
import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  Newspaper,
  Clock,
  Plus,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  UploadCloud,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Store,
  ShieldCheck,
  Activity,
  ArrowRight,
  Settings,
} from "lucide-react";

export default function AdminDashboardOverview({
  setActiveTab,
  onNavigateTab,
  stats = {},
  onOpenCreateAd,
  onOpenCreateNews,
  onRefresh = () => {},
  loading = false,
}) {
  const navigateTab = (tab) => {
    if (typeof setActiveTab === "function") {
      setActiveTab(tab);
    } else if (typeof onNavigateTab === "function") {
      onNavigateTab(tab);
    }
  };

  const handleOpenCreateAd = () => {
    if (typeof onOpenCreateAd === "function") {
      onOpenCreateAd();
    } else {
      navigateTab("ads");
    }
  };

  const handleOpenCreateNews = () => {
    if (typeof onOpenCreateNews === "function") {
      onOpenCreateNews();
    } else {
      navigateTab("news-manage");
    }
  };

  const [recentLogs, setRecentLogs] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const [errorExtras, setErrorExtras] = useState(null);

  useEffect(() => {
    fetchExtras();
  }, []);

  const fetchExtras = async () => {
    setLoadingExtras(true);
    setErrorExtras(null);
    const token = getAuthToken();

    try {
      // 1. Fetch recent audit logs
      const logRes = await API.get("/audit?limit=6", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch((err) => {
        console.warn("Audit log fetch error:", err);
        return null;
      });

      if (logRes?.data?.success && Array.isArray(logRes.data?.logs)) {
        setRecentLogs(logRes.data.logs.slice(0, 6));
      }

      // 2. Fetch upcoming events
      const evtRes = await API.get("/events?timeFilter=upcoming&limit=4").catch(() => null);
      if (evtRes?.data?.success && Array.isArray(evtRes.data?.events)) {
        setUpcomingEvents(evtRes.data.events.slice(0, 4));
      }

      // 3. Fetch pending submissions for quick review queue
      const subRes = await API.get("/submissions/places/admin?status=pending", {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);

      if (Array.isArray(subRes?.data)) {
        setPendingItems(subRes.data.slice(0, 5));
      }
    } catch (err) {
      console.warn("Dashboard extras warning:", err);
      setErrorExtras("Some live dashboard signals could not be refreshed.");
    } finally {
      setLoadingExtras(false);
    }
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const sec = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (sec < 60) return "Just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Quick Actions */}
      <PageHeader
        title="Civic Administration Dashboard"
        description="Comprehensive overview of town directory listings, live homepage announcements, moderation queues, and municipal content updates."
        icon={LayoutDashboard}
        actions={
          <>
            <button
              onClick={() => {
                if (typeof onRefresh === "function") onRefresh();
                fetchExtras();
              }}
              disabled={loading || loadingExtras}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Refresh live portal stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingExtras ? "animate-spin text-blue-600" : ""}`} />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>

            <button
              onClick={handleOpenCreateAd}
              className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>+ New Ad</span>
            </button>

            <button
              onClick={handleOpenCreateNews}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Story</span>
            </button>
          </>
        }
      />

      {/* PHASE 4 METRICS: 5 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Official Verified Entities */}
        <StatCard
          label="Verified Entities"
          value={stats.entitiesCount || 19}
          icon={Building2}
          color="emerald"
          subtitle="PIN 274401 Official Registry"
          onClick={() => navigateTab("manage-entities")}
          loading={loading}
        />

        {/* Metric 2: Pending Citizen Review Queue */}
        <StatCard
          label="Pending Review"
          value={stats.pendingSubmissionsCount || 0}
          icon={Clock}
          color={stats.pendingSubmissionsCount > 0 ? "amber" : "blue"}
          subtitle={
            stats.pendingSubmissionsCount > 0
              ? "Requires Admin Audit"
              : "Queue is fully clear"
          }
          onClick={() => navigateTab("community-places")}
          loading={loading}
        />

        {/* Metric 3: Live Advertisements */}
        <StatCard
          label="Live Advertisements"
          value={stats.liveAdsCount || 0}
          icon={Megaphone}
          color="purple"
          subtitle={`${stats.totalAdsCount || 0} total scheduled ads`}
          onClick={() => navigateTab("ads")}
          loading={loading}
        />

        {/* Metric 4: Published News & Reels */}
        <StatCard
          label="Published News"
          value={stats.publishedNewsCount || 0}
          icon={Newspaper}
          color="blue"
          subtitle={`${stats.totalNewsCount || 0} stories in registry`}
          onClick={() => navigateTab("news-manage")}
          loading={loading}
        />

        {/* Metric 5: Registered Users & Citizens */}
        <StatCard
          label="Registered Users"
          value={stats.usersCount ?? 0}
          icon={Users}
          color="indigo"
          subtitle="Citizen & Reporter accounts"
          onClick={() => navigateTab("manage-users")}
          loading={loading}
        />
      </div>

      {/* QUICK ACTIONS BAR */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Administrative Quick Actions
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Direct Module Launchers</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          <button
            onClick={handleOpenCreateAd}
            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition group cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-purple-600 mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#18232E] block">New Ad</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Floating/Banner</span>
          </button>

          <button
            onClick={handleOpenCreateNews}
            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition group cursor-pointer"
          >
            <Newspaper className="w-4 h-4 text-emerald-600 mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#18232E] block">New Story</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Publish bulletin</span>
          </button>

          <button
            onClick={() => navigateTab("cms-events")}
            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition group cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-amber-600 mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#18232E] block">Add Event</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Melas & festivals</span>
          </button>

          <button
            onClick={() => navigateTab("manage-entities")}
            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition group cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-blue-600 mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#18232E] block">Add Entity</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Town registry</span>
          </button>

          <button
            onClick={() => navigateTab("cms-settings")}
            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition group cursor-pointer"
          >
            <Settings className="w-4 h-4 text-indigo-600 mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#18232E] block">Manage Site</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">12 sections & ticker</span>
          </button>

          <button
            onClick={() => navigateTab("cms-media")}
            className="p-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-left transition group cursor-pointer"
          >
            <UploadCloud className="w-4 h-4 text-cyan-600 mb-2 group-hover:scale-110 transition" />
            <span className="text-xs font-bold text-[#18232E] block">Upload Media</span>
            <span className="text-[10px] text-slate-400 block mt-0.5">10MB CDN Assets</span>
          </button>
        </div>
      </div>

      {/* SPLIT WORKSPACE: Moderation Review Queue & Live Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Citizen Review Queue */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#18232E]">
                  Pending Citizen Submissions Queue
                </h3>
                <p className="text-[11px] text-slate-500">
                  New community places and corrections waiting for verification
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateTab("community-places")}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingExtras ? (
            <div className="space-y-3 py-4">
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          ) : pendingItems.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Review Queue is Clear"
              description="No unverified community listings or submissions pending administrator review."
            />
          ) : (
            <div className="space-y-2.5">
              {pendingItems.map((item) => (
                <div
                  key={item._id || item.id}
                  onClick={() => navigateTab("community-places")}
                  className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/30 transition flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-[#18232E] truncate">
                        {item.title || item.name}
                      </span>
                      <StatusBadge status="pending" size="sm" />
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span>{item.category || "Listing"}</span>
                      <span>•</span>
                      <span>{item.locality || "Fazilnagar"}</span>
                      <span>•</span>
                      <span>{timeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-amber-700 bg-amber-100 group-hover:bg-amber-200 px-2.5 py-1 rounded-lg transition shrink-0">
                    Review →
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Admin Audit Trail */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#18232E]">
                  Recent Activity & Audit Trail
                </h3>
                <p className="text-[11px] text-slate-500">
                  Immutable administrative actions logged across the portal
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateTab("cms-audit")}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Full Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loadingExtras ? (
            <div className="space-y-3 py-4">
              <div className="h-14 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-14 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          ) : recentLogs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No Recent Audit Logs"
              description="Actions performed by authorized administrators will appear here in chronological order."
            />
          ) : (
            <div className="space-y-2">
              {recentLogs.filter(Boolean).map((log, idx) => (
                <div
                  key={log._id || log.id || idx}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 truncate">
                        {log?.details || log?.entityType || "System Action"}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {log?.action || "LOG"}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      By {log?.adminEmail || log?.adminUser?.email || "Admin"} • {timeAgo(log?.createdAt || log?.timestamp)}
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-slate-400 uppercase shrink-0">
                    {log?.entityType || "SYSTEM"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* UPCOMING COMMUNITY EVENTS SNAPSHOT */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#18232E]">
                  Upcoming Melas & Cultural Events
                </h3>
                <p className="text-[11px] text-slate-500">
                  Active events scheduled to appear on the town calendar
                </p>
              </div>
            </div>

            <button
              onClick={() => navigateTab("cms-events")}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {upcomingEvents.map((evt) => (
              <div
                key={evt._id}
                onClick={() => navigateTab("cms-events")}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition cursor-pointer space-y-2 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    {evt.category || "Festival"}
                  </span>
                  <h4 className="text-xs font-bold text-[#18232E] mt-1 line-clamp-1">
                    {evt.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {evt.venue || "Fazilnagar"}
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>{evt.startDate ? new Date(evt.startDate).toLocaleDateString() : "Upcoming"}</span>
                  <StatusBadge status={evt.isPublished ? "published" : "draft"} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
