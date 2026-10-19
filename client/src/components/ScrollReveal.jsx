import React, { Children, cloneElement, isValidElement } from "react";
import useScrollReveal from "../hooks/useScrollReveal";

/**
 * ScrollReveal Component
 *
 * Smooth, restrained scroll-driven reveal component supporting upward/downward reveals,
 * staggered card groups, and reduced-motion preferences.
 *
 * @param {Object} props
 * @param {React.ElementType} [props.as="div"] HTML tag to render
 * @param {'fade-up'|'fade-down'|'fade-in'|'scale'} [props.variant='fade-up'] Reveal movement style
 * @param {number} [props.delay=0] Delay in milliseconds
 * @param {number} [props.duration=520] Duration in milliseconds
 * @param {number} [props.staggerIndex=0] Index for staggered grids
 * @param {number} [props.staggerBaseDelay=60] Delay increment per item
 * @param {boolean} [props.once=true] Only animate on first reveal
 * @param {boolean} [props.bidirectional=false] Re-reveal on scrolling in reverse
 * @param {string} [props.className=""] Extra CSS classes
 * @param {Object} [props.style={}] Inline styles
 * @param {React.ReactNode} props.children
 */
export function ScrollReveal({
  as: Component = "div",
  variant = "fade-up",
  delay = 0,
  duration = 520,
  staggerIndex = 0,
  staggerBaseDelay = 60,
  once = true,
  bidirectional = false,
  className = "",
  style = {},
  children,
  ...restProps
}) {
  const { ref, isRevealed, scrollDirection } = useScrollReveal({
    once,
    bidirectional,
    delay,
    staggerIndex,
    staggerBaseDelay,
  });

  const variantClass =
    variant === "fade-down"
      ? "fzn-reveal--fade-down"
      : variant === "scale"
      ? "fzn-reveal--scale"
      : variant === "fade-in"
      ? "fzn-reveal--fade-in"
      : "fzn-reveal--fade-up";

  const totalDelay = delay + (staggerIndex > 0 ? staggerIndex * staggerBaseDelay : 0);

  const combinedStyle = {
    ...style,
    "--fzn-reveal-dur": `${duration}ms`,
    "--fzn-reveal-delay": `${totalDelay}ms`,
  };

  const statusClasses = [
    "fzn-reveal",
    variantClass,
    isRevealed ? "is-revealed" : "",
    isRevealed && scrollDirection === "up" ? "revealed-from-top" : "",
    isRevealed && scrollDirection === "down" ? "revealed-from-bottom" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Component ref={ref} className={statusClasses} style={combinedStyle} {...restProps}>
      {children}
    </Component>
  );
}

/**
 * ScrollStagger Component
 *
 * Automatically assigns staggered delays to child elements or cards.
 */
export function ScrollStagger({
  as: Component = "div",
  baseDelay = 60,
  initialDelay = 0,
  variant = "fade-up",
  once = true,
  className = "",
  children,
  ...restProps
}) {
  const childArray = Children.toArray(children);

  return (
    <Component className={className} {...restProps}>
      {childArray.map((child, index) => {
        if (!isValidElement(child)) return child;

        return (
          <ScrollReveal
            key={child.key || index}
            variant={variant}
            staggerIndex={index}
            staggerBaseDelay={baseDelay}
            delay={initialDelay}
            once={once}
            className="w-full h-full"
          >
            {child}
          </ScrollReveal>
        );
      })}
    </Component>
  );
}

/**
 * ParallaxLayer Component
 *
 * Subtle, compositor-accelerated parallax layer for hero and storytelling sections.
 * Uses native CSS scroll-driven animations with fallback.
 */
export function ParallaxLayer({
  speed = 0.15, // Positive moves slightly slower than scroll, negative faster
  className = "",
  style = {},
  children,
  ...restProps
}) {
  const layerRef = React.useRef(null);

  React.useEffect(() => {
    // If browser supports CSS scroll-driven animations with animation-range, CSS will handle it natively
    if (
      typeof window !== "undefined" &&
      window.CSS &&
      window.CSS.supports &&
      window.CSS.supports("(animation-timeline: view()) and (animation-range: entry)")
    ) {
      return;
    }

    const el = layerRef.current;
    if (!el || typeof window === "undefined") return;

    let rAFId = null;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        rAFId = window.requestAnimationFrame(() => {
          const rect = el.getBoundingClientRect();
          const winHeight = window.innerHeight || 800;
          if (rect.top <= winHeight && rect.bottom >= 0) {
            const progress = (winHeight - rect.top) / (winHeight + rect.height);
            // Limit displacement to max 25px to keep text crisp and prevent layout shift
            const offset = (progress - 0.5) * speed * 50;
            const clamped = Math.max(-25, Math.min(25, offset));
            el.style.transform = `translate3d(0, ${clamped.toFixed(1)}px, 0)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rAFId) window.cancelAnimationFrame(rAFId);
    };
  }, [speed]);

  return (
    <div
      ref={layerRef}
      className={`fzn-parallax-layer ${className}`}
      style={{
        willChange: "transform",
        ...style,
      }}
      {...restProps}
    >
      {children}
    </div>
  );
}

export default ScrollReveal;
