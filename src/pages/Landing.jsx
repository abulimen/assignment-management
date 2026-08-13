import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { BookOpen, User, Users, Eye, ScrollText, Scale } from 'lucide-react';

const CONTRIBUTORS = [
  { name: 'Jonathan', share: 41 },
  { name: 'Sarah', share: 29 },
  { name: 'David', share: 22 },
  { name: 'Michael', share: 8, note: 'incomplete by the group' },
];

// Shared interactive styles — primary CTA, ghost buttons, and links all use the
// same 150ms ease-out motion and the same focus-visible ring (the accent).
const primaryBtn =
  'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg bg-primary-600 px-5 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

const secondaryBtn =
  'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition-colors duration-150 ease-out hover:border-gray-400 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

const heroBtn = `${primaryBtn} min-h-12 px-7 text-base`;

const ghostLink =
  'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-gray-600 transition-colors duration-150 ease-out hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

const sectionLink =
  'text-primary-600 transition-colors duration-150 ease-out hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

function ContributorRow({ name, share, note }) {
  return (
    <li className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-gray-800">{name}</span>
          {note && (
            <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] leading-4 text-gray-500">
              {note}
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-gray-600">{share}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
        <div
          className={`h-1 rounded-full ${note ? 'bg-gray-300' : 'bg-primary-600'}`}
          style={{ width: `${share}%` }}
        />
      </div>
    </li>
  );
}

export default function Landing() {
  // Rendered inside AuthProvider in the real app; safe to render standalone
  // (e.g. in tests) with no provider.
  const auth = useContext(AuthContext);
  const signedIn = Boolean(auth && auth.token && !auth.loading);

  return (
    <div className="bg-white text-gray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-gray-950 focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link
            to="/"
            aria-label="Assignment Management — home"
            className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            <BookOpen className="h-6 w-6 shrink-0 text-primary-600" aria-hidden="true" />
            <span className="hidden text-[15px] font-semibold tracking-tight text-gray-900 sm:inline">
              Assignment Management
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              <li>
                <a href="#modes" className={ghostLink}>
                  Two modes
                </a>
              </li>
              <li>
                <a href="#evidence" className={ghostLink}>
                  Evidence
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={ghostLink}>
                  How it works
                </a>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {signedIn ? (
              <Link to="/dashboard" className={secondaryBtn}>
                Open dashboard
              </Link>
            ) : (
              <Link to="/login" className={secondaryBtn}>
                Sign in
              </Link>
            )}
            <Link to="/register" className={primaryBtn}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* ---------------------------------------------------------- hero */}
        <section id="top" className="bg-white">
          <div className="mx-auto max-w-4xl px-6 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-primary-600">
              Proof of work, made legible
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-gray-900 sm:text-5xl">
              See the work behind the grade.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
              Don&rsquo;t just grade the final document. See how it got there &mdash; who contributed, what
              changed, and how the work developed.
            </p>
            <p className="mx-auto mt-10 max-w-2xl border-t border-gray-100 pt-8 text-lg font-medium leading-7 text-gray-800 sm:text-xl">
              Know who actually contributed to the group work before you grade it.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link to="/register" className={`${heroBtn} w-full sm:w-auto`}>
                Get started
              </Link>
              <Link
                to="/login"
                className={`${secondaryBtn} min-h-12 w-full px-7 text-base sm:w-auto`}
              >
                Sign in
              </Link>
            </div>

            {/* Product artifact: the contribution summary the lecturer sees on
                submission. Real list semantics; the bars are decorative and
                the percentages are the text. */}
            <figure className="mx-auto mt-20 w-full max-w-xl rounded-xl border border-gray-200 bg-white text-left shadow-sm">
              <figcaption className="border-b border-gray-100 px-6 py-5">
                <p className="text-sm font-semibold text-gray-900">Contribution summary</p>
                <p className="mt-1 text-sm text-gray-500">
                  Assignment: Database Design &middot; Group 7 &middot; 4 members
                </p>
              </figcaption>
              <ul className="divide-y divide-gray-100 px-6 py-1">
                {CONTRIBUTORS.map((c) => (
                  <ContributorRow key={c.name} name={c.name} share={c.share} note={c.note} />
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-gray-100 px-6">
                <p className="text-sm text-gray-500">Submitted Aug 13, 2026</p>
                <a href="#evidence" className={sectionLink}>
                  View evidence <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </figure>
          </div>
        </section>

        {/* -------------------------------------------------- two modes */}
        <section id="modes" className="scroll-mt-24 bg-gray-50">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-primary-600">
                One workspace
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                One workspace, two modes
              </h2>
              <p className="mt-5 text-lg leading-8 text-gray-600">
                A normal course has both individual and group assignments, and they run on the same
                engine: one student, or the group together.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
                <User className="h-6 w-6 text-primary-600" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold text-gray-900">Individual assignments</h3>
                <p className="mt-3 text-base leading-7 text-gray-600">
                  Each student works in their own document. The workspace records the work process,
                  so you can review it the moment the work is submitted.
                </p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm sm:p-10">
                <Users className="h-6 w-6 text-primary-600" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold text-gray-900">Group assignments</h3>
                <p className="mt-3 text-base leading-7 text-gray-600">
                  The group writes together in one shared document. Sections organize themselves,
                  and the record separates who contributed what.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ evidence */}
        <section id="evidence" className="scroll-mt-24 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="max-w-2xl">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-primary-600">
                On your terms
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Evidence on demand, not surveillance
              </h2>
              <p className="mt-5 text-lg leading-8 text-gray-600">
                The workspace keeps a quiet record while the work happens. Nothing is judged
                automatically, and nothing is recorded for show. The record exists to inform a
                decision when you need it.
              </p>
            </div>

            <ul className="mt-14 grid gap-6 md:grid-cols-3">
              <li className="rounded-xl border border-gray-200 bg-gray-50 p-8">
                <Eye className="h-6 w-6 text-primary-600" aria-hidden="true" />
                <h3 className="mt-5 text-base font-semibold text-gray-900">For lecturers</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  A summary on submission: contribution share and activity at a glance. Drill into
                  the source record only when a grading decision calls for it.
                </p>
              </li>
              <li className="rounded-xl border border-gray-200 bg-gray-50 p-8">
                <ScrollText className="h-6 w-6 text-primary-600" aria-hidden="true" />
                <h3 className="mt-5 text-base font-semibold text-gray-900">For students</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  See what is recorded. Every contributor can view what the workspace records about
                  their own work, and how it is used.
                </p>
              </li>
              <li className="rounded-xl border border-gray-200 bg-gray-50 p-8">
                <Scale className="h-6 w-6 text-primary-600" aria-hidden="true" />
                <h3 className="mt-5 text-base font-semibold text-gray-900">The verdict stays with you</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">
                  Evidence, not verdicts: the record shows what happened and flags what is unusual.
                  You decide &mdash; there is no automated verdict.
                </p>
              </li>
            </ul>
          </div>
        </section>

        {/* ----------------------------------------------------- how it works */}
        <section id="how-it-works" className="scroll-mt-24 bg-gray-50">
          <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-primary-600">
                Calm by design
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                How it works
              </h2>
              <p className="mt-5 text-lg leading-8 text-gray-600">
                Three steps, and the record builds itself while the work does.
              </p>
            </div>

            <ol className="mt-14 space-y-10">
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold tabular-nums text-gray-900"
                  aria-hidden="true"
                >
                  1
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Create the assignment</h3>
                  <p className="mt-2 text-base leading-7 text-gray-600">
                    Set it up in the workspace, for one student or a group. Sections and deadlines
                    are yours to define.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold tabular-nums text-gray-900"
                  aria-hidden="true"
                >
                  2
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">The work happens</h3>
                  <p className="mt-2 text-base leading-7 text-gray-600">
                    Students write in their own or the shared document, and sections organize
                    themselves as they go. When the group is finished, the leader submits.
                  </p>
                </div>
              </li>
              <li className="flex gap-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-sm font-semibold tabular-nums text-gray-900"
                  aria-hidden="true"
                >
                  3
                </span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Review with context</h3>
                  <p className="mt-2 text-base leading-7 text-gray-600">
                    You get the sealed final document and a contribution summary, with the
                    underlying evidence one click away.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------- CTA */}
        <section className="bg-white">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              Make the record part of the course.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-gray-600">
              Set up your next assignment and see the work behind the grade.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link to="/register" className={`${heroBtn} w-full sm:w-auto`}>
                Get started
              </Link>
              <Link to="/login" className={`${secondaryBtn} min-h-12 w-full px-7 text-base sm:w-auto`}>
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <p className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary-600" aria-hidden="true" />
                <span className="text-[15px] font-semibold tracking-tight text-gray-900">
                  Assignment Management
                </span>
              </p>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Evidence is recorded for the lecturer&rsquo;s review, never for surveillance.
              </p>
            </div>
            <nav aria-label="Footer">
              <ul className="flex flex-col gap-1">
                <li>
                  <Link to="/login" className={`${ghostLink} px-2`}>
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className={`${ghostLink} px-2`}>
                    Get started
                  </Link>
                </li>
                <li>
                  <a href="#modes" className={`${ghostLink} px-2`}>
                    Two modes
                  </a>
                </li>
                <li>
                  <a href="#evidence" className={`${ghostLink} px-2`}>
                    Evidence
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className={`${ghostLink} px-2`}>
                    How it works
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <p className="mt-12 text-xs text-gray-400">&copy; 2026 Assignment Management</p>
        </div>
      </footer>
    </div>
  );
}