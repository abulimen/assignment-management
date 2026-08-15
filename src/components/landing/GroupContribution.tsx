import React from 'react';
import { FileSearch, AlertCircle, ChevronRight } from 'lucide-react';

interface GroupContributionProps {
  onOpenEvidenceModal: () => void;
}

export const GroupContribution: React.FC<GroupContributionProps> = ({ onOpenEvidenceModal }) => {
  const members = [
    { name: 'Jonathan', role: 'Executive Summary & Section 1', pct: 41, words: 1420, edits: 38, color: '#0047FF' },
    { name: 'Sarah', role: 'Methodology & Data Tables', pct: 29, words: 980, edits: 27, color: '#008899' },
    { name: 'David', role: 'Literature Review & Discussion', pct: 22, words: 760, edits: 21, color: '#4F46E5' },
    { name: 'Michael', role: 'References & Formatting', pct: 8, words: 280, edits: 5, color: '#9CA3AF', lowContrib: true },
  ];

  return (
    <section className="py-20 md:py-28 bg-[#F9F8F6] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            GROUP ACCOUNTABILITY
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            Instant visibility into group contributions.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed font-sans">
            When group coursework is submitted, Draftly surfaces an immediate contribution breakdown. Lecturers spot uneven participation at a glance without having to inspect every line of text.
          </p>
        </div>

        {/* Realistic Group Submission UI Card */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Header Metadata */}
          <div className="bg-[#F9F8F6] border-b border-gray-200 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2 py-0.5 rounded border border-[#0047FF]/15">
                  GROUP 07
                </span>
                <span className="font-mono text-xs text-gray-400">
                  4 MEMBERS · SUBMITTED AUG 14, 21:47
                </span>
              </div>
              <h3 className="text-xl font-bold text-[#1A1A1B]">
                Corporate Finance Case Study: M&A Valuation Model
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                SUBMISSION SEALED
              </span>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold">
                CONTRIBUTION OVERVIEW
              </span>
              <span className="text-xs text-gray-500 font-mono">
                Total Words: 3,440 · 91 Total Revisions
              </span>
            </div>

            {/* Visual Multi-Segment Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-gray-100 mb-6">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="h-full transition-all"
                  style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                  title={`${m.name}: ${m.pct}%`}
                />
              ))}
            </div>

            {/* Member List Cards */}
            <div className="space-y-2.5 mb-8">
              {members.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    m.lowContrib
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-[#F9F8F6] border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1A1A1B] text-sm sm:text-base">
                          {m.name}
                        </span>
                        {m.lowContrib && (
                          <span className="text-[10px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Uneven Participation Flag
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-sans">{m.role}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 font-mono text-xs">
                    <span className="text-gray-500">{m.words} words</span>
                    <span className="text-gray-500">{m.edits} edits</span>
                    <span
                      className="text-base font-bold"
                      style={{ color: m.color }}
                    >
                      {m.pct}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 max-w-lg leading-relaxed font-sans">
                Percentages represent authoring distribution and session history — not automated grades. Lecturers retain full judgment.
              </p>

              <button
                id="view-evidence-btn"
                onClick={onOpenEvidenceModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#1A1A1B] hover:bg-[#2A2A2B] text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg transition-all active:scale-[0.98] cursor-pointer shadow-xs"
              >
                <FileSearch className="w-4 h-4 text-[#00E5FF]" />
                <span>View evidence</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

