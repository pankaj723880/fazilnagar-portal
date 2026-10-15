// Tab-isolated and Persistently Synchronized Authentication Storage Utility
// Ensures reliable login persistence and complete, permanent logout across browser refreshes and tabs.

let currentAuthEpoch = Date.now();

export function getAuthEpoch() {
  return currentAuthEpoch;
}

export function getAuthToken() {
  try {
    const sessionToken = sessionStorage.getItem("token");
    if (sessionToken && sessionToken !== "null" && sessionToken !== "undefined") {
      return sessionToken;
    }

    // Fallback to localStorage if this tab hasn't populated sessionStorage yet
    const localToken = localStorage.getItem("token");
    if (localToken && localToken !== "null" && localToken !== "undefined") {
      sessionStorage.setItem("token", localToken);
      return localToken;
    }
  } catch {
    // Storage access fallback
  }
  return null;
}

export function getAuthUser() {
  try {
    const sessionUser = sessionStorage.getItem("user");
    if (sessionUser && sessionUser !== "null" && sessionUser !== "undefined") {
      return JSON.parse(sessionUser);
    }

    const localUser = localStorage.getItem("user");
    if (localUser && localUser !== "null" && localUser !== "undefined") {
      const parsed = JSON.parse(localUser);
      sessionStorage.setItem("user", localUser);
      return parsed;
    }

    // Attempt token decode if user object is not cached
    const token = getAuthToken();
    if (token) {
      const payloadBase64 = token.split(".")[1];
      if (payloadBase64) {
        const decoded = JSON.parse(
          atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"))
        );
        if (decoded) {
          const u = {
            id: decoded.id,
            name: decoded.name || decoded.email?.split("@")[0] || "Citizen",
            email: decoded.email,
            role: decoded.role || (decoded.email === "pankaj723880@gmail.com" ? "admin" : "citizen"),
          };
          sessionStorage.setItem("user", JSON.stringify(u));
          return u;
        }
      }
    }
  } catch {
    // Storage/JSON parse error
  }
  return null;
}

export function isUserLoggedIn() {
  return Boolean(getAuthToken());
}

export function isUserAdmin() {
  const u = getAuthUser();
  return Boolean(u && (u.role === "admin" || u.email === "pankaj723880@gmail.com"));
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
