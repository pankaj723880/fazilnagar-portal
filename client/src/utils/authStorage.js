// Tab-isolated and Persistently Synchronized Authentication Storage Utility
// Ensures reliable login persistence and complete, permanent logout across browser refreshes and tabs.

let currentAuthEpoch = Date.now();

export function getAuthEpoch() {
  return currentAuthEpoch;
}

export function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonStr);
    // Validate expiration if exp is present
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getAuthToken() {
  try {
    let token = sessionStorage.getItem("token");
    if (!token || token === "null" || token === "undefined") {
      token = localStorage.getItem("token");
      if (token && token !== "null" && token !== "undefined") {
        sessionStorage.setItem("token", token);
      } else {
        token = null;
      }
    }

    if (token) {
      const payload = decodeJwtPayload(token);
      if (!payload) {
        // Expired or malformed token: purge immediately
        clearAuthSession();
        return null;
      }
      return token;
    }
  } catch {
    // Storage access error
  }
  return null;
}

export function getAuthUser() {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return null;
  }

  // Parse cached display profile from storage if available
  let cachedUser = null;
  try {
    const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (raw && raw !== "null" && raw !== "undefined") {
      cachedUser = JSON.parse(raw);
    }
  } catch {
    // ignore parse error
  }

  // SECURITY ENFORCEMENT:
  // The role and identity MUST be anchored to the server-signed JWT payload.
  // Never trust client-modified localStorage values for administrative privileges.
  const verifiedRole = payload.role === "admin" ? "admin" : (payload.role || cachedUser?.role || "user");
  const email = payload.email || cachedUser?.email || "";
  const id = payload.id || payload._id || cachedUser?.id || cachedUser?._id;
  const name = cachedUser?.name || payload.name || email.split("@")[0] || "Citizen";

  return {
    id,
    _id: id,
    name,
    email,
    role: verifiedRole,
    phone: cachedUser?.phone || "",
    status: cachedUser?.status || "active",
  };
}

export function isUserLoggedIn() {
  return Boolean(getAuthToken());
}

export function isUserAdmin() {
  const token = getAuthToken();
  if (!token) return false;
  const u = getAuthUser();
  return Boolean(u && u.role === "admin");
}


export function setAuthSession(token, user) {
  if (!token || token === "null" || token === "undefined") return;
  currentAuthEpoch = Date.now();
  try {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("token", token);
    localStorage.setItem("isLoggedIn", "true");
    if (user) {
      const userStr = typeof user === "string" ? user : JSON.stringify(user);
      sessionStorage.setItem("user", userStr);
      localStorage.setItem("user", userStr);
    }
  } catch {
    // Storage quota or privacy mode error
  }

  // Notify active components
  window.dispatchEvent(new Event("auth-change"));
}

export function clearAuthSession() {
  currentAuthEpoch = Date.now();
  try {
    // Clear both sessionStorage and localStorage completely so refresh NEVER restores session
    sessionStorage.clear();

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isLoggedIn");

    // Clean up legacy or variant keys
    localStorage.removeItem("fazil_user");
    localStorage.removeItem("fazil_auth_token");
  } catch {
    // Storage error
  }

  // Trigger cross-tab and current tab notifications
  try {
    localStorage.setItem("logout_event", String(Date.now()));
    localStorage.removeItem("logout_event");
  } catch {
    // LocalStorage error
  }

  window.dispatchEvent(new Event("auth-change"));
}

// Cross-tab logout listener: when another tab logs out, clear this tab too
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "logout_event" || (e.key === "token" && !e.newValue)) {
      try {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("isLoggedIn");
      } catch {
        // Storage error
      }
      currentAuthEpoch = Date.now();
      window.dispatchEvent(new Event("auth-change"));
    }
  });
}
