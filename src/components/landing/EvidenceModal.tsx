import React from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Clock, FileText } from 'lucide-react';

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#F9F8F6] border-b border-gray-200 p-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-[#1A1A1B] text-white flex items-center justify-center font-mono text-xs font-bold">
              DOC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/10 px-2 py-0.5 rounded border border-[#0047FF]/20">
                  WORK HISTORY RECORD
                </span>
                <span className="text-xs font-mono text-gray-500">COURSE #ECON-402</span>
              </div>
              <h3 className="text-base font-bold text-[#1A1A1B]">
                Comparative Analysis of Monetary Policy · Preserved Record
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-[#1A1A1B] hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Summary Alert Box */}
          <div className="p-4 rounded-lg bg-[#0047FF]/5 border border-[#0047FF]/15 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#0047FF] flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#1A1A1B]/80 leading-relaxed font-sans">
              <span className="font-bold text-[#1A1A1B]">Provenance Record Verified:</span> The group document was developed across 14 collaborative working sessions totaling 18.4 authoring hours. All revisions and section contributions are preserved for review.
            </div>
          </div>

          {/* Section Breakdown Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500">
                PAGE & SECTION ATTRIBUTION
              </span>
              <span className="text-xs text-gray-400 font-mono">4 SECTIONS · 3,440 WORDS</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  section: 'Section 1: Executive Summary',
                  lead: 'Chukwudi Nnamdi',
                  share: '41% of total words',
                  sessions: '5 sessions (6.2 hrs)',
                  status: 'Authentic gradual drafting',
                  color: '#0047FF',
                },
                {
                  section: 'Section 2: Monetary Policy Framework',
                  lead: 'Chiamaka Eze',
                  share: '29% of total words',
                  sessions: '4 sessions (4.8 hrs)',
                  status: 'Institutional dataset linked',
                  color: '#008899',
                },
                {
                  section: 'Section 3: Empirical Model & Findings',
                  lead: 'Babatunde Adeleke',
                  share: '22% of total words',
                  sessions: '4 sessions (4.1 hrs)',
                  status: 'Iterative formula updates',
                  color: '#4F46E5',
                },
                {
                  section: 'Section 4: Policy Recommendations',
                  lead: 'Emeka Okafor',
                  share: '8% of total words',
                  sessions: '1 session (0.9 hrs)',
                  status: 'Late structural contribution',
                  flag: true,
                  color: '#9CA3AF',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-lg border ${
                    item.flag ? 'bg-amber-50/50 border-amber-200' : 'bg-[#F9F8F6] border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[#1A1A1B]">{item.section}</span>
                    {item.flag && (
                      <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        Uneven
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mb-2 font-sans">Lead: {item.lead}</div>
                  <div className="space-y-1 text-[11px] font-mono text-gray-500">
                    <div className="flex justify-between">
                      <span>Volume:</span>
                      <span className="text-[#1A1A1B] font-semibold">{item.share}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Time:</span>
                      <span className="text-[#1A1A1B] font-semibold">{item.sessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Telemetry:</span>
                      <span className="text-[#1A1A1B] font-semibold">{item.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Session Timeline Visualizer */}
          <div className="bg-[#F9F8F6] p-4 rounded-lg border border-gray-200">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 block mb-3">
              WORKING SESSION TIMELINE (AUG 10 – AUG 16)
            </span>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="w-16 text-gray-400">Aug 10</span>
                <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-[#0047FF] w-[40%]" title="Jonathan (Outline)" />
                </div>
                <span className="text-[11px] text-gray-500">Setup & Outline</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 text-gray-400">Aug 12</span>
                <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-[#0047FF] w-[25%]" />
                  <div className="bg-[#008899] w-[35%]" />
                  <div className="bg-[#4F46E5] w-[20%]" />
                </div>
                <span className="text-[11px] text-gray-500">Core drafting</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 text-gray-400">Aug 16</span>
                <div className="flex-1 bg-gray-200 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-[#0047FF] w-[20%]" />
                  <div className="bg-[#008899] w-[25%]" />
                  <div className="bg-[#4F46E5] w-[35%]" />
                  <div className="bg-[#9CA3AF] w-[20%]" />
                </div>
                <span className="text-[11px] text-gray-500">Final revisions & seal</span>
              </div>
            </div>
          </div>

          {/* Principle Reminder */}
          <div className="p-3.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-500 leading-relaxed font-sans">
            <span className="font-bold text-[#1A1A1B]">Lecturer Context:</span> Draftly provides verifiable developmental context to inform your grading decisions. The final evaluation and grading remain entirely in the hands of the educator.
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#F9F8F6] border-t border-gray-200 p-4 flex items-center justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="bg-[#1A1A1B] hover:bg-[#2A2A2B] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
