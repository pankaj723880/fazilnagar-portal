import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import API from "../api";
import { ExternalLink, Sparkles, X } from "lucide-react";

// Track impression once per session per advertisement to avoid duplicate counts
const trackImpression = (adId) => {
  if (!adId) return;
  try {
    const storageKey = `fazil_ad_imp_${adId}`;
    if (!sessionStorage.getItem(storageKey)) {
      sessionStorage.setItem(storageKey, "1");
      API.post(`/advertisements/${adId}/impression`).catch(() => {});
    }
  } catch (_) {}
};

const trackClick = (adId) => {
  if (!adId) return;
  try {
    API.post(`/advertisements/${adId}/click`).catch(() => {});
  } catch (_) {}
};

const trackDismissal = (adId) => {
  if (!adId) return;
  try {
    API.post(`/advertisements/${adId}/dismiss`).catch(() => {});
  } catch (_) {}
};

// Helper: Check if an ad has been dismissed according to its configured policy
const isAdDismissed = (ad) => {
  if (!ad?._id) return true;
  // Permanent ads and 'always' frequency ads are NEVER dismissed persistently
  if (ad.isPermanent || ad.frequency === "permanent" || ad.frequency === "always") {
    return false;
  }

  const dismissedTimestamp = localStorage.getItem(`fazil_ad_dismissed_${ad._id}`);
  if (ad.frequency === "interval" && dismissedTimestamp) {
    const minutesPassed = (Date.now() - parseInt(dismissedTimestamp, 10)) / (1000 * 60);
    const interval = ad.redisplayIntervalMinutes || 60;
    if (minutesPassed < interval) {
      return true; // Still within dismissal cooldown
    }
    // Cooldown expired, clear localStorage
    localStorage.removeItem(`fazil_ad_dismissed_${ad._id}`);
    return false;
  }

  // Once-per-session policy check
  if (ad.frequency === "once-per-session") {
    if (sessionStorage.getItem(`fazil_ad_dismissed_session_${ad._id}`)) {
      return true;
    }
  }

  return false;
};

// Helper: Record dismissal in storage according to ad policy
const recordAdDismissal = (ad) => {
  if (!ad?._id) return;
  // Permanent ads should not be stored as permanently dismissed
  if (ad.isPermanent || ad.frequency === "permanent" || ad.frequency === "always") return;
  const policy = ad.frequency || "once-per-session";
  const now = Date.now().toString();

  if (policy === "once-per-session") {
    sessionStorage.setItem(`fazil_ad_dismissed_session_${ad._id}`, now);
  } else if (policy === "interval") {
    localStorage.setItem(`fazil_ad_dismissed_${ad._id}`, now);
  }
};

// ====================================================================
// 1. IN-FEED BANNER AD (Rendered inside content / TownPortal Section 3.5)
// ====================================================================
export default function AdvertisementSlot() {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchActiveAd = async () => {
      try {
        const res = await API.get("/advertisements/active");
        if (isMounted) {
          const allAds = res.data?.ads || (res.data?.ad ? [res.data.ad] : []);
          // Pick the active banner format ad, or if no banner exists pick permanent/active ad
          const bannerAd =
            allAds.find((a) => a.format === "banner") ||
            allAds.find((a) => a.isPermanent || a.frequency === "permanent") ||
            (allAds.length > 0 ? allAds[0] : null);

          if (bannerAd && !isAdDismissed(bannerAd)) {
            setAd(bannerAd);
            trackImpression(bannerAd._id);
          } else {
            setAd(null);
          }
        }
      } catch (err) {
        if (isMounted) setAd(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchActiveAd();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = () => {
    if (ad?._id) {
      recordAdDismissal(ad);
      trackDismissal(ad._id);
    }
    setDismissed(true);
  };

  // Zero reserved space: if loading, no ad, or dismissed, render absolutely nothing
  if (loading || !ad || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored Announcement"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
    >
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 border border-slate-700/80 shadow-xl group transition-all duration-300 hover:border-[#B8323C]/50">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white flex items-center justify-center transition cursor-pointer"
          aria-label="Dismiss advertisement"
          title="Dismiss ad (✕)"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 sm:p-6 lg:p-7">
          {/* Ad Visual / Media Banner */}
          {ad.imageUrl && (
            <div className="w-full md:w-5/12 lg:w-4/12 shrink-0 overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 border border-white/10 max-h-56">
              <img
                src={ad.imageUrl}
                alt={ad.title || "Fazilnagar Partner Advertisement"}
                className="w-full h-full object-cover object-center max-h-52 group-hover:scale-102 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Ad Content & Call To Action */}
          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 bg-[#B8323C] text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                <Sparkles className="w-3 h-3" />
                <span>Sponsored / विज्ञापन</span>
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Verified Community Partner
              </span>
            </div>

            <h3 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight font-heading leading-snug">
              {ad.title}
            </h3>

            {ad.description && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-2 sm:line-clamp-3">
                {ad.description}
              </p>
            )}

            {ad.destinationUrl ? (
              <div className="pt-2">
                <a
                  href={ad.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick(ad._id)}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-[#18232E] hover:text-[#B8323C] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition duration-200"
                >
                  <span>{ad.ctaText || "Visit Partner Website"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}

// ====================================================================
// 2. GLOBAL FLOATING & STICKY ADVERTISEMENTS (Mounted in App.jsx)
// - Floating Cards (bottom-right / bottom-left)
// - Sticky Bottom & Top Banners
// - Automatically suppresses over Reels / Fullscreen news feed
// ====================================================================
export function GlobalFloatingAndStickyAds() {
  const [ads, setAds] = useState([]);
  const [dismissedMap, setDismissedMap] = useState({});
  const [activeFloatingIndex, setActiveFloatingIndex] = useState(0);
  const location = useLocation();

  const isReelsPage =
    location.pathname === "/news" ||
    location.pathname === "/local-updates" ||
    location.pathname === "/directory/news";

  useEffect(() => {
    let isMounted = true;

    const fetchAds = async () => {
      try {
        const res = await API.get("/advertisements/active");
        if (isMounted) {
          const list = res.data?.ads || (res.data?.ad ? [res.data.ad] : []);
          setAds(list);

          // Track impressions for active visible ads
          list.forEach((a) => {
            if (a?._id && !isAdDismissed(a)) {
              trackImpression(a._id);
            }
          });
        }
      } catch (_) {
        if (isMounted) setAds([]);
      }
    };

    fetchAds();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDismiss = (ad) => {
    if (!ad?._id) return;
    recordAdDismissal(ad);
    trackDismissal(ad._id);
    setDismissedMap((prev) => ({ ...prev, [ad._id]: true }));
  };

  const isVisible = (ad) => {
    if (!ad?._id) return false;
    if (dismissedMap[ad._id]) return false;
    return !isAdDismissed(ad);
  };

  // Find eligible ads
  const floatingAds = ads.filter(
    (a) => (a.format === "floating" || (!a.format && a.format !== "banner")) && isVisible(a)
  );

  // Auto-rotate among multiple active floating ads every 9 seconds
  useEffect(() => {
    if (floatingAds.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFloatingIndex((prev) => (prev + 1) % floatingAds.length);
    }, 9000);
    return () => clearInterval(interval);
  }, [floatingAds.length]);

  const floatingAd =
    floatingAds.length > 0 ? floatingAds[activeFloatingIndex % floatingAds.length] : null;

  // On Reels full-screen feed, suppress sticky banners so video controls are unobstructed
  const stickyBottomAd = !isReelsPage
    ? ads.find((a) => a.format === "sticky-bottom" && isVisible(a))
    : null;
  const stickyTopAd = !isReelsPage
    ? ads.find((a) => a.format === "sticky-top" && isVisible(a))
    : null;

  // If no ads match, render nothing - zero empty space
  if (!floatingAd && !stickyBottomAd && !stickyTopAd) {
    return null;
  }

  return (
    <>
      {/* ----------------------------------------------------
          STICKY TOP BANNER AD (Fixed near top below navbar)
          ---------------------------------------------------- */}
      {stickyTopAd && (
        <div
          role="complementary"
          aria-label="Sponsored Top Banner"
          className="fixed top-[52px] sm:top-[60px] left-0 right-0 z-40 bg-gradient-to-r from-slate-950 via-[#18232E] to-slate-950 text-white border-b border-[#B8323C]/50 shadow-lg animate-in slide-in-from-top duration-300"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="shrink-0 bg-[#B8323C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Sponsored</span>
              </span>

              {stickyTopAd.imageUrl && (
                <img
                  src={stickyTopAd.imageUrl}
                  alt={stickyTopAd.title}
                  className="w-7 h-7 rounded-md object-cover shrink-0 border border-white/20 hidden sm:block"
                />
              )}

              <div className="truncate flex items-center gap-2">
                <span className="font-bold text-white truncate text-xs">
                  {stickyTopAd.title}
                </span>
                {stickyTopAd.description && (
                  <span className="text-slate-300 text-[11px] truncate hidden md:inline">
                    — {stickyTopAd.description}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {stickyTopAd.destinationUrl && (
                <a
                  href={stickyTopAd.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick(stickyTopAd._id)}
                  className="bg-white hover:bg-slate-100 text-[#18232E] font-bold text-[11px] px-3 py-1 rounded-lg flex items-center gap-1 transition shadow-xs"
                >
                  <span>{stickyTopAd.ctaText || "Explore"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                type="button"
                onClick={() => handleDismiss(stickyTopAd)}
                className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Close top banner"
                title="Dismiss ad (✕)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          STICKY BOTTOM BANNER AD (Fixed at bottom of screen)
          On mobile, placed above bottom app nav bar (bottom-14 sm:bottom-0)
          ---------------------------------------------------- */}
      {stickyBottomAd && (
        <div
          role="complementary"
          aria-label="Sponsored Sticky Bottom Banner"
          className="fixed bottom-14 sm:bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-slate-950 via-[#18232E] to-slate-950 text-white border-t border-slate-700 shadow-2xl animate-in slide-in-from-bottom duration-300"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="shrink-0 bg-[#B8323C] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Sponsored</span>
              </span>

              {stickyBottomAd.imageUrl && (
                <img
                  src={stickyBottomAd.imageUrl}
                  alt={stickyBottomAd.title}
                  className="w-9 h-9 rounded-lg object-cover shrink-0 border border-white/20"
                />
              )}

              <div className="truncate">
                <h4 className="font-bold text-white text-xs truncate">
                  {stickyBottomAd.title}
                </h4>
                {stickyBottomAd.description && (
                  <p className="text-slate-300 text-[11px] truncate">
                    {stickyBottomAd.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {stickyBottomAd.destinationUrl && (
                <a
                  href={stickyBottomAd.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick(stickyBottomAd._id)}
                  className="bg-[#B8323C] hover:bg-red-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                >
                  <span>{stickyBottomAd.ctaText || "Visit Partner"}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              <button
                type="button"
                onClick={() => handleDismiss(stickyBottomAd)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                aria-label="Dismiss sticky bottom banner"
                title="Dismiss ad (✕)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          FLOATING OVERLAY AD CARD (Corner popup with dismiss button)
          Placement: bottom-right (default) or bottom-left
          Mobile: Safe area positioning above mobile bottom bar
          ---------------------------------------------------- */}
      {floatingAd && (
        <aside
          role="complementary"
          aria-label="Sponsored Floating Advertisement"
          className={`fixed z-40 transition-all duration-300 ease-out animate-in fade-in zoom-in-95 duration-300 ${
            isReelsPage
              ? "bottom-20 left-3 max-w-[260px] sm:max-w-xs"
              : floatingAd.placement === "bottom-left"
              ? "bottom-16 sm:bottom-6 left-3 sm:left-6 w-[calc(100%-1.5rem)] sm:w-80 max-w-sm"
              : "bottom-16 sm:bottom-6 right-3 sm:right-6 w-[calc(100%-1.5rem)] sm:w-80 max-w-sm"
          } bg-gradient-to-br from-slate-900 via-[#18232E] to-slate-900 text-white rounded-2xl border border-slate-700/90 shadow-[0_12px_40px_rgba(0,0,0,0.4)] overflow-hidden`}
        >
          {/* Header Bar with Badge and Close (X) button */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-black/40 border-b border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-[#B8323C] text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Sponsored / विज्ञापन</span>
              </span>
              {(floatingAd.isPermanent || floatingAd.frequency === "permanent") && (
                <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                  ⭐ Permanent
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDismiss(floatingAd)}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/25 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Dismiss floating advertisement"
              title="Close ad (✕)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Media Image */}
          {floatingAd.imageUrl && (
            <div className="w-full h-28 sm:h-32 overflow-hidden bg-black/60 relative">
              <img
                src={floatingAd.imageUrl}
                alt={floatingAd.title || "Advertisement"}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          {/* Body Content */}
          <div className="p-3.5 space-y-2">
            <h4 className="text-xs sm:text-sm font-extrabold text-white leading-snug line-clamp-2">
              {floatingAd.title}
            </h4>

            {floatingAd.description && (
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed line-clamp-2">
                {floatingAd.description}
              </p>
            )}

            {floatingAd.destinationUrl && (
              <div className="pt-1 flex items-center justify-end">
                <a
                  href={floatingAd.destinationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackClick(floatingAd._id)}
                  className="w-full text-center inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 text-[#18232E] hover:text-[#B8323C] text-xs font-bold py-2 px-3 rounded-xl shadow-md transition"
                >
                  <span>{floatingAd.ctaText || "Learn More"}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
