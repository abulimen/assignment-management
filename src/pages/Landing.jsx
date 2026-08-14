import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Users, Eye, ScrollText, Scale } from 'lucide-react';
import BrandMark from '../components/BrandMark';

const CONTRIBUTORS = [
  { name: 'Jonathan', share: 41 },
  { name: 'Sarah', share: 29 },
  { name: 'David', share: 22 },
  { name: 'Michael', share: 8, note: 'flagged by the group' },
];

// Shared interactive recipes. Plum accent; 150ms ease-out; visible focus ring.
const primaryBtn =
  'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg bg-primary-600 px-5 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

const secondaryBtn =
  'inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-line bg-surface px-5 text-sm font-medium text-gray-700 transition-colors duration-150 ease-out hover:border-gray-400 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

const heroBtn = `${primaryBtn} min-h-12 px-7 text-base`;

const ghostLink =
  'inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-gray-600 transition-colors duration-150 ease-out hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

const sectionLink =
  'text-primary-600 transition-colors duration-150 ease-out hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 motion-reduce:transition-none';

const kicker =
  'text-[13px] font-semibold uppercase tracking-[0.18em] text-primary-600';

const h2serif =
  'mt-4 font-serif text-3xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-4xl';

function ContributorRow({ name, share, note }) {
  return (
    <li className="py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium text-gray-800">{name}</span>
          {note && (
            <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[11px] leading-4 text-gray-500">
              {note}
            </span>
          )}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-gray-600">{share}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
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
    <div className="bg-canvas text-gray-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary-700 focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <header className="border-b border-line bg-canvas">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6">
          <Link
            to="/"
            aria-label="Draftly — home"
            className="-m-2.5 flex items-center gap-2.5 rounded-md p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            <BrandMark className="h-7 w-7" />
            <span className="text-[15px] font-semibold tracking-tight text-gray-900">
              Draftly
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
        <section id="top">
          <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
            <div className="grid items-start gap-14 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className={kicker}>Evidence-first assignment workspace</p>
                <h1 className="mt-6 max-w-xl font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-gray-900 sm:text-6xl">
                  See the work behind the grade.
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
                  You grade the final document. Right now that is all you see. Draftly preserves
                  how the work got there, so a fair grade never depends on a guess.
                </p>
                <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
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

                {/* Three facts: a divided rule, not a card grid. */}
                <dl className="mt-14 border-t border-line pt-8 sm:max-w-lg">
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div>
                      <dt className="text-sm font-semibold text-gray-900">Who contributed</dt>
                      <dd className="mt-1.5 text-sm leading-6 text-gray-600">
                        Group grades backed by surviving text, not impressions.
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-gray-900">What changed</dt>
                      <dd className="mt-1.5 text-sm leading-6 text-gray-600">
                        The edit history of every draft, kept as it happens.
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-semibold text-gray-900">How it developed</dt>
                      <dd className="mt-1.5 text-sm leading-6 text-gray-600">
                        Work is reviewed as evidence, never as surveillance.
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              {/* Product artifact: the contribution summary a lecturer gets at
                  submission. Real list semantics; bars decorative, % the text. */}
              <figure className="rounded-2xl border border-line bg-surface shadow-sm">
                <figcaption className="border-b border-line px-6 py-5">
                  <p className="text-sm font-semibold text-gray-900">Contribution summary</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Assignment: Database Design &middot; Group 7 &middot; 4 members
                  </p>
                </figcaption>
                <ul className="divide-y divide-line px-6 py-1">
                  {CONTRIBUTORS.map((c) => (
                    <ContributorRow key={c.name} name={c.name} share={c.share} note={c.note} />
                  ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line px-6 py-5">
                  <p className="text-sm text-gray-500">Submitted Aug 13, 2026</p>
                  <a href="#evidence" className={`${sectionLink} inline-flex min-h-11 items-center`}>
                    View evidence <span aria-hidden="true">&rarr;</span>
                  </a>
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- two modes */}
        <section id="modes" className="scroll-mt-24 border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="max-w-2xl">
              <p className={kicker}>One workspace</p>
              <h2 className={h2serif}>One workspace, two modes</h2>
              <p className="mt-5 text-lg leading-8 text-gray-600">
                A normal course has both individual and group assignments. Draftly runs them on
                the same engine: one student, or the group together.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <article className="rounded-2xl border border-line bg-canvas p-8 sm:p-10">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <User className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold text-gray-900">
                  Individual assignments
                </h3>
                <p className="mt-3 text-base leading-7 text-gray-600">
                  Each student works in their own document. The workspace records the work
                  process, ready for review the moment it is submitted.
                </p>
              </article>
              <article className="rounded-2xl border border-line bg-canvas p-8 sm:p-10">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-serif text-xl font-semibold text-gray-900">
                  Group assignments
                </h3>
                <p className="mt-3 text-base leading-7 text-gray-600">
                  The group writes together in one shared document. Sections organize themselves,
                  and the record separates who contributed what.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ evidence */}
        <section id="evidence" className="scroll-mt-24 border-t border-line bg-canvas">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="max-w-2xl">
              <p className={kicker}>On your terms</p>
              <h2 className={h2serif}>Evidence on demand, not surveillance</h2>
              <p className="mt-5 text-lg leading-8 text-gray-600">
                The workspace keeps a quiet record while the work happens. Nothing is judged
                automatically, and nothing is recorded for show. The record exists to inform a
                decision when you need one.
              </p>
            </div>

            <ol className="mt-14 space-y-0 border-t border-line">
              {[
                {
                  icon: Eye,
                  title: 'For lecturers',
                  body: 'A summary on submission: contribution share and activity at a glance. Drill into the source record only when a grading decision calls for it.',
                },
                {
                  icon: ScrollText,
                  title: 'For students',
                  body: 'See what is recorded. Every contributor can view what the workspace records about their own work, and how it is used.',
                },
                {
                  icon: Scale,
                  title: 'The verdict stays with you',
                  body: 'Evidence, not verdicts: the record shows what happened and flags what is unusual. You decide; there is no automated verdict.',
                },
              ].map((item, i) => (
                <li key={item.title} className="grid gap-4 border-b border-line py-8 sm:grid-cols-[3rem_1fr]">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                    <p className="mt-2 max-w-2xl text-base leading-7 text-gray-600">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ----------------------------------------------------- how it works */}
        <section id="how-it-works" className="scroll-mt-24 border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="max-w-2xl">
              <p className={kicker}>Calm by design</p>
              <h2 className={h2serif}>How it works</h2>
              <p className="mt-5 text-lg leading-8 text-gray-600">
                Three steps, and the record builds itself while the work does.
              </p>
            </div>

            <ol className="mt-14 grid gap-10 md:grid-cols-3">
              <li>
                <span
                  className="font-serif text-5xl font-semibold text-primary-300"
                  aria-hidden="true"
                >
                  01
                </span>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Create the assignment</h3>
                <p className="mt-2 text-base leading-7 text-gray-600">
                  Set it up for one student or a group. Sections and deadlines are yours to define.
                </p>
              </li>
              <li>
                <span
                  className="font-serif text-5xl font-semibold text-primary-300"
                  aria-hidden="true"
                >
                  02
                </span>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">The work happens</h3>
                <p className="mt-2 text-base leading-7 text-gray-600">
                  Students write in their own or the shared document. When the group is finished,
                  the leader submits.
                </p>
              </li>
              <li>
                <span
                  className="font-serif text-5xl font-semibold text-primary-300"
                  aria-hidden="true"
                >
                  03
                </span>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">Review with context</h3>
                <p className="mt-2 text-base leading-7 text-gray-600">
                  You get the sealed final document and a contribution summary, with the evidence
                  one click away.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ------------------------------------------------------------- CTA */}
        <section className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-28">
            <h2 className="font-serif text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
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

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <p className="flex items-center gap-2.5">
                <BrandMark className="h-6 w-6" />
                <span className="text-[15px] font-semibold tracking-tight text-gray-900">
                  Draftly
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
          <p className="mt-12 text-xs text-gray-500">&copy; 2026 Draftly</p>
        </div>
      </footer>
    </div>
  );
}