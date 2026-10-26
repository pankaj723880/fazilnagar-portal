/**
 * Fazilnagar Town Portal - Site-wide Media Protection & Download Deterrence System
 *
 * Centralized, multi-layered deterrence against image and video downloads across
 * Home, Directory, Jobs, News, profiles, listings, galleries, and admin pages.
 *
 * Features:
 * - Context menu interception on protected media (right-click desktop, long-press mobile)
 * - Drag-and-drop prevention (dragstart prevention, draggable=false)
 * - Selection suppression on media elements (user-select: none)
 * - HTML5 video native download and PiP control deterrence (controlsList, disablePictureInPicture)
 * - Accidental raw media URL opening interception on image/video clicks
 * - Dynamic and lazy-loaded media observation via MutationObserver
 * - Targeted event delegation without disabling context menus on forms, inputs, or text
 * - Leaflet map tile/marker exemption to preserve map interactivity
 * - Full preservation of carousels, galleries, buttons, links, and video playback
 *
 * Note: This is a client-side deterrence measure to discourage casual copying/saving,
 * not cryptographic DRM or absolute download prevention.
 */

const RAW_MEDIA_EXT_REGEX = /\.(png|jpe?g|webp|gif|svg|bmp|ico|mp4|webm|mov|ogg|avi|m4v)($|\?)/i;

/**
 * Checks whether an element is inside an excluded interactive container (e.g. Leaflet map).
 */
export function isExcludedElement(el) {
  if (!el || !(el instanceof Element)) return false;
  // Preserve Leaflet map tiles, pins, controls, and vector layers
  if (el.closest('.leaflet-pane, .leaflet-tile-pane, .leaflet-marker-pane, .leaflet-container')) {
    return true;
  }
  // Allow explicit opt-outs if needed
  if (el.closest('[data-allow-media-save="true"], [data-bypass-media-protection="true"]')) {
    return true;
  }
  return false;
}

/**
 * Determines whether an element or event target represents protected media.
 */
export function isProtectedMediaTarget(el) {
  if (!el || !(el instanceof Element)) return false;

  if (isExcludedElement(el)) return false;

  // Never block context menu or interactions on inputs, textareas, selects, or editable fields
  if (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  ) {
    return false;
  }

  // Direct media elements
  if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
    return true;
  }

  // Explicitly marked media elements or wrappers
  if (el.hasAttribute('data-protected-media') || el.classList.contains('protected-media')) {
    return true;
  }

  // Check if click/contextmenu target is an overlay or child immediately over a media element
  const mediaContainer = el.closest('[data-protected-media], .protected-media, [data-media-shield]');
  if (mediaContainer) {
    return true;
  }

  // Target inside an anchor that contains an image/video
  const parentAnchor = el.closest('a');
  if (parentAnchor && (parentAnchor.querySelector('img, video') || parentAnchor.hasAttribute('data-protected-media'))) {
    // If the exact target is the image/video itself inside the link
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a URL is a direct raw media file (images, videos, drive media, uploads)
 */
export function isRawMediaUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return false;
  }
  if (RAW_MEDIA_EXT_REGEX.test(trimmed)) return true;
  if (trimmed.includes('/api/google-drive/media/')) return true;
  if (trimmed.includes('/uploads/avatars/') || trimmed.includes('/uploads/messages/') || trimmed.includes('/uploads/news/')) {
    return true;
  }
  return false;
}

/**
 * Applies security and download deterrence attributes to an HTML5 video element.
 */
export function enforceVideoProtection(video) {
  if (!video || !(video instanceof HTMLVideoElement)) return;
  if (isExcludedElement(video)) return;

  // Enforce controlsList="nodownload noplaybackrate"
  const currentList = video.getAttribute('controlsList') || '';
  const tokens = new Set(currentList.split(/\s+/).filter(Boolean));
  tokens.add('nodownload');
  tokens.add('noplaybackrate');
  video.setAttribute('controlsList', Array.from(tokens).join(' '));

  // Enforce disablePictureInPicture
  video.disablePictureInPicture = true;
  video.setAttribute('disablePictureInPicture', 'true');

  // Prevent dragging
  video.setAttribute('draggable', 'false');
  video.setAttribute('data-protected-media', 'true');

  // Ensure context menu is prevented on the video itself
  video.oncontextmenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
}

/**
 * Applies security and download deterrence attributes to an HTML image element.
 */
export function enforceImageProtection(img) {
  if (!img || !(img instanceof HTMLImageElement)) return;
  if (isExcludedElement(img)) return;

  img.setAttribute('draggable', 'false');
  img.setAttribute('data-protected-media', 'true');
  img.style.webkitUserDrag = 'none';
  img.style.userDrag = 'none';
  img.style.webkitTouchCallout = 'none';
  img.style.userSelect = 'none';
  img.style.webkitUserSelect = 'none';
}

/**
 * Scans and protects all existing media elements in a subtree.
 */
export function scanAndProtectSubtree(root = document) {
  if (typeof document === 'undefined') return;

  try {
    const images = root.querySelectorAll ? root.querySelectorAll('img') : [];
    images.forEach(enforceImageProtection);

    const videos = root.querySelectorAll ? root.querySelectorAll('video') : [];
    videos.forEach(enforceVideoProtection);
  } catch (err) {
    console.debug('[MediaProtection] Scan error:', err);
  }
}

let isInitialized = false;
let mutationObserver = null;
let touchTimer = null;
let touchMoved = false;

/**
 * Event Delegation Handlers
 */
function handleContextMenu(e) {
  if (isProtectedMediaTarget(e.target)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function handleDragStart(e) {
  if (isProtectedMediaTarget(e.target)) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function handleSelectStart(e) {
  if (isProtectedMediaTarget(e.target)) {
    e.preventDefault();
    return false;
  }
}

/**
 * Intercepts clicks on or around media to prevent accidental opening of raw naked media files,
 * without breaking legitimate internal/external links or button clicks.
 */
function handleClick(e) {
  const target = e.target;
  if (!target || !(target instanceof Element)) return;

  // Find nearest anchor
  const anchor = target.closest('a');
  if (anchor) {
    // If the anchor has explicit permission to open raw file (e.g. admin explicit view, or chat attachment download)
    if (anchor.hasAttribute('data-allow-media-link') || anchor.hasAttribute('download')) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (href && isRawMediaUrl(href)) {
      // Check if clicked element was a protected image/video or image wrapper
      const isMediaClick =
        target.tagName === 'IMG' ||
        target.tagName === 'VIDEO' ||
        target.closest('[data-protected-media], .protected-media');

      if (isMediaClick) {
        // Prevent browser navigating away to raw image/video file
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }
}

/**
 * Intercepts middle-click (auxclick) to prevent opening raw media in a new background tab.
 */
function handleAuxClick(e) {
  if (e.button === 1) { // Middle click
    const target = e.target;
    if (isProtectedMediaTarget(target)) {
      const anchor = target.closest('a');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && isRawMediaUrl(href) && !anchor.hasAttribute('data-allow-media-link')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  }
}

/**
 * Mobile touch callout deterrence:
 * Intercepts long-press on protected images and videos.
 */
function handleTouchStart(e) {
  touchMoved = false;
  if (!e.touches || e.touches.length !== 1) return;
  const target = e.target;
  if (isProtectedMediaTarget(target)) {
    if (touchTimer) clearTimeout(touchTimer);
    touchTimer = setTimeout(() => {
      // If user held down finger on protected media without scrolling, suppress callout
      if (!touchMoved) {
        // Modern iOS/Android will trigger contextmenu on long press, which handleContextMenu will block.
      }
    }, 450);
  }
}

function handleTouchMove() {
  touchMoved = true;
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }
}

function handleTouchEnd() {
  if (touchTimer) {
    clearTimeout(touchTimer);
    touchTimer = null;
  }
}

/**
 * Video lifecycle listener on capture phase to ensure video protection is active
 * as soon as a video is loaded or played.
 */
function handleVideoLoadStart(e) {
  if (e.target && e.target instanceof HTMLVideoElement) {
    enforceVideoProtection(e.target);
  }
}

/**
 * Initializes the site-wide media download deterrence system.
 * Attaches global delegated listeners and sets up a MutationObserver for dynamic/lazy content.
 */
export function initMediaProtection() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (isInitialized) return destroyMediaProtection;

  isInitialized = true;

  // Initial pass on existing DOM
  scanAndProtectSubtree(document);

  // Global event delegation (capture phase ensures deterrence fires before third-party libraries)
  document.addEventListener('contextmenu', handleContextMenu, { capture: true });
  document.addEventListener('dragstart', handleDragStart, { capture: true });
  document.addEventListener('selectstart', handleSelectStart, { capture: true });
  document.addEventListener('click', handleClick, { capture: true });
  document.addEventListener('auxclick', handleAuxClick, { capture: true });

  // Mobile long-press deterrence
  document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: true });
  document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: true });
  document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
  document.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: true });

  // Video lifecycle hooks on capture
  window.addEventListener('loadstart', handleVideoLoadStart, { capture: true });
  window.addEventListener('play', handleVideoLoadStart, { capture: true });
  window.addEventListener('loadedmetadata', handleVideoLoadStart, { capture: true });

  // MutationObserver to protect dynamically rendered, route-loaded, and infinite-scroll media
  if (typeof MutationObserver !== 'undefined' && document.body) {
    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node instanceof HTMLElement) {
              if (node.tagName === 'IMG') enforceImageProtection(node);
              else if (node.tagName === 'VIDEO') enforceVideoProtection(node);
              else scanAndProtectSubtree(node);
            }
          }
        } else if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target instanceof HTMLVideoElement) {
            enforceVideoProtection(target);
          } else if (target instanceof HTMLImageElement) {
            enforceImageProtection(target);
          }
        }
      }
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'controls', 'controlslist', 'poster'],
    });
  }

  return destroyMediaProtection;
}

/**
 * Teardown / cleanup function (useful for tests or unmounting).
 */
export function destroyMediaProtection() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (!isInitialized) return;

  isInitialized = false;

  document.removeEventListener('contextmenu', handleContextMenu, { capture: true });
  document.removeEventListener('dragstart', handleDragStart, { capture: true });
  document.removeEventListener('selectstart', handleSelectStart, { capture: true });
  document.removeEventListener('click', handleClick, { capture: true });
  document.removeEventListener('auxclick', handleAuxClick, { capture: true });

  document.removeEventListener('touchstart', handleTouchStart, { capture: true });
  document.removeEventListener('touchmove', handleTouchMove, { capture: true });
  document.removeEventListener('touchend', handleTouchEnd, { capture: true });
  document.removeEventListener('touchcancel', handleTouchEnd, { capture: true });

  window.removeEventListener('loadstart', handleVideoLoadStart, { capture: true });
  window.removeEventListener('play', handleVideoLoadStart, { capture: true });
  window.removeEventListener('loadedmetadata', handleVideoLoadStart, { capture: true });

  if (mutationObserver) {
    mutationObserver.disconnect();
    mutationObserver = null;
  }
}
