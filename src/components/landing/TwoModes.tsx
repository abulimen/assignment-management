import React from 'react';
import { User, Users } from 'lucide-react';

export const TwoModes: React.FC = () => {
  return (
    <section id="workspace" className="py-20 md:py-28 bg-[#F9F8F6] border-t border-gray-200/60">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            VERSATILE ARCHITECTURE
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            One workspace. Two modes.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed font-sans">
            Whether a student is tackling an in-depth solo thesis or collaborating across a four-person case study, Draftly adapts to the assignment structure while preserving a dependable record of the process.
          </p>
        </div>

        {/* Equal Visual Importance Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Individual Mode Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Header & Badges */}
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center border border-[#0047FF]/20">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                      MODE A · SOLO
                    </span>
                    <span className="text-sm font-bold text-[#1A1A1B]">Individual Assignment</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded border border-[#0047FF]/15">
                  SOLO WRITER
                </span>
              </div>

              {/* Headline & Copy */}
              <h3 className="text-2xl font-bold text-[#1A1A1B] tracking-tight mb-3">
                One student. One workspace.
              </h3>
              <p className="text-[#1A1A1B]/70 text-sm sm:text-base leading-relaxed mb-6">
                Students work directly inside Draftly. Their assignment develops from the first draft to the final submission in one continuous workspace.
              </p>

              {/* Supporting Metadata Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['ONE WRITER', 'WORKSPACE HISTORY', 'SEALED SUBMISSION'].map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] font-semibold tracking-wider text-gray-600 bg-gray-100 px-2.5 py-1 rounded border border-gray-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Realistic UI Visualization of Individual Mode */}
              <div className="bg-[#F9F8F6] rounded-lg border border-gray-200 p-4 text-xs space-y-3 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-gray-500">PROJECT · HIST 201 INDIVIDUAL THESIS</span>
                  <span className="text-[#059669] flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" /> ACTIVE DRAFT
                  </span>
                </div>

                <div className="space-y-2 bg-white p-3 rounded-md border border-gray-200">
                  <div className="flex justify-between text-[#1A1A1B] font-sans font-semibold text-[13px]">
                    <span>Author: Marcus Vance</span>
                    <span className="font-mono text-[12px] text-[#0047FF] font-bold">3,420 words</span>
                  </div>
                  <div className="text-[12px] font-sans text-gray-600">
                    Draft milestones: Outline (Aug 10) → Methodology Draft (Aug 12) → Primary Source Integration (Aug 14)
                  </div>
                  {/* Timeline progress line */}
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0047FF] h-full rounded-full" style={{ width: '82%' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                  <span>Version Hash: 0x9f82...3b</span>
                  <span className="text-[#1A1A1B] font-sans font-medium">100% solo authorship recorded</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 font-medium">
              Eliminates cut-and-paste ambiguity through continuous session history.
            </div>
          </div>

          {/* Group Mode Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Header & Badges */}
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center border border-[#0047FF]/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                      MODE B · TEAM
                    </span>
                    <span className="text-sm font-bold text-[#1A1A1B]">Group Assignment</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded border border-[#0047FF]/15">
                  COLLABORATIVE
                </span>
              </div>

              {/* Headline & Copy */}
              <h3 className="text-2xl font-bold text-[#1A1A1B] tracking-tight mb-3">
                One shared workspace. Everyone contributes.
              </h3>
              <p className="text-[#1A1A1B]/70 text-sm sm:text-base leading-relaxed mb-6">
                Groups work together in the same document, organize their sections themselves, and collaborate in real time or at different times. The record preserves how the work came together.
              </p>

              {/* Supporting Metadata Tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['SHARED DOCUMENT', 'REAL-TIME COLLABORATION', 'CONTRIBUTION RECORD'].map((tag) => (
                  <span
                    key={tag}
                    className="font-mono text-[10px] font-semibold tracking-wider text-gray-600 bg-gray-100 px-2.5 py-1 rounded border border-gray-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Realistic UI Visualization of Group Mode */}
              <div className="bg-[#F9F8F6] rounded-lg border border-gray-200 p-4 text-xs space-y-3 font-mono">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-gray-500">TEAM · BIO 405 LAB REPORT (GROUP 03)</span>
                  <span className="text-[#00E5FF] flex items-center gap-1 font-semibold text-[#008899]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" /> 3 WRITERS ONLINE
                  </span>
                </div>

                <div className="space-y-2 bg-white p-3 rounded-md border border-gray-200">
                  <div className="flex justify-between text-[#1A1A1B] font-sans font-semibold text-[13px]">
                    <span>4 Contributors Synced</span>
                    <span className="font-mono text-[12px] text-[#0047FF] font-bold">4,890 words</span>
                  </div>
                  
                  {/* Multi-contributor bars */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1 font-mono text-[10px]">
                    <div className="bg-[#0047FF]/5 border border-[#0047FF]/20 p-1.5 rounded text-center">
                      <div className="font-bold text-[#0047FF]">Elena (34%)</div>
                      <div className="text-gray-500">Intro / Lab</div>
                    </div>
                    <div className="bg-cyan-50 border border-cyan-200 p-1.5 rounded text-center">
                      <div className="font-bold text-cyan-800">Sam (28%)</div>
                      <div className="text-gray-500">Data Visuals</div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-1.5 rounded text-center">
                      <div className="font-bold text-gray-700">Liam (26%)</div>
                      <div className="text-gray-500">Results</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 p-1.5 rounded text-center">
                      <div className="font-bold text-amber-800">Maya (12%)</div>
                      <div className="text-gray-500">Conclusion</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                  <span>Sections claimable by team members</span>
                  <span className="text-[#1A1A1B] font-sans font-medium">Automatic revision diffing</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 font-medium">
              Protects students who do the work while providing fair visibility on collaboration.
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

