// Tab-isolated Authentication Storage Utility
// Enables simultaneous multi-account logins across different browser tabs without collision.

export function getAuthToken() {
  try {
    const sessionToken = sessionStorage.getItem("token");
    if (sessionToken) return sessionToken;

    // Fallback to localStorage if this tab hasn't diverged yet
    const localToken = localStorage.getItem("token");
    if (localToken) {
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
    if (sessionUser) {
      return JSON.parse(sessionUser);
    }

    const localUser = localStorage.getItem("user");
    if (localUser) {
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
  try {
    if (token) {
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("isLoggedIn", "true");
    }
    if (user) {
      sessionStorage.setItem("user", typeof user === "string" ? user : JSON.stringify(user));
    }

    // Also update localStorage as baseline default for newly opened tabs,
    // but because each tab prioritizes sessionStorage, active tabs remain isolated.
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("isLoggedIn", "true");
    }
    if (user) {
      localStorage.setItem("user", typeof user === "string" ? user : JSON.stringify(user));
    }
  } catch {
    // Storage quota or privacy mode error
  }

  // Notify this tab's components
  window.dispatchEvent(new Event("auth-change"));
}

export function clearAuthSession(currentTabOnly = true) {
  try {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("isLoggedIn");

    if (!currentTabOnly) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isLoggedIn");
    }
  } catch {
    // Storage error
  }

  window.dispatchEvent(new Event("auth-change"));
}
