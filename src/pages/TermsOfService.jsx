import React from 'react';
import { LegalLayout } from '../components/legal/LegalLayout';
import { useSeo } from '../utils/seo';
import { 
  FileText, 
  Sparkles, 
  Users, 
  GraduationCap, 
  Scale, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Copyright,
  ShieldAlert
} from 'lucide-react';

export default function TermsOfService() {
  useSeo({ title: 'Terms of Service — Draftly', description: 'Terms governing use of the Draftly assignment workspace, student IP, and group contribution records.', canonical: '/terms' });
  const toc = [
    { id: 'acceptance', title: '1. Acceptance & Eligibility' },
    { id: 'service-description', title: '2. The Draftly Workspace Service' },
    { id: 'intellectual-property', title: '3. Student Intellectual Property' },
    { id: 'user-accounts', title: '4. Account Security & Responsibilities' },
    { id: 'academic-integrity', title: '5. Acceptable Use & Integrity' },
    { id: 'group-workspaces', title: '6. Group Collaboration & Sealing' },
    { id: 'evidence-disclaimer', title: '7. Evidence on Demand (No Auto-Guilt)' },
    { id: 'fees-billing', title: '8. Beta Program & Institutional Subscriptions' },
    { id: 'disclaimer-liability', title: '9. Warranty Disclaimers & Liability' },
    { id: 'governing-law', title: '10. Governing Law & Jurisdiction' },
  ];

  return (
    <LegalLayout
      title="Terms of Service"
      subtitle="The contractual terms and usage policies governing student workspaces, collaborative group drafting, and academic assignment verification on Draftly."
      lastUpdated="August 16, 2026"
      badgeText="Academic Integrity & Workspace Agreement"
      toc={toc}
    >
      {/* Intro Summary Callout */}
      <div className="not-prose bg-[#0047FF]/5 border border-[#0047FF]/20 rounded-xl p-4 sm:p-5 mb-8 text-sm">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-[#0047FF] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-[#1A1A1B]">Key Principles at a Glance</h3>
            <p className="text-[#1A1A1B]/75 leading-relaxed text-xs sm:text-sm">
              Students retain <strong>100% ownership and copyright</strong> of all original academic work written in Draftly. Draftly provides the tracked workspace for drafting and collaborative group work. Telemetry provides objective context to your lecturers, but <strong>human educators remain the sole decision-makers</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Acceptance & Eligibility */}
      <section id="acceptance" className="scroll-mt-28">
        <h2>1. Acceptance & Eligibility</h2>
        <p>
          These Terms of Service (<strong>"Terms"</strong>) constitute a legally binding agreement between you (whether as a student, educator, or institutional administrator) and <strong>Draftly Technologies Ltd.</strong> (<strong>"Draftly"</strong>, <strong>"we"</strong>, <strong>"us"</strong>).
        </p>
        <p>
          By creating an account, opening a workspace, or using any part of the Draftly platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms and our <a href="/privacy">Privacy Policy</a>. If you do not agree, you must not access or use Draftly.
        </p>
      </section>

      <hr />

      {/* 2. The Draftly Workspace Service */}
      <section id="service-description" className="scroll-mt-28">
        <h2>2. The Draftly Workspace Service</h2>
        <p>
          Draftly is an educational technology workspace designed for higher education coursework. Rather than treating assignments as simple transactional file uploads, Draftly provides a tracked, rich-text collaborative environment where students draft, revise, collaborate, and submit their assignments with verified provenance.
        </p>
        <p>
          The service includes individual workspaces, real-time multi-user group editors (powered by Yjs and section-based collaboration), presence synchronization, paste context tracking, and immutable submission sealing.
        </p>
      </section>

      <hr />

      {/* 3. Student Intellectual Property */}
      <section id="intellectual-property" className="scroll-mt-28">
        <h2>3. Student Intellectual Property Rights</h2>
        <div className="not-prose bg-gray-50 border border-gray-200 rounded-xl p-5 my-4">
          <div className="flex items-center gap-2 font-bold text-sm text-[#1A1A1B] mb-1">
            <Copyright className="w-4 h-4 text-[#0047FF]" />
            <span>You Own Your Original Work</span>
          </div>
          <p className="text-xs text-[#1A1A1B]/75 leading-relaxed">
            Students and authors retain complete copyright, moral rights, and intellectual property ownership in all assignments, essays, reports, code snippets, and research drafted on Draftly.
          </p>
        </div>
        <p>
          Draftly claims no ownership rights over your coursework. By using Draftly, you grant us only a limited, revocable, non-exclusive license to host, display, and transmit your content solely for the purpose of enabling your authoring session, facilitating group collaboration, and delivering your submitted work to your designated course lecturers.
        </p>
        <p>
          <strong>No AI Training on Student Content:</strong> We strictly warrant that your text, essays, and drafts will never be used, sold, or shared to train public machine learning or third-party generative AI models.
        </p>
      </section>

      <hr />

      {/* 4. Account Security & Responsibilities */}
      <section id="user-accounts" className="scroll-mt-28">
        <h2>4. Account Security & User Responsibilities</h2>
        <p>
          When registering for Draftly, you agree to:
        </p>
        <ul>
          <li>Provide accurate, authentic institutional identification (including university email and student matriculation number where required);</li>
          <li>Maintain the confidentiality and security of your account authentication credentials;</li>
          <li>Never permit another individual to access, author, or submit work under your credentials;</li>
          <li>Promptly notify Draftly security at <a href="mailto:security@draftly.ng">security@draftly.ng</a> of any unauthorized account activity.</li>
        </ul>
      </section>

      <hr />

      {/* 5. Acceptable Use & Integrity */}
      <section id="academic-integrity" className="scroll-mt-28">
        <h2>5. Acceptable Use & Academic Integrity</h2>
        <p>
          Draftly is engineered to foster academic honesty, genuine creativity, and fair workload distribution. You agree not to:
        </p>
        <ul>
          <li>Use automated scripts, headless browser bots, or synthetic keystroke generators to falsify workspace telemetry;</li>
          <li>Attempt to reverse-engineer, decompile, or tamper with Draftly’s tracking WebSockets, attribution engines, or cryptographic SHA-256 submission seals;</li>
          <li>Upload malicious code, viruses, or unlawful material into assignment workspaces;</li>
          <li>Interfere with or disrupt the normal operation of collaborative editing servers;</li>
          <li>Engage in harassment, abusive language, or unauthorized deletion of peers' contributions in group assignments.</li>
        </ul>
        <p>
          Violations of acceptable use policies may result in immediate suspension of workspace access and formal referral to your university’s academic integrity board.
        </p>
      </section>

      <hr />

      {/* 6. Group Collaboration & Sealing */}
      <section id="group-workspaces" className="scroll-mt-28">
        <h2>6. Group Collaboration & Submission Sealing</h2>
        <p>
          In collaborative group assignments, Draftly operates on a self-organization model:
        </p>
        <ul>
          <li><strong>Autonomous Section Organization:</strong> Group members have full autonomy to create, title, and reorder document sections to reflect their agreed-upon division of labour.</li>
          <li><strong>Surviving Authorship Attribution:</strong> Draftly tracks real-time contribution and calculates surviving character authorship per member, ensuring fair representation in the group contribution record.</li>
          <li><strong>Readiness & Group Submission:</strong> All members must mark their contribution status as <em>Done</em> before the group leader can finalize submission. A leader may only override with a mandatory, recorded justification.</li>
          <li><strong>Irrevocable Sealing:</strong> Once submitted, the server seals the document into an immutable snapshot with a cryptographic SHA-256 fingerprint. No subsequent edits can alter the submitted artifact.</li>
        </ul>
      </section>

      <hr />

      {/* 7. Evidence on Demand (No Auto-Guilt) */}
      <section id="evidence-disclaimer" className="scroll-mt-28">
        <h2>7. Evidence on Demand — No Automated Accusations</h2>
        <p>
          A cornerstone of Draftly’s engineering philosophy is <strong>"Evidence, not verdicts."</strong>
        </p>
        <p>
          Draftly produces objective metrics, editing timelines, and paste inventories. Draftly does <strong>not</strong> declare a student guilty of academic misconduct, does not automatically fail students, and does not deduct marks.
        </p>
        <p>
          Course lecturers and institutional academic boards remain the sole decision-makers regarding grading, interpretation of provenance records, and evaluation of student work.
        </p>
      </section>

      <hr />

      {/* 8. Beta Program & Institutional Subscriptions */}
      <section id="fees-billing" className="scroll-mt-28">
        <h2>8. Beta Program & Enterprise Agreements</h2>
        <p>
          During the Draftly Beta Program, access to standard workspace features is provided free of charge to approved pilot institutions, lecturers, and participating student cohorts.
        </p>
        <p>
          Enterprise campus deployments, custom LMS integrations (Canvas, Moodle, Blackboard), and institutional service level agreements (SLAs) are governed by separate Master Services Agreements (MSAs) executed with university administrations.
        </p>
      </section>

      <hr />

      {/* 9. Warranty Disclaimers & Liability */}
      <section id="disclaimer-liability" className="scroll-mt-28">
        <h2>9. Disclaimers & Limitation of Liability</h2>
        <p>
          The Draftly platform is provided on an <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> basis. While we maintain 99.9% target uptime and automatic continuous draft synchronization across cloud and local storage, Draftly disclaims all warranties of any kind, whether express or implied, including fitness for a particular academic purpose.
        </p>
        <p>
          To the maximum extent permitted by applicable Nigerian law, Draftly Technologies Ltd. shall not be liable for indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to access the platform.
        </p>
      </section>

      <hr />

      {/* 10. Governing Law & Jurisdiction */}
      <section id="governing-law" className="scroll-mt-28">
        <h2>10. Governing Law & Dispute Resolution</h2>
        <p>
          These Terms are governed by and construed in accordance with the <strong>Laws of the Federal Republic of Nigeria</strong>, without regard to its conflict of law principles.
        </p>
        <p>
          Any dispute arising out of or relating to these Terms shall first be submitted to good-faith mediation. If unresolved within 30 days, the dispute shall be resolved through arbitration in Lagos or Abuja under the Arbitration and Mediation Act, 2023 of Nigeria.
        </p>

        <div className="not-prose bg-gray-50 border border-gray-200 rounded-xl p-5 my-4 space-y-2 text-xs">
          <div className="font-bold text-sm text-[#1A1A1B]">Legal Inquiries</div>
          <div><strong>Draftly Technologies Ltd. Legal & Academic Integrity Team</strong></div>
          <div><strong>Email:</strong> <a href="mailto:legal@draftly.ng" className="text-[#0047FF] hover:underline">legal@draftly.ng</a></div>
        </div>
      </section>
    </LegalLayout>
  );
}
