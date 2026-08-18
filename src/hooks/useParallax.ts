import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useParallax — lightweight scroll-driven parallax for the landing page.
 *
 * Returns a scrollY value (throttled to rAF) that components can use
 * to compute their own transform offsets. CSS-only transforms on
 * `opacity` and `transform` keep everything compositor-friendly at 60fps.
 *
 * Respects prefers-reduced-motion: returns 0 when the user has opted out.
 */
export function useParallax() {
  const [scrollY, setScrollY] = useState(0);
  const ticking = useRef(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;

    if (reducedMotion.current) return;

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking.current = false;
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return reducedMotion.current ? 0 : scrollY;
}

/**
 * useScrollReveal — IntersectionObserver-based reveal for landing sections.
 *
 * Returns a ref to attach to the container element. When the element enters
 * the viewport (with a configurable threshold), it adds a `data-visible`
 * attribute that CSS can target for reveal animations.
 */
export function useScrollReveal<T extends HTMLElement>(
  threshold = 0.12
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip if reduced motion
    const prefersReduced =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false;
    if (prefersReduced) {
      el.setAttribute('data-visible', 'true');
      return;
    }

    // If IntersectionObserver is not available (e.g. jsdom), show immediately
    if (typeof IntersectionObserver === 'undefined') {
      el.setAttribute('data-visible', 'true');
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute('data-visible', 'true');
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
