import { useState, useEffect, useRef } from 'react';

/**
 * Ensures a loading state stays active for at least minDuration (default 280ms)
 * to allow skeleton animations to render gracefully without jarring instant flashes.
 */
export function useMinLoading(actualLoading, minDuration = 280) {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (actualLoading) {
      setShowSkeleton(true);
    } else {
      const elapsed = Date.now() - mountTimeRef.current;
      const remaining = Math.max(0, minDuration - elapsed);

      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, remaining);

      return () => clearTimeout(timer);
    }
  }, [actualLoading, minDuration]);

  return showSkeleton;
}
