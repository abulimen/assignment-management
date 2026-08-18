import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Logo } from '../landing/Logo';
import { 
  ShieldCheck, 
  FileText, 
  Cookie, 
  ArrowLeft, 
  Menu, 
  X, 
  ChevronRight, 
  ExternalLink,
  Lock,
  Building2,
  Mail
} from 'lucide-react';

interface TocItem {
  id: string;
  title: string;
}

interface LegalLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  badgeText?: string;
  toc: TocItem[];
  children: React.ReactNode;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  lastUpdated,
  badgeText = 'Nigeria Data Protection Act (NDPA 2023) Aligned',
  toc,
  children,
}) => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<string>(toc[0]?.id || '');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140;
      for (let i = toc.length - 1; i >= 0; i--) {
        const element = document.getElementById(toc[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveSection(toc[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [toc]);

  const navLinks = [
    { name: 'Privacy Policy', path: '/privacy', icon: ShieldCheck },
    { name: 'Terms of Service', path: '/terms', icon: FileText },
    { name: 'Cookie Policy', path: '/cookies', icon: Cookie },
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1B] font-sans antialiased flex flex-col selection:bg-[#0047FF]/15 selection:text-[#0047FF]">
      {/* Top Main Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 py-3.5 px-6 sm:px-10 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF] rounded-md" aria-label="Draftly Home">
              <Logo size="md" />
            </Link>
            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-[#1A1A1B]/50 bg-gray-100/80 px-2.5 py-1 rounded-full border border-gray-200/60">
              <Lock className="w-3 h-3 text-[#0047FF]" />
              <span>Trust & Legal Center</span>
            </div>
          </div>

          {/* Desktop Right Links */}
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[#1A1A1B]/70 hover:text-[#0047FF] transition-colors py-1.5 px-3 rounded-lg hover:bg-gray-100/60"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to home</span>
            </Link>
            <Link
              to="/login"
              className="text-[#1A1A1B] hover:text-[#0047FF] px-3.5 py-1.5 rounded-lg hover:bg-gray-100/60 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="bg-[#0047FF] hover:bg-[#0038CC] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-sm transition-all active:scale-[0.98]"
            >
              Join the beta
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle legal navigation"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Sidebar Panel */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Legal navigation"
              className="relative z-10 w-[300px] max-w-[85vw] h-full bg-white border-l border-gray-200 shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-300 ease-out"
            >
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                  <span className="font-bold text-sm text-[#1A1A1B] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0047FF]" />
                    <span>Legal Documents</span>
                  </span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-6 space-y-2">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 p-3 text-sm text-[#1A1A1B] hover:bg-gray-50 rounded-xl mb-3 font-semibold border border-gray-100"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#0047FF]" />
                    <span>Back to home</span>
                  </Link>

                  <span className="text-[10px] font-mono font-bold tracking-widest text-gray-400 uppercase block mb-2 px-3">
                    Policies & Terms
                  </span>

                  {navLinks.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 text-sm rounded-xl transition-all ${
                        location.pathname === item.path
                          ? 'bg-[#0047FF]/10 text-[#0047FF] font-bold shadow-xs'
                          : 'text-[#1A1A1B]/75 hover:bg-gray-50 hover:text-[#1A1A1B]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4" />
                        {item.name}
                      </span>
                      {location.pathname === item.path && <ChevronRight className="w-4 h-4" />}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-[#1A1A1B] hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 bg-[#0047FF] hover:bg-[#0038CC] text-white text-center text-sm font-bold rounded-xl shadow-md shadow-blue-200 transition-all"
                >
                  Join the beta
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Sub-Header / Hero Banner */}
      <div className="bg-white border-b border-gray-200 pt-6 pb-6 sm:pt-10 sm:pb-8 px-4 sm:px-6 lg:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              {badgeText}
            </span>
            <span className="text-xs text-[#1A1A1B]/50 font-mono">
              Effective Date: {lastUpdated}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#1A1A1B] tracking-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm sm:text-lg text-[#1A1A1B]/70 max-w-3xl leading-relaxed">
            {subtitle}
          </p>

          {/* Quick Legal Switcher Tabs */}
          <div className="flex items-center gap-2 mt-5 sm:mt-6 overflow-x-auto pb-1 scrollbar-none">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#1A1A1B] text-white shadow-xs'
                      : 'bg-gray-100 text-[#1A1A1B]/70 hover:bg-gray-200 hover:text-[#1A1A1B]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isActive ? 'text-white' : 'text-[#1A1A1B]/60'}`} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Layout with Sidebar */}
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-10 py-5 sm:py-10 flex-grow w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          
          {/* Left Sidebar: Table of Contents */}
          <aside className="hidden lg:block lg:col-span-3">
            <div className="sticky top-24 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-[#1A1A1B]/40 px-3">
                On this page
              </div>
              <nav className="space-y-1 text-sm border-l-2 border-gray-200 pl-2">
                {toc.map((item) => {
                  const isCurrent = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={`block py-1.5 px-3 rounded-md transition-all text-xs leading-snug ${
                        isCurrent
                          ? '-ml-[10px] border-l-2 border-[#0047FF] pl-3 font-semibold text-[#0047FF] bg-[#0047FF]/5'
                          : 'text-[#1A1A1B]/65 hover:text-[#1A1A1B] hover:bg-gray-100/60'
                      }`}
                    >
                      {item.title}
                    </a>
                  );
                })}
              </nav>

              {/* Data Protection Contact Box */}
              <div className="mt-8 bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1A1A1B]">
                  <Building2 className="w-4 h-4 text-[#0047FF]" />
                  <span>Nigeria DPO Contact</span>
                </div>
                <p className="mt-1.5 text-xs text-[#1A1A1B]/60 leading-relaxed">
                  Draftly Technologies Ltd.
                  <br />
                  Data Protection Officer
                </p>
                <a
                  href="mailto:dpo@draftly.ng"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0047FF] hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  dpo@draftly.ng
                </a>
              </div>
            </div>
          </aside>

          {/* Right Main Article */}
          <main className="lg:col-span-9 bg-white border border-gray-200/90 rounded-xl sm:rounded-2xl p-4 sm:p-8 lg:p-12 shadow-xs">
            <article className="legal-article w-full max-w-none">
              {children}
            </article>
          </main>

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-10 mt-16 text-sm text-[#1A1A1B]/70">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <span className="text-xs text-[#1A1A1B]/50 font-mono">
                &copy; {new Date().getFullYear()} Draftly Technologies. All rights reserved.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-xs font-medium">
              <Link to="/privacy" className="hover:text-[#0047FF] transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-[#0047FF] transition-colors">Terms of Service</Link>
              <Link to="/cookies" className="hover:text-[#0047FF] transition-colors">Cookie Policy</Link>
              <a 
                href="https://ndpc.gov.ng" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 text-[#1A1A1B]/50 hover:text-[#0047FF] transition-colors"
              >
                NDPC Nigeria <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
