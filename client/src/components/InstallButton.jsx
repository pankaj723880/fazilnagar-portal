import { useState, useEffect } from "react";
import { Download, Smartphone, Check, X, Share2, Monitor, PlusSquare } from "lucide-react";

export default function InstallButton({ className = "", compact = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone/PWA mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async (e) => {
    e.stopPropagation();

    if (isInstalled) {
      alert("Fazilnagar Town Portal is already installed on your device!");
      return;
    }

    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
        setShowModal(true);
      }
    } else {
      // If browser doesn't support deferred prompt (e.g. iOS Safari or manual desktop)
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title={isInstalled ? "App Installed on Device" : "Install Fazilnagar Town Portal on your device"}
        className={`inline-flex items-center justify-center gap-1.5 transition font-bold text-xs cursor-pointer shadow-2xs hover:shadow-xs ${
          isInstalled
            ? "bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1.5 rounded-xl"
            : "bg-emerald-50 hover:bg-emerald-100 text-[#168568] border border-emerald-300 hover:border-emerald-400 px-3 py-1.5 rounded-xl active:scale-95"
        } ${className}`}
      >
        {isInstalled ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            {!compact && <span>Installed</span>}
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5 text-[#168568] animate-bounce-slow" />
            <span>{compact ? "Install" : "Install App"}</span>
          </>
        )}
      </button>

      {/* Device Install Guide Modal (For iOS Safari, Android, and Desktop) */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#18232E] text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
                F
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#18232E] leading-snug">
                  Install Fazilnagar Portal
                </h3>
                <p className="text-xs text-[#647180]">
                  Get instant 1-tap offline access on your device
                </p>
              </div>
            </div>

            {/* Platform Instructions */}
            <div className="space-y-3.5 text-xs text-[#18232E] my-4">
              {/* Android / Chrome */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Android (Chrome / Edge / Firefox)</span>
                </div>
                <p className="text-[#647180] pl-6 leading-relaxed">
                  Tap the <strong className="text-slate-800">⋮ (three dots)</strong> menu in the top-right corner, then select <strong className="text-emerald-700">"Install app"</strong> or <strong className="text-emerald-700">"Add to Home screen"</strong>.
                </p>
              </div>

              {/* iPhone / iPad (Safari) */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Share2 className="w-4 h-4 text-blue-600" />
                  <span>iPhone / iPad (Safari)</span>
                </div>
                <p className="text-[#647180] pl-6 leading-relaxed">
                  Tap the <strong className="text-slate-800">Share button (⎋)</strong> at the bottom bar, scroll down and tap <strong className="text-blue-700">"Add to Home Screen" (⊕)</strong>.
                </p>
              </div>

              {/* Desktop Computer */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <Monitor className="w-4 h-4 text-purple-600" />
                  <span>Desktop (Chrome / Edge)</span>
                </div>
                <p className="text-[#647180] pl-6 leading-relaxed">
                  Click the <strong className="text-purple-700">Install icon (⊕)</strong> in your browser's URL address bar at the top right.
                </p>
              </div>
            </div>

            {/* Modal Action Button */}
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full mt-2 bg-[#18232E] hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
