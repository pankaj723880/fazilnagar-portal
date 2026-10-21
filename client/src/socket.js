import { io } from "socket.io-client";
import { getAuthToken } from "./utils/authStorage";

const isLocalhost =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const DEFAULT_SOCKET_URL = isLocalhost
  ? "http://localhost:5000"
  : "https://fazilnagar-portal-l95o.onrender.com";

let rawSocketUrl = (import.meta.env.VITE_API_URL || DEFAULT_SOCKET_URL).trim();
if (rawSocketUrl.includes("fazilnagar-portal.onrender.com")) {
  rawSocketUrl = rawSocketUrl.replace("https://fazilnagar-portal.onrender.com", "https://fazilnagar-portal-l95o.onrender.com");
}
const SOCKET_URL = rawSocketUrl.replace(/\/api\/?$/, "");

let socket = null;

export function getSocket() {
  const token = getAuthToken();
  if (!token) {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
    return null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket.IO] Connection error:", err.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export const initClientSocket = getSocket;

// Pure Web Audio API synthesis for offline notification chime (no MP3/WAV assets required)
export function playMessageChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // First tone (E5 ~ 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second tone (A5 ~ 880 Hz) - pleasant upbeat chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch {
    // Gracefully ignore audio errors (e.g. user hasn't interacted or unsupported)
  }
}
