import React, { useState } from 'react';
import { X, ArrowRight, ShieldCheck, Building } from 'lucide-react';
import { Logo } from './Logo';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose }) => {
  const [authMethod, setAuthMethod] = useState<'sso' | 'email'>('sso');
  const [email, setEmail] = useState('');
  const [ssoDomain, setSsoDomain] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggedInSuccess, setLoggedInSuccess] = useState(false);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setTimeout(() => {
      setLoggingIn(false);
      setLoggedInSuccess(true);
    }, 800);
  };

  const handleReset = () => {
    setLoggedInSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#F9F8F6] border-b border-gray-200 p-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="font-mono text-[10px] font-bold text-[#1A1A1B] uppercase tracking-wider">
              PORTAL LOGIN
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {loggedInSuccess ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#0047FF]/5 text-[#0047FF] flex items-center justify-center mx-auto border border-[#0047FF]/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1B]">
                Institutional SSO Connected
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-sans">
                Redirecting to your active course workspaces...
              </p>
              <button
                onClick={handleReset}
                className="w-full mt-4 bg-[#1A1A1B] hover:bg-[#2A2A2B] text-white text-xs font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
              >
                Close preview
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#1A1A1B] mb-1">
                  Sign in to Draftly
                </h3>
                <p className="text-xs text-gray-500 font-sans">
                  Access your individual and collaborative course workspaces.
                </p>
              </div>

              {/* Toggle SSO vs Email */}
              <div className="flex rounded-md bg-gray-100 p-1 text-xs font-medium border border-gray-200 font-sans">
                <button
                  type="button"
                  onClick={() => setAuthMethod('sso')}
                  className={`flex-1 py-1.5 rounded transition-all cursor-pointer ${
                    authMethod === 'sso'
                      ? 'bg-white text-[#1A1A1B] shadow-xs font-semibold'
                      : 'text-gray-500 hover:text-[#1A1A1B]'
                  }`}
                >
                  University SSO
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('email')}
                  className={`flex-1 py-1.5 rounded transition-all cursor-pointer ${
                    authMethod === 'email'
                      ? 'bg-white text-[#1A1A1B] shadow-xs font-semibold'
                      : 'text-gray-500 hover:text-[#1A1A1B]'
                  }`}
                >
                  Email & Password
                </button>
              </div>

              {authMethod === 'sso' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                      Institutional Domain / Identifier
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={ssoDomain}
                        onChange={(e) => setSsoDomain(e.target.value)}
                        placeholder="e.g. oxford.ac.uk or stanford.edu"
                        className="w-full text-sm pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full flex items-center justify-center gap-2 bg-[#0047FF] hover:bg-[#0038CC] text-white font-semibold text-sm py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>{loggingIn ? 'Authenticating...' : 'Continue with Single Sign-On'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                      Academic Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="prof.smith@college.edu"
                      className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-gray-500 uppercase mb-1 tracking-wider">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-[#0047FF] bg-[#F9F8F6] text-[#1A1A1B] font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full flex items-center justify-center gap-2 bg-[#1A1A1B] hover:bg-[#2A2A2B] text-white font-semibold text-sm py-2.5 rounded-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <span>{loggingIn ? 'Signing in...' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 text-center">
                <span className="text-xs text-gray-500 font-sans">
                  Need early access?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                    }}
                    className="text-[#0047FF] font-semibold hover:underline"
                  >
                    Request beta invitation
                  </button>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

