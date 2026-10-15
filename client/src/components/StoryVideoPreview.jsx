import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Play, Pause, Film } from "lucide-react";
import API from "../api";

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
  const [isFailed, setIsFailed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);

  const backendBase = (API.defaults.baseURL || "").replace(/\/api\/?$/, "");

  const normalizeUrl = (u) => {
    if (!u || typeof u !== "string") return "";
    const trimmed = u.trim();
    if (trimmed.startsWith("blob:")) return "";
    if (trimmed.startsWith("/")) return `${backendBase}${trimmed}`;
    if (trimmed.includes("localhost:") || trimmed.includes("127.0.0.1:")) {
      const uploadsIdx = trimmed.indexOf("/uploads/");
      if (uploadsIdx !== -1) return `${backendBase}${trimmed.substring(uploadsIdx)}`;
      const driveIdx = trimmed.indexOf("/api/google-drive/");
      if (driveIdx !== -1) return `${backendBase}${trimmed.substring(driveIdx)}`;
    }
    return trimmed;
  };

  const isVideoExt = (url) => /\.(mp4|webm|mov|ogg|avi|m4v)($|\?)/i.test(url);
  const isImageExt = (url) => /\.(png|jpe?g|webp|gif|svg|bmp)($|\?)/i.test(url);

  const normVideo = normalizeUrl(story?.video);
  const normImage = normalizeUrl(story?.image);
  const normMedia = normalizeUrl(story?.mediaUrl);

  let videoUrl = "";
  let posterUrl = "";

  if (normVideo && !isImageExt(normVideo)) {
    videoUrl = normVideo;
  }
  if (normImage && !isVideoExt(normImage)) {
    posterUrl = normImage;
  }
  if (!videoUrl && normMedia && (isVideoExt(normMedia) || story?.mediaType === "video")) {
    videoUrl = normMedia;
  }
  if (!posterUrl && normMedia && isImageExt(normMedia)) {
    posterUrl = normMedia;
  }
  if (!posterUrl && fallbackPoster) {
    posterUrl = fallbackPoster;
  }

  // IntersectionObserver: Only play when visible in the mobile or desktop viewport (>40% visible)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsVisible(Boolean(entry && entry.isIntersecting && entry.intersectionRatio >= 0.4));
      },
      { threshold: [0.1, 0.4, 0.7] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Manage playback lifecycle strictly with refs and safe Promise handling
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
          })
          .catch((err) => {
            // Autoplay rejected by mobile browser policy
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
        p.then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
      }
    }
  };

  const storyDestination = story?._id ? `/news?storyId=${story._id}` : "/news";

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-950 flex items-center justify-center select-none group ${aspectRatio} ${className}`}
    >
      {videoUrl && !isFailed ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl || undefined}
          muted
          playsInline
          loop
          preload="metadata"
          className="w-full h-full object-cover pointer-events-none"
          onEnded={() => setIsPlaying(false)}
          onError={() => setIsFailed(true)}
        />
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
