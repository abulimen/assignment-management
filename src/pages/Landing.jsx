// Draftly marketing root — the Flight Recorder identity. Dark graphite
// chassis, one luminous sheet under readout, cobalt + electric-cyan
// telemetry. Story order is workspace first, evidence as the differentiator:
// hero (the workspace) → how it works → two modes → the record → evidence
// on demand → for students → beta call to action.
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import BrandMark from '../components/BrandMark';

/* ------------------------------------------------------------- recipes */

const primaryBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg bg-cobalt-600 px-7 text-base font-semibold text-sheet transition-colors duration-150 ease-out hover:bg-cobalt-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900 motion-reduce:transition-none';

const ghostBtn =
  'inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg border border-graphite-700 px-7 text-base font-medium text-graphite-200 transition-colors duration-150 ease-out hover:border-graphite-500 hover:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900 motion-reduce:transition-none';

const ghostLink =
  'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-graphite-400 transition-colors duration-150 ease-out hover:text-sheet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900 motion-reduce:transition-none';

const kicker =
  'font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-graphite-400';

const h2style =
  'mt-5 font-instrument text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold leading-[1.05] tracking-tight text-sheet [font-stretch:118%]';

/* ------------------------------------------------------ hero artifact */

const READOUT_ROWS = [
  { name: 'Jonathan', share: 41 },
  { name: 'Sarah', share: 29 },
  { name: 'David', share: 22 },
  { name: 'Michael', share: 8, flagged: true },
];

// Sheet skeleton widths: one luminous document with a pasted block inside.
const SHEET_LINES = ['w-2/5', 'w-full', 'w-[92%]', 'w-[96%]', 'w-3/4'];
const SHEET_LINES_AFTER = ['w-[88%]', 'w-full', 'w-2/3'];

function RecordedDocument() {
  return (
    <figure className="relative rounded-xl border border-graphite-700 bg-graphite-800 p-4 sm:p-5">
      {/* chassis readout bar */}
      <div className="flex items-center justify-between gap-4 px-1 pb-4">
        <p className="truncate font-mono text-[10px] tracking-[0.18em] text-graphite-500">
          DOC 07 · DATABASE DESIGN REPORT
        </p>
        <p className="flex shrink-0 items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-signal">
          <span aria-hidden="true" className="fr-pulse h-1.5 w-1.5 rounded-full bg-signal" />
          REC
        </p>
      </div>

      {/* the luminous sheet */}
      <div className="rounded-md bg-sheet p-6 sm:p-7">
        <p className="font-instrument text-sm font-bold tracking-tight text-graphite-900">
          Distributed Query Optimization
        </p>
        <div className="mt-4 space-y-2" aria-hidden="true">
          {SHEET_LINES.map((w) => (
            <div key={w} className={`h-1.5 rounded-full bg-graphite-300 ${w}`} />
          ))}
        </div>
        <div className="mt-4 rounded border border-cobalt-600/30 bg-cobalt-600/10 p-3">
          <div className="space-y-2" aria-hidden="true">
            <div className="h-1.5 w-[94%] rounded-full bg-cobalt-600/40" />
            <div className="h-1.5 w-4/5 rounded-full bg-cobalt-600/40" />
          </div>
          <p className="mt-2.5 font-mono text-[9px] tracking-[0.14em] text-cobalt-600">
            CONTENT PASTED · +412 CHARS · SARAH · 21:14:07
          </p>
        </div>
        <div className="mt-4 space-y-2" aria-hidden="true">
          {SHEET_LINES_AFTER.map((w) => (
            <div key={w} className={`h-1.5 rounded-full bg-graphite-300 ${w}`} />
          ))}
        </div>
      </div>

      {/* development trace */}
      <div className="relative mt-4 px-1">
        <p className="font-mono text-[9px] tracking-[0.18em] text-graphite-500" aria-hidden="true">
          <span className="absolute right-1 top-0 -translate-y-1 font-mono text-[9px] tracking-[0.14em] text-cobalt-300">
            PASTE +412 · 21:14
          </span>
          WRITING ACTIVITY
        </p>
        <svg
          viewBox="0 0 400 64"
          preserveAspectRatio="none"
          className="mt-2 h-16 w-full"
          aria-hidden="true"
          focusable="false"
        >
          <line x1="0" y1="56" x2="400" y2="56" className="stroke-graphite-700" strokeWidth="1" />
          {/* paste marker */}
          <line
            x1="252" y1="6" x2="252" y2="56"
            className="stroke-cobalt-400" strokeWidth="1" strokeDasharray="2 3"
          />
          <path
            d="M0 48 H46 L50 44 53 50 56 40 60 48 H118 L122 30 125 52 128 22 131 50 134 34 137 48 H246 L250 26 253 50 256 32 259 48 H318 L321 43 324 48 H400"
            fill="none"
            className="stroke-signal"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex justify-between font-mono text-[9px] tracking-[0.08em] text-graphite-600" aria-hidden="true">
          <span>21:00</span>
          <span>21:30</span>
          <span>22:00</span>
          <span>22:30</span>
        </div>
      </div>

      {/* contribution readout */}
      <figcaption className="mt-4 border-t border-graphite-700 px-1 pt-4">
        <div className="flex items-center justify-between pb-3">
          <p className="font-mono text-[10px] tracking-[0.18em] text-graphite-500">
            CONTRIBUTION · GROUP 7
          </p>
          <p className="font-mono text-[10px] tracking-[0.18em] text-graphite-500">4 MEMBERS</p>
        </div>
        <ul className="space-y-2.5">
          {READOUT_ROWS.map((r) => (
            <li key={r.name} className="flex items-center gap-3">
              <span className="w-16 shrink-0 truncate font-instrument text-xs font-medium text-graphite-300">
                {r.name}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-graphite-700" aria-hidden="true">
                <span
                  className={`block h-1 rounded-full ${r.flagged ? 'bg-graphite-600' : 'bg-cobalt-400'}`}
                  style={{ width: `${r.share}%` }}
                />
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-graphite-400">
                {r.share}%
              </span>
              {r.flagged && (
                <span className="shrink-0 font-mono text-[9px] tracking-[0.14em] text-error-fg">
                  NOT DONE
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="font-mono text-[10px] tracking-[0.14em] text-graphite-500">
            SEALED AUG 13, 2026 · 21:47:32
          </p>
          <a
            href="#record"
            className="inline-flex min-h-11 items-center rounded-md font-mono text-[10px] tracking-[0.18em] text-cobalt-300 transition-colors hover:text-cobalt-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-800"
          >
            VIEW THE RECORD <span aria-hidden="true">&nbsp;&rarr;</span>
          </a>
        </div>
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------ sections */

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

const RECORD_EVENTS = [
  { time: '20:06:41', label: 'Assignment opened', detail: 'Group 7 · 4 members', live: false },
  { time: '20:09:12', label: 'First draft created', detail: 'Jonathan', live: false },
  { time: '20:41:26', label: 'Section added', detail: 'Methods · Sarah', live: false },
  { time: '21:02:11', label: 'Major revision', detail: 'Introduction rewritten · Jonathan', live: false },
  { time: '21:14:07', label: 'Content pasted', detail: '+412 chars · Sarah', live: true },
  { time: '21:19:04', label: 'Contribution status', detail: 'David marked Done', live: false },
  { time: '21:47:32', label: 'Submission sealed', detail: 'Snapshot locked · Jonathan submitted', live: true },
];

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

export default function Landing() {
  // Rendered inside AuthProvider in the real app; safe to render standalone
  // (e.g. in tests) with no provider.
  const auth = useContext(AuthContext);
  const signedIn = Boolean(auth && auth.token && !auth.loading);

  return (
    <div className="fr-page min-h-screen bg-graphite-900 font-instrument text-graphite-200">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cobalt-600 focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-sheet"
      >
        Skip to main content
      </a>

      {/* -------------------------------------------------------- header */}
      <header className="border-b border-graphite-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link
            to="/"
            aria-label="Draftly — home"
            className="-m-2.5 flex items-center gap-2.5 rounded-md p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900"
          >
            <BrandMark className="h-7 w-7" tone="dark" />
            <span className="font-instrument text-[15px] font-bold tracking-tight text-sheet">
              Draftly
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              <li>
                <a href="#how" className={`${ghostLink} font-mono text-[11px] uppercase tracking-[0.18em]`}>
                  How it works
                </a>
              </li>
              <li>
                <a href="#modes" className={`${ghostLink} font-mono text-[11px] uppercase tracking-[0.18em]`}>
                  Modes
                </a>
              </li>
              <li>
                <a href="#record" className={`${ghostLink} font-mono text-[11px] uppercase tracking-[0.18em]`}>
                  The record
                </a>
              </li>
              <li>
                <a href="#students" className={`${ghostLink} font-mono text-[11px] uppercase tracking-[0.18em]`}>
                  For students
                </a>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link to="/dashboard" className={ghostLink}>
                Open dashboard
              </Link>
            ) : (
              <Link to="/login" className={ghostLink}>
                Sign in
              </Link>
            )}
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg bg-cobalt-600 px-4 text-sm font-semibold text-sheet transition-colors duration-150 ease-out hover:bg-cobalt-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900 motion-reduce:transition-none"
            >
              Join the beta
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ---------------------------------------------------------- hero */}
        <section id="top" aria-label="See the work behind the submission">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <p className={`${kicker} flex items-center gap-2.5`}>
                <span aria-hidden="true" className="fr-pulse h-2 w-2 rounded-full bg-signal" />
                <span className="text-signal">REC</span>
                <span aria-hidden="true">&middot;</span>
                The assignment workspace
              </p>
              <h1 className="mt-7 max-w-2xl font-instrument text-[clamp(2.9rem,7.5vw,5rem)] font-extrabold leading-[0.98] tracking-[-0.03em] text-sheet [font-stretch:125%] [text-wrap:balance]">
                See the work behind the submission.
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-graphite-300">
                Draftly gives students a workspace to complete assignments individually or
                together, and preserves how the work develops from first draft to final
                submission. The work happens here, not in collected Word files.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
                <Link to="/register" className={`${primaryBtn} w-full sm:w-auto`}>
                  Join the beta
                </Link>
                <Link to="/login" className={`${ghostBtn} w-full sm:w-auto`}>
                  Sign in
                </Link>
              </div>
              <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-2 border-t border-graphite-800 pt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-500">
                <li>Every draft preserved</li>
                <li>Sealed on submit</li>
                <li>Evidence, not verdicts</li>
              </ul>
            </div>

            <div className="lg:pl-2">
              <RecordedDocument />
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- how it works */}
        <section id="how" className="scroll-mt-20 border-t border-graphite-800 bg-graphite-950">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="max-w-2xl">
              <p className={kicker}>The workflow</p>
              <h2 className={h2style}>How Draftly works</h2>
              <p className="mt-5 text-lg leading-8 text-graphite-300">
                One place for the whole assignment, from the moment it is created to the moment
                it is graded.
              </p>
            </div>
            <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {WORKFLOW_STEPS.map((step, i) => (
                <li key={step.title} className="border-t border-graphite-800 pt-6">
                  <p className="font-mono text-sm tabular-nums text-cobalt-300" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-3 font-instrument text-lg font-bold tracking-tight text-sheet">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-graphite-300">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------- modes */}
        <section id="modes" className="scroll-mt-20 border-t border-graphite-800">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="max-w-2xl">
              <p className={kicker}>One workspace</p>
              <h2 className={h2style}>Two modes. One engine.</h2>
              <p className="mt-5 text-lg leading-8 text-graphite-300">
                A normal course runs on individual and group work. Draftly treats them the same
                way: one workspace per assignment, opened to one student or to the whole group.
              </p>
            </div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-graphite-800 bg-graphite-800 lg:grid-cols-2">
              <article className="bg-graphite-900 p-8 sm:p-10">
                <p className="font-mono text-[11px] tracking-[0.24em] text-cobalt-300">INDIVIDUAL</p>
                <h3 className="mt-4 font-instrument text-2xl font-bold tracking-tight text-sheet">
                  Individual assignments
                </h3>
                <p className="mt-4 font-instrument text-lg font-semibold leading-7 text-graphite-200">
                  One student. One workspace. One complete record of the work.
                </p>
                <p className="mt-3 max-w-lg text-base leading-7 text-graphite-300">
                  The record follows the assignment from first draft to submission, so an
                  individual grade rests on the work itself rather than on impressions.
                </p>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-500">
                  One writer &middot; Full history &middot; Sealed draft
                </p>
              </article>
              <article className="bg-graphite-900 p-8 sm:p-10">
                <p className="font-mono text-[11px] tracking-[0.24em] text-cobalt-300">GROUP</p>
                <h3 className="mt-4 font-instrument text-2xl font-bold tracking-tight text-sheet">
                  Group assignments
                </h3>
                <p className="mt-4 font-instrument text-lg font-semibold leading-7 text-graphite-200">
                  One shared workspace. Everyone contributes. The record shows how the work came
                  together.
                </p>
                <p className="mt-3 text-base leading-7 text-graphite-300">
                  The group writes one sectioned document in realtime, members organize the
                  sections and mark their contribution Done, and the leader submits.
                </p>
                <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-500">
                  Shared sections &middot; Contribution readout
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- the record */}
        <section id="record" className="scroll-mt-20 border-t border-graphite-800 bg-graphite-950">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <div>
                <p className={kicker}>The record</p>
                <h2 className={h2style}>Everything that happened, kept.</h2>
                <p className="mt-5 max-w-md text-lg leading-8 text-graphite-300">
                  Draftly keeps the development of the work as it unfolds: drafts, revisions,
                  contributions, and the sealed final version. Nothing is added after the fact,
                  and nothing is edited away.
                </p>
              </div>
              <ol className="border-t border-graphite-800">
                {RECORD_EVENTS.map((ev) => (
                  <li
                    key={ev.time}
                    className="grid grid-cols-[1rem_1fr] items-baseline gap-x-4 gap-y-1 border-b border-graphite-800 py-4 sm:grid-cols-[1rem_110px_1fr] sm:gap-x-5"
                  >
                    <span
                      aria-hidden="true"
                      className={`relative top-[-1px] inline-block h-1.5 w-1.5 rounded-full ${ev.live ? 'bg-signal' : 'bg-graphite-600'}`}
                    />
                    <span className="font-mono text-xs tabular-nums tracking-wide text-graphite-500">
                      {ev.time}
                    </span>
                    <span className="col-span-2 sm:col-span-1">
                      <span className="font-instrument text-[15px] font-semibold text-graphite-200">
                        {ev.label}
                      </span>
                      <span className="ml-3 font-mono text-[11px] tracking-wide text-graphite-500">
                        {ev.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------- evidence */}
        <section id="evidence" className="scroll-mt-20 border-t border-graphite-800">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <div>
                <p className={kicker}>On your terms</p>
                <h2 className={h2style}>Evidence on demand, not surveillance.</h2>
                <p className="mt-5 max-w-md text-lg leading-8 text-graphite-300">
                  The record stays quiet while the work happens. It exists to inform a decision
                  when one is needed, never to watch.
                </p>
              </div>
              <ol className="border-t border-graphite-800">
                {EVIDENCE_ROWS.map((row, i) => (
                  <li key={row.title} className="grid gap-3 border-b border-graphite-800 py-7 sm:grid-cols-[3.5rem_1fr] sm:gap-x-5">
                    <span className="font-mono text-sm tabular-nums text-cobalt-300" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-instrument text-lg font-bold tracking-tight text-sheet">
                        {row.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-base leading-7 text-graphite-300">
                        {row.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- students */}
        <section id="students" className="scroll-mt-20 border-t border-graphite-800 bg-graphite-950">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
              <div>
                <p className={kicker}>For students</p>
                <h2 className={h2style}>Your work has a history.</h2>
                <p className="mt-5 max-w-md text-lg leading-8 text-graphite-300">
                  Draftly keeps a record of how your assignment develops, so your contribution
                  never disappears behind the final document. If you did the work, the work
                  shows it.
                </p>
              </div>
              <ol className="border-t border-graphite-800">
                {STUDENT_ROWS.map((row, i) => (
                  <li key={row.title} className="grid gap-3 border-b border-graphite-800 py-7 sm:grid-cols-[3.5rem_1fr] sm:gap-x-5">
                    <span className="font-mono text-sm tabular-nums text-cobalt-300" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="font-instrument text-lg font-bold tracking-tight text-sheet">
                        {row.title}
                      </h3>
                      <p className="mt-2 max-w-xl text-base leading-7 text-graphite-300">
                        {row.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------- beta band */}
        <section aria-label="Join the Draftly beta" className="border-t border-graphite-800 bg-cobalt-600">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-sheet/70">
                  Draftly beta
                </p>
                <h2 className="mt-5 max-w-2xl font-instrument text-[clamp(1.9rem,4vw,3.2rem)] font-extrabold leading-[1.02] tracking-tight text-sheet [font-stretch:120%]">
                  Stop grading blind.
                </h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-sheet/80">
                  Free for early lecturers and their courses. Bring one assignment, let your
                  students work it inside Draftly, and grade it with the record beside it.
                </p>
              </div>
              <div className="lg:justify-self-end">
                <Link
                  to="/register"
                  className="inline-flex min-h-13 w-full items-center justify-center whitespace-nowrap rounded-lg bg-graphite-950 px-8 py-4 text-base font-semibold text-sheet transition-colors duration-150 ease-out hover:bg-graphite-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sheet focus-visible:ring-offset-2 focus-visible:ring-offset-cobalt-600 motion-reduce:transition-none sm:w-auto"
                >
                  Join the beta
                </Link>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-sheet/70">
                  Free during the beta &middot; Set up in minutes
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --------------------------------------------------------- footer */}
      <footer className="border-t border-graphite-800">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <p className="flex items-center gap-2.5">
                <BrandMark className="h-6 w-6" tone="dark" />
                <span className="font-instrument text-[15px] font-bold tracking-tight text-sheet">
                  Draftly
                </span>
              </p>
              <p className="mt-3 text-sm leading-6 text-graphite-400">
                Evidence is recorded for the lecturer&rsquo;s review, never for surveillance.
              </p>
            </div>
            <nav aria-label="Footer">
              <ul className="flex flex-col gap-1">
                <li>
                  <Link to="/register" className={`${ghostLink} px-2`}>
                    Join the beta
                  </Link>
                </li>
                <li>
                  <Link to="/login" className={`${ghostLink} px-2`}>
                    Sign in
                  </Link>
                </li>
                <li>
                  <a href="#how" className={`${ghostLink} px-2`}>
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#modes" className={`${ghostLink} px-2`}>
                    Modes
                  </a>
                </li>
                <li>
                  <a href="#record" className={`${ghostLink} px-2`}>
                    The record
                  </a>
                </li>
                <li>
                  <a href="#students" className={`${ghostLink} px-2`}>
                    For students
                  </a>
                </li>
                <li>
                  <a href="#evidence" className={`${ghostLink} px-2`}>
                    Evidence
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-600">
            &copy; 2026 Draftly
          </p>
        </div>
      </footer>
    </div>
  );
}
