import React from 'react';
import { ShieldCheck, Award, HeartHandshake, CheckCircle2 } from 'lucide-react';

export const StudentBenefit: React.FC = () => {
  const benefits = [
    {
      title: 'Your effort is preserved',
      desc: 'No more unfair assumptions. When you spend hours iterating, refining arguments, and testing data models, that developmental effort remains part of your permanent submission record.',
      icon: Award,
    },
    {
      title: 'Protection in group projects',
      desc: 'When one student carries a group report, everyone traditionally shares the same final grade blind mark. In Draftly, your individual contribution is clearly distinct and documented.',
      icon: ShieldCheck,
    },
    {
      title: 'A focused, calm writing space',
      desc: 'Built specifically for academic coursework. A clean, distraction-free document editor with instant autosave, section outlines, and zero unnecessary bloat.',
      icon: HeartHandshake,
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            BUILT FOR FAIRNESS
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            Your work speaks for itself.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed font-sans">
            When the final document is all anyone can see, the work that produced it disappears. Draftly preserves that history — including individual effort and group contribution.
          </p>
        </div>

        {/* 3 Benefit Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="p-6 sm:p-8 rounded-xl bg-[#F9F8F6] border border-gray-200 hover:border-[#0047FF]/30 transition-all flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="w-12 h-12 rounded-lg bg-white text-[#0047FF] flex items-center justify-center border border-gray-200 mb-5 shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-[#1A1A1B] mb-3">{b.title}</h3>
                  <p className="text-[#1A1A1B]/70 text-sm leading-relaxed font-sans">{b.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-2 text-xs font-semibold text-[#0047FF]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Fair attribution guaranteed</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Student Testimonial Quote / Concept Callout */}
        <div className="max-w-4xl mx-auto bg-[#F9F8F6] rounded-xl border border-gray-200 p-6 sm:p-8 text-center shadow-xs">
          <blockquote className="text-lg sm:text-xl font-medium text-[#1A1A1B] leading-relaxed italic mb-4 font-sans">
            &ldquo;In group work, everyone always worries about deadweight group members. With Draftly, you simply write your section, collaborate cleanly, and know your contribution isn&apos;t invisible.&rdquo;
          </blockquote>
          <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
            DESIGNED FOR ACADEMIC INTEGRITY & STUDENT FAIRNESS
          </div>
        </div>

      </div>
    </section>
  );
};

