import React, { useState } from 'react';
import {
  ArrowRight,
  FileText,
  Clock,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Users,
  History,
  Lock,
} from 'lucide-react';

interface HeroProps {
  onOpenBetaModal: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenBetaModal }) => {
  const [activeTab, setActiveTab] = useState<'document' | 'contribution' | 'activity'>('document');

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-[#F9F8F6]">
      {/* Geometric radial dot grid background */}
      <div
        className="absolute top-0 right-0 w-1/2 h-full pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: 'radial-gradient(#0047FF 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-1/3 h-1/2 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(#0047FF 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 sm:px-10 flex flex-col items-center">
        {/* Header Copy */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          {/* Geometric Eyebrow */}
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            ASSIGNMENT WORKSPACE
          </span>

          {/* Primary Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold leading-tight tracking-tighter text-[#1A1A1B] max-w-3xl mx-auto">
            See the work behind <br className="hidden sm:inline" />
            the submission.
          </h1>

          {/* Supporting Copy */}
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 max-w-2xl mx-auto mt-4 leading-relaxed font-sans">
            The workspace where students actually complete their assignments. The work, collaboration, and final submission stay connected and verifiable.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <button
              id="hero-join-beta-cta"
              onClick={onOpenBetaModal}
              className="w-full sm:w-auto bg-[#0047FF] hover:bg-[#0038CC] text-white px-7 py-3.5 rounded-full text-sm font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Join the beta</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#how-it-works"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-[#1A1A1B] px-7 py-3.5 rounded-full text-sm font-semibold border border-gray-200 shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>See how it works</span>
            </a>
          </div>
        </div>

        {/* Hero Product Visualization (Geometric Balance 3-Pane Architecture) */}
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden relative">
          
          {/* Top Window Bar */}
          <div className="h-12 border-b border-gray-100 bg-gray-50/50 flex items-center px-5 sm:px-6 justify-between flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-1.5 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#1A1A1B]">
                  JR
                </div>
                <div className="w-6 h-6 rounded-full bg-[#0047FF] border-2 border-white flex items-center justify-center text-[10px] font-bold text-white">
                  SC
                </div>
                <div className="w-6 h-6 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#1A1A1B]">
                  DL
                </div>
              </div>
              <div className="h-4 w-[1px] bg-gray-300 mx-1 hidden sm:block" />
              <span className="text-xs font-semibold text-gray-600 truncate max-w-[200px] sm:max-w-md">
                Group 07 • Macroeconomics Final
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile View Switcher */}
              <div className="flex md:hidden items-center gap-1 bg-gray-100 p-0.5 rounded-md text-[11px] font-medium">
                <button
                  onClick={() => setActiveTab('document')}
                  className={`px-2 py-0.5 rounded ${activeTab === 'document' ? 'bg-white shadow-xs text-[#1A1A1B]' : 'text-gray-500'}`}
                >
                  Doc
                </button>
                <button
                  onClick={() => setActiveTab('contribution')}
                  className={`px-2 py-0.5 rounded ${activeTab === 'contribution' ? 'bg-white shadow-xs text-[#1A1A1B]' : 'text-gray-500'}`}
                >
                  Map
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-2 py-0.5 rounded ${activeTab === 'activity' ? 'bg-white shadow-xs text-[#1A1A1B]' : 'text-gray-500'}`}
                >
                  Log
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest hidden sm:inline">
                  Draftly Beta • Live
                </span>
              </div>
            </div>
          </div>

          {/* 3-Pane Body Grid */}
          <div className="flex flex-1 overflow-hidden min-h-[480px]">
            
            {/* Left Pane: Contribution */}
            <aside
              className={`w-64 border-r border-gray-100 p-5 flex-col gap-6 bg-gray-50/30 flex-shrink-0 ${
                activeTab === 'contribution' ? 'flex w-full md:w-64' : 'hidden md:flex'
              }`}
            >
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-4">
                  Contribution
                </h4>
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-[#1A1A1B]">
                      <span>Jonathan Ray</span>
                      <span className="font-mono font-bold">41%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0047FF] w-[41%]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-[#1A1A1B]">
                      <span>Sarah Chen</span>
                      <span className="font-mono font-bold">29%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0047FF]/70 w-[29%]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-[#1A1A1B]/80">
                      <span>David Lee</span>
                      <span className="font-mono font-bold">22%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-300 w-[22%]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-[#1A1A1B]/60">
                      <span>Michael Kwan</span>
                      <span className="font-mono font-bold">8%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gray-200 w-[8%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Lock Card */}
              <div className="mt-auto p-3.5 bg-[#0047FF]/5 border border-[#0047FF]/10 rounded-lg">
                <span className="text-[10px] block font-mono font-bold text-[#0047FF] mb-1 tracking-wider">
                  EVIDENCE LOCK
                </span>
                <p className="text-[11px] text-[#0047FF]/80 leading-relaxed font-sans">
                  Submission sealed at 21:47:32. Content and activity log preserved.
                </p>
              </div>
            </aside>

            {/* Center Pane: Editorial Document */}
            <main
              className={`flex-1 p-6 sm:p-8 overflow-y-auto bg-white ${
                activeTab === 'document' ? 'block' : 'hidden md:block'
              }`}
            >
              <div className="max-w-2xl">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    Section 02 · Monetary Framework
                  </span>
                  <span className="text-[10px] font-mono text-[#0047FF] bg-[#0047FF]/5 px-2 py-0.5 rounded border border-[#0047FF]/10 font-bold">
                    Sarah Chen Active
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-[#1A1A1B] tracking-tight">
                  Comparative Analysis of Central Bank Policies
                </h2>

                <p className="text-[#1A1A1B]/80 leading-relaxed mb-4 text-sm sm:text-base font-sans">
                  The divergence between the Federal Reserve and the European Central Bank during the late 2023 period illustrates a fundamental shift in global monetary strategies. While the Fed maintained a hawkish stance on long-term rates, the ECB began signaling a more cautious pivot...
                </p>

                {/* Sarah's Inline Callout */}
                <div className="p-4 border-l-4 border-[#0047FF] bg-[#0047FF]/5 text-sm text-[#1A1A1B]/80 mb-4 rounded-r-lg">
                  <div className="font-bold text-[#0047FF] text-xs font-mono mb-0.5">
                    Sarah Chen · 21:14:07
                  </div>
                  <div className="italic">
                    I&apos;ve updated the chart references in Section 4 to reflect the new inflation data from the October release.
                  </div>
                </div>

                <p className="text-[#1A1A1B]/80 leading-relaxed text-sm sm:text-base font-sans">
                  In this section, we analyze the impact of these policies on emerging market economies, particularly those with high dollar-denominated debt. The following table highlights the correlation between policy rate adjustments and currency volatility indices across the BRICS+ nations.
                </p>
              </div>
            </main>

            {/* Right Pane: Activity Record */}
            <aside
              className={`w-72 border-l border-gray-100 bg-white p-5 flex-shrink-0 flex-col justify-between ${
                activeTab === 'activity' ? 'flex w-full md:w-72' : 'hidden lg:flex'
              }`}
            >
              <div>
                <h4 className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-4">
                  Activity Record
                </h4>
                <div className="space-y-3.5 font-mono text-[10px]">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-gray-400 flex-shrink-0">21:47:32</span>
                    <span className="flex-1 text-[#1A1A1B]">Submission sealed</span>
                    <span className="text-[#0047FF] font-bold">Jonathan</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-gray-400 flex-shrink-0">21:32:55</span>
                    <span className="flex-1 text-[#1A1A1B]">Section reordered</span>
                    <span className="text-gray-500">Team</span>
                  </div>
                  <div className="flex gap-2.5 items-start opacity-75">
                    <span className="text-gray-400 flex-shrink-0">21:19:04</span>
                    <span className="flex-1 text-[#1A1A1B]">Contribution updated</span>
                    <span className="font-bold text-[#1A1A1B]">David</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <span className="text-gray-400 flex-shrink-0">21:14:07</span>
                    <span className="flex-1 bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                      Paste detected
                    </span>
                    <span className="font-bold text-[#0047FF]">Sarah</span>
                  </div>
                  <div className="flex gap-2.5 items-start opacity-75">
                    <span className="text-gray-400 flex-shrink-0">20:09:12</span>
                    <span className="flex-1 text-[#1A1A1B]">First work session</span>
                    <span className="font-bold text-[#1A1A1B]">Jonathan</span>
                  </div>
                  <div className="flex gap-2.5 items-start opacity-40">
                    <span className="text-gray-400 flex-shrink-0">20:06:41</span>
                    <span className="flex-1 text-[#1A1A1B]">Workspace opened</span>
                    <span className="text-gray-500">System</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={onOpenBetaModal}
                  className="w-full py-2 border border-gray-200 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider text-[#1A1A1B] hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Full History Export
                </button>
              </div>
            </aside>

          </div>
        </div>

        {/* 3-Card Feature Ribbon (Geometric Balance Layout) */}
        <div className="w-full max-w-5xl flex flex-col md:flex-row justify-between mt-12 gap-6">
          <div className="flex-1 p-6 border border-gray-200 bg-white/60 rounded-xl hover:bg-white transition-all shadow-xs">
            <h3 className="font-bold mb-2 text-[#1A1A1B] text-base">Individual assignments</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              One student. One workspace. The assignment develops from first draft to sealed submission.
            </p>
          </div>

          <div className="flex-1 p-6 border-2 border-[#0047FF]/20 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all">
            <h3 className="font-bold mb-2 flex items-center gap-2 text-[#1A1A1B] text-base">
              Group assignments{' '}
              <span className="text-[9px] bg-[#0047FF] text-white px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">
                MOST POPULAR
              </span>
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Shared document. Everyone contributes. A clear preserved record of who did what, and when.
            </p>
          </div>

          <div className="flex-1 p-6 border border-gray-200 bg-white/60 rounded-xl hover:bg-white transition-all shadow-xs">
            <h3 className="font-bold mb-2 text-[#1A1A1B] text-base">Evidence on demand</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              The record stays quiet. It exists to inform a grading decision when one is needed, not to spy.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};

