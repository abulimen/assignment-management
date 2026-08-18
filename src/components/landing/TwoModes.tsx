import React from 'react';
import { User, Users, CheckCircle2, Lock, Sparkles, ArrowRight, ShieldCheck, Layers, GitBranch, FileCheck } from 'lucide-react';

export const TwoModes: React.FC = () => {
  return (
    <section id="workspace" className="py-20 md:py-28 bg-[#FBFBFA] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3.5 py-1.5 rounded-full bg-[#0047FF]/5 uppercase font-bold mb-4 inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#0047FF]" />
            <span>INDIVIDUAL & GROUP WORK</span>
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            Built for individual and group assignments.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/70 leading-relaxed font-sans">
            Whether a student is drafting an individual essay or a team is co-authoring a capstone project, Draftly provides a single, distraction-free academic workspace.
          </p>
        </div>

        {/* Two Balanced Product Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          
          {/* Card 1: Individual Assignments */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-xl hover:border-[#0047FF]/30 transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center border border-[#0047FF]/20 group-hover:scale-105 transition-transform">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                      SOLO WORKSPACE
                    </span>
                    <span className="text-sm font-bold text-[#1A1A1B]">Individual coursework</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded-md border border-[#0047FF]/15">
                  1 STUDENT
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#1A1A1B] tracking-tight mb-3">
                One student. One continuous assignment.
              </h3>
              <p className="text-[#1A1A1B]/70 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                Students write directly inside Draftly. No juggling draft files or version numbers. When they submit, the sealed assignment preserves the full story of its development.
              </p>

              {/* Workflow Breakdown */}
              <div className="space-y-3 bg-[#FAF9F7] rounded-xl border border-gray-200/90 p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0047FF]/10 text-[#0047FF] font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1B]">Direct In-Browser Authoring</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">
                      Draft in a familiar Microsoft-Word-styled editor with real-time autosave.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#0047FF]/10 text-[#0047FF] font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1B]">Effort & Process Capture</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">
                      Writing sessions, revision cadence, and citation pastes are recorded automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1B]">Immutable Submission Seal</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">
                      Submission creates a frozen server snapshot that lecturers evaluate with full context.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-sans">
              <span className="font-medium text-[#1A1A1B]">Full authorship protection</span>
              <span className="font-mono text-[11px] text-[#0047FF]">Zero file uploads needed</span>
            </div>
          </div>

          {/* Card 2: Group Assignments */}
          <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-xl hover:border-purple-500/30 transition-all duration-300 p-6 sm:p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                      SHARED WORKSPACE
                    </span>
                    <span className="text-sm font-bold text-[#1A1A1B]">Group capstones & projects</span>
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-200">
                  COLLABORATIVE TEAMS
                </span>
              </div>

              <h3 className="text-2xl font-bold text-[#1A1A1B] tracking-tight mb-3">
                One shared document. Everyone contributes.
              </h3>
              <p className="text-[#1A1A1B]/70 text-sm sm:text-base leading-relaxed mb-6 font-sans">
                Groups collaborate simultaneously in a shared document. When everyone marks &quot;Done&quot;, the leader submits a sealed snapshot with surviving text measured per member.
              </p>

              {/* Workflow Breakdown */}
              <div className="space-y-3 bg-[#FAF9F7] rounded-xl border border-gray-200/90 p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1B]">Self-Organized Sections</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">
                      Students create, name, and reorder document sections with real-time presence.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1B]">Member Status & Gate</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">
                      Each member marks <span className="text-emerald-700 font-bold">Done</span>. Leader submission requires all complete or a recorded override.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#1A1A1B]">Contribution X-Ray</h4>
                    <p className="text-xs text-gray-500 font-sans mt-0.5">
                      Contribution measured objectively by surviving text in the final document.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-sans">
              <span className="font-medium text-[#1A1A1B]">No more free-rider disputes</span>
              <span className="font-mono text-[11px] text-purple-600">Leader submission gate</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
