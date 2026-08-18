import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'draftly_cookie_consent';

export const CookieNotice: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const consent = localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      // Delay slightly for smooth page entry feel
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (type: 'all' | 'essential') => {
    try {
      localStorage.setItem(STORAGE_KEY, type);
    } catch {
      // ignore storage write errors
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-desc"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-[#1A1A1B] flex flex-col gap-3.5">
        
        {/* Top Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#0047FF]/10 flex items-center justify-center text-[#0047FF] shrink-0">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h3 id="cookie-notice-title" className="text-sm font-bold text-[#1A1A1B] flex items-center gap-1.5">
                <span>Privacy & Workspace Storage</span>
                <span className="text-[10px] font-semibold text-[#0047FF] bg-[#0047FF]/10 px-2 py-0.5 rounded-full">
                  NDPA 2023
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={() => handleAccept('essential')}
            className="text-gray-400 hover:text-[#1A1A1B] p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Dismiss cookie notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text description */}
        <p id="cookie-notice-desc" className="text-xs text-[#1A1A1B]/70 leading-relaxed font-sans">
          Draftly uses essential cookies and local draft caches to securely authenticate sessions and protect your coursework from offline data loss. We do not use third-party advertising trackers.
        </p>

        {/* Bottom Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-gray-100">
          <Link
            to="/cookies"
            onClick={() => setIsVisible(false)}
            className="text-xs font-medium text-[#1A1A1B]/60 hover:text-[#0047FF] transition-colors underline underline-offset-2"
          >
            Learn more
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAccept('essential')}
              className="text-xs font-semibold text-[#1A1A1B]/75 hover:text-[#1A1A1B] hover:bg-gray-100/80 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            >
              Essential only
            </button>
            <button
              onClick={() => handleAccept('all')}
              className="text-xs font-semibold bg-[#0047FF] hover:bg-[#0038CC] text-white px-4 py-1.5 rounded-full shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              Accept
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
