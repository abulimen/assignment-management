import React from 'react';
import { Lock, CheckCircle2, Laptop, FileText } from 'lucide-react';

export const SubmissionSection: React.FC = () => {
  return (
    <section className="py-20 md:py-28 bg-[#F9F8F6] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            SEALED SUBMISSION
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            From workspace to final submission.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed font-sans">
            When students are ready, the final version is sealed and submitted. The lecturer receives the exact work that was submitted, together with its record.
          </p>
        </div>

        {/* Realistic Submission Receipt UI */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6 sm:p-10">
          
          {/* Top Status Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-200 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                  OFFICIAL SUBMISSION RECEIPT
                </span>
                <h3 className="text-xl font-bold text-[#1A1A1B]">
                  Assignment Sealed & Submitted
                </h3>
              </div>
            </div>

            <div className="text-right font-mono text-xs text-gray-500">
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 inline-block mb-1 text-[11px]">
                LOCKED · NO FURTHER EDITS
              </span>
              <div className="text-[11px] text-gray-400">TIMESTAMP: 2026-08-14 21:47:32 UTC</div>
            </div>
          </div>

          {/* Submission Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* Left: Metadata */}
            <div className="space-y-3 font-sans">
              <div className="bg-[#F9F8F6] p-4 rounded-lg border border-gray-200">
                <span className="text-[10px] font-mono text-gray-400 block mb-1 uppercase tracking-wider font-bold">ASSIGNMENT</span>
                <span className="font-bold text-[#1A1A1B] text-sm">
                  ECON 401 · Macroeconomic Forecasting (Final Project)
                </span>
              </div>

              <div className="bg-[#F9F8F6] p-4 rounded-lg border border-gray-200">
                <span className="text-[10px] font-mono text-gray-400 block mb-1 uppercase tracking-wider font-bold">AUTHORS CONFIRMED</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1A1B] mt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-[#0047FF]/5 text-[#0047FF] border border-[#0047FF]/15 font-mono text-[11px]">Jonathan R.</span>
                  <span className="px-2 py-0.5 rounded bg-[#0047FF]/5 text-[#0047FF] border border-[#0047FF]/15 font-mono text-[11px]">Sarah C.</span>
                  <span className="px-2 py-0.5 rounded bg-[#0047FF]/5 text-[#0047FF] border border-[#0047FF]/15 font-mono text-[11px]">David L.</span>
                  <span className="px-2 py-0.5 rounded bg-[#0047FF]/5 text-[#0047FF] border border-[#0047FF]/15 font-mono text-[11px]">Michael K.</span>
                </div>
              </div>

              <div className="bg-[#F9F8F6] p-4 rounded-lg border border-gray-200 font-mono text-xs text-gray-500">
                <span className="text-[10px] block mb-1 text-gray-400 uppercase tracking-wider font-bold">PROVENANCE CHECKSUM</span>
                <span className="text-[#1A1A1B] font-semibold break-all text-[11px]">
                  SHA-256: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                </span>
              </div>
            </div>

            {/* Right: Institutional Workflow Flexibility */}
            <div className="bg-[#F9F8F6] p-5 rounded-lg border border-gray-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#0047FF] font-bold block mb-2">
                  WORKFLOW OPTIONS
                </span>
                <h4 className="font-bold text-[#1A1A1B] text-base mb-2">
                  Flexible Delivery Formats
                </h4>
                <p className="text-xs text-[#1A1A1B]/70 leading-relaxed mb-4 font-sans">
                  Lecturers configure how assignments are delivered according to institutional preferences:
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-200">
                    <Laptop className="w-4 h-4 text-[#0047FF]" />
                    <span className="font-medium text-[#1A1A1B] font-sans">Direct Digital Submission via Draftly</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-200">
                    <FileText className="w-4 h-4 text-[#0047FF]" />
                    <span className="font-medium text-[#1A1A1B] font-sans">Physical submission with sealed receipt matching</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-200">
                    <CheckCircle2 className="w-4 h-4 text-[#0047FF]" />
                    <span className="font-medium text-[#1A1A1B] font-sans">LMS Sync (Canvas, Blackboard, Moodle)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200 text-[11px] text-gray-500 font-sans">
                Everything stays securely linked from draft to review.
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

