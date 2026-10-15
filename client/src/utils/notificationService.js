/**
 * Fazilnagar Portal Notification Service
 * Manages OS-level desktop laptop popups, mobile push alerts, and in-app notifications.
 */
import API from "../api";

const SUBMISSIONS_STORAGE_KEY = "fazilnagar_user_submissions";
const USER_PHONE_STORAGE_KEY = "fazilnagar_user_phone";
const LAST_NOTIF_ID_KEY = "fazilnagar_last_seen_notif_id";
const NOTIF_SOUND_KEY = "fazilnagar_notif_sound_enabled";
const POPUP_SEEN_IDS_KEY = "fazilnagar_seen_popup_ids";

/**
 * Returns list of notification IDs that have already triggered an OS device popup.
 */
export function getSeenPopupIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(POPUP_SEEN_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Marks a notification ID as having triggered an OS device popup.
 */
export function markPopupAsSeen(id) {
  if (typeof window === "undefined" || !id) return;
  try {
    const list = getSeenPopupIds();
    if (!list.includes(id)) {
      list.push(id);
      localStorage.setItem(POPUP_SEEN_IDS_KEY, JSON.stringify(list.slice(-50)));
    }
  } catch (_) {}
}

/**
 * Marks a single notification as read on the backend server.
 */
export async function markNotificationAsRead(id) {
  if (!id) return;
  try {
    const res = await API.patch(`/notifications/${id}/read`);
    return res.data;
  } catch (err) {
    console.warn("[NotificationService] Mark read error:", err);
    throw err;
  }
}

/**
 * Marks all notifications as read on the backend server.
 */
export async function markAllNotificationsAsRead() {
  try {
    const res = await API.post("/notifications/mark-all-read");
    return res.data;
  } catch (err) {
    console.warn("[NotificationService] Mark all read error:", err);
    throw err;
  }
}

/**
 * Returns browser notification permission status.
 */
export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Requests native notification permission from the user.
 */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      playNotificationSound();
    }
    return permission;
  } catch (err) {
    console.warn("[NotificationService] Permission request error:", err);
    return "denied";
  }
}

/**
 * Synthesizes a subtle, pleasant chime using the Web Audio API (no external MP3 required).
 */
export function playNotificationSound() {
  try {
    const enabled = localStorage.getItem(NOTIF_SOUND_KEY);
    if (enabled === "false") return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = "sine";
    osc2.type = "triangle";

    // Pleasant high melodic chime: 587.33Hz (D5) -> 880Hz (A5)
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.08);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (_) {
    // Ignore audio autostart restrictions
  }
}

/**
 * Triggers a native OS notification (desktop laptop popup or mobile status bar popup).
 */
export async function showDeviceNotification({
  title = "Fazilnagar Portal",
  message = "New notification received.",
  link = "/",
  icon = "/icon-192.svg",
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  playNotificationSound();

  const options = {
    body: message,
    icon: icon || "/icon-192.svg",
    badge: "/icon-192.svg",
    data: { url: link },
    tag: `fazilnagar-${Date.now()}`,
    renotify: true,
  };

  // Try service worker notification first (supports mobile background alerts)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return;
      }
    } catch (_) {}
  }

  // Fallback to desktop window Notification API (triggers OS notification banner on Windows/Mac)
  try {
    const notif = new Notification(title, options);
    notif.onclick = () => {
      window.focus();
      notif.close();
      if (link && window.location.pathname !== link) {
        window.location.href = link;
      }
    };
  } catch (err) {
    console.warn("[NotificationService] Fallback notification failed:", err);
  }
}

/**
 * Stores a reference ID or submission tracking details in localStorage so
 * citizens who submit places/stories get notified even when browsing as guest.
 */
export function addTrackedSubmission(referenceId, phone) {
  try {
    if (referenceId) {
      const existing = getTrackedSubmissions();
      if (!existing.includes(referenceId)) {
        existing.push(referenceId);
        localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(existing.slice(-20)));
      }
    }
    if (phone) {
      localStorage.setItem(USER_PHONE_STORAGE_KEY, String(phone).trim());
    }
  } catch (_) {}
}

/**
 * Retrieves tracked submission reference IDs from localStorage.
 */
export function getTrackedSubmissions() {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

/**
 * Retrieves stored user phone number from localStorage.
 */
export function getTrackedPhone() {
  try {
    return localStorage.getItem(USER_PHONE_STORAGE_KEY) || "";
  } catch (_) {
    return "";
  }
}

/**
 * Fetches notifications from backend and triggers OS popups ONLY for genuinely new, unread alerts.
 */
export async function fetchAndCheckNotifications({ triggerPopups = true } = {}) {
  try {
    const phone = getTrackedPhone();
    const refIds = getTrackedSubmissions().join(",");

    const params = {};
    if (phone) params.phone = phone;
    if (refIds) params.referenceIds = refIds;

    const res = await API.get("/notifications", { params });
    const data = res.data;
    const notifications = data.notifications || [];

    // Trigger popup ONLY for genuinely new, eligible unread notifications that haven't been popped up yet
    if (triggerPopups && notifications.length > 0 && Notification.permission === "granted") {
      const hasInitialSeeding = localStorage.getItem(POPUP_SEEN_IDS_KEY) !== null;
      const seenIds = getSeenPopupIds();

      if (!hasInitialSeeding) {
        // Cold start on new browser: seed existing notification IDs so historical alerts don't spam popups
        const seedIds = notifications.map((n) => n._id);
        localStorage.setItem(POPUP_SEEN_IDS_KEY, JSON.stringify(seedIds.slice(-50)));
      } else {
        // Filter for truly unread notifications that have never triggered a popup on this client
        const newUnread = notifications.filter(
          (notif) => notif && !notif.isRead && !seenIds.includes(notif._id)
        );

        if (newUnread.length > 0) {
          const alertItem = newUnread[0];
          markPopupAsSeen(alertItem._id);
          showDeviceNotification({
            title: alertItem.title,
            message: alertItem.message,
            link: alertItem.link || "/",
          });
        }
      }
    }

    // Broadcast update event so all listening components re-render unread count
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("fazilnagar-notifications-updated", {
          detail: {
            unreadCount: data.unreadCount || 0,
            notifications,
          },
        })
      );
    }

    return data;
  } catch (err) {
    console.warn("[NotificationService] Fetch error:", err.message);
    return { notifications: [], unreadCount: 0 };
  }
}
