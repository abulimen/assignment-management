import React from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface BetaCTAProps {
  onOpenBetaModal: () => void;
}

export const BetaCTA: React.FC<BetaCTAProps> = ({ onOpenBetaModal }) => {
  return (
    <section className="py-20 md:py-28 bg-[#0047FF] text-white relative overflow-hidden">
      {/* Subtle geometric grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-6 sm:px-10">
        <div className="max-w-4xl mx-auto text-center">
          
          {/* Restrained Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 border border-white/20 text-white mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] font-mono uppercase text-white">
              DRAFTLY BETA PROGRAM
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight text-white mb-6">
            Free for early lecturers and their courses.
          </h2>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto mb-10 font-sans">
            We&apos;re onboarding an early group of lecturers to use Draftly with real assignments. Bring one assignment, let your students work inside Draftly, and see how the workflow feels.
          </p>

          {/* Obvious Primary Action Button */}
          <div className="flex flex-col items-center justify-center gap-4 mb-6">
            <button
              id="cta-join-beta-btn"
              onClick={onOpenBetaModal}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-[#1A1A1B] text-base sm:text-lg font-bold px-8 py-4 rounded-xl shadow-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Join the beta</span>
              <ArrowRight className="w-5 h-5 text-[#0047FF]" />
            </button>
          </div>

          {/* Supporting Microcopy */}
          <div className="font-mono text-[11px] font-bold tracking-widest text-white/80 uppercase">
            FREE DURING THE BETA · SET UP IN MINUTES
          </div>

          {/* 3 Quick Assurance Bullets */}
          <div className="mt-12 pt-8 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-white/85 max-w-3xl mx-auto font-sans">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00E5FF]" />
              <span>No LMS overhaul required</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00E5FF]" />
              <span>Start with a single trial assignment</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00E5FF]" />
              <span>Dedicated onboarding support</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

