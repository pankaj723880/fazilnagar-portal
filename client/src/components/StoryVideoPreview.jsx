import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Film,
  RotateCcw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { resolveStoryMedia } from "../utils/mediaUtils";

function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

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

  // Video state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const progressBarRef = useRef(null);
  const retryCountRef = useRef(0);
  const controlsTimeoutRef = useRef(null);

  const { videoUrl, imageUrl } = resolveStoryMedia(story);
  const posterUrl = imageUrl || fallbackPoster || "";

  useEffect(() => {
    retryCountRef.current = 0;
    setIsFailed(false);
    setIsBuffering(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [videoUrl]);

  // IntersectionObserver: Autoplay preview when visible (>35%) if user hasn't explicitly paused
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

    video.muted = isMuted;
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
            setIsPlaying(false);
          });
      }
    } else if (!isVisible && !isFullscreen) {
      video.pause();
      setIsPlaying(false);
    }
  }, [isVisible, videoUrl, isFailed, hasInteracted, isMuted, isFullscreen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentFs = Boolean(
        document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
      );
      setIsFullscreen(isCurrentFs);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleManualPlay = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    setHasInteracted(true);
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setIsFailed(false);
        }).catch(() => setIsPlaying(false));
      }
    }
    triggerControlsVisibility();
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && video.volume === 0) {
      video.volume = 1;
      setVolume(1);
    }
    triggerControlsVisibility();
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const newVol = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
    triggerControlsVisibility();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
      if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
        setDuration(video.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video && video.duration && !isNaN(video.duration)) {
      setDuration(video.duration);
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;

    const targetTime = parseFloat(e.target.value);
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
    triggerControlsVisibility();
  };

  const toggleFullscreen = async (e) => {
    e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!isFullscreen) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          await container.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle error:", err);
    }
    triggerControlsVisibility();
  };

  const triggerControlsVisibility = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 2800);
  };

  const handleVideoError = (e) => {
    const error = e?.target?.error;
    if (error && error.code === 1) return; // MEDIA_ERR_ABORTED

    if (retryCountRef.current < 3) {
      retryCountRef.current += 1;
      setIsBuffering(true);
      const delay = retryCountRef.current * 1500;
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
      }, delay);
      return;
    }

    console.warn("Story video preview error for URL:", videoUrl, error);
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
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (isPlaying) setShowControls(false);
      }}
      onClick={triggerControlsVisibility}
      className={`relative overflow-hidden bg-slate-950 flex items-center justify-center select-none group ${
        isFullscreen ? "w-screen h-screen fixed inset-0 z-[9999]" : `${aspectRatio} ${className}`
      }`}
    >
      {videoUrl ? (
        <>
          <video
            key={videoUrl}
            ref={videoRef}
            src={videoUrl}
            poster={posterUrl || undefined}
            muted={isMuted}
            playsInline
            webkit-playsinline="true"
            loop
            preload="metadata"
            controlsList="nodownload noplaybackrate"
            disablePictureInPicture
            draggable="false"
            data-protected-media="true"
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={`w-full h-full object-cover transition-opacity duration-200 select-none ${
              isFailed ? "opacity-0 pointer-events-none absolute inset-0" : "opacity-100"
            }`}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
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
            <div className="absolute inset-0 w-full h-full bg-slate-900/95 flex flex-col items-center justify-center text-slate-400 p-4 text-center space-y-2 z-20">
              <Film className="w-7 h-7 text-red-400/80" />
              <span className="text-[11px] font-semibold text-slate-300">
                Video playback unavailable
              </span>
              <p className="text-[10px] text-slate-400 max-w-[220px]">
                Could not load media file. Check network connection or retry.
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry Playback</span>
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
          <Loader2 className="w-8 h-8 text-white animate-spin drop-shadow-md" />
        </div>
      )}

      {/* Subtle Dark Gradient Overlay for Control Contrast */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Top Header Bar: Video Story Badge + External Story Link */}
      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between z-20 pointer-events-none">
        {showPlayBadge && (
          <span className="bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs border border-white/10">
            <Film className="w-3 h-3 text-red-400" />
            <span>Video Update</span>
          </span>
        )}

        {linkToViewer && (
          <Link
            to={storyDestination}
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto bg-black/70 hover:bg-black/90 text-white/90 hover:text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 backdrop-blur-md border border-white/15 transition-colors shadow-xs"
            aria-label="Open full story article"
          >
            <span>Full Story</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </Link>
        )}
      </div>

      {/* Center Big Play / Pause Button */}
      {videoUrl && !isFailed && !isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
          <button
            type="button"
            onClick={toggleManualPlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md transition-all duration-300 shadow-xl cursor-pointer pointer-events-auto ${
              isPlaying
                ? showControls
                  ? "bg-black/50 text-white opacity-80 hover:opacity-100 hover:scale-105"
                  : "opacity-0"
                : "bg-red-700/90 hover:bg-red-700 text-white scale-105 shadow-red-950/60 opacity-100"
            }`}
            aria-label={isPlaying ? "Pause video" : "Play video"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>
      )}

      {/* Full Bottom Playback Controls Bar */}
      {videoUrl && !isFailed && (
        <div
          className={`absolute inset-x-0 bottom-0 p-2 sm:p-2.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-25 transition-opacity duration-300 flex flex-col gap-1.5 ${
            showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Interactive Seek Bar / Timeline */}
          <div className="flex items-center gap-2 group/seek">
            <input
              ref={progressBarRef}
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek video position"
              className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer accent-red-600 focus:outline-none focus:ring-1 focus:ring-red-400 group-hover/seek:h-2 transition-all"
            />
          </div>

          {/* Controls Strip: Play/Pause, Time Display, Volume Slider, Fullscreen */}
          <div className="flex items-center justify-between text-white text-xs">
            {/* Left: Play/Pause & Time */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleManualPlay}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>

              <span className="text-[11px] font-mono text-slate-200 select-none">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>

            {/* Right: Volume & Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Volume Button + Compact Slider */}
              <div className="flex items-center gap-1 group/vol">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  aria-label="Volume slider"
                  className="w-12 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white transition-all hidden sm:block"
                />
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-3.5 h-3.5" />
                ) : (
                  <Maximize className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

