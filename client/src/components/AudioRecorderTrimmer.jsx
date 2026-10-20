import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Scissors,
  Volume2,
  VolumeX,
  Upload,
  Trash2,
  Check,
  AlertCircle,
  Radio,
  Clock,
  Sparkles,
  Split,
  Undo2,
} from "lucide-react";
import {
  decodeAudioBlob,
  extractWaveformPeaks,
  trimAudioBuffer,
  spliceCutAudioBuffer,
  bufferToWavBlob,
  formatAudioTime,
} from "../utils/audioProcessing";

const MAX_RECORD_SECONDS = 300; // 5 minutes

export default function AudioRecorderTrimmer({
  onAudioChange,
  onAudioClear,
  existingAudioUrl = "",
  existingDuration = 0,
}) {
  // Recorder states: "idle" | "recording" | "paused" | "ready"
  const [recorderState, setRecorderState] = useState(existingAudioUrl ? "ready" : "idle");
  const [recordDuration, setRecordDuration] = useState(0);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [activeTab, setActiveTab] = useState("mic"); // "mic" | "upload"
  const [liveVolume, setLiveVolume] = useState(0.05);

  // Audio Buffer & History for Non-Destructive Editing
  const [originalBuffer, setOriginalBuffer] = useState(null);
  const [currentBuffer, setCurrentBuffer] = useState(null);
  const [bufferHistory, setBufferHistory] = useState([]);
  const [peaks, setPeaks] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(existingAudioUrl || "");
  const [totalDuration, setTotalDuration] = useState(existingDuration || 0);

  // Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  // Editing Tool: "trim" (start/end) | "cut" (middle remove)
  const [editMode, setEditMode] = useState("trim");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [cutStart, setCutStart] = useState(0);
  const [cutEnd, setCutEnd] = useState(0);
  const [editStatusMsg, setEditStatusMsg] = useState("");
  const [previewingCutSegment, setPreviewingCutSegment] = useState(false);

  // Refs
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const recordTimerRef = useRef(null);
  const audioElementRef = useRef(null);
  const waveformCanvasRef = useRef(null);
  const fileUploadInputRef = useRef(null);

  // Cleanup object URLs and audio streams on unmount
  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl]);

  // Load existing audio on initial mount if provided
  useEffect(() => {
    if (existingAudioUrl && !currentBuffer) {
      fetch(existingAudioUrl)
        .then((res) => res.blob())
        .then(async (blob) => {
          const decoded = await decodeAudioBlob(blob);
          setOriginalBuffer(decoded);
          setCurrentBuffer(decoded);
          setBufferHistory([decoded]);
          setPeaks(extractWaveformPeaks(decoded, 120));
          setTotalDuration(decoded.duration);
          setTrimEnd(decoded.duration);
          setCutStart(decoded.duration * 0.25);
          setCutEnd(decoded.duration * 0.5);
          setAudioBlob(blob);
        })
        .catch((err) => {
          console.warn("Failed to decode initial audio:", err);
        });
    }
  }, [existingAudioUrl]);

  // =========================================================================
  // MICROPHONE RECORDING LOGIC
  // =========================================================================
  const startRecording = async () => {
    setMicPermissionDenied(false);
    setEditStatusMsg("");
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Audio analysis for live input meter
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolumeMeter = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setLiveVolume(Math.min(1, Math.max(0.08, avg / 128)));
        animFrameRef.current = requestAnimationFrame(updateVolumeMeter);
      };
      updateVolumeMeter();

      // Setup MediaRecorder
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/ogg";
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (ctx.state !== "closed") ctx.close().catch(() => {});

        const rawBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        try {
          const decoded = await decodeAudioBlob(rawBlob);
          // Convert decoded buffer to high compatibility 16-bit PCM WAV
          const wavBlob = bufferToWavBlob(decoded);
          const newUrl = URL.createObjectURL(wavBlob);

          setOriginalBuffer(decoded);
          setCurrentBuffer(decoded);
          setBufferHistory([decoded]);
          setPeaks(extractWaveformPeaks(decoded, 120));
          setTotalDuration(decoded.duration);
          setTrimStart(0);
          setTrimEnd(decoded.duration);
          setCutStart(Math.max(0, decoded.duration * 0.25));
          setCutEnd(Math.min(decoded.duration, decoded.duration * 0.5));
          setAudioBlob(wavBlob);
          setAudioUrl(newUrl);
          setRecorderState("ready");

          if (onAudioChange) {
            onAudioChange({
              blob: wavBlob,
              duration: decoded.duration,
              name: "reporter_voice_note.wav",
              url: newUrl,
            });
          }
        } catch (err) {
          console.error("Audio decoding error:", err);
          setEditStatusMsg("Failed to decode audio. Please try recording again.");
          setRecorderState("idle");
        }
      };

      recorder.start(250);
      setRecorderState("recording");
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= MAX_RECORD_SECONDS) {
            stopRecording();
            return MAX_RECORD_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setMicPermissionDenied(true);
      setRecorderState("idle");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recorderState === "recording") {
      mediaRecorderRef.current.pause();
      setRecorderState("paused");
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recorderState === "paused") {
      mediaRecorderRef.current.resume();
      setRecorderState("recording");
      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= MAX_RECORD_SECONDS) {
            stopRecording();
            return MAX_RECORD_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === "recording" ||
        mediaRecorderRef.current.state === "paused")
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // =========================================================================
  // FILE UPLOAD ALTERNATIVE
  // =========================================================================
  const handleAudioFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditStatusMsg("");
    try {
      const decoded = await decodeAudioBlob(file);
      const wavBlob = bufferToWavBlob(decoded);
      const newUrl = URL.createObjectURL(wavBlob);

      setOriginalBuffer(decoded);
      setCurrentBuffer(decoded);
      setBufferHistory([decoded]);
      setPeaks(extractWaveformPeaks(decoded, 120));
      setTotalDuration(decoded.duration);
      setTrimStart(0);
      setTrimEnd(decoded.duration);
      setCutStart(Math.max(0, decoded.duration * 0.25));
      setCutEnd(Math.min(decoded.duration, decoded.duration * 0.5));
      setAudioBlob(wavBlob);
      setAudioUrl(newUrl);
      setRecorderState("ready");

      if (onAudioChange) {
        onAudioChange({
          blob: wavBlob,
          duration: decoded.duration,
          name: file.name.replace(/\.[^/.]+$/, "") + ".wav",
          url: newUrl,
        });
      }
    } catch (err) {
      console.error("Audio upload error:", err);
      setEditStatusMsg("Invalid or unsupported audio file. Please upload MP3, WAV, M4A, or WebM.");
    }
  };

  // =========================================================================
  // PLAYBACK CONTROLS
  // =========================================================================
  const togglePlay = () => {
    if (!audioElementRef.current) return;
    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
      setPreviewingCutSegment(false);
    } else {
      audioElementRef.current.playbackRate = playbackRate;
      audioElementRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleTimeUpdate = () => {
    if (!audioElementRef.current) return;
    const cur = audioElementRef.current.currentTime;
    setCurrentTime(cur);

    // If previewing middle cut segment, stop automatically when it reaches cutEnd
    if (previewingCutSegment && cur >= cutEnd) {
      audioElementRef.current.pause();
      setIsPlaying(false);
      setPreviewingCutSegment(false);
    }
  };

  const handleSeek = (newTime) => {
    if (!audioElementRef.current) return;
    const clamped = Math.max(0, Math.min(newTime, totalDuration));
    audioElementRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioElementRef.current) {
      audioElementRef.current.playbackRate = nextRate;
    }
  };

  // Preview only the segment selected for middle-cut removal
  const previewMiddleCut = () => {
    if (!audioElementRef.current) return;
    audioElementRef.current.currentTime = cutStart;
    setCurrentTime(cutStart);
    setPreviewingCutSegment(true);
    audioElementRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  };

  // =========================================================================
  // ADVANCED TRIMMING & MIDDLE-CUT SPLICING
  // =========================================================================
  const applyStartEndTrim = () => {
    if (!currentBuffer) return;
    if (trimStart >= trimEnd || trimEnd - trimStart < 0.5) {
      setEditStatusMsg("Minimum trim selection must be at least 0.5 seconds.");
      return;
    }

    try {
      const trimmed = trimAudioBuffer(currentBuffer, trimStart, trimEnd);
      const newWavBlob = bufferToWavBlob(trimmed);
      const newUrl = URL.createObjectURL(newWavBlob);

      // Save to history for undo
      setBufferHistory((prev) => [...prev, currentBuffer]);
      setCurrentBuffer(trimmed);
      setPeaks(extractWaveformPeaks(trimmed, 120));
      setTotalDuration(trimmed.duration);
      setTrimStart(0);
      setTrimEnd(trimmed.duration);
      setCutStart(Math.max(0, trimmed.duration * 0.25));
      setCutEnd(Math.min(trimmed.duration, trimmed.duration * 0.5));
      setAudioBlob(newWavBlob);
      setAudioUrl(newUrl);
      setCurrentTime(0);
      if (audioElementRef.current) audioElementRef.current.currentTime = 0;

      setEditStatusMsg("✓ Trim applied successfully! Beginning and end updated.");

      if (onAudioChange) {
        onAudioChange({
          blob: newWavBlob,
          duration: trimmed.duration,
          name: "reporter_voice_trimmed.wav",
          url: newUrl,
        });
      }
    } catch (err) {
      console.error("Trim apply error:", err);
      setEditStatusMsg("Failed to apply trim. " + err.message);
    }
  };

  const applyMiddleCutSplice = () => {
    if (!currentBuffer) return;
    if (cutStart >= cutEnd) {
      setEditStatusMsg("Cut start point must be before cut end point.");
      return;
    }
    const remainingTime = currentBuffer.duration - (cutEnd - cutStart);
    if (remainingTime < 0.5) {
      setEditStatusMsg("Cannot cut entire clip. At least 0.5s of audio must remain.");
      return;
    }

    try {
      const spliced = spliceCutAudioBuffer(currentBuffer, cutStart, cutEnd);
      const newWavBlob = bufferToWavBlob(spliced);
      const newUrl = URL.createObjectURL(newWavBlob);

      // Save to history for undo
      setBufferHistory((prev) => [...prev, currentBuffer]);
      setCurrentBuffer(spliced);
      setPeaks(extractWaveformPeaks(spliced, 120));
      setTotalDuration(spliced.duration);
      setTrimStart(0);
      setTrimEnd(spliced.duration);
      setCutStart(Math.max(0, spliced.duration * 0.25));
      setCutEnd(Math.min(spliced.duration, spliced.duration * 0.5));
      setAudioBlob(newWavBlob);
      setAudioUrl(newUrl);
      setCurrentTime(0);
      if (audioElementRef.current) audioElementRef.current.currentTime = 0;

      const removedSecs = (cutEnd - cutStart).toFixed(1);
      setEditStatusMsg(
        `✓ Middle segment cut (${removedSecs}s removed). Remaining audio seamlessly spliced!`
      );

      if (onAudioChange) {
        onAudioChange({
          blob: newWavBlob,
          duration: spliced.duration,
          name: "reporter_voice_spliced.wav",
          url: newUrl,
        });
      }
    } catch (err) {
      console.error("Splice cut error:", err);
      setEditStatusMsg("Failed to remove middle segment. " + err.message);
    }
  };

  const undoLastEdit = () => {
    if (bufferHistory.length === 0) return;
    const previous = bufferHistory[bufferHistory.length - 1];
    const newHistory = bufferHistory.slice(0, -1);

    const newWavBlob = bufferToWavBlob(previous);
    const newUrl = URL.createObjectURL(newWavBlob);

    setBufferHistory(newHistory);
    setCurrentBuffer(previous);
    setPeaks(extractWaveformPeaks(previous, 120));
    setTotalDuration(previous.duration);
    setTrimStart(0);
    setTrimEnd(previous.duration);
    setCutStart(Math.max(0, previous.duration * 0.25));
    setCutEnd(Math.min(previous.duration, previous.duration * 0.5));
    setAudioBlob(newWavBlob);
    setAudioUrl(newUrl);
    setCurrentTime(0);
    setEditStatusMsg("✓ Reverted to previous version.");

    if (onAudioChange) {
      onAudioChange({
        blob: newWavBlob,
        duration: previous.duration,
        name: "reporter_voice_undo.wav",
        url: newUrl,
      });
    }
  };

  const resetToOriginal = () => {
    if (!originalBuffer) return;
    const originalBlob = bufferToWavBlob(originalBuffer);
    const newUrl = URL.createObjectURL(originalBlob);

    setBufferHistory([originalBuffer]);
    setCurrentBuffer(originalBuffer);
    setPeaks(extractWaveformPeaks(originalBuffer, 120));
    setTotalDuration(originalBuffer.duration);
    setTrimStart(0);
    setTrimEnd(originalBuffer.duration);
    setCutStart(Math.max(0, originalBuffer.duration * 0.25));
    setCutEnd(Math.min(originalBuffer.duration, originalBuffer.duration * 0.5));
    setAudioBlob(originalBlob);
    setAudioUrl(newUrl);
    setCurrentTime(0);
    setEditStatusMsg("✓ Reset back to raw recorded audio.");

    if (onAudioChange) {
      onAudioChange({
        blob: originalBlob,
        duration: originalBuffer.duration,
        name: "reporter_voice_raw.wav",
        url: newUrl,
      });
    }
  };

  const discardAudio = () => {
    if (audioUrl && audioUrl.startsWith("blob:")) {
      URL.revokeObjectURL(audioUrl);
    }
    setRecorderState("idle");
    setOriginalBuffer(null);
    setCurrentBuffer(null);
    setBufferHistory([]);
    setPeaks([]);
    setAudioBlob(null);
    setAudioUrl("");
    setTotalDuration(0);
    setCurrentTime(0);
    setEditStatusMsg("");
    if (fileUploadInputRef.current) fileUploadInputRef.current.value = "";
    if (onAudioClear) onAudioClear();
  };

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================
  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;
  const trimStartPercent = totalDuration > 0 ? (trimStart / totalDuration) * 100 : 0;
  const trimEndPercent = totalDuration > 0 ? (trimEnd / totalDuration) * 100 : 100;
  const cutStartPercent = totalDuration > 0 ? (cutStart / totalDuration) * 100 : 25;
  const cutEndPercent = totalDuration > 0 ? (cutEnd / totalDuration) * 100 : 50;

  return (
    <div className="w-full bg-[#FAFAFA] dark:bg-[#1E293B]/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioElementRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            setPreviewingCutSegment(false);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          muted={isMuted}
        />
      )}

      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-[#B8323C] dark:text-rose-400">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs sm:text-sm text-[#18232E] dark:text-white flex items-center gap-1.5">
              <span>Reporter Voice Narration</span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                (आवाज़ रिकॉर्ड करें)
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Add spoken ground updates, witness interviews, or local news voiceovers.
            </p>
          </div>
        </div>

        {/* Tab switch (only if not currently recording or in ready preview) */}
        {recorderState === "idle" && (
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800/80 p-0.5 rounded-xl text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("mic")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "mic"
                  ? "bg-white dark:bg-slate-700 text-[#B8323C] dark:text-rose-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Mic className="w-3 h-3" />
              <span>Record</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === "upload"
                  ? "bg-white dark:bg-slate-700 text-[#B8323C] dark:text-rose-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              <Upload className="w-3 h-3" />
              <span>Upload Audio</span>
            </button>
          </div>
        )}
      </div>

      {/* Permission denied alert */}
      {micPermissionDenied && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Microphone access was blocked or denied. Please enable microphone permissions in your browser or switch to &quot;Upload Audio&quot;.
          </span>
        </div>
      )}

      {/* =================================================================== */}
      {/* 1. IDLE STATE: MIC OR UPLOAD PROMPT                                 */}
      {/* =================================================================== */}
      {recorderState === "idle" && (
        <div className="mt-4">
          {activeTab === "mic" ? (
            <div className="text-center py-6 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900/40 flex flex-col items-center">
              <button
                type="button"
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#B8323C] to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all group mb-3 cursor-pointer"
                title="Click to start voice recording"
              >
                <Mic className="w-7 h-7 group-hover:scale-110 transition-transform" />
              </button>
              <h5 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                Click to Start Voice Recording
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Speak clearly into your phone or PC microphone. You will be able to pause, trim edges, and cut out any mistakes afterward.
              </p>
            </div>
          ) : (
            <div className="text-center py-6 px-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900/40 flex flex-col items-center">
              <input
                ref={fileUploadInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
                onChange={handleAudioFileUpload}
                className="hidden"
                id="reporter-audio-file-input"
              />
              <label
                htmlFor="reporter-audio-file-input"
                className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#B8323C] hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center mb-3 cursor-pointer transition-colors shadow-xs"
              >
                <Upload className="w-6 h-6" />
              </label>
              <label
                htmlFor="reporter-audio-file-input"
                className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 cursor-pointer hover:underline"
              >
                Choose an audio file to attach
              </label>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Supports MP3, WAV, M4A, OGG, or WebM audio files up to 25MB.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. RECORDING / PAUSED STATE                                         */}
      {/* =================================================================== */}
      {(recorderState === "recording" || recorderState === "paused") && (
        <div className="mt-4 p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-rose-200 dark:border-rose-950 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                {recorderState === "recording" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    recorderState === "recording" ? "bg-rose-600" : "bg-amber-500"
                  }`}
                ></span>
              </span>
              <span className="font-extrabold text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                {recorderState === "recording" ? "Recording Live..." : "Recording Paused"}
              </span>
            </div>

            {/* Live timer */}
            <div className="flex items-center gap-1.5 font-mono text-base font-black text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatAudioTime(recordDuration)}</span>
              <span className="text-slate-400 text-xs">/ 05:00</span>
            </div>
          </div>

          {/* Animated Audio Level Visualizer */}
          <div className="h-14 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1 px-4 mb-5 overflow-hidden">
            {new Array(32).fill(0).map((_, i) => {
              const heightMultiplier =
                recorderState === "recording"
                  ? Math.sin((i / 32) * Math.PI) * liveVolume * 100 + (i % 2 === 0 ? 10 : 5)
                  : 8;
              const barHeight = Math.max(6, Math.min(48, heightMultiplier));
              return (
                <div
                  key={i}
                  className="w-1.5 bg-[#B8323C] dark:bg-rose-500 rounded-full transition-all duration-75 ease-out"
                  style={{ height: `${barHeight}px` }}
                />
              );
            })}
          </div>

          {/* Recording Control Buttons */}
          <div className="flex items-center justify-center gap-3">
            {recorderState === "recording" ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume</span>
              </button>
            )}

            <button
              type="button"
              onClick={stopRecording}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#B8323C] to-rose-600 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Finish & Preview</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. READY STATE: PREVIEW, WAVEFORM, & ADVANCED TRIMMING / MIDDLE CUT */}
      {/* =================================================================== */}
      {recorderState === "ready" && (
        <div className="mt-4 space-y-4">
          {/* Audio Meta Header & Discard */}
          <div className="flex items-center justify-between bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 p-2.5 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                Audio Ready for Story ({formatAudioTime(totalDuration, true)}, 16-bit PCM WAV)
              </span>
            </div>

            <button
              type="button"
              onClick={discardAudio}
              className="px-2 py-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Discard audio and record/upload new"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Discard / Re-record</span>
            </button>
          </div>

          {/* Status Message / Notification */}
          {editStatusMsg && (
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs font-medium flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-600" />
              <span>{editStatusMsg}</span>
            </div>
          )}

          {/* INTERACTIVE WAVEFORM CONTAINER */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs select-none">
            {/* Waveform Bars */}
            <div
              className="relative h-20 w-full flex items-center gap-[2px] cursor-pointer overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-950/50 px-2"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                handleSeek(ratio * totalDuration);
              }}
            >
              {peaks.map((peak, idx) => {
                const barRatio = idx / peaks.length;
                const isPlayed = barRatio <= currentTime / (totalDuration || 1);

                // Highlight middle-cut removal zone in warning red/amber
                const isInCutZone =
                  editMode === "cut" &&
                  barRatio >= cutStart / (totalDuration || 1) &&
                  barRatio <= cutEnd / (totalDuration || 1);

                // Dim outer trimmed regions
                const isTrimmedOut =
                  editMode === "trim" &&
                  (barRatio < trimStart / (totalDuration || 1) ||
                    barRatio > trimEnd / (totalDuration || 1));

                let barColor = isPlayed
                  ? "bg-[#B8323C] dark:bg-rose-500"
                  : "bg-slate-300 dark:bg-slate-700";

                if (isInCutZone) {
                  barColor = "bg-amber-500 dark:bg-amber-400";
                } else if (isTrimmedOut) {
                  barColor = "bg-slate-200 dark:bg-slate-800 opacity-40";
                }

                return (
                  <div
                    key={idx}
                    className={`flex-1 rounded-full transition-all duration-75 ${barColor}`}
                    style={{
                      height: `${Math.max(10, peak * 68)}px`,
                    }}
                  />
                );
              })}

              {/* Playhead indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-600 shadow-md pointer-events-none transition-all duration-75 z-20"
                style={{ left: `${progressPercent}%` }}
              >
                <div className="w-2.5 h-2.5 -ml-1 rounded-full bg-rose-600 -top-1 absolute" />
              </div>

              {/* Middle Cut Overlay Visualizer */}
              {editMode === "cut" && (
                <div
                  className="absolute top-0 bottom-0 bg-amber-500/20 border-x-2 border-amber-500 dark:border-amber-400 pointer-events-none z-10"
                  style={{
                    left: `${cutStartPercent}%`,
                    width: `${Math.max(0, cutEndPercent - cutStartPercent)}%`,
                  }}
                >
                  <div className="absolute top-1 left-1.5 text-[9px] font-black text-amber-700 dark:text-amber-300 uppercase tracking-wider bg-white/80 dark:bg-slate-900/80 px-1 py-0.5 rounded">
                    Segment to Cut
                  </div>
                </div>
              )}

              {/* Trim Markers Visualizer */}
              {editMode === "trim" && (
                <>
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-slate-900/10 dark:bg-black/40 border-r-2 border-[#B8323C] pointer-events-none z-10"
                    style={{ width: `${trimStartPercent}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 right-0 bg-slate-900/10 dark:bg-black/40 border-l-2 border-[#B8323C] pointer-events-none z-10"
                    style={{ width: `${100 - trimEndPercent}%` }}
                  />
                </>
              )}
            </div>

            {/* Time labels below waveform */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-2">
              <span>{formatAudioTime(currentTime, true)}</span>
              <span>{formatAudioTime(totalDuration, true)}</span>
            </div>
          </div>

          {/* PLAYBACK & SPEED TOOLBAR */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#B8323C] to-rose-600 hover:from-rose-700 hover:to-rose-800 text-white flex items-center justify-center shadow-xs cursor-pointer transition-all active:scale-95"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSeek(0)}
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Restart from beginning"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Playback speed toggle */}
              <button
                type="button"
                onClick={cyclePlaybackRate}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Cycle playback speed"
              >
                {playbackRate}x
              </button>

              {/* Undo Button */}
              {bufferHistory.length > 0 && (
                <button
                  type="button"
                  onClick={undoLastEdit}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                  title="Undo last trim or cut"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>Undo</span>
                </button>
              )}

              {/* Reset to Raw */}
              {bufferHistory.length > 0 && (
                <button
                  type="button"
                  onClick={resetToOriginal}
                  className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-semibold transition-colors"
                  title="Reset to original raw recording"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* ADVANCED TRIMMING TOOLSET TABS (TRIM START/END vs. MIDDLE CUT)    */}
          {/* ================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <button
                type="button"
                onClick={() => setEditMode("trim")}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  editMode === "trim"
                    ? "bg-[#B8323C] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Trim Start & End</span>
              </button>

              <button
                type="button"
                onClick={() => setEditMode("cut")}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                  editMode === "cut"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Remove Middle Segment (Cut/Splice)</span>
              </button>
            </div>

            {/* TAB 1: TRIM START AND END */}
            {editMode === "trim" && (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Drag the sliders to crop silent pauses at the beginning or end of your narration.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Start Point: {formatAudioTime(trimStart, true)}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, trimEnd - 0.5)}
                      step={0.1}
                      value={trimStart}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimStart(val);
                        handleSeek(val);
                      }}
                      className="w-full accent-[#B8323C]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      End Point: {formatAudioTime(trimEnd, true)}
                    </label>
                    <input
                      type="range"
                      min={Math.min(totalDuration, trimStart + 0.5)}
                      max={totalDuration}
                      step={0.1}
                      value={trimEnd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTrimEnd(val);
                        handleSeek(val);
                      }}
                      className="w-full accent-[#B8323C]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={applyStartEndTrim}
                    className="px-4 py-2 rounded-xl bg-[#B8323C] hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Start/End Trim</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: REMOVE MIDDLE SEGMENT (CUT & SPLICE) */}
            {editMode === "cut" && (
              <div className="space-y-3">
                <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 p-2.5 rounded-xl text-amber-900 dark:text-amber-200 text-xs">
                  <p className="font-bold flex items-center gap-1.5">
                    <Split className="w-3.5 h-3.5 text-amber-600" />
                    <span>Remove a Mistake or Cough in the Middle:</span>
                  </p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Select the start and end of the segment you want to eliminate. Clicking &quot;Cut &amp; Splice&quot; permanently removes that segment and joins the two remaining sides smoothly.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cut From: {formatAudioTime(cutStart, true)}
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, cutEnd - 0.2)}
                      step={0.1}
                      value={cutStart}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCutStart(val);
                        handleSeek(val);
                      }}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cut Until: {formatAudioTime(cutEnd, true)}
                    </label>
                    <input
                      type="range"
                      min={Math.min(totalDuration, cutStart + 0.2)}
                      max={totalDuration}
                      step={0.1}
                      value={cutEnd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCutEnd(val);
                        handleSeek(val);
                      }}
                      className="w-full accent-amber-600"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={previewMiddleCut}
                    className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Listen to the segment that will be removed"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Preview Cut Segment ({Math.max(0, cutEnd - cutStart).toFixed(1)}s)</span>
                  </button>

                  <button
                    type="button"
                    onClick={applyMiddleCutSplice}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Cut &amp; Splice Remaining</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
