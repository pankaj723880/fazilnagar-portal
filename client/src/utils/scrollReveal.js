/**
 * Scroll Reveal & Direction Observer Utility for Fazilnagar Town Portal
 *
 * Implements high-performance IntersectionObserver management, scroll direction detection,
 * progressive enhancement, and strict prefers-reduced-motion respect.
 */

// Check if user prefers reduced motion
export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Track window scroll direction ('down' | 'up') with rAF throttling
let currentScrollDirection = "down";
let lastScrollY = typeof window !== "undefined" ? window.scrollY || window.pageYOffset || 0 : 0;
let isScrollTicking = false;
const scrollDirectionListeners = new Set();

function updateScrollDirection() {
  if (typeof window === "undefined") return;
  const currentScrollY = window.scrollY || window.pageYOffset || 0;
  const delta = currentScrollY - lastScrollY;

  // Require a minimum threshold (4px) to ignore micro-jitter
  if (Math.abs(delta) >= 4) {
    const newDirection = delta > 0 ? "down" : "up";
    if (newDirection !== currentScrollDirection) {
      currentScrollDirection = newDirection;
      scrollDirectionListeners.forEach((listener) => {
        try {
          listener(currentScrollDirection);
        } catch (e) {
          console.error("Scroll direction listener error:", e);
        }
      });
    }
    lastScrollY = currentScrollY;
  }
  isScrollTicking = false;
}

function handlePassiveScroll() {
  if (!isScrollTicking) {
    window.requestAnimationFrame(updateScrollDirection);
    isScrollTicking = true;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("scroll", handlePassiveScroll, { passive: true });
}

export function getScrollDirection() {
  return currentScrollDirection;
}

export function subscribeScrollDirection(listener) {
  scrollDirectionListeners.add(listener);
  return () => scrollDirectionListeners.delete(listener);
}

// Global registry of observed elements
const observerMap = new Map();
let globalObserver = null;
let bidirectionalObserver = null;

function getObserver(options = {}) {
  const { bidirectional = false, rootMargin = "0px 0px -40px 0px", threshold = 0.1 } = options;

  if (bidirectional) {
    if (!bidirectionalObserver && typeof window !== "undefined" && "IntersectionObserver" in window) {
      bidirectionalObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target;
            const config = observerMap.get(el);
            if (!config) return;

            if (entry.isIntersecting) {
              const dir = currentScrollDirection;
              el.classList.add("is-revealed");
              if (dir === "up") {
                el.classList.add("revealed-from-top");
                el.classList.remove("revealed-from-bottom");
              } else {
                el.classList.add("revealed-from-bottom");
                el.classList.remove("revealed-from-top");
              }
              if (config.onReveal) config.onReveal(dir);
            } else {
              // Only reset if element has scrolled sufficiently out of view
              // and bidirectional option is explicitly enabled
              const rect = entry.boundingClientRect;
              const isBelowViewport = rect.top > (window.innerHeight || document.documentElement.clientHeight);
              const isAboveViewport = rect.bottom < 0;

              if (isBelowViewport || isAboveViewport) {
                el.classList.remove("is-revealed", "revealed-from-top", "revealed-from-bottom");
                if (config.onReset) config.onReset();
              }
            }
          });
        },
        { rootMargin, threshold }
      );
    }
    return bidirectionalObserver;
  }

  // Standard once-per-element observer
  if (!globalObserver && typeof window !== "undefined" && "IntersectionObserver" in window) {
    globalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const config = observerMap.get(el);
            const dir = currentScrollDirection;

            el.classList.add("is-revealed");
            if (dir === "up") {
              el.classList.add("revealed-from-top");
            } else {
              el.classList.add("revealed-from-bottom");
            }

            if (config?.onReveal) config.onReveal(dir);

            // Unobserve for performance once revealed
            if (globalObserver) {
              globalObserver.unobserve(el);
            }
            observerMap.delete(el);
          }
        });
      },
      { rootMargin, threshold }
    );
  }

  return globalObserver;
}

/**
 * Register an element for scroll reveal animation
 */
export function registerRevealElement(element, config = {}) {
  if (!element || typeof window === "undefined") return () => {};

  // If reduced motion is requested, reveal immediately
  if (prefersReducedMotion()) {
    element.classList.add("is-revealed");
    if (config.onReveal) config.onReveal("down");
    return () => {};
  }

  // If IntersectionObserver is not supported, reveal immediately
  if (!("IntersectionObserver" in window)) {
    element.classList.add("is-revealed");
    if (config.onReveal) config.onReveal("down");
    return () => {};
  }

  // Check if element is already in the viewport on initial page load
  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight || document.documentElement.clientHeight;
  const isAlreadyVisible = rect.top < windowHeight * 0.95 && rect.bottom > 0;

  if (isAlreadyVisible && config.once !== false) {
    // In viewport already: quick gentle reveal without waiting
    window.requestAnimationFrame(() => {
      element.classList.add("is-revealed");
      if (config.onReveal) config.onReveal("down");
    });
    return () => {};
  }

  // Mark pending
  element.classList.add("fzn-reveal--pending");
  observerMap.set(element, config);

  const observer = getObserver({
    bidirectional: config.bidirectional === true,
    rootMargin: config.rootMargin,
    threshold: config.threshold,
  });

  if (observer) {
    observer.observe(element);
  }

  return () => {
    if (observer) {
      observer.unobserve(element);
    }
    observerMap.delete(element);
  };
}
