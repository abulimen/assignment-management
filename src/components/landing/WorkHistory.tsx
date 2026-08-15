import React, { useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';

export const WorkHistory: React.FC = () => {
  const [filterType, setFilterType] = useState<'all' | 'milestones' | 'collaborations'>('all');

  const timelineEvents = [
    {
      time: '20:06:41',
      action: 'Workspace opened',
      actor: 'System / Group 07',
      category: 'milestones',
      type: 'INIT',
      details: 'Shared workspace initialized. Template and rubric loaded.',
      badgeColor: 'bg-gray-100 text-gray-600',
    },
    {
      time: '20:09:12',
      action: 'First work',
      actor: 'Jonathan Ray',
      category: 'milestones',
      type: 'DRAFT',
      details: 'Outline established for Sections 1–4. Title finalized.',
      badgeColor: 'bg-[#0047FF]/10 text-[#0047FF]',
    },
    {
      time: '21:14:07',
      action: 'Paste detected',
      actor: 'Sarah Chen',
      category: 'collaborations',
      type: 'SOURCE',
      details: 'Dataset table imported from institutional repository (OpenData v2.1).',
      badgeColor: 'bg-cyan-50 text-cyan-700',
    },
    {
      time: '21:19:04',
      action: 'Contribution updated',
      actor: 'David Lee',
      category: 'collaborations',
      type: 'CONTRIB',
      details: '+450 words drafted in Section 3 (Empirical Model & Findings).',
      badgeColor: 'bg-[#0047FF]/10 text-[#0047FF]',
    },
    {
      time: '21:32:55',
      action: 'Section reordered',
      actor: 'Team Consensus',
      category: 'collaborations',
      type: 'STRUCT',
      details: 'Policy implications relocated prior to concluding bibliography.',
      badgeColor: 'bg-purple-50 text-purple-700',
    },
    {
      time: '21:47:32',
      action: 'Submission sealed',
      actor: 'Jonathan Ray',
      category: 'milestones',
      type: 'SEALED',
      details: 'Final proofing confirmed by all 4 authors. Cryptographic receipt generated.',
      badgeColor: 'bg-emerald-50 text-emerald-700',
    },
  ];

  const filteredEvents =
    filterType === 'all'
      ? timelineEvents
      : timelineEvents.filter((e) => e.category === filterType);

  return (
    <section className="py-20 md:py-28 bg-[#F9F8F6] border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            CONTINUOUS PROVENANCE
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            Everything that happened, kept.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed mb-6 font-sans">
            Draftly preserves the development of an assignment as students work. Drafts, revisions, contributions, significant activity and submission events remain part of the assignment's record.
          </p>
          <div className="inline-block bg-white px-4 py-2 rounded-lg border border-gray-200 font-semibold text-xs text-[#1A1A1B] shadow-xs">
            Every draft. Every revision. Preserved.
          </div>
        </div>

        {/* Realistic Activity Timeline UI */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Header Bar */}
          <div className="bg-[#F9F8F6] border-b border-gray-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center border border-[#0047FF]/20">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                  ASSIGNMENT RECORD · AUDIT LEDGER
                </span>
                <span className="text-sm font-bold text-[#1A1A1B]">
                  FIN 410 · Asset Allocation Report (Group 07)
                </span>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-md border border-gray-200 text-xs font-medium">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer text-xs ${
                  filterType === 'all'
                    ? 'bg-[#1A1A1B] text-white font-semibold'
                    : 'text-gray-500 hover:text-[#1A1A1B]'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setFilterType('milestones')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer text-xs ${
                  filterType === 'milestones'
                    ? 'bg-[#1A1A1B] text-white font-semibold'
                    : 'text-gray-500 hover:text-[#1A1A1B]'
                }`}
              >
                Milestones
              </button>
              <button
                onClick={() => setFilterType('collaborations')}
                className={`px-3 py-1 rounded transition-colors cursor-pointer text-xs ${
                  filterType === 'collaborations'
                    ? 'bg-[#1A1A1B] text-white font-semibold'
                    : 'text-gray-500 hover:text-[#1A1A1B]'
                }`}
              >
                Collaboration
              </button>
            </div>
          </div>

          {/* Timeline Events List */}
          <div className="p-4 sm:p-6 space-y-2.5">
            {filteredEvents.map((evt, idx) => (
              <div
                key={idx}
                className="group p-3.5 rounded-lg border border-gray-200 bg-[#F9F8F6] hover:bg-white hover:border-[#0047FF]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="font-mono text-[11px] font-semibold text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 flex-shrink-0">
                    {evt.time}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#1A1A1B] text-[13px]">
                        {evt.action}
                      </span>
                      {evt.actor && (
                        <span className="text-[12px] text-gray-500 font-medium font-sans">
                          — {evt.actor}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5 font-sans">
                      {evt.details}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-current/20 ${evt.badgeColor}`}
                  >
                    {evt.type}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Ledger Notice */}
          <div className="bg-[#F9F8F6] border-t border-gray-200 p-4 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <div className="flex items-center gap-1.5 font-sans">
              <ShieldCheck className="w-4 h-4 text-[#0047FF]" />
              <span>
                Quietly captured during authoring. Never intrusive. Always accessible when required.
              </span>
            </div>
            <span className="font-mono text-[#0047FF] font-semibold text-[11px]">
              HASH ID: #DRAFT-77402-SEALED
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};

