import React, { useState } from 'react';
import { PlusCircle, Edit3, Users2, Lock, Eye, ArrowRight } from 'lucide-react';

interface Step {
  num: string;
  title: string;
  headline: string;
  description: string;
  icon: any;
  uiDetail: {
    badge: string;
    subtext: string;
    metrics: { label: string; val: string }[];
  };
}

export const HowItWorks: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<number>(0);

  const steps: Step[] = [
    {
      num: '01',
      title: 'Create',
      headline: 'Set assignment rules & scope directly in Draftly.',
      description:
        'The lecturer creates an assignment and sets the basic requirements — word limits, individual or group format, section prompts, and deadlines.',
      icon: PlusCircle,
      uiDetail: {
        badge: 'LECTURER PORTAL',
        subtext: 'Configured in under 2 minutes · Ready for distribution',
        metrics: [
          { label: 'Mode', val: 'Individual or Group' },
          { label: 'Integrations', val: 'Canvas / Blackboard / Direct Link' },
          { label: 'Milestones', val: 'Optional checkpoints' },
        ],
      },
    },
    {
      num: '02',
      title: 'Work',
      headline: 'Students draft directly in their connected workspace.',
      description:
        'Students open the assignment and work directly inside their workspace. The rich document editor saves iterations continuously from initial outline to polished drafts.',
      icon: Edit3,
      uiDetail: {
        badge: 'STUDENT WORKSPACE',
        subtext: 'Clean typography · Distraction-free editing · Autosaved',
        metrics: [
          { label: 'Session Logging', val: 'Quiet continuous autosave' },
          { label: 'Draft Snapshots', val: 'Key revisions preserved' },
          { label: 'Word Tracking', val: 'Live word & section counts' },
        ],
      },
    },
    {
      num: '03',
      title: 'Collaborate',
      headline: 'Teams coordinate sections and edit synchronously.',
      description:
        'For group assignments, students work together in the same document and organize the work themselves. Live presence, section claims, and edit histories preserve how the collaboration came together.',
      icon: Users2,
      uiDetail: {
        badge: 'MULTI-AUTHOR WORKSPACE',
        subtext: 'Real-time multi-cursor syncing · Attribution mapping',
        metrics: [
          { label: 'Section Ownership', val: 'Self-organized by group' },
          { label: 'Contribution Meter', val: 'Live transparent telemetry' },
          { label: 'Concurrent Edits', val: 'Conflict-free synchronization' },
        ],
      },
    },
    {
      num: '04',
      title: 'Submit',
      headline: 'The final version is submitted and cryptographically sealed.',
      description:
        'The final version is submitted and sealed. The document is locked from further edits, generating a permanent tamper-evident timestamp and version receipt.',
      icon: Lock,
      uiDetail: {
        badge: 'SUBMISSION GATE',
        subtext: 'Tamper-proof record · Permanent version seal',
        metrics: [
          { label: 'Status', val: 'Sealed & Locked' },
          { label: 'Receipt Hash', val: '0x7c49...e21a' },
          { label: 'Sign-off', val: 'All group members confirmed' },
        ],
      },
    },
    {
      num: '05',
      title: 'Review',
      headline: 'Lecturers review final work with evidence on demand.',
      description:
        'The lecturer receives the finished work and can access its development when necessary. Contribution summaries and activity timelines are one click away if questions arise.',
      icon: Eye,
      uiDetail: {
        badge: 'REVIEW ON DEMAND',
        subtext: 'Quiet review by default · Evidence when needed',
        metrics: [
          { label: 'Primary View', val: 'Clean finished document' },
          { label: 'Evidence Drawer', val: 'One click inspection' },
          { label: 'Final Verdict', val: 'Always 100% human judgment' },
        ],
      },
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-[#F9F8F6] border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="text-[10px] font-mono tracking-[0.2em] text-[#0047FF] border border-[#0047FF]/20 px-3 py-1 rounded-md bg-[#0047FF]/5 uppercase font-bold mb-4 inline-block">
            CONTINUOUS WORKFLOW
          </span>
          <h2 className="text-4xl sm:text-5xl font-bold text-[#1A1A1B] tracking-tight leading-tight mb-4">
            How Draftly works
          </h2>
          <p className="text-base sm:text-lg text-[#1A1A1B]/60 leading-relaxed font-sans">
            Five clear stages that seamlessly unite assignment creation, drafting, teamwork, sealed submission, and informed review.
          </p>
        </div>

        {/* Step Navigation Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-10 max-w-5xl mx-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = selectedStep === idx;
            return (
              <button
                key={s.num}
                onClick={() => setSelectedStep(idx)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#1A1A1B] border-[#1A1A1B] text-white shadow-md'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-[#0047FF]/40 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isSelected ? 'text-[#00E5FF]' : 'text-[#0047FF]'
                    }`}
                  >
                    {s.num}
                  </span>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-400'}`} />
                </div>
                <div className={`font-bold text-sm sm:text-base ${isSelected ? 'text-white' : 'text-[#1A1A1B]'}`}>
                  {s.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Step Detail Card */}
        <div className="max-w-5xl mx-auto bg-white rounded-xl border border-gray-200 p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Description */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#0047FF] bg-[#0047FF]/5 px-2.5 py-1 rounded border border-[#0047FF]/15">
                  STAGE {steps[selectedStep].num}
                </span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
                  {steps[selectedStep].title}
                </span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1A1B] tracking-tight leading-snug">
                {steps[selectedStep].headline}
              </h3>

              <p className="text-sm sm:text-base text-[#1A1A1B]/70 leading-relaxed font-sans">
                {steps[selectedStep].description}
              </p>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setSelectedStep((prev) => (prev + 1) % steps.length)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0047FF] hover:text-[#0038CC] cursor-pointer"
                >
                  <span>Next stage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right UI Preview Artifact */}
            <div className="lg:col-span-5 bg-[#F9F8F6] rounded-lg border border-gray-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
                <span className="font-mono text-[10px] font-bold text-[#0047FF] uppercase tracking-wider">
                  {steps[selectedStep].uiDetail.badge}
                </span>
                <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse" />
              </div>

              <div className="text-xs text-gray-500 mb-4">
                {steps[selectedStep].uiDetail.subtext}
              </div>

              <div className="space-y-2.5">
                {steps[selectedStep].uiDetail.metrics.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-md bg-white border border-gray-200 text-xs"
                  >
                    <span className="text-gray-600 font-medium">{m.label}</span>
                    <span className="font-mono text-[#1A1A1B] font-semibold">{m.val}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};

