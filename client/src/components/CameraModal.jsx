import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Video,
  X,
  RotateCw,
  Check,
  RefreshCw,
  AlertCircle,
  Square,
  Circle,
} from "lucide-react";

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const [mode, setMode] = useState("photo"); // "photo" | "video"
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [permissionError, setPermissionError] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  // Photo capture state
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Start camera stream
  const startCamera = async (facing = facingMode) => {
    setIsInitializing(true);
    setPermissionError("");

    // Stop existing stream tracks
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      // First try requesting video and audio
      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
      } catch (audioErr) {
        // Fallback to video only if microphone is missing/denied
        console.warn("Audio access failed, falling back to video only:", audioErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error("Camera permission error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError("Camera and microphone permission was denied. Please allow camera access in your browser settings.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionError("No camera found on this device.");
      } else {
        setPermissionError("Unable to access camera: " + (err.message || "Unknown error"));
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetMedia();
      startCamera(facingMode);
    } else {
      stopAllMedia();
    }

    return () => {
      stopAllMedia();
    };
  }, [isOpen, facingMode]);

  const stopAllMedia = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  };

  const resetMedia = () => {
    if (capturedPhotoUrl) URL.revokeObjectURL(capturedPhotoUrl);
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setCapturedPhotoUrl(null);
    setCapturedBlob(null);
    setRecordedVideoUrl(null);
    setIsRecording(false);
    setRecordingSeconds(0);
    recordedChunksRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Flip camera (front <-> back)
  const handleFlipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
  };

  // Snap photo
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");

    // Mirror image if user facing
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedPhotoUrl(url);
          setCapturedBlob(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // Start video recording
  const handleStartRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    setRecordedVideoUrl(null);

    try {
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, selectedMime ? { mimeType: selectedMime } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        setCapturedBlob(blob);
      };

      recorder.start(500); // 500ms chunk interval
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start MediaRecorder:", err);
      alert("Video recording could not be started: " + err.message);
    }
  };

  // Stop video recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Confirm and Send Media
  const handleConfirmMedia = () => {
    if (!capturedBlob) return;
    const isVid = mode === "video" || Boolean(recordedVideoUrl);
    const ext = isVid ? "mp4" : "jpg";
    const mime = isVid ? (capturedBlob.type || "video/mp4") : "image/jpeg";
    const filename = `camera_${Date.now()}.${ext}`;

    const file = new File([capturedBlob], filename, { type: mime });
    onCapture(file, isVid ? "video" : "image");
    handleCloseModal();
  };

  const handleCloseModal = () => {
    stopAllMedia();
    resetMedia();
    onClose();
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  const hasPreview = capturedPhotoUrl || recordedVideoUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92dvh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 text-[#B8323C] flex items-center justify-center">
              <Camera className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white">
                Live Camera / लाइव कैमरा
              </h3>
              <p className="text-[10px] text-slate-400">
                Snap photos or record clips directly from your device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Flip camera button */}
            {!hasPreview && !permissionError && (
              <button
                type="button"
                onClick={handleFlipCamera}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Flip Camera (Front/Back) / कैमरा पलटें"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCloseModal}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close / बंद करें"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Screen */}
        <div className="relative flex-1 min-h-[300px] sm:min-h-[360px] bg-black flex items-center justify-center overflow-hidden">
          {permissionError ? (
            <div className="p-6 text-center max-w-sm space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">Camera Access Required</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{permissionError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again / पुनः प्रयास करें</span>
              </button>
            </div>
          ) : isInitializing ? (
            <div className="flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-[#B8323C]" />
              <span>Starting camera stream...</span>
            </div>
          ) : capturedPhotoUrl ? (
            <img
              src={capturedPhotoUrl}
              alt="Captured"
              className="w-full h-full object-contain max-h-[55vh]"
            />
          ) : recordedVideoUrl ? (
            <video
              src={recordedVideoUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain max-h-[55vh]"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[55vh] ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />

              {/* Recording indicator */}
              {isRecording && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 text-white px-3 py-1.5 rounded-full text-xs font-mono font-bold shadow-lg animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <span>REC {formatTimer(recordingSeconds)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Control Bar */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 flex flex-col gap-3">
          {hasPreview ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetMedia}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake / पुनः लें</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmMedia}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#B8323C] hover:bg-red-700 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Attach to Message / जोड़ें</span>
              </button>
            </div>
          ) : (
            <>
              {/* Mode Toggle (Photo vs Video) */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setMode("photo")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    mode === "photo"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Photo / तस्वीर
                </button>
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setMode("video")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    mode === "video"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Video / वीडियो
                </button>
              </div>

              {/* Shutter / Record Button */}
              <div className="flex items-center justify-center pt-1">
                {mode === "photo" ? (
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={isInitializing || Boolean(permissionError)}
                    className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-40"
                    title="Click to snap photo"
                  >
                    <div className="w-12 h-12 rounded-full bg-white active:bg-slate-200" />
                  </button>
                ) : isRecording ? (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer"
                    title="Stop recording"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-500" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={isInitializing || Boolean(permissionError)}
                    className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer disabled:opacity-40"
                    title="Start recording"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-600 active:bg-red-700" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
