import { useState, useEffect } from "react";
import API from "../api";
import { ExternalLink, Sparkles } from "lucide-react";

export default function AdvertisementSlot() {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchActiveAd = async () => {
      try {
        const res = await API.get("/advertisements/active");
        if (isMounted) {
          if (res.data?.ad) {
            setAd(res.data.ad);
            trackImpression(res.data.ad._id);
          } else {
            setAd(null);
          }
        }
      } catch (err) {
        // Silently fail - if no ad or backend offline, render nothing
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

  const handleAdClick = () => {
    if (!ad?._id) return;
    try {
      API.post(`/advertisements/${ad._id}/click`).catch(() => {});
    } catch (_) {}
  };

  // STRICT REQUIREMENT: If loading or no active ad exists, render ABSOLUTELY NOTHING.
  // No empty container, no blank banner, no skeleton, no margin, zero height.
  if (loading || !ad) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored Announcement"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
    >
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-[#18232E] to-slate-900 border border-slate-700/80 shadow-xl group transition-all duration-300 hover:border-[#B8323C]/50">
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
                  onClick={handleAdClick}
                  className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-[#18232E] hover:text-[#B8323C] text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition duration-200"
                >
                  <span>Visit Partner Website</span>
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
