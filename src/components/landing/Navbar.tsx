import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Menu, X, ArrowRight } from 'lucide-react';

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

  return (
    <header
      id="main-navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-gray-200 py-3 shadow-[0_2px_12px_-4px_rgba(26,26,27,0.05)]'
          : 'bg-white/80 backdrop-blur-sm border-b border-gray-200/80 py-4 sm:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-10 flex items-center justify-between">
        {/* Left: Logo */}
        <a
          href="#"
          className="flex items-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF] rounded-md p-0.5"
        >
          <Logo size="md" />
        </a>

        {/* Center: Navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#1A1A1B]/70">
          <a
            href="#workspace"
            className="hover:text-[#1A1A1B] transition-colors"
          >
            The Workspace
          </a>
          <a
            href="#how-it-works"
            className="hover:text-[#1A1A1B] transition-colors"
          >
            How it Works
          </a>
          <a
            href="#evidence"
            className="hover:text-[#1A1A1B] transition-colors"
          >
            Evidence
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button
            id="nav-signin-btn"
            onClick={onOpenSignInModal}
            className="text-sm font-semibold text-[#1A1A1B] hover:text-[#0047FF] px-3 py-2 transition-colors cursor-pointer"
          >
            Sign in
          </button>
          <button
            id="nav-join-beta-btn"
            onClick={onOpenBetaModal}
            className="bg-[#0047FF] hover:bg-[#0038CC] text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
          >
            <span>Join the beta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-6 pt-3 pb-6 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col gap-3">
            <a
              href="#workspace"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#1A1A1B] py-2 px-3 hover:bg-gray-50 rounded-md transition-colors"
            >
              The Workspace
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#1A1A1B] py-2 px-3 hover:bg-gray-50 rounded-md transition-colors"
            >
              How it Works
            </a>
            <a
              href="#evidence"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-[#1A1A1B] py-2 px-3 hover:bg-gray-50 rounded-md transition-colors"
            >
              Evidence
            </a>
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenSignInModal();
                }}
                className="w-full text-center py-2.5 text-sm font-semibold text-[#1A1A1B] hover:bg-gray-50 rounded-full border border-gray-200 cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBetaModal();
                }}
                className="w-full text-center py-2.5 bg-[#0047FF] hover:bg-[#0038CC] text-white text-sm font-semibold rounded-full shadow-lg shadow-blue-200 cursor-pointer"
              >
                Join the beta
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

