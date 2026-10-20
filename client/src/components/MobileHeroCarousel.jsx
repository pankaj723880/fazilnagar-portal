import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";

/**
 * Mobile 16:9 Hero Carousel for Fazilnagar Town Portal.
 * Reuses the existing desktop hero slides, links, captions, and auto-play logic.
 *
 * Requirements:
 * - True 16:9 display ratio on mobile (aspect-ratio: 16 / 9, width: 100%).
 * - object-fit: cover without stretching images.
 * - Smooth touch swipe navigation (left / right).
 * - Autoplay with configurable interval, pausing on touch interaction.
 * - Non-intrusive navigation arrows and dot indicators.
 * - Zero horizontal overflow.
 */
export default function MobileHeroCarousel({
  slides = [],
  autoplay = true,
  interval = 5000,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Touch swipe tracking
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isSwiping = useRef(false);

  const totalSlides = slides.length;

  // Auto-play interval
  useEffect(() => {
    if (!autoplay || isPaused || totalSlides <= 1) return;

    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, Math.max(3000, interval));

    return () => clearInterval(timer);
  }, [autoplay, isPaused, totalSlides, interval]);

  if (!slides || slides.length === 0) {
    return null;
  }

  const handlePrev = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNext = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  };

  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isSwiping.current) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swiped Left -> Next
        handleNext();
      } else {
        // Swiped Right -> Prev
        handlePrev();
      }
    }

    // Resume autoplay shortly after touch release
    setTimeout(() => {
      setIsPaused(false);
    }, 1500);
  };

  const activeSlide = slides[currentIndex % totalSlides] || slides[0];

  return (
    <div
      className="w-full max-w-full my-2.5 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Fazilnagar Homepage Carousel"
    >
      <div
        className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-slate-200/80 bg-slate-900 group"
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Carousel Slide Images */}
        {slides.map((slide, idx) => {
          const isCurrent = idx === currentIndex;
          const fallback = slide.fallbackSrc || "/images/fazilnagar_pawanagar.webp";
          const imageSrc = slide.src || slide.imageUrl || fallback;

          return (
            <div
              key={slide.id || slide._id || idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isCurrent ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
              }`}
              style={{
                backgroundImage: `url(${fallback})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <img
                src={imageSrc}
                alt={slide.title || "Fazilnagar"}
                loading={idx === 0 ? "eager" : "lazy"}
                decoding={idx === 0 ? "sync" : "async"}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  if (e.currentTarget.src !== fallback && !e.currentTarget.src.endsWith(fallback)) {
                    e.currentTarget.src = fallback;
                  }
                }}
                className="w-full h-full object-cover object-center"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              {/* Bottom Vignette Gradient for Readable Text & Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 pointer-events-none" />
            </div>
          );
        })}

        {/* Slide Content Caption Overlay */}
        <Link
          to={activeSlide.linkUrl || "/directory"}
          className="absolute inset-0 z-20 flex flex-col justify-end p-3 sm:p-4 text-white cursor-pointer"
        >
          {/* Location Badge */}
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs border border-white/20 text-[10px] font-semibold text-amber-300 w-fit mb-1 shadow-xs">
            <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
            <span className="truncate max-w-[200px]">
              {activeSlide.location || activeSlide.subtitle || "Fazilnagar"}
            </span>
          </div>

          {/* Slide Title */}
          <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight line-clamp-1 drop-shadow-md">
            {activeSlide.title || "Fazilnagar Town Portal"}
          </h3>

          {/* Optional Caption */}
          {activeSlide.caption && (
            <p className="text-[10px] text-slate-200 line-clamp-1 font-medium mt-0.5 drop-shadow-xs">
              {activeSlide.caption}
            </p>
          )}
        </Link>

        {/* Navigation Arrows (Rendered only if > 1 slide) */}
        {totalSlides > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous slide"
              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition active:scale-90 border border-white/10 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next slide"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/45 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition active:scale-90 border border-white/10 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Carousel Dot Indicators */}
        {totalSlides > 1 && (
          <div className="absolute bottom-2 right-3 z-30 flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                aria-label={`Go to slide ${idx + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex % totalSlides
                    ? "w-4 h-1.5 bg-amber-400"
                    : "w-1.5 h-1.5 bg-white/60 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
