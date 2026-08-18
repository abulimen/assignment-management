import React from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

export const TheProblem: React.FC = () => {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            THE WORKFLOW GAP
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            The assignment shouldn&apos;t disappear into a file upload.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/70 leading-relaxed font-sans">
            In a traditional workflow, the final document is usually the only thing that survives. Draftly gives the assignment a place where the work actually happens.
          </p>
        </div>

        {/* Compact Workflow Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Traditional Workflow */}
          <div className="bg-[#F9F8F6] rounded-xl border border-gray-200 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold block">
                    TRADITIONAL WORKFLOW
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1B]">
                    Disconnected Tools
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700">
                  DISCONNECTED
                </span>
              </div>

              {/* Compact Flow Items */}
              <div className="space-y-2.5">
                {[
                  { step: 'Assignment created', note: 'Prompt posted on portal' },
                  { step: 'External writing', note: 'Word docs, Google Docs, personal files' },
                  { step: 'WhatsApp / side chats', note: 'Collaboration fragmented across private apps' },
                  { step: 'Final file upload', note: 'Single PDF/DOCX submitted at deadline' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-white border border-gray-200 flex items-center justify-between text-xs sm:text-sm font-sans"
                  >
                    <div>
                      <span className="font-semibold text-[#1A1A1B]">{item.step}</span>
                      <span className="text-gray-500 text-xs ml-2 hidden sm:inline">— {item.note}</span>
                    </div>
                    <span className="font-mono text-xs text-gray-400">0{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-2 text-xs font-semibold text-red-700 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Result: The development process disappears completely.</span>
            </div>
          </div>

          {/* Draftly Workflow */}
          <div className="bg-white rounded-xl border-2 border-[#0047FF]/30 shadow-md hover:shadow-lg transition-all p-6 sm:p-8 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#0047FF] font-bold block">
                    DRAFTLY WORKFLOW
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-[#1A1A1B]">
                    The Connected Workspace
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20">
                  CONNECTED
                </span>
              </div>

              {/* Compact Flow Items */}
              <div className="space-y-2.5">
                {[
                  { step: 'Assignment created', note: 'Rules & format set directly in workspace' },
                  { step: 'Draftly workspace', note: 'Students draft and structure content in one place' },
                  { step: 'Writing + collaboration', note: 'Individual work or real-time group editing' },
                  { step: 'Sealed submission', note: 'Final document locked with its full record' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#F9F8F6] border border-gray-200 flex items-center justify-between text-xs sm:text-sm font-sans"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#0047FF] flex-shrink-0" />
                      <div>
                        <span className="font-semibold text-[#1A1A1B]">{item.step}</span>
                        <span className="text-gray-600 text-xs ml-2 hidden sm:inline">— {item.note}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#0047FF]">0{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-semibold text-[#0047FF] bg-[#0047FF]/5 p-3 rounded-lg border border-[#0047FF]/15">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Result: The development stays connected to the submission.</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
