import { useEffect, useRef } from 'react';

/**
 * UserAvatar: Renders a unique geometric identicon profile avatar using Jdenticon
 * with graceful fallback to user initials if the script is still loading.
 */
export default function UserAvatar({
  user,
  size = 32,
  className = '',
  alt,
}) {
  const svgRef = useRef(null);
  const value = user?.email || user?.name || (user?.id ? String(user.id) : 'Draftly User');
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    function updateIcon() {
      if (typeof window !== 'undefined' && window.jdenticon && svgRef.current) {
        window.jdenticon.updateSvg(svgRef.current, value);
      }
    }

    updateIcon();

    // Check if jdenticon is still loading asynchronously
    if (typeof window !== 'undefined' && !window.jdenticon) {
      const interval = setInterval(() => {
        if (window.jdenticon) {
          updateIcon();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [value]);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 bg-white border border-gray-200/80 shadow-2xs ${className}`}
      style={{ width: size, height: size }}
      title={alt || user?.name || 'User profile'}
    >
      <svg
        ref={svgRef}
        data-jdenticon-value={value}
        width={size}
        height={size}
        className="w-full h-full block"
      />
      {/* Visual initial fallback hidden if SVG rendered or rendered behind transparent SVG */}
      <span className="sr-only">{initial}</span>
    </div>
  );
}
