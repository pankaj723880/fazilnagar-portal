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
export default function SplashScreen({ onComplete, duration = 2000 }) {
  const [stage, setStage] = useState("enter"); // 'enter' | 'active' | 'exit' | 'done'

  useEffect(() => {
    // 6. Lock background scrolling while splash screen is mounted
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    // 2. Trigger elastic spring entrance after initial mount frame
    const enterTimer = setTimeout(() => {
      setStage("active");
    }, 40);

    // 5. Trigger exit animation (after ~1.6s to finish by 2.0s over 400ms)
    const exitTimer = setTimeout(() => {
      setStage("exit");
    }, Math.max(1200, duration - 400));

    // 5. Fully complete & unmount
    const doneTimer = setTimeout(() => {
      setStage("done");
      if (onComplete) onComplete();
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [duration, onComplete]);

  if (stage === "done") return null;

  const isExiting = stage === "exit";
  const isActive = stage === "active" || isExiting;

  return (
    <aside
      role="status"
      aria-label="Loading Fazilnagar Town Portal"
      aria-live="polite"
      className={`fixed inset-0 z-50 h-[100dvh] w-screen flex flex-col items-center justify-center select-none overflow-hidden touch-none pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        isExiting ? "opacity-0 scale-105" : "opacity-100 scale-100"
      } bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950`}
      style={{
        WebkitTapHighlightColor: "transparent",
        willChange: "transform, opacity",
      }}
    >
      {/* 1. Visual Background & Ambiance: Animated subtle warm amber/crimson ambient blur orb */}
      <div
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full pointer-events-none filter blur-3xl opacity-20 bg-gradient-to-tr from-amber-500 via-rose-600 to-orange-500 animate-pulse"
        style={{
          transform: "translate3d(0, 0, 0)",
          willChange: "transform, opacity, filter",
        }}
      />

      {/* Ambient background secondary glow for rich depth */}
      <div
        className="absolute w-48 h-48 rounded-full pointer-events-none filter blur-2xl opacity-15 bg-amber-400/30"
        style={{
          transform: "translate3d(0, 20px, 0)",
        }}
      />

      {/* Center Branding Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm mx-auto">
        {/* 2. Logo Animation (Entrance Spring + Idle Breathing Glow/Pulse) */}
        <div
          className={`relative mb-6 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            isActive ? "scale-100 opacity-100" : "scale-[0.8] opacity-0"
          }`}
          style={{ willChange: "transform, opacity" }}
        >
          {/* Logo Continuous Breathing Glow Effect */}
          <div
            className={`absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-amber-500/30 via-rose-500/25 to-orange-500/30 filter blur-xl transition-opacity duration-1000 ${
              isActive ? "opacity-90 animate-pulse" : "opacity-0"
            }`}
          />

          {/* Logo Card */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-900/90 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] p-3.5 flex items-center justify-center backdrop-blur-md">
            <img
              src="/icon-192.svg"
              alt="Fazilnagar Town Portal"
              className="w-full h-full object-contain filter drop-shadow-[0_4px_14px_rgba(184,50,60,0.5)]"
              width="112"
              height="112"
            />
          </div>
        </div>

        {/* 3. Typography & Badges: Staggered Slide-up */}
        <div className="flex flex-col items-center space-y-2 overflow-hidden">
          <h1
            className={`text-2xl sm:text-3xl font-black tracking-wider text-white transition-all duration-500 ease-out font-heading ${
              isActive
                ? "translate-y-0 opacity-100 delay-150"
                : "translate-y-4 opacity-0"
            }`}
            style={{ willChange: "transform, opacity" }}
          >
            FAZIL<span className="text-[#B8323C]">NAGAR</span>
          </h1>

          <div
            className={`flex items-center gap-1.5 transition-all duration-500 ease-out ${
              isActive
                ? "translate-y-0 opacity-100 delay-300"
                : "translate-y-4 opacity-0"
            }`}
            style={{ willChange: "transform, opacity" }}
          >
            <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-slate-400 uppercase">
              PIN 274401 • Your Town. Your Community.
            </p>
          </div>
        </div>

        {/* 4. Minimal Loading Indicator: Thin glowing indeterminate progress bar */}
        <div
          className={`mt-7 h-0.5 w-32 bg-white/10 rounded-full overflow-hidden relative shadow-[0_0_8px_rgba(255,255,255,0.15)] transition-opacity duration-500 ${
            isActive ? "opacity-100 delay-300" : "opacity-0"
          }`}
        >
          <div className="splash-shimmer-indicator absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full" />
        </div>
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
