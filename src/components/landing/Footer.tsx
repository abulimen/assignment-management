import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

interface FooterProps {
  onOpenBetaModal: () => void;
  onOpenSignInModal: () => void;
  onOpenInfoModal: (title: string, content: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenBetaModal,
  onOpenSignInModal,
  onOpenInfoModal,
}) => {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          
          {/* Left: Logo & Tagline */}
          <div className="space-y-3 max-w-sm">
            <Logo size="md" />
            <p className="text-sm text-[#1A1A1B]/60 leading-relaxed font-sans">
              Assignment workspaces for the way coursework is actually done.
            </p>
          </div>

          {/* Right: Navigation & Legal Links */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-sm font-medium text-[#1A1A1B]/70 font-sans">
            <button
              onClick={onOpenBetaModal}
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Join the beta
            </button>
            <button
              onClick={onOpenSignInModal}
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <Link
              to="/privacy"
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Terms
            </Link>
            <Link
              to="/cookies"
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Cookies
            </Link>
            <button
              onClick={() =>
                onOpenInfoModal(
                  'Contact & Support',
                  'Have questions about onboarding Draftly for your department or next semester course? Contact our academic integrations team at beta@draftly.ng or schedule a walkthrough with an educational specialist at legal@draftly.ng.'
                )
              }
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>

        </div>

        {/* Bottom copyright notice */}
        <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono text-gray-400">
          <div>&copy; {new Date().getFullYear()} Draftly Technologies Ltd. All rights reserved.</div>
          <div className="text-[11px] text-gray-400 font-sans">
            Aligned with Nigeria Data Protection Act (NDPA) 2023
          </div>
        </div>

      </div>
    </footer>
  );
};


