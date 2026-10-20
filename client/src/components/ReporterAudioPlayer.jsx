import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Mic, Radio } from "lucide-react";
import { formatAudioTime } from "../utils/audioProcessing";

export default function ReporterAudioPlayer({
  audioUrl,
  audioMeta,
  authorName = "Reporter",
  compact = false,
  className = "",
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioMeta?.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    if (audioMeta?.duration) {
      setDuration(audioMeta.duration);
    }
  }, [audioMeta]);

  if (!audioUrl) return null;

  const togglePlay = (e) => {
    e?.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Audio playback error:", err);
          setHasError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
    setHasError(false);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const cyclePlaybackRate = (e) => {
    e.stopPropagation();
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full shadow-lg ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onError={() => setHasError(true)}
        />
        <button
          type="button"
          onClick={togglePlay}
          className="w-6 h-6 rounded-full bg-[#B8323C] hover:bg-rose-600 flex items-center justify-center text-white cursor-pointer transition-all"
        >
          {isPlaying ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current ml-0.5" />
          )}
        </button>
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <Mic className="w-3 h-3 text-rose-400" />
          <span>{formatAudioTime(currentTime)}</span>
          <span className="text-white/60">/ {formatAudioTime(duration)}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl bg-gradient-to-r from-slate-900 to-[#18232E] text-white p-3.5 sm:p-4 border border-slate-700/60 shadow-lg ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
      />

      {/* Header with Reporter Dispatch Badge */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Mic className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                Ground Audio Dispatch
              </span>
              <span className="text-[10px] text-slate-400 font-medium">• {authorName}</span>
            </div>
            <p className="text-[10px] text-slate-300">
              Listen to the reporter&apos;s audio coverage from the location
            </p>
          </div>
        </div>

        {/* Animated equalizer bars when playing */}
        {isPlaying && (
          <div className="flex items-center gap-0.5 h-4">
            <span className="w-1 bg-rose-500 rounded-full animate-bounce h-3" />
            <span className="w-1 bg-rose-400 rounded-full animate-bounce h-4 [animation-delay:0.15s]" />
            <span className="w-1 bg-rose-500 rounded-full animate-bounce h-2.5 [animation-delay:0.3s]" />
            <span className="w-1 bg-rose-400 rounded-full animate-bounce h-3.5 [animation-delay:0.1s]" />
          </div>
        )}
      </div>

      {hasError ? (
        <div className="p-2 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs text-center">
          Audio could not be loaded or is in an unsupported format.
        </div>
      ) : (
        <div className="space-y-2">
          {/* Timeline Range Scrubber */}
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#B8323C]"
            />
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-[#B8323C] to-rose-600 hover:from-rose-600 hover:to-rose-700 flex items-center justify-center text-white shadow-md cursor-pointer transition-all active:scale-95"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <span className="text-[11px] font-mono text-slate-300">
                {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={cyclePlaybackRate}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                title="Playback speed"
              >
                {playbackRate}x
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
