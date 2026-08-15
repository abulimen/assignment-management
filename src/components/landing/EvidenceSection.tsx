import React from 'react';
import { GraduationCap, UserCheck, Scale, CheckCircle2, ShieldCheck } from 'lucide-react';

export const EvidenceSection: React.FC = () => {
  const principles = [
    {
      id: 'lecturers',
      title: 'For lecturers',
      tag: 'QUIET READINESS',
      icon: GraduationCap,
      description:
        'A contribution summary is available when the work is submitted. The full record is one click away when a grading decision calls for it.',
      keyPoints: [
        'Clear contribution distribution on submission',
        'Direct access to draft history & section logs',
        'No need to constantly monitor live writing',
      ],
    },
    {
      id: 'students',
      title: 'For students',
      tag: 'FAIR ATTRIBUTION',
      icon: UserCheck,
      description:
        'Your work and contribution have a record. You can see what is recorded and how it is used.',
      keyPoints: [
        'Visible proof of authentic authoring effort',
        'Protection against free-riding in group assignments',
        'Full transparency into logged project metadata',
      ],
    },
    {
      id: 'verdict',
      title: 'The verdict stays yours',
      tag: 'HUMAN JUDGMENT',
      icon: Scale,
      description:
        'Draftly surfaces evidence and unusual activity. It never grades, accuses or makes the final decision for the lecturer.',
      keyPoints: [
        'No arbitrary automated penalty algorithms',
        'Neutral factual provenance data',
        'Educators retain 100% academic discretion',
      ],
    },
  ];

  return (
    <section id="evidence" className="py-20 md:py-28 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            ETHICAL ARCHITECTURE
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            Evidence on demand. Not surveillance.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed font-sans">
            The record stays quiet while the work happens. It exists to inform a decision when one is needed, not to make lecturers watch students.
          </p>
        </div>

        {/* 3 Core Principles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {principles.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                className="bg-[#F9F8F6] rounded-xl border border-gray-200 p-6 sm:p-8 flex flex-col justify-between hover:border-[#0047FF]/40 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-lg bg-white text-[#0047FF] flex items-center justify-center border border-gray-200 shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded border border-[#0047FF]/15">
                      {p.tag}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A1B] tracking-tight mb-3">
                    {p.title}
                  </h3>

                  <p className="text-[#1A1A1B]/70 text-sm leading-relaxed mb-6 font-sans">
                    {p.description}
                  </p>

                  <div className="space-y-2.5 border-t border-gray-200 pt-4">
                    {p.keyPoints.map((point, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2 text-xs text-gray-700 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0047FF] flex-shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 text-[10px] font-mono text-gray-400">
                  INFRASTRUCTURE PRINCIPLE 0{idx + 1}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-12 max-w-4xl mx-auto bg-[#0047FF]/5 rounded-xl border border-[#0047FF]/15 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-[#0047FF] flex-shrink-0" />
            <div>
              <span className="font-bold text-[#1A1A1B] text-sm block">
                Evidence Infrastructure for Modern Higher Education
              </span>
              <span className="text-xs text-gray-600 font-sans">
                Built to support trustworthy academic outcomes without invasive screen tracking or webcam monitoring.
              </span>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-white px-3 py-1.5 rounded-md border border-[#0047FF]/20 whitespace-nowrap">
            PRIVACY FIRST
          </span>
        </div>

      </div>
    </section>
  );
};

