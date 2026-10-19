/**
 * Route chunk prefetch utility for Fazilnagar Portal.
 * Lazily fetches high-traffic route bundles on desktop hover and mobile touchstart
 * so that navigation feels instantaneous without layout collapse.
 */

const routeLoaders = {
  "/news": () => import("../pages/ReelsNewsFeed"),
  "/local-updates": () => import("../pages/ReelsNewsFeed"),
  "/directory/news": () => import("../pages/ReelsNewsFeed"),
  "/directory": () => import("../pages/Directory"),
  "/local-directory": () => import("../pages/Directory"),
  "/emergency": () => import("../pages/EmergencyHub"),
  "/healthcare": () => import("../pages/HealthcareDirectory"),
  "/education": () => import("../pages/EducationHub"),
  "/jobs": () => import("../pages/JobsAndBusiness"),
  "/tourism": () => import("../pages/Tourism"),
  "/food": () => import("../pages/FoodGuide"),
  "/marketplace": () => import("../pages/Marketplace"),
  "/transport": () => import("../pages/Transportation"),
  "/govt": () => import("../pages/GovtServices"),
  "/messages": () => import("../pages/Messages"),
  "/login": () => import("../pages/Login"),
  "/register": () => import("../pages/Register"),
  "/forgot-password": () => import("../pages/ForgotPassword"),
  "/create-news": () => import("../pages/CreateNews"),
  "/about": () => import("../pages/About"),
  "/contact": () => import("../pages/Contact"),
  "/privacy": () => import("../pages/PrivacyPolicy"),
  "/terms": () => import("../pages/TermsOfService"),
};

const prefetchedPaths = new Set();

/**
 * Prefetch a route bundle ahead of click/tap.
 * @param {string} path - Target path e.g. "/directory"
 */
export function prefetchRoute(path) {
  if (!path || typeof path !== "string") return;
  // Strip hash and query params
  const cleanPath = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  if (prefetchedPaths.has(cleanPath)) return;

  const loader = routeLoaders[cleanPath];
  if (!loader) return;

  prefetchedPaths.add(cleanPath);

  // Defer prefetch to idle time so it doesn't contend with active animations or main-thread tasks
  if (typeof window !== "undefined") {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(
        () => {
          loader().catch(() => {
            prefetchedPaths.delete(cleanPath);
          });
        },
        { timeout: 2500 }
      );
    } else {
      setTimeout(() => {
        loader().catch(() => {
          prefetchedPaths.delete(cleanPath);
        });
      }, 30);
    }
  }
}
