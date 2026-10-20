import { memo } from "react";
import { useLocation } from "react-router-dom";
import { useTheme, DEFAULT_BG_ANIMATIONS } from "../context/ThemeContext";

/**
 * Ambient Background & Motion Canvas for Fazilnagar Town Portal
 * Renders lightweight, theme-matched GPU-accelerated CSS effects
 * Behind all content with zero pointer events & full accessibility respect.
 */
function BackgroundAnimations() {
  const { themeConfig } = useTheme();
  const location = useLocation();

  const bgConfig = themeConfig?.bgAnimations || DEFAULT_BG_ANIMATIONS;
  const {
    enabled = true,
    scope = "global",
    density = "medium",
    effects = DEFAULT_BG_ANIMATIONS.effects,
  } = bgConfig;

  if (!enabled) return null;

  const isAdminPage = location.pathname.startsWith("/admin");
  if (scope === "public-only" && isAdminPage) return null;
  if (scope === "admin-only" && !isAdminPage) return null;

  const isLow = density === "low";
  const isHigh = density === "high";

  return (
    <div
      className="fzn-bg-container"
      aria-hidden="true"
      data-testid="fzn-bg-animations"
    >
      {/* 1. Aurora & Liquid Gradients */}
      {effects.aurora && <div className="fzn-bg-aurora-layer" />}

      {/* 2. Floating Orbs & Particles */}
      {effects.orbs && (
        <>
          <div className="fzn-bg-orb fzn-bg-orb--1" />
          <div className="fzn-bg-orb fzn-bg-orb--2" />
          {!isLow && <div className="fzn-bg-orb fzn-bg-orb--3" />}
          {isHigh && (
            <div
              className="fzn-bg-orb"
              style={{
                width: 220,
                height: 220,
                top: "70%",
                left: "20%",
                background:
                  "radial-gradient(circle, color-mix(in srgb, var(--fzn-anim-primary) 18%, transparent) 0%, transparent 70%)",
                animation:
                  "fznOrbFloat1 calc(22s * var(--fzn-anim-speed-factor, 1)) ease-in-out infinite alternate-reverse",
              }}
            />
          )}
        </>
      )}

      {/* 3. Flowing Ribbons & Light Beams */}
      {effects.ribbons && (
        <div className="fzn-bg-ribbons">
          <div className="fzn-bg-beam" />
          {!isLow && <div className="fzn-bg-beam fzn-bg-beam--2" />}
          {isHigh && (
            <div
              className="fzn-bg-beam"
              style={{
                left: "85%",
                animationDelay: "-11s",
                animationDuration:
                  "calc(28s * var(--fzn-anim-speed-factor, 1))",
              }}
            />
          )}
        </div>
      )}

      {/* 4. Moving Grids, Hexagons & Topographic Patterns */}
      {effects.grid && (
        <>
          <div className="fzn-bg-grid-layer" />
          <div className="fzn-bg-hex-layer">
            <svg
              className="w-full h-full"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern
                  id="fzn-hex-pattern"
                  width="56"
                  height="96"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z M28 96 L56 80 L56 48 L28 64 L0 48 L0 80 Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    className="text-[var(--fzn-anim-accent)]"
                    strokeOpacity="0.18"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#fzn-hex-pattern)" />
            </svg>
          </div>
        </>
      )}

      {/* 5. Orbital Rings & Twinkling Sparkles */}
      {effects.orbitalRings && (
        <div className="fzn-bg-orbital-layer">
          <div className="fzn-bg-ring" />
          {!isLow && <div className="fzn-bg-ring fzn-bg-ring--inner" />}
        </div>
      )}

      {effects.sparkles && (
        <>
          <div
            className="fzn-sparkle"
            style={{ width: 4, height: 4, top: "18%", left: "15%", animationDelay: "0s" }}
          />
          <div
            className="fzn-sparkle"
            style={{ width: 5, height: 5, top: "32%", right: "18%", animationDelay: "1.2s" }}
          />
          <div
            className="fzn-sparkle"
            style={{ width: 3, height: 3, top: "65%", left: "28%", animationDelay: "2.1s" }}
          />
          {!isLow && (
            <>
              <div
                className="fzn-sparkle"
                style={{ width: 6, height: 6, bottom: "22%", right: "24%", animationDelay: "0.8s" }}
              />
              <div
                className="fzn-sparkle"
                style={{ width: 4, height: 4, top: "78%", left: "55%", animationDelay: "1.6s" }}
              />
            </>
          )}
          {isHigh && (
            <>
              <div
                className="fzn-sparkle"
                style={{ width: 5, height: 5, top: "40%", left: "75%", animationDelay: "2.7s" }}
              />
              <div
                className="fzn-sparkle"
                style={{ width: 3, height: 3, top: "85%", right: "45%", animationDelay: "0.5s" }}
              />
            </>
          )}
        </>
      )}

      {/* 6. Hero Light Shimmer */}
      {effects.heroShimmer && <div className="fzn-hero-shimmer" />}
    </div>
  );
}

export default memo(BackgroundAnimations);
