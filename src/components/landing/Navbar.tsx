import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Menu, X, ArrowRight, Layers, HelpCircle, ShieldCheck, ChevronRight } from 'lucide-react';

interface NavbarProps {
  onOpenBetaModal: () => void;
  onOpenSignInModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenBetaModal,
  onOpenSignInModal,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile sidebar is open & close on Escape
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: 'The Workspace', href: '#workspace', icon: Layers, note: 'Solo & team writing' },
    { label: 'How it Works', href: '#how-it-works', icon: HelpCircle, note: 'Connected assignment flow' },
    { label: 'Evidence', href: '#evidence', icon: ShieldCheck, note: 'Preserved work history' },
  ];

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-200 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md border-b border-gray-200 py-3 shadow-[0_2px_12px_-4px_rgba(26,26,27,0.06)]'
          : 'bg-white/80 backdrop-blur-xs border-b border-gray-200/80 py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
        {/* Left: Logo */}
        <a
          href="#"
          className="flex items-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF] rounded-md p-0.5"
          aria-label="Draftly Home"
        >
          <Logo size="md" />
        </a>

        {/* Center: Navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#1A1A1B]/75">
          <a
            href="#workspace"
            className="hover:text-[#0047FF] transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF] rounded px-1"
          >
            The Workspace
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#0047FF] transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF] rounded px-1"
          >
            How it Works
          </a>
          <a
            href="#evidence"
            className="hover:text-[#0047FF] transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF] rounded px-1"
          >
            Evidence
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            id="nav-signin-btn"
            onClick={onOpenSignInModal}
            className="text-sm font-semibold text-[#1A1A1B] hover:text-[#0047FF] hover:bg-gray-100/80 px-4 py-2 rounded-full transition-all cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF]"
          >
            Sign in
          </button>
          <button
            id="nav-join-beta-btn"
            onClick={onOpenBetaModal}
            className="bg-[#0047FF] hover:bg-[#0038CC] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0047FF]"
          >
            <span>Join the beta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile menu toggle button */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden p-2 text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF]"
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* ------------------------------------------------------------- Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex justify-end">
          {/* Dark Backdrop with soft blur */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-in Sidebar Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            className="relative z-10 w-[310px] max-w-[85vw] h-full bg-white border-l border-gray-200 shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-300 ease-out"
          >
            {/* Top Row: Logo & Close Button */}
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                <a
                  href="#"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2"
                >
                  <Logo size="sm" />
                </a>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="py-6 space-y-2">
                <span className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase block mb-3 px-3">
                  Navigation
                </span>
                {navLinks.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between p-3 rounded-xl text-[#1A1A1B] hover:bg-[#F9F8F6] hover:text-[#0047FF] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 group-hover:bg-[#0047FF]/10 group-hover:text-[#0047FF] flex items-center justify-center transition-colors">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold leading-tight">{item.label}</div>
                        <div className="text-[11px] text-gray-500 font-sans">{item.note}</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0047FF] group-hover:translate-x-0.5 transition-all" />
                  </a>
                ))}
              </div>
            </div>

            {/* Bottom Actions & Tagline */}
            <div className="space-y-4 pt-5 border-t border-gray-100">
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSignInModal();
                  }}
                  className="w-full text-center py-2.5 text-sm font-semibold text-[#1A1A1B] hover:bg-gray-50 rounded-xl border border-gray-200 cursor-pointer transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenBetaModal();
                  }}
                  className="w-full py-2.5 bg-[#0047FF] hover:bg-[#0038CC] text-white text-sm font-bold rounded-xl shadow-md shadow-blue-200 cursor-pointer transition-all active:scale-[0.98] inline-flex items-center justify-center gap-2"
                >
                  <span>Join the beta</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center">
                <p className="text-[11px] font-sans text-gray-400">
                  Where student assignments happen.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
