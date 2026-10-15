import { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  Sparkles,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Radio,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import API from "../api";
import { getAuthToken, getAuthUser } from "../utils/authStorage";
import {
  getNotificationPermission,
  requestNotificationPermission,
  showDeviceNotification,
  fetchAndCheckNotifications,
  playNotificationSound,
} from "../utils/notificationService";

export default function NotificationCenter({ lightMode = false, subtleDot = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState("default");
  const [isTesting, setIsTesting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => getAuthUser()?.role === "admin");
  const containerRef = useRef(null);

  // Load notifications and permissions on mount
  useEffect(() => {
    setPermission(getNotificationPermission());
    const soundPref = localStorage.getItem("fazilnagar_notif_sound_enabled");
    if (soundPref !== null) {
      setSoundEnabled(soundPref !== "false");
    }

    // Initial fetch
    loadNotifications(false);

    // Poll frequently so broadcast notifications reach open visitor sessions promptly.
    const interval = setInterval(() => {
      fetchAndCheckNotifications({ triggerPopups: true });
    }, 5000);

    const syncAdmin = () => setIsAdmin(getAuthUser()?.role === "admin");
    window.addEventListener("auth-change", syncAdmin);

    // Listen for custom notification update events
    const handleUpdate = (e) => {
      if (e.detail) {
        setUnreadCount(e.detail.unreadCount || 0);
        if (e.detail.notifications) {
          setNotifications(e.detail.notifications);
        }
      }
    };
    window.addEventListener("fazilnagar-notifications-updated", handleUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("auth-change", syncAdmin);
      window.removeEventListener("fazilnagar-notifications-updated", handleUpdate);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async (triggerPopups = false) => {
    const data = await fetchAndCheckNotifications({ triggerPopups });
    if (data && data.notifications) {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount || 0);
    }
  };

  const handleRequestPermission = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      showDeviceNotification({
        title: "🎉 Notifications Enabled!",
        message: "You will now receive instant popups on this device for every story, post, and submission review.",
        link: "/news",
      });
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      if (permission !== "granted") {
        const res = await requestNotificationPermission();
        setPermission(res);
        if (res !== "granted") {
          setIsTesting(false);
          return;
        }
      }

      // Persist the broadcast first; only show local success after the server accepts it.
      const response = await API.post(
        "/notifications/test",
        { deviceType: window.innerWidth > 768 ? "laptop / desktop" : "mobile phone" },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      if (!response.data?.success) throw new Error(response.data?.message || "Broadcast was rejected.");

      await showDeviceNotification({
        title: "🔔 Test Notification Received!",
        message: "Your laptop and mobile popup notifications are working perfectly with Fazilnagar Portal.",
        link: "/news",
      });
      loadNotifications(false);
    } catch (err) {
      console.warn("Test notification failed:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Failed to mark as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await API.post("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn("Failed to mark all as read:", err);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("fazilnagar_notif_sound_enabled", String(next));
    if (next) playNotificationSound();
  };

  const handleNotificationClick = (notif) => {
    handleMarkAsRead(notif._id);
    setIsOpen(false);
    if (notif.link) {
      window.location.href = notif.link;
    }
  };

  const formatTimestamp = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    } catch (_) {
      return "";
    }
  };

  const getNotificationIcon = (notif) => {
    if (notif.type === "custom_alert") {
      if (notif.severity === "urgent") {
        return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />;
      }
      if (notif.severity === "warning") {
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      }
      return <Radio className="w-4 h-4 text-blue-400 shrink-0" />;
    }
    if (notif.type === "custom_notification") {
      return <Bell className="w-4 h-4 text-indigo-400 shrink-0" />;
    }
    switch (notif.type) {
      case "submission_approved":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case "submission_rejected":
        return <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case "submission_received":
        return <Clock className="w-4 h-4 text-blue-400 shrink-0" />;
      case "broadcast_place":
        return <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />;
      case "broadcast_news":
      default:
        return <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications(false);
        }}
        className={`relative p-2 rounded-xl transition duration-200 cursor-pointer ${
          isOpen
            ? lightMode
              ? "bg-slate-100 text-slate-900 border border-slate-300"
              : "bg-blue-600/30 text-blue-400 border border-blue-500/40"
            : lightMode
              ? "text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
              : "text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent"
        }`}
        title="Notifications & Device Alerts"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5 transition-transform active:scale-90" />
        {unreadCount > 0 && (
          subtleDot ? (
            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white animate-pulse" />
          ) : (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md ring-2 ring-slate-900 animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="fixed inset-x-2 top-16 md:absolute md:inset-auto md:right-0 md:top-full md:mt-2.5 w-auto md:w-[410px] max-h-[85vh] md:max-h-[600px] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[11px] font-semibold border border-blue-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleSound}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  soundEnabled
                    ? "text-slate-300 hover:text-white hover:bg-slate-800"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                }`}
                title={soundEnabled ? "Mute notification sound" : "Enable notification chime"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-blue-300 transition hover:bg-slate-800 rounded-lg flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mark read</span>
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 md:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Admin-only test controls; regular visitors only receive broadcasts. */}
          {isAdmin && (
            <div className="p-3 border-b border-slate-800/70 bg-gradient-to-r from-blue-950/40 via-slate-900/50 to-indigo-950/40">
              {permission === "granted" ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Laptop & Phone popups active</span>
                  </div>
                  <button
                    onClick={handleTestNotification}
                    disabled={isTesting}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    title="Send a sample popup to your laptop or phone"
                  >
                    <Radio className="w-3 h-3 text-blue-400" />
                    <span>{isTesting ? "Sending..." : "Test Popup"}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs">
                      <p className="font-semibold text-slate-200">
                        🔔 Get Laptop & Phone Popups
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Receive live alerts when new stories publish or civic announcements occur.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleRequestPermission}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Enable Device Popups</span>
                    </button>
                    <button
                      onClick={handleTestNotification}
                      disabled={isTesting}
                      className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                    >
                      {isTesting ? "Testing..." : "Test"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notification List (No external tabs; Notifications ONLY) */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 max-h-[380px] scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
                  <Bell className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-xs font-semibold text-slate-300">No notifications right now</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  You will be alerted here whenever new official updates, stories, or town announcements are published.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.isRead;
                const isAlert = notif.type === "custom_alert";
                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 transition-colors cursor-pointer flex items-start gap-3 hover:bg-slate-800/60 ${
                      isAlert && notif.severity === "urgent"
                        ? isUnread ? "bg-rose-950/30 border-l-2 border-rose-500" : "bg-rose-950/10"
                        : isUnread ? "bg-blue-950/20" : ""
                    }`}
                  >
                    <div className={`mt-0.5 p-2 rounded-xl border ${
                      isAlert && notif.severity === "urgent"
                        ? "bg-rose-950/60 border-rose-700/60"
                        : "bg-slate-800/90 border-slate-700/60"
                    }`}>
                      {getNotificationIcon(notif)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          {isAlert && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              notif.severity === "urgent"
                                ? "bg-rose-600/30 text-rose-300 border border-rose-500/40"
                                : notif.severity === "warning"
                                ? "bg-amber-600/30 text-amber-300 border border-amber-500/40"
                                : "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                            }`}>
                              {notif.severity === "urgent" ? "Urgent" : notif.severity === "warning" ? "Notice" : "Alert"}
                            </span>
                          )}
                          <h4
                            className={`text-xs font-bold truncate ${
                              isUnread ? "text-white font-black" : "text-slate-300"
                            }`}
                          >
                            {notif.title}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1">
                          <span>View details</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>

                        {isUnread && (
                          <button
                            onClick={(e) => handleMarkAsRead(notif._id, e)}
                            className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>

                    {isUnread && (
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ring-2 ${
                        isAlert && notif.severity === "urgent"
                          ? "bg-rose-500 ring-rose-500/20"
                          : "bg-blue-500 ring-blue-500/20"
                      }`} />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
            <span>Fazilnagar Town Alert Center</span>
            <span className="text-slate-500">Auto-synced</span>
          </div>
        </div>
      )}
    </div>
  );
}
