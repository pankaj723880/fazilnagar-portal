import { useState, useEffect } from "react";

/**
 * Ultra-premium, native-app style Splash Screen (Netflix / Airbnb caliber)
 * for Fazilnagar Mobile Web Portal.
 *
 * 1. Deep radial glow background (slate-950 -> slate-900 -> slate-950) with animated amber/crimson ambient blur orb.
 * 2. Elastic spring entrance for the logo mark (scale: 0.8 -> 1, opacity: 0 -> 1) with continuous idle breathing pulse.
 * 3. Staggered typography slide-up ("FAZILNAGAR" + "PIN 274401 • Your Town. Your Community.").
 * 4. Sleek indeterminate shimmer progress line.
 * 5. GPU-accelerated exit fade & scale (400ms) with seamless homepage reveal.
 * 6. Body scroll locked during mount, pointer-events-none during exit, touch-none.
 */
export default function SplashScreen({ onComplete, duration = 1400 }) {
  const [stage, setStage] = useState("active"); // 'active' | 'exit' | 'done'

  const handleDismiss = () => {
    if (stage === "done") return;
    setStage("exit");
    setTimeout(() => {
      setStage("done");
      if (onComplete) onComplete();
    }, 150);
  };

  useEffect(() => {
    // Lock background scrolling while splash screen is mounted
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    // Trigger smooth opacity cross-fade (300ms before completion)
    const exitTimer = setTimeout(() => {
      setStage("exit");
    }, Math.max(800, duration - 300));

    // Fully complete & unmount
    const doneTimer = setTimeout(() => {
      setStage("done");
      if (onComplete) onComplete();
    }, duration);

    // Allow user to instantly dismiss by pressing any key or clicking anywhere
    const onKeyDown = () => handleDismiss();
    window.addEventListener("keydown", onKeyDown);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [duration, onComplete]);

  if (stage === "done") return null;

  const isExiting = stage === "exit";

  return (
    <aside
      role="status"
      aria-label="Loading Fazilnagar Town Portal - Tap anywhere to skip"
      aria-live="polite"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[999999] h-[100dvh] w-full flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer ${
        isExiting ? "pointer-events-none opacity-0" : "pointer-events-auto opacity-100"
      } transition-opacity duration-300 ease-out bg-[#18232E] bg-gradient-to-b from-[#18232E] via-[#131d27] to-[#0f171e]`}
      style={{
        WebkitTapHighlightColor: "transparent",
        willChange: "opacity",
      }}
    >
      {/* 1. Subtle warm ambient glow matching index.html shell */}
      <div
        className="absolute w-72 h-72 rounded-full pointer-events-none filter blur-3xl opacity-20 bg-gradient-to-tr from-amber-500/20 via-rose-600/15 to-orange-500/20"
        style={{
          transform: "translate3d(0, 0, 0)",
        }}
      />

      {/* 2. Center Branding Content - Anchored at stable position without vertical shifting */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm mx-auto">
        {/* Logo Card - Static, crisp, identical to HTML shell */}
        <div className="relative mb-5">
          {/* Subtle backdrop glow */}
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-amber-500/20 via-rose-500/15 to-orange-500/20 filter blur-lg opacity-80" />

          {/* Logo Card Box */}
          <div className="relative w-24 h-24 rounded-2xl bg-[#0f171e]/90 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3.5 flex items-center justify-center backdrop-blur-md">
            <img
              src="/icon-192.svg"
              alt="Fazilnagar Town Portal"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(184,50,60,0.4)]"
              width="68"
              height="68"
            />
          </div>
        </div>

        {/* 3. Typography & Badges - Static alignment without translate-y animations */}
        <div className="flex flex-col items-center">
          <h1 className="text-2xl font-black tracking-wider text-white font-heading leading-tight m-0">
            FAZIL<span className="text-[#B8323C]">NAGAR</span>
          </h1>

          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mt-1.5 mb-0">
            PIN 274401 • Your Town. Your Community.
          </p>
        </div>

        {/* 4. Minimal Progress Indicator - Identical to index.html shell */}
        <div className="mt-6 h-0.5 w-32 bg-white/10 rounded-full overflow-hidden relative shadow-[0_0_8px_rgba(255,255,255,0.15)]">
          <div className="splash-shimmer-indicator absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full" />
        </div>

        <span className="text-[10px] text-slate-500 font-medium mt-3.5 opacity-60 tracking-wider">
          Tap anywhere to skip
        </span>
      </div>

      <style>{`
        @keyframes splashShimmerMotion {
          0% {
            transform: translate3d(-100%, 0, 0);
          }
          100% {
            transform: translate3d(240%, 0, 0);
          }
        }
        .splash-shimmer-indicator {
          animation: splashShimmerMotion 1.25s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          will-change: transform;
        }
      `}</style>
    </aside>
  );
}
