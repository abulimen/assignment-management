import React from 'react';
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

          {/* Right: Minimal Links */}
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
            <button
              onClick={() =>
                onOpenInfoModal(
                  'Privacy Policy',
                  'Draftly adheres to strict student data privacy standards (FERPA / GDPR compliant). Workspace provenance data is only captured during official assignment authoring sessions and is strictly confidential to course instructors and enrolled group members. We do not sell data, train public AI models on student work, or deploy invasive biometric/screen recording tools.'
                )
              }
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Privacy
            </button>
            <button
              onClick={() =>
                onOpenInfoModal(
                  'Terms of Service',
                  'Draftly provides an assignment workspace infrastructure for academic institutions. By participating in the Draftly beta, institutions and educators agree to use audit telemetry responsibly in accordance with their faculty guidelines and academic integrity policies.'
                )
              }
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Terms
            </button>
            <button
              onClick={() =>
                onOpenInfoModal(
                  'Contact & Support',
                  'Have questions about onboarding Draftly for your department or next semester course? Contact our academic integrations team at beta@draftly.edu or schedule a 15-minute walkthrough with an educational specialist.'
                )
              }
              className="hover:text-[#0047FF] transition-colors cursor-pointer"
            >
              Contact
            </button>
          </div>

        </div>

        {/* Bottom copyright notice */}
        <div className="mt-8 pt-8 border-t border-gray-100 text-xs font-mono text-gray-400">
          <div>&copy; {new Date().getFullYear()} Draftly Inc. All rights reserved.</div>
        </div>

      </div>
    </footer>
  );
};

