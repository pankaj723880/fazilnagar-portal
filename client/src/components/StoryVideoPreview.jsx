import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Film, RotateCcw, Loader2 } from "lucide-react";
import { resolveStoryMedia } from "../utils/mediaUtils";

export default function StoryVideoPreview({
  story,
  className = "",
  aspectRatio = "aspect-video",
  fallbackPoster = "",
  showPlayBadge = true,
  linkToViewer = true,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const retryCountRef = useRef(0);

  const { videoUrl, imageUrl, mimeType } = resolveStoryMedia(story);
  const posterUrl = imageUrl || fallbackPoster || "";

  useEffect(() => {
    retryCountRef.current = 0;
    setIsFailed(false);
    setIsBuffering(false);
    setIsPlaying(false);
  }, [videoUrl]);

  // IntersectionObserver: Play when visible in the viewport (>35% visible)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(Boolean(entry && entry.isIntersecting && entry.intersectionRatio >= 0.35));
      },
      { threshold: [0.1, 0.35, 0.7] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Manage playback lifecycle with safe Promise handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl || isFailed) return;

    video.muted = true;
    video.playsInline = true;

    if (isVisible && !hasInteracted) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch(() => {
            // Autoplay restricted by browser policy
            setIsPlaying(false);
          });
      }
    } else if (!isVisible) {
      video.pause();
      setIsPlaying(false);
    }

    return () => {
      video.pause();
    };
  }, [isVisible, videoUrl, isFailed, hasInteracted]);

  const toggleManualPlay = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    setHasInteracted(true);
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.muted = true;
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setIsFailed(false);
        }).catch(() => setIsPlaying(false));
      }
    }
  };

  const handleVideoError = (e) => {
    const error = e?.target?.error;
    if (error && error.code === 1) return; // MEDIA_ERR_ABORTED

    if (retryCountRef.current < 2) {
      retryCountRef.current += 1;
      setIsBuffering(true);
      setTimeout(() => {
        const video = videoRef.current;
        if (video) {
          try {
            video.load();
            video.play().then(() => {
              setIsPlaying(true);
              setIsBuffering(false);
              setIsFailed(false);
            }).catch(() => {
              setIsBuffering(false);
            });
          } catch {
            setIsBuffering(false);
          }
        }
      }, 1200);
      return;
    }

    console.warn("Story video preview error:", videoUrl, error);
    setIsFailed(true);
    setIsBuffering(false);
  };

  const handleRetry = (e) => {
    e.stopPropagation();
    retryCountRef.current = 0;
    setIsFailed(false);
    setIsBuffering(true);
    const video = videoRef.current;
    if (video) {
      try {
        video.load();
        video
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsBuffering(false);
          })
          .catch(() => {
            setIsPlaying(false);
            setIsBuffering(false);
          });
      } catch {
        setIsBuffering(false);
      }
    }
  };

  const storyDestination = story?._id ? `/news?storyId=${story._id}` : "/news";

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-950 flex items-center justify-center select-none group ${aspectRatio} ${className}`}
    >
      {videoUrl ? (
        <>
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl || undefined}
            muted
            playsInline
            webkit-playsinline="true"
            crossOrigin="anonymous"
            loop
            preload="metadata"
            className={`w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
              isFailed ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
            }`}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => {
              setIsBuffering(false);
              setIsPlaying(true);
              setIsFailed(false);
            }}
            onCanPlay={() => setIsBuffering(false)}
            onEnded={() => setIsPlaying(false)}
            onError={handleVideoError}
          />
          {isFailed && (
            <div className="absolute inset-0 w-full h-full bg-slate-900/95 flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-2 z-10">
              <Film className="w-7 h-7 text-red-400/80" />
              <span className="text-[11px] font-semibold text-slate-300">Video preview unavailable</span>
              <button
                type="button"
                onClick={handleRetry}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </>
      ) : posterUrl ? (
        <img
          src={posterUrl}
          alt={story?.title || "Story Preview"}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500">
          <Film className="w-8 h-8 opacity-40" />
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && !isFailed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
          <Loader2 className="w-7 h-7 text-white animate-spin drop-shadow-md" />
        </div>
      )}

      {/* Subtle dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

      {/* Top Video Tag Badge */}
      {showPlayBadge && (
        <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm border border-white/10 z-10 pointer-events-none">
          <Film className="w-3 h-3 text-red-400" />
          <span>Video Story</span>
        </span>
      )}

      {/* Center Interactive Play / Pause Control Button */}
      {!isFailed && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <button
            type="button"
            onClick={toggleManualPlay}
            className={`w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 shadow-xl cursor-pointer ${
              isPlaying
                ? "bg-black/30 text-white/80 opacity-0 group-hover:opacity-100"
                : "bg-red-600/90 hover:bg-red-600 text-white scale-105 shadow-red-900/50"
            }`}
            aria-label={isPlaying ? "Pause video preview" : "Play video preview"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Bottom Link to Full-Screen Story Viewer */}
      {linkToViewer && (
        <Link
          to={storyDestination}
          className="absolute inset-x-0 bottom-0 py-1.5 px-3 bg-gradient-to-t from-black/90 to-transparent text-white text-[11px] font-semibold flex items-center justify-between z-10 hover:text-red-300 transition-colors"
        >
          <span>Tap to watch full story</span>
          <span className="text-red-400 font-bold">Open →</span>
        </Link>
      )}
    </div>
  );
}
