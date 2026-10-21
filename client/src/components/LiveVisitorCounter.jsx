import { useState, useEffect } from "react";
import API from "../api";
import { Users } from "lucide-react";

const VISITOR_ID_KEY = "fazilnagar_visitor_id";

/**
 * Returns or generates a persistent visitor identifier stored in localStorage.
 * Multiple tabs in the same browser share this same ID, ensuring accurate visitor deduplication.
 */
export function getOrCreateVisitorId() {
  if (typeof window === "undefined") return "ssr_visitor";
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid || typeof vid !== "string" || !vid.trim()) {
      vid = "v_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now().toString(36);
      localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
  } catch (_) {
    return "anon_visitor";
  }
}

/**
 * Checks if the given date falls into nighttime (11:30 PM to 6:59:59 AM local time).
 * Correctly handles midnight crossover.
 */
export function isNightTime(date = new Date()) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const totalMinutes = hours * 60 + minutes;
  // 11:30 PM is 23:30 (1410 min). 7:00 AM is 07:00 (420 min).
  // 11:30 PM through 6:59:59 AM falls in [1410, 1440) or [0, 420).
  return totalMinutes >= 1410 || totalMinutes < 420;
}

/**
 * Returns the effective displayed visitor count.
 * From 11:30 PM through 6:59 AM local time, simulated count is strictly between 1 and 9 (never 10+).
 * From 7:00 AM through 11:29 PM, preserves existing count.
 * Real analytics / mode are never altered.
 */
export function getDisplayedVisitorCount(count, mode, date = new Date()) {
  if (count === null || count === undefined) return null;
  const num = parseInt(count, 10);
  if (isNaN(num)) return count;

  if (mode === "simulated" && isNightTime(date)) {
    if (num >= 1 && num <= 9) return num;
    const safeBase = Math.max(1, num);
    return ((safeBase - 1) % 9) + 1;
  }

  return num;
}

export default function LiveVisitorCounter({ compact = false, className = "" }) {
  const [visitorCount, setVisitorCount] = useState(null);
  const [mode, setMode] = useState("real");

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();

    const sendHeartbeat = async () => {
      // Pause heartbeats when browser tab is hidden to save client & server resources
      if (typeof document !== "undefined" && document.hidden) return;

      try {
        const res = await API.post("/visitors/heartbeat", { visitorId });
        if (res.data?.success) {
          setVisitorCount(res.data.count);
          if (res.data.mode) setMode(res.data.mode);
        }
      } catch (err) {
        // Fallback to lightweight count query if heartbeat endpoint hit an edge case
        try {
          const res = await API.get("/visitors/count");
          if (res.data?.success) {
            setVisitorCount(res.data.count);
            if (res.data.mode) setMode(res.data.mode);
          }
        } catch (_) {}
      }
    };

    // 1. Initial heartbeat
    sendHeartbeat();

    // 2. Regular 60-second heartbeat when active (safely within backend 90s cutoff)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      sendHeartbeat();
    }, 60000);

    // 3. Re-sync immediately on tab focus
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        sendHeartbeat();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 4. Send leave beacon on tab close / unload for fast session cleanup
    const handleUnload = () => {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        try {
          const blob = new Blob([JSON.stringify({ visitorId })], { type: "application/json" });
          navigator.sendBeacon("/api/visitors/leave", blob);
        } catch (_) {}
      }
    };
    window.addEventListener("pagehide", handleUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, []);

  if (visitorCount === null) {
    return null; // Don't render until first active presence ping completes
  }

  const displayedCount = getDisplayedVisitorCount(visitorCount, mode);

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs select-none transition-all ${className}`}
        title={`Live Website Visitors (${mode === "simulated" ? "Simulated Mode" : "Real Active"})`}
        aria-label={`${displayedCount} live website visitors`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono font-bold">{displayedCount}</span>
        <span className="text-[10px] text-emerald-700 dark:text-emerald-300">live</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shadow-2xs select-none transition-all ${className}`}
      title={`Current Active Website Visitors (${mode === "simulated" ? "Simulated Mode" : "Real Live Count"})`}
      aria-label={`${displayedCount} active visitors on portal`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="font-mono font-bold tracking-tight">{displayedCount}</span>
      <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200">Online Now</span>
    </div>
  );
}
