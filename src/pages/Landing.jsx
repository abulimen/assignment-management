// Draftly marketing root — the Modern Atmospheric identity (2026-08-14 brief).
// Luminous off-white sheets, graphite ink, Lora serif headlines, Inter body,
// Space Grotesk for labels and telemetry accents, cobalt + electric-cyan as
// the only saturated voices. Light mode, never dark. Layout: sticky nav with
// a glass capsule → 110vh hero with badge, typed-card subheading, and the
// vibe input box → floating integration bar → scroll-spy features →
// testimonial masonry → FAQ accordion → beta band → footer.
//
// The committed story order is unchanged: workspace first, evidence as the
// differentiator, students get their own section, and "Stop grading blind."
// stays reserved for the beta band.
import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ChevronDown,
  ClipboardCheck,
  FileText,
  GitBranch,
  History,
  Layers,
  Paperclip,
  PenLine,
  Send,
  Users,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';

/* ------------------------------------------------------------- recipes */

const primaryBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg bg-atmos-cobalt px-7 text-base font-semibold text-white transition-all duration-500 ease-in-out hover:bg-[#2a4bb8] hover:shadow-[0_0_24px_rgba(24,221,232,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-atmos-sheet motion-reduce:transition-none';

const ghostBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg border border-atmos-line bg-white/60 px-7 text-base font-medium text-atmos-ink transition-colors duration-500 ease-in-out hover:border-atmos-cobalt/40 hover:text-atmos-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-atmos-sheet motion-reduce:transition-none';

const kicker =
  'font-grotesk text-[11px] font-semibold uppercase tracking-[0.22em] text-atmos-cobalt';

const h2style =
  'mt-5 font-lora text-[clamp(1.9rem,3.6vw,2.75rem)] font-bold leading-[1.1] tracking-tight text-atmos-ink';

/* ------------------------------------------------------ hero visual */

// The vibe input box: a white command-center card with a restrained
// cobalt-to-cyan outer glow that intensifies on hover. The glow lives in a
// hidden -inset-1 gradient layer, per the brief. Purely presentational: the
// pitch lives in the headline and subheading.
function VibeInputBox() {
  return (
    <figure
      role="img"
      aria-label="Preview of the Draftly assignment workspace: a document being written, with an attachment button and a send button"
      className="group relative mt-14 w-full max-w-2xl"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-1 rounded-[20px] bg-gradient-to-r from-atmos-cobalt via-atmos-cyan to-atmos-cobalt opacity-30 blur-lg transition-opacity duration-500 ease-in-out group-hover:opacity-60 motion-reduce:transition-none"
      />
      <div className="relative rounded-2xl bg-white p-4 text-left shadow-[0_14px_50px_-12px_rgba(17,22,29,0.18)]">
        <p className="flex items-center justify-between px-2 pt-1 font-mono text-[10px] tracking-[0.16em] text-atmos-ink/50">
          <span>DOC 07 · DATABASE DESIGN REPORT</span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-atmos-cyan" />
            WRITING
          </span>
        </p>

        {/* borderless "textarea", text-xl */}
        <div className="px-2 py-4 text-xl leading-8 text-atmos-ink/85">
          Methods: how the sample was drawn, and why the outliers stay
          <span className="landing-caret" aria-hidden="true" />
        </div>

        {/* utility bar: attachment + send */}
        <div className="mt-2 flex items-center justify-between border-t border-atmos-line pt-3">
          <div className="flex items-center gap-2 px-1">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-lg text-atmos-ink/55"
            >
              <Paperclip className="h-4 w-4" />
            </span>
            <span className="font-grotesk text-xs font-medium text-atmos-ink/45">
              Attach a source
            </span>
          </div>
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-full bg-atmos-cobalt text-white"
          >
            <ArrowUp className="h-4.5 w-4.5" strokeWidth={2.25} />
          </span>
        </div>
      </div>
    </figure>
  );
}

/* -------------------------------------------------- integration bar */

const WORKFLOW_ICONS = [
  PenLine,
  Users,
  FileText,
  History,
  Send,
  ClipboardCheck,
  Layers,
  GitBranch,
];

function MarqueeRow() {
  // Two identical copies so the -50% translate loops seamlessly.
  const copy = (ariaHidden) => (
    <>
      {WORKFLOW_ICONS.map((Icon, i) => (
        <Icon
          key={i}
          aria-hidden={ariaHidden ? 'true' : undefined}
          focusable="false"
          className={`h-5 w-5 shrink-0 text-atmos-ink/35 transition-colors duration-300 ease-in-out ${
            i % 2 ? 'hover:text-atmos-cobalt' : 'hover:text-atmos-cyan'
          }`}
        />
      ))}
    </>
  );
  return (
    <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="landing-marquee">
        {copy(false)}
        <span aria-hidden="true" className="contents">
          {copy(true)}
        </span>
      </div>
    </div>
  );
}

const WORKS_WITH = [
  'Word documents',
  'Google Docs',
  'Group projects',
  'Course workflows',
];

function IntegrationBar() {
  return (
    <div className="landing-glass-soft flex flex-col gap-6 rounded-2xl p-6 shadow-[0_10px_40px_-12px_rgba(17,22,29,0.12)] sm:p-7 lg:flex-row lg:items-center lg:gap-10">
      <div className="lg:w-[220px] lg:shrink-0">
        <p className={kicker}>Works with</p>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {WORKS_WITH.map((w) => (
            <li
              key={w}
              className="font-grotesk text-[13px] font-medium text-atmos-ink/65"
            >
              {w}
              <span aria-hidden="true" className="ml-3 text-atmos-ink/25">
                /
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden w-px self-stretch bg-atmos-line/80 lg:block" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={kicker}>Assignment workflow</p>
        <div className="mt-3">
          <MarqueeRow />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------ feature section */

const SECTION_IDS = ['how', 'modes', 'record', 'evidence', 'students'];

const SECTION_LABELS = {
  how: 'How it works',
  modes: 'Two modes',
  record: 'The record',
  evidence: 'Evidence',
  students: 'For students',
};

const WORKFLOW_STEPS = [
  {
    title: 'Create',
    body: 'A lecturer creates the assignment, sets the deadline, and opens the workspace to one student or a whole group.',
  },
  {
    title: 'Work',
    body: 'Students write directly inside Draftly. Drafts, revisions, and sections live in one place.',
  },
  {
    title: 'Submit',
    body: 'The final version is sealed at submission: the exact document the lecturer reviews.',
  },
  {
    title: 'Review',
    body: 'The lecturer grades the submission, and opens the record behind it only when a decision needs it.',
  },
];

/* Blueprint-style product visuals: graphite/cobalt/cyan interface snippets
   on white, with SVG annotation lines. One per feature, alternating sides. */

function HowVisual() {
  return (
    <figure
      role="img"
      aria-label="Blueprint of a workspace: a document with attributed edits and a pasted-content flag"
      className="relative rounded-2xl border border-atmos-line bg-white p-5 shadow-[0_10px_36px_-14px_rgba(17,22,29,0.14)]"
    >
      <p className="font-mono text-[10px] tracking-[0.16em] text-atmos-ink/45">
        WORKSPACE · DRAFT 3
      </p>
      <div className="mt-4 space-y-2.5" aria-hidden="true">
        <div className="h-2 w-full rounded-full bg-atmos-soft" />
        <div className="h-2 w-[94%] rounded-full bg-atmos-soft" />
        <div className="h-2 w-[88%] rounded-full bg-atmos-soft" />
      </div>
      <div className="mt-4 rounded-lg border border-atmos-cobalt/25 bg-atmos-cobalt/[0.06] px-3 py-2.5">
        <p className="font-mono text-[9px] tracking-[0.14em] text-atmos-cobalt">
          CONTENT PASTED · +412 CHARS · SARAH · 21:14:07
        </p>
      </div>
      {/* annotation line to the flag */}
      <svg
        aria-hidden="true"
        viewBox="0 0 40 48"
        className="absolute -right-7 -top-2 hidden h-12 w-10 text-atmos-cobalt sm:block"
      >
        <path d="M2 4 C 22 12, 30 26, 34 44" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="34" cy="44" r="2.5" fill="currentColor" />
      </svg>
    </figure>
  );
}

function ModesVisual() {
  return (
    <figure
      role="img"
      aria-label="Split workspace: one individual document, one group document with member contribution bars"
      className="grid gap-px overflow-hidden rounded-2xl border border-atmos-line bg-atmos-line shadow-[0_10px_36px_-14px_rgba(17,22,29,0.14)]"
    >
      <div className="bg-white p-5" aria-hidden="true">
        <p className="font-mono text-[10px] tracking-[0.16em] text-atmos-ink/45">INDIVIDUAL</p>
        <p className="mt-3 font-lora text-sm font-semibold text-atmos-ink">
          One writer, one complete record
        </p>
        <div className="mt-3 space-y-2">
          <div className="h-1.5 w-full rounded-full bg-atmos-soft" />
          <div className="h-1.5 w-[82%] rounded-full bg-atmos-soft" />
          <div className="h-1.5 w-[90%] rounded-full bg-atmos-soft" />
        </div>
      </div>
      <div className="bg-white p-5" aria-hidden="true">
        <p className="font-mono text-[10px] tracking-[0.16em] text-atmos-ink/45">GROUP · 4 MEMBERS</p>
        <div className="mt-3 space-y-2">
          {[
            ['Jonathan', '92%', true],
            ['Sarah', '61%', true],
            ['David', '34%', false],
          ].map(([name, pct, ok]) => (
            <div key={name} className="flex items-center gap-2.5">
              <span className="w-14 font-grotesk text-[11px] font-medium text-atmos-ink/70">{name}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-atmos-soft">
                <span
                  className={`block h-1.5 rounded-full ${ok ? 'bg-atmos-cobalt' : 'bg-atmos-ink/25'}`}
                  style={{ width: pct }}
                />
              </span>
              <span className="w-8 text-right font-mono text-[9px] text-atmos-ink/45">{pct}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

const RECORD_EVENTS = [
  { time: '20:06:41', label: 'Assignment opened', live: false },
  { time: '20:41:26', label: 'Section added', live: false },
  { time: '21:14:07', label: 'Content pasted', live: true },
  { time: '21:47:32', label: 'Submission sealed', live: true },
];

function RecordVisual() {
  return (
    <figure
      role="img"
      aria-label="Timeline of recorded events: assignment opened, section added, content pasted, submission sealed"
      className="rounded-2xl border border-atmos-line bg-white p-5 shadow-[0_10px_36px_-14px_rgba(17,22,29,0.14)]"
    >
      <p className="font-mono text-[10px] tracking-[0.16em] text-atmos-ink/45">
        THE RECORD · GROUP 7
      </p>
      <ol className="mt-3 border-t border-atmos-line">
        {RECORD_EVENTS.map((ev) => (
          <li key={ev.time} className="flex items-baseline gap-3 border-b border-atmos-line py-2.5">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${ev.live ? 'bg-atmos-cyan' : 'bg-atmos-ink/25'}`}
            />
            <span className="font-mono text-[10px] tabular-nums text-atmos-ink/45">{ev.time}</span>
            <span className="font-grotesk text-[13px] font-medium text-atmos-ink/80">{ev.label}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

function EvidenceVisual() {
  return (
    <figure
      role="img"
      aria-label="Evidence factors with numbers: typing naturalness 86, revision behavior 74, engagement 91. A note reads: surfaced on demand, no verdicts."
      className="rounded-2xl border border-atmos-line bg-white p-5 shadow-[0_10px_36px_-14px_rgba(17,22,29,0.14)]"
    >
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] tracking-[0.16em] text-atmos-ink/45">EVIDENCE · ON DEMAND</p>
        <p className="font-mono text-[10px] tracking-[0.16em] text-atmos-cobalt">NO VERDICTS</p>
      </div>
      <div className="mt-4 space-y-3" aria-hidden="true">
        {[
          ['Typing naturalness', '86', 'w-[86%]'],
          ['Revision behavior', '74', 'w-[74%]'],
          ['Engagement', '91', 'w-[91%]'],
        ].map(([label, pct, w]) => (
          <div key={label}>
            <div className="flex items-baseline justify-between">
              <span className="font-grotesk text-[12px] font-medium text-atmos-ink/70">{label}</span>
              <span className="font-mono text-[10px] tabular-nums text-atmos-ink/50">{pct}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-atmos-soft">
              <div className={`h-1.5 rounded-full bg-atmos-cobalt/70 ${w}`} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-atmos-line pt-3 font-grotesk text-[11px] font-medium text-atmos-ink/45">
        The lecturer reads the record and keeps the judgement.
      </p>
    </figure>
  );
}

function StudentsVisual() {
  return (
    <figure
      role="img"
      aria-label="Writing activity line chart with a flagged paste event at 21:14"
      className="rounded-2xl border border-atmos-line bg-white p-5 shadow-[0_10px_36px_-14px_rgba(17,22,29,0.14)]"
    >
      <p className="font-mono text-[10px] tracking-[0.16em] text-atmos-ink/45">WRITING ACTIVITY · YOUR RECORD</p>
      <svg viewBox="0 0 400 88" preserveAspectRatio="none" className="mt-4 h-20 w-full" aria-hidden="true">
        <line x1="0" y1="72" x2="400" y2="72" className="stroke-atmos-line" strokeWidth="1" />
        <line x1="252" y1="8" x2="252" y2="72" className="stroke-atmos-cobalt" strokeWidth="1" strokeDasharray="2 3" />
        <path
          d="M0 60 H46 L50 56 53 62 56 52 60 60 H118 L122 42 125 64 128 34 131 62 134 46 137 60 H246 L250 38 253 62 256 44 259 60 H318 L321 55 324 60 H400"
          fill="none"
          className="stroke-atmos-cyan"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="flex justify-between font-mono text-[9px] tracking-[0.08em] text-atmos-ink/40" aria-hidden="true">
        <span>21:00</span>
        <span className="text-atmos-cobalt">PASTE +412 · 21:14</span>
        <span>22:00</span>
      </div>
    </figure>
  );
}

const EVIDENCE_ROWS = [
  {
    title: 'For lecturers',
    body: 'A contribution summary the moment work is submitted. The full source record sits one click away, opened only when a grading decision calls for it.',
  },
  {
    title: 'The verdict stays yours',
    body: 'Draftly surfaces evidence and flags what is unusual. It never grades, never accuses, and never decides in your place.',
  },
];

const STUDENT_ROWS = [
  {
    title: 'Proof of effort',
    body: 'Carried a group project? The record shows who contributed what, in surviving text, not impressions.',
  },
  {
    title: 'Proof of authorship',
    body: 'If a submission is ever questioned, the development history shows exactly how your work got there.',
  },
];

/* -------------------------------------------------------- testimonials */

const TESTIMONIALS = [
  {
    quote:
      'The group record settled a grading dispute in five minutes. The evidence was already there; I just opened it.',
    name: 'Amara O.',
    role: 'Course lead, Public Health',
  },
  {
    quote:
      'Students stopped asking what counts as plagiarism. They can see the flagged pastes themselves, with context.',
    name: 'Daniel Reyes',
    role: 'Senior Lecturer, Systems Design',
  },
  {
    quote:
      'I was worried group work would end in arguments about effort. The contribution numbers ended the arguments.',
    name: 'Priya N.',
    role: 'Lecturer, Research Methods',
  },
  {
    quote:
      'My own work history is proof I did the work. It feels like a receipt for the late nights.',
    name: 'Tom B.',
    role: 'Third-year student, Computer Science',
  },
  {
    quote:
      'The playback is calm, factual, and complete. It shows how a draft became a submission without drama.',
    name: 'Grace W.',
    role: 'Programme director, Media Studies',
  },
  {
    quote:
      'Our group leader could see who was done and who was not. We finished a week early.',
    name: 'Jonas M.',
    role: 'Second-year student, Economics',
  },
];

const AVATAR_TONES = [
  'bg-atmos-cobalt/12 text-atmos-cobalt',
  'bg-atmos-cyan/15 text-[#0b8a92]',
];

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .replace('.', '')
    .toUpperCase();
}

/* --------------------------------------------------------------- FAQ */

const FAQS = [
  {
    q: 'What exactly does Draftly record?',
    a: 'Every draft, revision, paste, and edit is recorded as the work happens inside the workspace, then sealed at submission. The record explains how the work developed, nothing more. It never watches anything outside the assignment.',
  },
  {
    q: 'Who can see the record?',
    a: 'A student sees the history of their own work. A lecturer sees the contribution and evidence summaries, and can open the full record when a grading decision calls for it. Evidence is surfaced on demand, never streamed as surveillance.',
  },
  {
    q: 'How is group contribution measured?',
    a: 'By the text that survives into the sealed submission. Each member writes inside the shared document, marks their contribution Done, and the system measures what remains of each member\u2019s work in the final version.',
  },
  {
    q: 'Does Draftly decide what is original?',
    a: 'No. It reports evidence: typing rhythm, revision behavior, pasted content, engagement. It flags what is unusual and leaves the judgement to the lecturer. The verdict is always a human one.',
  },
  {
    q: 'What does the beta cost?',
    a: 'Draftly is free for early lecturers and their courses during the private beta. Bring one assignment, let your students work inside it, and grade with the record beside it.',
  },
];

function FaqItem({ faq, index, open, onToggle }) {
  return (
    <li className="overflow-hidden rounded-xl bg-atmos-soft">
      <h3>
        <button
          type="button"
          id={`faq-trigger-${index}`}
          aria-expanded={open}
          aria-controls={`faq-panel-${index}`}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center justify-between gap-4 px-6 py-4 text-left font-grotesk text-[15px] font-semibold text-atmos-ink transition-colors duration-500 ease-in-out hover:text-atmos-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-atmos-soft"
        >
          {faq.q}
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 shrink-0 text-atmos-cobalt transition-transform duration-300 ease-in-out ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>
      </h3>
      <div
        id={`faq-panel-${index}`}
        role="region"
        aria-labelledby={`faq-trigger-${index}`}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-6 pb-6 text-[15px] leading-7 text-atmos-ink/70">{faq.a}</p>
        </div>
      </div>
    </li>
  );
}

/* ----------------------------------------------------------- landing */

export default function Landing() {
  // Rendered inside AuthProvider in the real app; safe to render standalone
  // (e.g. in tests) with no provider.
  const auth = useContext(AuthContext);
  const signedIn = Boolean(auth && auth.token && !auth.loading);

  // Sticky nav gains glass once the page scrolls past the hero intro.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll-spy: highlight the sidebar item for the section in view.
  const [activeSection, setActiveSection] = useState('how');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  // FAQ accordion, one open at a time (matches sibling analysis: nothing
  // opened by default; the first tap opens the first panel a user asks).
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-atmos-sheet font-sans text-atmos-ink [color-scheme:light]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-atmos-cobalt focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      {/* -------------------------------------------------------- header */}
      <header
        className={`sticky top-0 z-40 transition-colors duration-500 ease-in-out motion-reduce:transition-none ${
          scrolled ? 'landing-glass-soft' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link
            to="/"
            aria-label="Draftly — home"
            className="-m-2.5 flex items-center gap-2.5 rounded-md p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-atmos-sheet"
          >
            <BrandMark className="h-7 w-7" tone="dark" />
            <span className="font-grotesk text-[15px] font-bold lowercase tracking-tight text-atmos-ink">
              draftly
            </span>
          </Link>

          {/* Center capsule */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="landing-glass-soft flex items-center gap-1 rounded-full p-1">
              {[
                ['#how', 'How it works'],
                ['#modes', 'Modes'],
                ['#record', 'The record'],
                ['#faq', 'FAQ'],
              ].map(([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    className="inline-flex min-h-9 items-center rounded-full px-4 font-grotesk text-sm font-medium text-atmos-ink/70 transition-colors duration-500 ease-in-out hover:bg-white/80 hover:text-atmos-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt motion-reduce:transition-none"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex min-h-11 items-center rounded-md px-3 font-grotesk text-sm font-medium text-atmos-ink/70 transition-colors duration-500 ease-in-out hover:text-atmos-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt"
              >
                Open dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center rounded-md px-3 font-grotesk text-sm font-medium text-atmos-ink/70 transition-colors duration-500 ease-in-out hover:text-atmos-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt"
              >
                Sign in
              </Link>
            )}
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg bg-atmos-cobalt px-4 text-sm font-semibold text-white transition-all duration-500 ease-in-out hover:bg-[#2a4bb8] hover:shadow-[0_0_18px_rgba(24,221,232,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-atmos-sheet motion-reduce:transition-none"
            >
              Join the beta
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ------------------------------------------------------ hero */}
        <section id="top" aria-label="See the work behind the submission" className="relative overflow-hidden">
          {/* atmosphere: grid + restrained cobalt/cyan glows */}
          <div className="landing-grid absolute inset-0" aria-hidden="true" />
          <div
            aria-hidden="true"
            className="absolute -top-40 left-1/2 h-[560px] w-[880px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(49,87,213,0.16),transparent_72%)] blur-[20px]"
          />
          <div
            aria-hidden="true"
            className="absolute right-[-180px] top-[26%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(24,221,232,0.14),transparent_72%)] blur-[20px]"
          />

          <div className="relative mx-auto flex min-h-[110vh] max-w-4xl flex-col items-center justify-center px-6 pb-24 pt-16 text-center sm:pb-28">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-atmos-cobalt/20 bg-atmos-cobalt/[0.06] px-4 py-1.5 font-grotesk text-xs font-semibold uppercase tracking-[0.16em] text-atmos-cobalt">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-atmos-cyan" />
              Private Beta
            </p>

            <h1 className="mt-7 font-lora text-[clamp(2.75rem,7vw,4.5rem)] font-bold leading-[1.05] tracking-tight text-atmos-ink [text-wrap:balance]">
              See the work behind the submission.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-atmos-ink/65 sm:text-xl sm:leading-9">
              Every keystroke, revision, and contribution preserved. Draftly turns the
              assignment into a workspace with a record, from first draft to sealed final
              submission.
              <span className="landing-caret" aria-hidden="true" />
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link to="/register" className={`${primaryBtn} w-full sm:w-auto`}>
                Join the beta
              </Link>
              <Link to="/login" className={`${ghostBtn} w-full sm:w-auto`}>
                Sign in
              </Link>
            </div>

            <VibeInputBox />

            <ul className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-2 font-grotesk text-[11px] font-medium uppercase tracking-[0.18em] text-atmos-ink/60">
              <li>Every draft preserved</li>
              <li aria-hidden="true">
                <span className="text-atmos-cobalt">·</span>
              </li>
              <li>Sealed on submit</li>
              <li aria-hidden="true">
                <span className="text-atmos-cobalt">·</span>
              </li>
              <li>Evidence, not verdicts</li>
            </ul>
          </div>
        </section>

        {/* --------------------------------------------- integration bar */}
        <div className="relative z-20 mx-auto -mt-16 max-w-4xl px-6">
          <IntegrationBar />
        </div>

        {/* -------------------------------------------- scroll-spy features */}
        <section
          id="features"
          aria-label="What Draftly does"
          className="mx-auto mt-28 grid max-w-6xl gap-12 px-6 lg:grid-cols-[240px_1fr] lg:gap-16"
        >
          {/* sticky sidebar: dot indicator on the active item */}
          <div className="hidden lg:block">
            <nav aria-label="Sections" className="sticky top-28">
              <p className={kicker}>The platform</p>
              <ul className="mt-4">
                {SECTION_IDS.map((id) => {
                  const active = activeSection === id;
                  return (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        aria-current={active ? 'true' : undefined}
                        onClick={() => setActiveSection(id)}
                        className={`group flex items-center gap-3 rounded-md py-2.5 pl-1 transition-colors duration-500 ease-in-out motion-reduce:transition-none ${
                          active
                            ? 'font-semibold text-atmos-ink'
                            : 'font-medium text-atmos-ink/60 hover:text-atmos-ink/80'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-1.5 w-1.5 shrink-0 rounded-full bg-atmos-cobalt transition-opacity duration-500 ease-in-out motion-reduce:transition-none ${
                            active ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <span className="font-grotesk text-[15px]">{SECTION_LABELS[id]}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="min-w-0 space-y-24 sm:space-y-28">
            {/* --------------------------------------------- feature: how */}
            <section id="how" className="scroll-mt-28">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <p className={kicker}>The workflow</p>
                  <h2 className={h2style}>How Draftly works</h2>
                  <p className="mt-5 max-w-md text-base leading-7 text-atmos-ink/70">
                    One place for the whole assignment, from the moment it is created to the
                    moment it is graded.
                  </p>
                  <p className="mt-5 max-w-md text-base leading-7 text-atmos-ink/70">
                    The work happens inside Draftly, so the record covers every step in
                    between.
                  </p>
                </div>
                <HowVisual />
              </div>
              <ol className="mt-12 grid gap-8 border-t border-atmos-line pt-8 sm:grid-cols-2 lg:grid-cols-4">
                {WORKFLOW_STEPS.map((step, i) => (
                  <li key={step.title}>
                    <p className="font-grotesk text-sm font-bold tabular-nums text-atmos-cobalt" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <h3 className="mt-2 font-lora text-xl font-bold tracking-tight text-atmos-ink">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-atmos-ink/65">{step.body}</p>
                  </li>
                ))}
              </ol>
            </section>

            {/* ------------------------------------------- feature: modes */}
            <section id="modes" className="scroll-mt-28">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div className="lg:order-2">
                  <p className={kicker}>One workspace</p>
                  <h2 className={h2style}>Two modes. One engine.</h2>
                  <p className="mt-5 text-base leading-7 text-atmos-ink/70">
                    A normal course runs on individual and group work. Draftly treats them the
                    same way: one workspace per assignment, opened to one student or to the
                    whole group.
                  </p>
                  <div className="mt-8 space-y-6">
                    <div className="rounded-xl border border-atmos-line bg-white/70 p-5">
                      <p className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.2em] text-atmos-cobalt">
                        Individual
                      </p>
                      <h3 className="mt-2 font-lora text-lg font-bold tracking-tight text-atmos-ink">
                        Individual assignments
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-atmos-ink/65">
                        One student, one workspace, one complete record from first draft to
                        sealed submission.
                      </p>
                    </div>
                    <div className="rounded-xl border border-atmos-line bg-white/70 p-5">
                      <p className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.2em] text-atmos-cobalt">
                        Group
                      </p>
                      <h3 className="mt-2 font-lora text-lg font-bold tracking-tight text-atmos-ink">
                        Group assignments
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-atmos-ink/65">
                        One shared, sectioned document. Everyone contributes in realtime, and
                        the record shows how the work actually came together.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="lg:order-1">
                  <ModesVisual />
                </div>
              </div>
            </section>

            {/* ------------------------------------------ feature: record */}
            <section id="record" className="scroll-mt-28">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <p className={kicker}>The record</p>
                  <h2 className={h2style}>Everything that happened, kept.</h2>
                  <p className="mt-5 text-base leading-7 text-atmos-ink/70">
                    Draftly keeps the development of the work as it unfolds: drafts, revisions,
                    contributions, and the sealed final version. Nothing is added after the
                    fact, and nothing is edited away.
                  </p>
                  <p className="mt-4 text-base leading-7 text-atmos-ink/70">
                    Ask a question of any point in the record, and it answers with the source,
                    not with a summary.
                  </p>
                </div>
                <RecordVisual />
              </div>
            </section>

            {/* ---------------------------------------- feature: evidence */}
            <section id="evidence" className="scroll-mt-28">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div className="lg:order-2">
                  <p className={kicker}>On your terms</p>
                  <h2 className={h2style}>Evidence on demand, not surveillance.</h2>
                  <p className="mt-5 text-base leading-7 text-atmos-ink/70">
                    The record stays quiet while the work happens. It exists to inform a
                    decision when one is needed, never to watch.
                  </p>
                  <ol className="mt-8 space-y-7">
                    {EVIDENCE_ROWS.map((row, i) => (
                      <li key={row.title} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
                        <span className="font-grotesk text-sm font-bold tabular-nums text-atmos-cobalt" aria-hidden="true">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h3 className="font-lora text-lg font-bold tracking-tight text-atmos-ink">
                            {row.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-6 text-atmos-ink/65">{row.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="lg:order-1">
                  <EvidenceVisual />
                </div>
              </div>
            </section>

            {/* ----------------------------------------- feature: students */}
            <section id="students" className="scroll-mt-28">
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
                <div>
                  <p className={kicker}>For students</p>
                  <h2 className={h2style}>Your work has a history.</h2>
                  <p className="mt-5 text-base leading-7 text-atmos-ink/70">
                    Draftly keeps a record of how your assignment develops, so your
                    contribution never disappears behind the final document. If you did the
                    work, the work shows it.
                  </p>
                  <ol className="mt-8 space-y-7">
                    {STUDENT_ROWS.map((row, i) => (
                      <li key={row.title} className="grid gap-3 sm:grid-cols-[3rem_1fr]">
                        <span className="font-grotesk text-sm font-bold tabular-nums text-atmos-cobalt" aria-hidden="true">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <h3 className="font-lora text-lg font-bold tracking-tight text-atmos-ink">
                            {row.title}
                          </h3>
                          <p className="mt-1.5 text-sm leading-6 text-atmos-ink/65">{row.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
                <StudentsVisual />
              </div>
            </section>
          </div>
        </section>

        {/* ------------------------------------------------ testimonials */}
        <section id="voices" aria-label="What early users say" className="mx-auto mt-28 max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className={kicker}>Early voices</p>
            <h2 className={h2style}>What early users say.</h2>
            <p className="mt-5 text-base leading-7 text-atmos-ink/70">
              Beta feedback from the first courses, lecturers and students alike.
            </p>
          </div>

          <div className="mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3 [column-fill:balance]">
            {TESTIMONIALS.map((t, i) => (
              <figure
                key={t.name}
                className="landing-glass-strong mb-6 break-inside-avoid rounded-2xl p-6"
              >
                <blockquote className="text-sm leading-7 text-atmos-ink/80">
                  <span aria-hidden="true" className="mb-2 block font-lora text-3xl leading-none text-atmos-cobalt">
                    &ldquo;
                  </span>
                  {t.quote}
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-atmos-line pt-4">
                  <span
                    aria-hidden="true"
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-grotesk text-xs font-bold ${AVATAR_TONES[i % 2]}`}
                  >
                    {initials(t.name)}
                  </span>
                  <span>
                    <span className="block font-grotesk text-sm font-semibold text-atmos-ink">
                      {t.name}
                    </span>
                    <span className="block text-xs text-atmos-ink/65">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- FAQ */}
        <section id="faq" aria-label="Frequently asked questions" className="mx-auto mt-28 max-w-4xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className={kicker}>FAQ</p>
            <h2 className={h2style}>Questions, answered.</h2>
            <p className="mt-5 text-base leading-7 text-atmos-ink/70">
              Plain answers about recording, contribution, and what the beta includes.
            </p>
          </div>

          <ul className="mt-12 space-y-3">
            {FAQS.map((faq, i) => (
              <FaqItem
                key={faq.q}
                faq={faq}
                index={i}
                open={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </ul>
        </section>

        {/* --------------------------------------------------- beta band */}
        <section
          aria-label="Join the Draftly beta"
          className="mt-28 bg-atmos-cobalt [background-image:radial-gradient(ellipse_60%_90%_at_20%_top,rgba(255,255,255,0.10),transparent_60%)]"
        >
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90">
                  Draftly beta
                </p>
                <h2 className="mt-5 max-w-2xl font-lora text-[clamp(1.9rem,4vw,3.2rem)] font-bold leading-[1.05] tracking-tight text-white">
                  Stop grading blind.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-white/85">
                  Free for early lecturers and their courses. Bring one assignment, let your
                  students work it inside Draftly, and grade it with the record beside it.
                </p>
              </div>
              <div className="lg:justify-self-end">
                <Link
                  to="/register"
                  className="inline-flex min-h-13 w-full items-center justify-center whitespace-nowrap rounded-lg bg-white px-8 py-4 text-base font-semibold text-atmos-cobalt transition-colors duration-500 ease-in-out hover:bg-atmos-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-atmos-cobalt motion-reduce:transition-none sm:w-auto"
                >
                  Join the beta
                </Link>
                <p className="mt-4 font-grotesk text-[11px] font-medium uppercase tracking-[0.18em] text-white/90">
                  Free during the beta · Set up in minutes
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------- footer */}
      <footer className="border-t border-atmos-line bg-atmos-sheet">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <p className="flex items-center gap-2.5">
                <BrandMark className="h-6 w-6" tone="dark" />
                <span className="font-grotesk text-[15px] font-bold lowercase tracking-tight text-atmos-ink">
                  draftly
                </span>
              </p>
              <p className="mt-3 text-sm leading-6 text-atmos-ink/65">
                Evidence is recorded for the lecturer&rsquo;s review, never for surveillance.
              </p>
            </div>
            <nav aria-label="Footer">
              <ul className="flex flex-col gap-1">
                {[
                  ['/register', 'Join the beta'],
                  ['/login', 'Sign in'],
                  ['#how', 'How it works'],
                  ['#modes', 'Modes'],
                  ['#record', 'The record'],
                  ['#students', 'For students'],
                  ['#evidence', 'Evidence'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link
                      to={href}
                      className="inline-flex min-h-9 items-center rounded-md px-2 font-grotesk text-sm font-medium text-atmos-ink/65 transition-colors duration-500 ease-in-out hover:text-atmos-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-atmos-cobalt"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <p className="mt-12 font-grotesk text-[11px] font-medium uppercase tracking-[0.18em] text-atmos-ink/60">
            &copy; 2026 Draftly
          </p>
        </div>
      </footer>
    </div>
  );
}