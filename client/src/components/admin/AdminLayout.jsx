import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import ToastNotification from "./ToastNotification";

export default function AdminLayout({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  pendingSubmissions = [],
  pendingCount,
  entitiesCount = 19,
  liveAdsCount = 0,
  newsCount = 0,
  civicCount = 0,
  onRefresh = () => {},
  loading = false,
  toastMessage = "",
  toastType = "success",
  onCloseToast = () => {},
  onOpenCreateAd,
  onOpenCreateNews,
  children,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const calculatedPendingCount =
    typeof pendingCount === "number"
      ? pendingCount
      : pendingSubmissions.filter((s) => s.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex text-[#18232E] font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Sidebar Navigation */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={calculatedPendingCount}
        entitiesCount={entitiesCount}
        liveAdsCount={liveAdsCount}
        newsCount={newsCount}
        civicCount={civicCount}
        isMobileOpen={mobileDrawerOpen}
        setIsMobileOpen={setMobileDrawerOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      {/* Main Workspace Body */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          sidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        {/* Professional Top Navigation Bar */}
        <AdminTopbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onToggleSidebar={() => {
            if (typeof window !== "undefined" && window.innerWidth < 1024) {
              setMobileDrawerOpen((prev) => !prev);
            } else {
              setSidebarCollapsed((prev) => !prev);
            }
          }}
          isCollapsed={sidebarCollapsed}
          currentUser={currentUser}
          onLogout={onLogout}
          pendingCount={calculatedPendingCount}
          pendingSubmissions={pendingSubmissions}
          onRefresh={onRefresh}
          loading={loading}
          onOpenCreateAd={onOpenCreateAd}
          onOpenCreateNews={onOpenCreateNews}
        />

        {/* Dynamic Module Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Global Toast Feedback */}
      {toastMessage && (
        <ToastNotification
          message={toastMessage}
          type={toastType}
          onClose={onCloseToast}
        />
      )}
    </div>
  );
}
