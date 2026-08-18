import React from 'react';
import { GraduationCap, UserCheck, Building2, CheckCircle2 } from 'lucide-react';

export const WhoBenefits: React.FC = () => {
  const pillars = [
    {
      title: 'Lecturers',
      role: 'INFORMED GRADING',
      icon: GraduationCap,
      description:
        'Grade the final work normally, with the development record available when context matters.',
      points: [
        'Review final document by default',
        'Inspect work history on demand',
        'Human judgment always remains central',
      ],
    },
    {
      title: 'Students',
      role: 'FAIR ATTRIBUTION',
      icon: UserCheck,
      description:
        'Your effort and contribution don\u2019t disappear behind the final document.',
      points: [
        'Individual drafting effort preserved',
        'Visible proof of group contribution',
        'Calm, focused academic workspace',
      ],
    },
    {
      title: 'Institutions',
      role: 'CONNECTED WORKFLOW',
      icon: Building2,
      description:
        'Give coursework one connected workflow for creation, collaboration and submission.',
      points: [
        'Fits existing course assignments',
        'Supports digital or physical submissions',
        'No heavy LMS replacement needed',
      ],
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3.5 py-1.5 rounded-full bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            WHO BENEFITS
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            A clearer workflow for everyone involved.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/70 leading-relaxed font-sans">
            Draftly provides a focused workspace for students, context for educators, and a dependable process for institutions.
          </p>
        </div>

        {/* 3 Concise Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="bg-[#F9F8F6] rounded-xl border border-gray-200 p-6 sm:p-8 flex flex-col justify-between hover:border-[#0047FF]/40 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-lg bg-white text-[#0047FF] flex items-center justify-center border border-gray-200 shadow-xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded border border-[#0047FF]/15">
                      {pillar.role}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A1B] tracking-tight mb-3">
                    {pillar.title}
                  </h3>

                  <p className="text-[#1A1A1B]/70 text-sm leading-relaxed mb-6 font-sans">
                    {pillar.description}
                  </p>

                  <div className="space-y-2 border-t border-gray-200/80 pt-4">
                    {pillar.points.map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-2 text-xs text-gray-700 font-sans">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#0047FF] flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200/80 text-[10px] font-mono text-gray-400">
                  PILLAR 0{idx + 1}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
