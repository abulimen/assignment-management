import React from 'react';
import {
  Layers,
  Sparkles,
  Users,
  FileCheck,
  Zap,
  Clock,
  ShieldCheck,
  Edit3,
  MoveVertical,
  CheckCircle2,
} from 'lucide-react';

export const WorkspaceShowcase: React.FC = () => {
  const features = [
    {
      icon: Edit3,
      title: 'Word-Grade Academic Editor',
      description:
        'A distraction-free writing environment built on TipTap with familiar ribbon formatting, heading hierarchy, blockquotes, tables, and academic citations.',
      badge: 'Zero Learning Curve',
    },
    {
      icon: Users,
      title: 'Realtime Multiplayer Presence',
      description:
        'Collaborate seamlessly on one live shared document. See teammate cursor positions and section presence without chaotic content overwrites.',
      badge: 'Yjs + WebSockets',
    },
    {
      icon: MoveVertical,
      title: 'Self-Organized Sections',
      description:
        'Students structure complex coursework by creating and naming sections, then reordering them freely with intuitive drag-and-drop.',
      badge: 'Team Freedom',
    },
    {
      icon: ShieldCheck,
      title: 'Continuous Draft Persistence',
      description:
        'Zero manual save buttons or file upload panic. Every edit, revision, and writing session is continuously synced and preserved.',
      badge: 'Never Lose Work',
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-white border-y border-gray-200 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3.5 py-1.5 rounded-full bg-[#0047FF]/5 uppercase font-bold mb-4 inline-flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#0047FF]" />
            <span>THE DRAFTLY WORKSPACE</span>
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            One workspace. From first draft to submission.
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/70 leading-relaxed font-sans">
            Students do all their research, drafting, and team collaboration in one focused space — eliminating fragmented draft files, copy-paste handoffs, and lost work.
          </p>
        </div>

        {/* 4 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-[#FAF9F7] rounded-2xl border border-gray-200/90 p-7 sm:p-8 flex flex-col justify-between hover:border-[#0047FF]/40 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-11 h-11 rounded-xl bg-white text-[#0047FF] flex items-center justify-center border border-gray-200 shadow-xs group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded-md border border-[#0047FF]/15">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#1A1A1B] tracking-tight">
                    {feature.title}
                  </h3>

                  <p className="text-sm text-[#1A1A1B]/70 leading-relaxed font-sans">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
