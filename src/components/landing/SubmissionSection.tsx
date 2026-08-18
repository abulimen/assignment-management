import React from 'react';
import {
  Lock,
  FileSearch,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Clock,
  FileText,
  Users,
  Activity,
  Sparkles,
} from 'lucide-react';

interface SubmissionSectionProps {
  onOpenEvidenceModal: () => void;
}

export const SubmissionSection: React.FC<SubmissionSectionProps> = ({ onOpenEvidenceModal }) => {
  const factors = [
    { label: 'Drafting Cadence', score: 96, detail: 'Gradual, multi-session progression' },
    { label: 'Group Participation', score: 92, detail: '3 of 3 members contributed actively' },
    { label: 'Iterative Revisions', score: 88, detail: 'Regular edits & phrasing iterations' },
    { label: 'Citation Transparency', score: 95, detail: 'References & quotes accounted for' },
  ];

  const members = [
    { name: 'Chiamaka Eze', role: 'Pages 1 & 2', pct: 41, words: 1420, color: '#0047FF' },
    { name: 'Babatunde Adeleke', role: 'Pages 2 & 3', pct: 35, words: 1180, color: '#0D9488' },
    { name: 'Zainab Abubakar', role: 'Page 3', pct: 24, words: 840, color: '#8B5CF6' },
  ];

  return (
    <section id="evidence" className="py-20 md:py-28 bg-[#FBFBFA] border-b border-gray-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3.5 py-1.5 rounded-full bg-[#0047FF]/5 uppercase font-bold mb-4 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0047FF]" />
            <span>EVIDENCE ON DEMAND</span>
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            The final submission comes with its history.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/70 leading-relaxed font-sans">
            When students submit, Draftly seals an immutable snapshot. Lecturers review the final document normally, with instant access to group contribution breakdown, editing history, and development context whenever needed.
          </p>
        </div>

        {/* ------------------------------------------------------------- 1:1 Lecturer Review UI */}
        <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-gray-200/90 shadow-2xl shadow-gray-300/40 overflow-hidden space-y-6 p-6 sm:p-8">
          
          {/* Top Review Metadata Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-gray-100 text-gray-800 rounded">
                  ECON 402
                </span>
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-0.5 rounded border border-[#0047FF]/20 uppercase">
                  GROUP SUBMISSION REVIEW
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Sealed Snapshot
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1B] tracking-tight">
                Comparative Analysis of Monetary Policy
              </h3>
              <p className="text-xs text-gray-500 font-sans mt-0.5">
                Submitted 16 Aug 2026, 21:47 UTC · 3 Collaborators · 3,440 Words
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="view-evidence-btn"
                onClick={onOpenEvidenceModal}
                className="inline-flex items-center justify-center gap-2 bg-[#0047FF] hover:bg-[#0038CC] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-sm shadow-blue-200 whitespace-nowrap"
              >
                <FileSearch className="w-3.5 h-3.5" />
                <span>View work history</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Development Context Overview Card */}
          <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1 max-w-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                    <span>Verified Development</span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      Full Record
                    </span>
                  </div>
                  <div className="text-xs text-emerald-800 font-sans">
                    Gradual collaborative drafting across 14 working sessions.
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Context Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
              {factors.map((f, i) => (
                <div key={i} className="bg-white/80 border border-emerald-200/60 p-3 rounded-lg text-xs space-y-1">
                  <div className="text-gray-500 font-sans text-[11px] truncate">{f.label}</div>
                  <div className="font-mono text-sm font-bold text-gray-900">{f.score}%</div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${f.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Contribution X-Ray */}
          <div className="bg-[#FAF9F7] border border-gray-200/90 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0047FF]" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-gray-700">
                  Member Contribution Clarity
                </span>
              </div>
              <span className="text-xs font-mono text-gray-500">
                Measured by surviving text in final sealed document
              </span>
            </div>

            {/* Multi-segment Contribution Bar */}
            <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-gray-200">
              {members.map((m, i) => (
                <div
                  key={i}
                  className="h-full transition-all duration-300"
                  style={{ width: `${m.pct}%`, backgroundColor: m.color }}
                  title={`${m.name}: ${m.pct}%`}
                />
              ))}
            </div>

            {/* Member Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {members.map((m, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs"
                      style={{ backgroundColor: m.color }}
                    >
                      {m.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#1A1A1B]">{m.name}</div>
                      <div className="text-[11px] text-gray-500 font-sans">{m.role}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs font-bold text-[#1A1A1B]">{m.pct}%</div>
                    <div className="text-[10px] text-gray-400">{m.words} words</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Integrity / Evidence Note */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0047FF]/10 text-[#0047FF] flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-gray-600 font-sans leading-relaxed">
                <strong className="text-[#1A1A1B]">Evidence, not arbitrary verdicts.</strong> Draftly presents verifiable authoring telemetry so lecturers can grade with total clarity.
              </p>
            </div>
            <div className="font-mono text-gray-400 text-[11px] whitespace-nowrap">
              SHA-256 Verified Seal
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
