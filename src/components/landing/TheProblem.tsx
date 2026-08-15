import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const TheProblem: React.FC = () => {
  return (
    <section className="py-20 md:py-28 bg-white border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            THE COURSEWORK GAP
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            The assignment should have a place where the work actually happens.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed font-sans">
            In traditional coursework workflows, the final uploaded document is all anyone ever sees. The actual development, drafts, revisions, and collaborative contributions disappear into the void between instructions and submission.
          </p>
        </div>

        {/* Side-by-side Workflow Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          
          {/* Traditional Workflow Card */}
          <div className="bg-[#F9F8F6] rounded-xl border border-gray-200 p-6 sm:p-8 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                    TRADITIONAL WORKFLOW
                  </span>
                  <h3 className="text-xl font-bold text-[#1A1A1B]">The Fragmented Black Box</h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">
                  BLIND PROCESS
                </span>
              </div>

              {/* Vertical Step Sequence */}
              <div className="space-y-3 font-sans">
                {[
                  { step: '1. Assignment & Prompt', desc: 'Lecturer posts prompt on LMS portal' },
                  { step: '2. External Document Writing', desc: 'Work happens across separate Word or Google Docs files' },
                  { step: '3. Unrecorded Group Chat', desc: 'Coordination split over WhatsApp, DMs, and personal emails' },
                  { step: '4. Detached File Upload', desc: 'Single PDF/DOCX submitted minutes before deadline' },
                  { step: '5. Blind Lecturer Grading', desc: 'Lecturer evaluates final text with zero visibility into authorship' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-white border border-gray-200 flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <div className="font-semibold text-[#1A1A1B]">{item.step}</div>
                      <div className="text-gray-500 text-[13px]">{item.desc}</div>
                    </div>
                    <span className="font-mono text-[11px] text-gray-400 flex-shrink-0">0{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-2 text-xs text-gray-500 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Result: The journey behind the assignment is completely lost.</span>
            </div>
          </div>

          {/* Draftly Workflow Card */}
          <div className="bg-white rounded-xl border-2 border-[#0047FF]/20 shadow-md hover:shadow-lg transition-all p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#0047FF] font-bold">
                    DRAFTLY WORKFLOW
                  </span>
                  <h3 className="text-xl font-bold text-[#1A1A1B]">The Connected Workspace</h3>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0047FF]/10 text-[#0047FF] border border-[#0047FF]/20">
                  CONNECTED RECORD
                </span>
              </div>

              {/* Vertical Step Sequence */}
              <div className="space-y-3 font-sans">
                {[
                  { step: '1. Assignment Created', desc: 'Lecturer sets requirements directly in the workspace' },
                  { step: '2. Work in Continuous Workspace', desc: 'Students draft and structure content right inside Draftly' },
                  { step: '3. Transparent Collaboration', desc: 'Group sections, revisions, and edits synchronized live' },
                  { step: '4. Sealed Submission', desc: 'Final version is locked with its full developmental provenance' },
                  { step: '5. Informed Review', desc: 'Lecturer reviews the submission with evidence ready on demand' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg bg-[#F9F8F6] border border-gray-200 flex items-start justify-between gap-3 text-sm hover:border-[#0047FF]/40 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-[#1A1A1B] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0047FF] flex-shrink-0" />
                        <span>{item.step}</span>
                      </div>
                      <div className="text-[#1A1A1B]/70 text-[13px] ml-5">{item.desc}</div>
                    </div>
                    <span className="font-mono text-[11px] text-[#0047FF] font-bold flex-shrink-0">0{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-[#1A1A1B] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              <span>Result: The work, collaboration, and submission remain connected.</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

