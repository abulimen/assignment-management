import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  LayoutDashboard,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  User,
  X,
  FileText,
  Lock,
  ExternalLink,
  Settings,
} from 'lucide-react';
import BrandMark from './BrandMark';
import UserAvatar from './UserAvatar';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setShowHelp(false);
      }
    }
    if (showUserMenu || showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showUserMenu, showHelp]);

  const isDashboardActive = location.pathname === '/dashboard' || location.pathname.startsWith('/courses') || location.pathname.startsWith('/assignments');
  const isProfileActive = location.pathname === '/profile';

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F6] text-[#1A1A1B] font-sans antialiased selection:bg-[#0047FF]/15 selection:text-[#0047FF]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#0047FF] focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Global Academic Workspace Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-gray-200/90 sticky top-0 z-30 transition-all shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15">
            {/* Left: Brand + Section Hub */}
            <div className="flex items-center gap-4 sm:gap-6">
              <Link
                to="/dashboard"
                className="flex items-center gap-2.5 py-1.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0047FF] rounded-lg cursor-pointer"
                aria-label="Draftly — dashboard"
              >
                <BrandMark className="h-6 w-6 text-[#0047FF] group-hover:scale-105 transition-transform" />
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-[#1A1A1B] group-hover:text-[#0047FF] transition-colors">
                    Draftly
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#0047FF] bg-[#0047FF]/5 px-1.5 py-0.2 rounded border border-[#0047FF]/20 hidden sm:inline">
                    WORKSPACE
                  </span>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden sm:flex items-center gap-1.5 border-l border-gray-200 pl-4 sm:pl-6 h-6">
                <Link
                  to="/dashboard"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isDashboardActive
                      ? 'bg-gray-100/90 text-[#0047FF] font-bold shadow-2xs'
                      : 'text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className={`w-3.5 h-3.5 ${isDashboardActive ? 'text-[#0047FF]' : 'text-gray-400'}`} />
                  <span>Assignments Hub</span>
                </Link>

                <Link
                  to="/profile"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isProfileActive
                      ? 'bg-gray-100/90 text-[#0047FF] font-bold shadow-2xs'
                      : 'text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-50'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 ${isProfileActive ? 'text-[#0047FF]' : 'text-gray-400'}`} />
                  <span>Profile</span>
                </Link>
              </nav>
            </div>

            {/* Right: Academic Guide & User Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="How Draftly Works"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#0047FF]" />
                <span className="hidden sm:inline font-sans">Guide</span>
              </button>

              {user && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 sm:p-1.5 rounded-lg border border-gray-200 bg-[#F9F8F6] hover:bg-white hover:border-gray-300 transition-all cursor-pointer group"
                    aria-expanded={showUserMenu}
                    aria-haspopup="true"
                  >
                    <UserAvatar
                      user={user}
                      size={28}
                      className="shadow-xs group-hover:scale-105 transition-transform"
                    />
                    <div className="hidden sm:flex flex-col text-left leading-tight pr-1">
                      <span className="text-xs font-bold text-[#1A1A1B] truncate max-w-[120px]">
                        {user.name}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500 capitalize">
                        {user.role}
                      </span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Enhanced Dropdown Menu */}
                  {showUserMenu && (
                    <div
                      className="absolute right-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100 divide-y divide-gray-100"
                    >
                      {/* User Snapshot Header */}
                      <div className="px-3 py-2.5 pb-3">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            user={user}
                            size={34}
                            className="shadow-xs"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#1A1A1B] truncate">{user.name}</p>
                            <p className="text-[11px] font-mono text-gray-500 truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider bg-[#0047FF]/10 text-[#0047FF] px-2 py-0.5 rounded border border-[#0047FF]/20">
                            {user.role === 'lecturer' ? 'Lecturer' : 'Student'}
                          </span>
                          {user.studentId && (
                            <span className="inline-block text-[9px] font-mono font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 truncate">
                              ID: {user.studentId}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <div className="py-1.5 space-y-0.5">
                        <Link
                          to="/profile"
                          onClick={() => setShowUserMenu(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            isProfileActive
                              ? 'bg-gray-100 text-[#0047FF] font-bold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-[#1A1A1B]'
                          }`}
                        >
                          <User className="w-4 h-4 text-[#0047FF]" />
                          <span>Profile & Account Settings</span>
                        </Link>

                        <Link
                          to="/dashboard"
                          onClick={() => setShowUserMenu(false)}
                          className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                            isDashboardActive && !isProfileActive
                              ? 'bg-gray-100 text-[#0047FF] font-bold'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-[#1A1A1B]'
                          }`}
                        >
                          <LayoutDashboard className="w-4 h-4 text-gray-500" />
                          <span>Assignments Hub</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            setShowHelp(true);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-[#1A1A1B] rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <HelpCircle className="w-4 h-4 text-gray-500" />
                          <span>How Draftly Works</span>
                        </button>
                      </div>

                      {/* Logout Action */}
                      <div className="pt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            logout();
                            navigate('/login');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer text-left"
                        >
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span>Log Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Guide / How Draftly Works Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-150"
          onClick={() => setShowHelp(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#1A1A1B]">The Draftly Workspace</h3>
                  <p className="text-xs text-gray-500">How continuous proof-of-work works</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="w-7 h-7 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 font-sans leading-relaxed">
              <div className="p-3 bg-[#F9F8F6] rounded-xl border border-gray-200 space-y-1">
                <p className="font-bold text-[#1A1A1B] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#0047FF] text-white text-[10px] font-mono flex items-center justify-center">1</span>
                  Write in the Connected Workspace
                </p>
                <p className="text-gray-500 pl-5.5">
                  Students write their essays and coursework directly inside Draftly. Keystrokes and drafts are saved continuously with zero file uploads required.
                </p>
              </div>

              <div className="p-3 bg-[#F9F8F6] rounded-xl border border-gray-200 space-y-1">
                <p className="font-bold text-[#1A1A1B] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#0047FF] text-white text-[10px] font-mono flex items-center justify-center">2</span>
                  Multiplayer Group Collaboration
                </p>
                <p className="text-gray-500 pl-5.5">
                  Teams work in one shared sectioned document. Students create sections, write simultaneously, and submit when all members mark their work Done.
                </p>
              </div>

              <div className="p-3 bg-[#F9F8F6] rounded-xl border border-gray-200 space-y-1">
                <p className="font-bold text-[#1A1A1B] flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#0047FF] text-white text-[10px] font-mono flex items-center justify-center">3</span>
                  The Work Behind the Submission Stays With It
                </p>
                <p className="text-gray-500 pl-5.5">
                  When submitted, a server snapshot is permanently sealed. Lecturers read the final paper and inspect writing sessions, effort analytics, and contribution on demand.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-[#0047FF] hover:bg-[#0038CC] text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main" className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7 w-full scroll-mt-20">
        {children}
      </main>
    </div>
  );
}