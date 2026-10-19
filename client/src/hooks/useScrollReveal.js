import { useEffect, useRef, useState } from "react";
import { registerRevealElement, prefersReducedMotion, getScrollDirection } from "../utils/scrollReveal";

/**
 * useScrollReveal Hook
 *
 * Provides ref and state for scroll-driven reveals.
 *
 * @param {Object} options
 * @param {boolean} [options.once=true] Whether animation should only play once
 * @param {boolean} [options.bidirectional=false] Whether to re-animate when scrolling up/down
 * @param {number} [options.delay=0] Animation delay in ms
 * @param {number} [options.staggerIndex=0] Card index for staggered delay
 * @param {number} [options.staggerBaseDelay=60] Delay per stagger step in ms
 * @param {string} [options.rootMargin="0px 0px -40px 0px"]
 * @param {number} [options.threshold=0.1]
 * @returns {{ ref: React.RefObject, isRevealed: boolean, scrollDirection: string }}
 */
export function useScrollReveal(options = {}) {
  const {
    once = true,
    bidirectional = false,
    delay = 0,
    staggerIndex = 0,
    staggerBaseDelay = 60,
    rootMargin,
    threshold,
  } = options;

  const elementRef = useRef(null);
  const [isRevealed, setIsRevealed] = useState(() => prefersReducedMotion());
  const [scrollDirection, setScrollDirection] = useState(() => getScrollDirection());

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setIsRevealed(true);
      return;
    }

    // Apply calculated delay as CSS variable for CSS transition
    const totalDelay = delay + (staggerIndex > 0 ? staggerIndex * staggerBaseDelay : 0);
    if (totalDelay > 0) {
      el.style.setProperty("--fzn-reveal-delay", `${totalDelay}ms`);
    }

    const unregister = registerRevealElement(el, {
      once,
      bidirectional,
      rootMargin,
      threshold,
      onReveal: (dir) => {
        setIsRevealed(true);
        setScrollDirection(dir);
      },
      onReset: () => {
        if (bidirectional) {
          setIsRevealed(false);
        }
      },
    });

    return () => {
      unregister();
    };
  }, [once, bidirectional, delay, staggerIndex, staggerBaseDelay, rootMargin, threshold]);

  return { ref: elementRef, isRevealed, scrollDirection };
}

export default useScrollReveal;
