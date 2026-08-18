import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Bold,
  Italic,
  List,
  Underline,
  AlignLeft,
  ShieldCheck,
  Clock,
  Users,
} from 'lucide-react';
import { HeroCanvas } from './HeroCanvas';

interface HeroProps {
  onOpenBetaModal: () => void;
  scrollY?: number;
}

const TYPING_SENTENCES = [
  'The divergence between central bank forward guidance cycles represents a crucial case study in macroeconomic transmission mechanisms. Sovereign yield premiums responded non-linearly across domestic commercial sectors, suggesting that orthodox monetary models underestimate cross-border spillover effects during periods of synchronised tightening.',
  'Empirical regression indicates a statistically robust correlation between dollar-denominated debt exposure and sovereign CDS spread volatility during forward guidance shifts. These findings are consistent with the Mundell-Fleming framework when extended to account for modern capital mobility.',
  'Consequently, cross-border capital reallocation accelerated during this period, compelling emerging market monetary authorities to deploy foreign exchange reserves at historically elevated rates to stabilise import parity and prevent inflationary pass-through.',
];

export const Hero: React.FC<HeroProps> = ({ onOpenBetaModal, scrollY = 0 }) => {
  // Live Typing Simulation
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  const currentSentence = TYPING_SENTENCES[sentenceIndex];

  useEffect(() => {
    const typingSpeed = isDeleting ? 18 : 48;
    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentSentence.length) {
        setCharIndex((prev) => prev + 1);
        if (charIndex % 15 === 0) setSaveStatus('saving');
        else if (charIndex % 15 === 8) setSaveStatus('saved');
      } else if (!isDeleting && charIndex === currentSentence.length) {
        setSaveStatus('saved');
        setTimeout(() => setIsDeleting(true), 4000);
      } else if (isDeleting && charIndex > 0) {
        setCharIndex((prev) => prev - 1);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setSentenceIndex((prev) => (prev + 1) % TYPING_SENTENCES.length);
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, currentSentence, sentenceIndex]);

  const liveTypedText = currentSentence.slice(0, charIndex);

  // Simulate word count
  const baseWords = 3440;
  const typedWordCount =
    baseWords + (liveTypedText.trim() ? liveTypedText.trim().split(/\s+/).length : 0);

  // Parallax offsets (text rises slower, artifact sinks slower)
  const textOffset = scrollY * 0.25;
  const artifactOffset = scrollY * 0.08;
  const canvasOffset = scrollY * 0.15;
  // Fade the canvas art as user scrolls past the hero
  const canvasOpacity = Math.max(0, 1 - scrollY / 700);

  return (
    <section className="relative pt-32 pb-16 md:pt-36 md:pb-24 overflow-hidden bg-[#FBFBFA]">
      {/* Algorithmic art background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translateY(${canvasOffset}px)`,
          opacity: canvasOpacity * 0.55,
        }}
      >
        <HeroCanvas />
      </div>

      {/* Soft atmospheric wash over the canvas */}
      <div
        aria-hidden="true"
        className="absolute top-[-15%] left-[10%] w-[600px] h-[600px] rounded-full bg-[#0047FF]/[0.025] blur-[140px] pointer-events-none animate-float-slow"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[-10%] right-[5%] w-[500px] h-[500px] rounded-full bg-[#0047FF]/[0.015] blur-[160px] pointer-events-none animate-float-reverse"
      />

      <div className="relative max-w-6xl mx-auto px-6 sm:px-10">
        {/* ─── Copy Block (parallax: rises slightly) ─── */}
        <div
          className="text-center max-w-3xl mx-auto mb-12 md:mb-14 will-change-transform"
          style={{ transform: `translateY(-${textOffset}px)` }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-[72px] font-black leading-[1.06] tracking-[-0.035em] text-[#1A1A1B] animate-fade-up">
            The workspace for{' '}
            <br className="hidden sm:inline" />
            student assignments.
          </h1>

          <p className="text-base sm:text-lg text-[#1A1A1B]/70 max-w-xl mx-auto mt-6 leading-relaxed animate-fade-up delay-75">
            Where student coursework actually happens. Write,
            collaborate, and submit directly. The full history of the
            work stays with it.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 animate-fade-up delay-150">
            <button
              id="hero-join-beta-cta"
              onClick={onOpenBetaModal}
              className="w-full sm:w-auto bg-[#0047FF] hover:bg-[#0038CC] text-white px-8 py-3.5 rounded-xl text-[15px] font-bold shadow-xl shadow-[#0047FF]/20 hover:shadow-2xl hover:shadow-[#0047FF]/30 transition-all duration-200 active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0047FF]"
            >
              <span>Join the beta</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <a
              href="#how-it-works"
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-[#1A1A1B] px-7 py-3.5 rounded-xl text-[15px] font-semibold border border-gray-200 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer inline-flex items-center justify-center gap-2 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#0047FF]"
            >
              <span>See how it works</span>
            </a>
          </div>
        </div>

        {/* ─── The Artifact: A Living Workspace (parallax: minimal drift) ─── */}
        <div
          className="w-full max-w-[960px] mx-auto animate-fade-scale delay-225 will-change-transform"
          style={{ transform: `translateY(-${artifactOffset}px)` }}
        >
          {/* Outer window chrome */}
          <div className="bg-white rounded-2xl shadow-2xl shadow-[#1A1A1B]/10 border border-gray-200 overflow-hidden">
            {/* ── Title bar ── */}
            <div className="h-12 border-b border-gray-200 bg-[#FAFAF8] flex items-center px-4 sm:px-5 justify-between select-none">
              <div className="flex items-center gap-3 min-w-0">
                {/* Presence dots */}
                <div className="flex -space-x-1.5 items-center flex-shrink-0">
                  <div
                    className="w-6 h-6 rounded-full bg-[#0047FF] border-2 border-white flex items-center justify-center text-[9px] font-black text-white"
                    title="Chiamaka Eze"
                  >
                    CE
                  </div>
                  <div
                    className="w-6 h-6 rounded-full bg-teal-600 border-2 border-white flex items-center justify-center text-[9px] font-black text-white"
                    title="Babatunde Adeleke"
                  >
                    BA
                  </div>
                  <div
                    className="w-6 h-6 rounded-full bg-purple-600 border-2 border-white flex items-center justify-center text-[9px] font-black text-white"
                    title="Zainab Abubakar"
                  >
                    ZA
                  </div>
                </div>

                <div className="h-4 w-px bg-gray-200 hidden sm:block" />

                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[#0047FF]/8 text-[#0047FF] rounded border border-[#0047FF]/15 uppercase flex-shrink-0">
                    ECON 402
                  </span>
                  <span className="text-xs font-semibold text-[#1A1A1B] truncate hidden sm:inline">
                    Comparative Analysis of Monetary Policy
                  </span>
                </div>
              </div>

              {/* Save indicator */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    saveStatus === 'saving'
                      ? 'bg-amber-500 animate-pulse'
                      : 'bg-emerald-500 animate-beacon-pulse'
                  }`}
                />
                <span className="text-[11px] font-mono text-gray-500 font-medium hidden sm:inline">
                  {saveStatus === 'saving'
                    ? 'Saving...'
                    : 'All changes saved'}
                </span>
              </div>
            </div>

            {/* ── Toolbar ribbon ── */}
            <div className="border-b border-gray-100 bg-white px-4 sm:px-5 py-1.5 flex items-center justify-between text-xs text-gray-500 select-none">
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5 pr-2 border-r border-gray-100">
                  <span className="px-1.5 py-0.5 text-[11px] font-serif text-gray-700 font-medium">
                    Times New Roman
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    12pt
                  </span>
                </div>
                <div className="flex items-center gap-px">
                  <button className="p-1 rounded text-gray-400 hover:bg-gray-50 cursor-default">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 rounded text-gray-400 hover:bg-gray-50 cursor-default">
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 rounded text-gray-400 hover:bg-gray-50 cursor-default">
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 rounded text-gray-400 hover:bg-gray-50 cursor-default">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1 rounded text-gray-400 hover:bg-gray-50 cursor-default">
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="text-[#0047FF] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0047FF]" />
                  {typedWordCount.toLocaleString()} words
                </span>
                <span className="text-gray-400 hidden sm:inline">
                  Page 2 of 3
                </span>
              </div>
            </div>

            {/* ── Document canvas ── */}
            <div className="bg-[#ECEAE5] p-4 sm:p-6">
              <div className="max-w-[640px] mx-auto bg-white rounded-sm shadow-md border border-[#D8D6D0] p-6 sm:p-8 min-h-[280px] sm:min-h-[320px] flex flex-col">
                {/* Section heading */}
                <h2 className="text-base sm:text-lg font-bold font-sans tracking-tight text-[#1A1A1B] mb-4">
                  Policy Framework &amp; Field Survey
                </h2>

                {/* Static paragraph — Chiamaka's work */}
                <div className="relative mb-4">
                  <div className="font-serif text-xs sm:text-[13px] leading-[1.7] text-gray-800">
                    <span className="inline-block relative mr-1">
                      <span className="inline-block w-[2px] h-[14px] bg-[#0047FF] align-middle" />
                      <span className="absolute -top-4 left-0 px-1.5 py-px bg-[#0047FF] text-white font-sans text-[8px] font-bold rounded-sm whitespace-nowrap">
                        Chiamaka Eze
                      </span>
                    </span>
                    The divergence between central bank forward guidance
                    cycles represents a crucial case study in
                    macroeconomic transmission mechanisms. Sovereign yield
                    premiums responded non-linearly across domestic
                    commercial sectors, suggesting that orthodox monetary
                    models underestimate cross-border spillover effects.
                  </div>
                </div>

                {/* Live typing paragraph — Babatunde's work */}
                <div className="relative p-3 rounded-lg border border-teal-300/60 bg-teal-50/30 min-h-[72px] sm:min-h-[80px] flex-1">
                  <div className="absolute -top-2 left-2.5 px-1.5 py-px bg-teal-600 text-white font-sans text-[8px] font-bold rounded-sm flex items-center gap-1">
                    <span>Babatunde Adeleke</span>
                    <span className="opacity-80 font-normal">
                      · typing
                    </span>
                  </div>

                  <div className="font-serif text-xs sm:text-[13px] leading-[1.7] text-gray-800 pt-1">
                    <span>{liveTypedText}</span>
                    <span className="inline-block w-[2px] h-[13px] bg-teal-600 ml-px align-middle animate-pulse" />
                  </div>
                </div>

                {/* Page footer */}
                <div className="pt-3 mt-auto flex items-center justify-between text-[9px] font-sans text-gray-400">
                  <span>Section: Policy Framework &amp; Field Survey</span>
                  <span className="font-semibold">Page 2</span>
                </div>
              </div>
            </div>

            {/* ── Preserved record strip ── */}
            <div className="border-t border-gray-200 bg-[#FAFAF8] px-4 sm:px-5 py-2.5 flex items-center justify-between select-none">
              <div className="flex items-center gap-4 text-[11px] text-gray-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span>3 contributors</span>
                </span>
                <span className="hidden sm:flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-gray-400" />
                  <span>Activity since 14 Aug</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Work history preserved</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
