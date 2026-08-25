import React from 'react';
import { LegalLayout } from '../components/legal/LegalLayout';
import { useSeo } from '../utils/seo';
import { 
  ShieldCheck, 
  Lock, 
  Database, 
  UserCheck, 
  FileKey, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  HelpCircle,
  Clock,
  Send,
  Building
} from 'lucide-react';

export default function PrivacyPolicy() {
  useSeo({ title: 'Privacy Policy — Draftly', description: 'How Draftly collects, uses and protects student data under the Nigeria Data Protection Act (NDPA).', canonical: '/privacy' });
  const toc = [
    { id: 'statutory-framework', title: '1. Statutory Framework & Scope' },
    { id: 'philosophy', title: '2. Product Philosophy & Privacy Pledge' },
    { id: 'data-collected', title: '3. Categories of Data We Process' },
    { id: 'telemetry-provenance', title: '4. Workspace Telemetry & Provenance' },
    { id: 'lawful-bases', title: '5. Lawful Bases for Processing' },
    { id: 'data-sharing', title: '6. Data Disclosures & Third Parties' },
    { id: 'data-subject-rights', title: '7. Your NDPA & NDPR Rights' },
    { id: 'security-retention', title: '8. Security & Data Retention' },
    { id: 'international-transfers', title: '9. Cross-Border Transfers' },
    { id: 'dpo-contact', title: '10. DPO & Supervisory Contact' },
  ];

  return (
    <LegalLayout
      title="Privacy & Data Protection Policy"
      subtitle="How Draftly collects, processes, protects, and respects personal data and academic assignment provenance under the Nigeria Data Protection Act (NDPA) 2023."
      lastUpdated="August 16, 2026"
      badgeText="NDPA 2023 & NDPR Compliant"
      toc={toc}
    >
      {/* Intro Summary Callout */}
      <div className="not-prose bg-[#0047FF]/5 border border-[#0047FF]/20 rounded-xl p-4 sm:p-5 mb-8 text-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#0047FF] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-[#1A1A1B]">Quick Executive Summary</h3>
            <p className="text-[#1A1A1B]/75 leading-relaxed text-xs sm:text-sm">
              Draftly is an educational assignment workspace. We capture authoring provenance (such as typing pace, revision history, and paste volume) solely to verify the authentic progression of academic coursework for your educators and group collaborators. We <strong>never</strong> sell student data, <strong>never</strong> train public AI models on your work, and <strong>never</strong> operate webcam, microphone, or invasive desktop screen surveillance.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Statutory Framework & Scope */}
      <section id="statutory-framework" className="scroll-mt-28">
        <h2>1. Statutory Framework & Scope</h2>
        <p>
          Draftly Technologies Ltd. (<strong>"Draftly"</strong>, <strong>"we"</strong>, <strong>"us"</strong>, or <strong>"our"</strong>) is committed to protecting the privacy, confidentiality, and data sovereignty of students, lecturers, academic institutions, and all visitors to our platform.
        </p>
        <p>
          This Privacy Policy governs your use of Draftly’s web applications, collaborative editors, submission verification systems, and APIs. It is formulated in strict compliance with:
        </p>
        <ul>
          <li><strong>Nigeria Data Protection Act, 2023 (NDPA)</strong>;</li>
          <li><strong>Nigeria Data Protection Regulation, 2019 (NDPR)</strong>;</li>
          <li>Guidelines, circulars, and codes of practice issued by the <strong>Nigeria Data Protection Commission (NDPC)</strong>; and</li>
          <li>Recognized international academic privacy benchmarks (including GDPR interoperability and FERPA-aligned data stewardship).</li>
        </ul>
        <p>
          Under the NDPA, when an educational institution engages Draftly to manage course assignments, the institution acts as the <strong>Data Controller</strong>, and Draftly serves as the <strong>Data Processor</strong>. For direct user registrations, Draftly acts as the Data Controller in respect of user account credentials.
        </p>
      </section>

      <hr />

      {/* 2. Product Philosophy & Privacy Pledge */}
      <section id="philosophy" className="scroll-mt-28">
        <h2>2. Product Philosophy & The Draftly Privacy Pledge</h2>
        <p>
          Draftly’s founding principle is: <em>"Draftly is where student assignments happen — from the first draft to the final submission. The work behind the submission stays with it."</em>
        </p>
        <p>
          Unlike traditional surveillance or proctoring platforms, Draftly exists to give students credit for their genuine creative effort while offering educators clear context. We uphold a strict ethical boundary between <strong>academic workspace provenance</strong> and <strong>invasive surveillance</strong>:
        </p>

        {/* Comparison Grid */}
        <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-6">
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 sm:p-4">
            <div className="flex items-center gap-2 font-bold text-emerald-900 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>What Draftly Records</span>
            </div>
            <ul className="text-xs text-emerald-950/80 space-y-1.5 list-disc list-inside">
              <li>Keystroke cadence and edit timestamps in the workspace</li>
              <li>Clipboard paste volume and character metrics</li>
              <li>Collaborative section authorship & presence indicators</li>
              <li>Cryptographic SHA-256 document submission seals</li>
              <li>Revision history and progressive draft evolution</li>
            </ul>
          </div>

          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 sm:p-4">
            <div className="flex items-center gap-2 font-bold text-rose-900 mb-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>What We NEVER Do</span>
            </div>
            <ul className="text-xs text-rose-950/80 space-y-1.5 list-disc list-inside">
              <li>NO webcam or facial biometric recording</li>
              <li>NO microphone or environmental audio listening</li>
              <li>NO whole-screen or background desktop recording</li>
              <li>NO sale or commercial brokering of student data</li>
              <li>NO training public LLMs / AI models on student work</li>
            </ul>
          </div>
        </div>
      </section>

      <hr />

      {/* 3. Categories of Data We Process */}
      <section id="data-collected" className="scroll-mt-28">
        <h2>3. Categories of Personal Data We Process</h2>
        <p>
          In accordance with the principle of <strong>Data Minimization</strong> (NDPA Section 24), we collect only the personal information strictly necessary to operate the assignment workspace:
        </p>

        <div className="not-prose overflow-x-auto my-4">
          <table className="min-w-full text-xs text-left border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-[#1A1A1B] font-semibold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Data Category</th>
                <th className="py-2.5 px-3">Specific Elements</th>
                <th className="py-2.5 px-3">Purpose & Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#1A1A1B]">Account & Identity</td>
                <td className="py-2.5 px-3">Full name, university email, matriculation / student ID number, institutional affiliation, account password hash (bcrypt).</td>
                <td className="py-2.5 px-3">User authentication, course enrollment, role routing (student vs. lecturer).</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#1A1A1B]">Workspace Telemetry</td>
                <td className="py-2.5 px-3">Typing intervals, paste event character counts, section editing duration, real-time cursor presence in group documents.</td>
                <td className="py-2.5 px-3">Building the assignment provenance timeline, attributing surviving text in group projects.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#1A1A1B]">Submitted Documents</td>
                <td className="py-2.5 px-3">Assignment text, ProseMirror JSON document tree, section titles, sealed submission timestamp, cryptographic SHA-256 hash.</td>
                <td className="py-2.5 px-3">Lecturer review, grading integrity, immutable historical submission archiving.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#1A1A1B]">Technical & Network</td>
                <td className="py-2.5 px-3">IP address, browser user-agent, session tokens, WebSocket handshake metadata.</td>
                <td className="py-2.5 px-3">Session maintenance, DDoS protection, rate-limiting, and security audit logs.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <hr />

      {/* 4. Workspace Telemetry & Provenance */}
      <section id="telemetry-provenance" className="scroll-mt-28">
        <h2>4. Workspace Telemetry & Provenance</h2>
        <p>
          When you compose coursework inside Draftly’s editor, the client captures micro-events (such as keystroke intervals, deletion bursts, and paste events) transmitted over a secure WebSocket connection or HTTPS fallback.
        </p>
        <p>
          <strong>Evidence on Demand, Not Automatic Guilt:</strong>
        </p>
        <ul>
          <li><strong>Explainable Metrics:</strong> We do not operate black-box scoring or automated cheating verdicts. Provenance signals are presented as objective effort timelines for the lecturer to review alongside the document.</li>
          <li><strong>Paste Context:</strong> Pasting text is a legitimate part of academic writing (e.g., quotes, bibliography references, personal notes). Draftly highlights pasted text volume to provide context, not accusations.</li>
          <li><strong>Group Contribution X-Ray:</strong> In collaborative group assignments, Draftly tracks which member authored each surviving paragraph and section, preventing free-rider disputes while respecting self-organization.</li>
        </ul>
      </section>

      <hr />

      {/* 5. Lawful Bases for Processing */}
      <section id="lawful-bases" className="scroll-mt-28">
        <h2>5. Lawful Bases for Processing (NDPA Section 25)</h2>
        <p>
          We only process your personal data where an explicit lawful basis exists under the Nigeria Data Protection Act:
        </p>
        <ol>
          <li><strong>Performance of a Contract:</strong> Processing is required to create your account, provide the real-time writing editor, synchronize group workspaces, and deliver sealed assignments to your instructor.</li>
          <li><strong>Legitimate Interests:</strong> Fulfilling the educational mandate of ensuring academic originality, authentic student attribution, and secure software operation.</li>
          <li><strong>Legal Obligation:</strong> Complying with statutory reporting, institutional accreditation requirements, and lawful directives from regulatory authorities.</li>
          <li><strong>Explicit Consent:</strong> Where you opt in to optional communications or non-essential cookies.</li>
        </ol>
      </section>

      <hr />

      {/* 6. Data Disclosures & Third Parties */}
      <section id="data-sharing" className="scroll-mt-28">
        <h2>6. Data Sharing & Third-Party Disclosures</h2>
        <p>
          Draftly operates under a strict data isolation policy. Your personal and assignment data is shared only with:
        </p>
        <ul>
          <li><strong>Your Course Lecturers & Department:</strong> Authorized educators overseeing your specific enrolled courses can view your submissions, group attribution, and work history.</li>
          <li><strong>Your Group Members:</strong> In designated group assignments, fellow group members can see your active presence and collaborative section edits.</li>
          <li><strong>Infrastructure Sub-Processors:</strong> Vetted cloud hosting providers, database clusters, and transactional email gateways bound by strict Data Processing Agreements (DPAs) meeting NDPA/NDPR standards.</li>
          <li><strong>Law Enforcement & Regulators:</strong> Solely when compelled by a valid court order or statutory requirement under Nigerian law.</li>
        </ul>
      </section>

      <hr />

      {/* 7. Your NDPA & NDPR Rights */}
      <section id="data-subject-rights" className="scroll-mt-28">
        <h2>7. Your Rights as a Data Subject</h2>
        <p>
          Under the <strong>Nigeria Data Protection Act (NDPA) 2023</strong> and <strong>NDPR 2019</strong>, you possess fundamental rights regarding your personal data:
        </p>

        <div className="not-prose grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="font-bold text-xs text-[#1A1A1B] flex items-center gap-1.5 mb-1">
              <UserCheck className="w-3.5 h-3.5 text-[#0047FF]" />
              1. Right to Access (Section 34)
            </div>
            <p className="text-xs text-[#1A1A1B]/70">You have the right to request a full copy of your personal data and assignment provenance records.</p>
          </div>

          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="font-bold text-xs text-[#1A1A1B] flex items-center gap-1.5 mb-1">
              <FileKey className="w-3.5 h-3.5 text-[#0047FF]" />
              2. Right to Rectification (Section 35)
            </div>
            <p className="text-xs text-[#1A1A1B]/70">You can request correction of inaccurate or incomplete profile and enrollment information.</p>
          </div>

          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="font-bold text-xs text-[#1A1A1B] flex items-center gap-1.5 mb-1">
              <Database className="w-3.5 h-3.5 text-[#0047FF]" />
              3. Right to Erasure / Deletion (Section 36)
            </div>
            <p className="text-xs text-[#1A1A1B]/70">You can request data deletion, subject to institutional academic record retention schedules.</p>
          </div>

          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="font-bold text-xs text-[#1A1A1B] flex items-center gap-1.5 mb-1">
              <Lock className="w-3.5 h-3.5 text-[#0047FF]" />
              4. Right to Data Portability (Section 38)
            </div>
            <p className="text-xs text-[#1A1A1B]/70">You can export your original writing and verified submission receipts in a structured JSON/PDF format.</p>
          </div>
        </div>

        <p>
          To exercise any of your statutory data rights, submit a written Data Subject Access Request (DSAR) to our Data Protection Officer at <a href="mailto:dpo@draftly.ng">dpo@draftly.ng</a>. Under NDPA regulations, we respond to verified requests within <strong>30 calendar days</strong>.
        </p>
      </section>

      <hr />

      {/* 8. Security & Data Retention */}
      <section id="security-retention" className="scroll-mt-28">
        <h2>8. Technical Security & Retention Policies</h2>
        <p>
          We employ state-of-the-art security measures to safeguard all educational data:
        </p>
        <ul>
          <li><strong>Encryption:</strong> AES-256 encryption at rest for all database volumes, and TLS 1.3 encryption in transit.</li>
          <li><strong>Cryptographic Sealing:</strong> Submissions are finalized with SHA-256 tamper-evident digital seals, preventing retroactive alteration.</li>
          <li><strong>72-Hour Breach Notification:</strong> In the unlikely event of a data security incident impacting personal data, Draftly will notify the NDPC and affected users within 72 hours in compliance with Section 40 of the NDPA.</li>
          <li><strong>Retention Schedule:</strong> Assignment drafts and active telemetry are retained for the duration of the academic semester and any applicable grade appeal windows defined by the institution, after which unneeded telemetry is purged.</li>
        </ul>
      </section>

      <hr />

      {/* 9. International Transfers */}
      <section id="international-transfers" className="scroll-mt-28">
        <h2>9. Cross-Border Data Transfers</h2>
        <p>
          Draftly primary data processing servers are optimized for Nigerian latency while utilizing high-availability cloud infrastructure. Where data is transferred across borders for cloud resilience or backup purposes, we ensure compliance with NDPA Section 41, guaranteeing that the recipient jurisdiction maintains an adequate level of data protection or that standard contractual clauses (SCCs) are executed.
        </p>
      </section>

      <hr />

      {/* 10. DPO & Supervisory Contact */}
      <section id="dpo-contact" className="scroll-mt-28">
        <h2>10. Data Protection Officer & NDPC Contact</h2>
        <p>
          If you have questions, inquiries, or complaints concerning this Privacy Policy or our data protection practices, please contact our Data Protection Officer:
        </p>
        <div className="not-prose bg-gray-50 border border-gray-200 rounded-xl p-5 my-4 space-y-2 text-xs">
          <div className="font-bold text-sm text-[#1A1A1B]">Draftly Technologies Ltd. — Data Protection Office</div>
          <div><strong>Email:</strong> <a href="mailto:dpo@draftly.ng" className="text-[#0047FF] hover:underline">dpo@draftly.ng</a> or <a href="mailto:privacy@draftly.ng" className="text-[#0047FF] hover:underline">privacy@draftly.ng</a></div>
          <div><strong>Jurisdiction:</strong> Federal Republic of Nigeria</div>
        </div>

        <p>
          You also have the statutory right to lodge a complaint directly with Nigeria's national data privacy supervisory authority:
        </p>
        <div className="not-prose bg-gray-50 border border-gray-200 rounded-xl p-5 my-4 space-y-2 text-xs">
          <div className="font-bold text-sm text-[#1A1A1B]">Nigeria Data Protection Commission (NDPC)</div>
          <div><strong>Headquarters:</strong> No. 5, Donau Crescent, Off Amazon Street, Maitama, Abuja, Nigeria</div>
          <div><strong>Website:</strong> <a href="https://ndpc.gov.ng" target="_blank" rel="noopener noreferrer" className="text-[#0047FF] hover:underline">https://ndpc.gov.ng</a></div>
          <div><strong>Email:</strong> info@ndpc.gov.ng</div>
        </div>
      </section>
    </LegalLayout>
  );
}
