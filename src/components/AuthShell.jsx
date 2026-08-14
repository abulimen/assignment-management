// Shared auth page shell and class recipes (Flight Recorder identity). One
// graphite centered column with the dark Draftly mark, an Archivo heading,
// and a raised panel. Success states use <AuthSuccess/> (icon + heading +
// message, no card).
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export const authCard =
  'bg-graphite-800 rounded-xl border border-graphite-700 p-6 sm:p-8 space-y-4';

export const authInput =
  'w-full min-h-[44px] rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-sheet placeholder:text-graphite-500 outline-none transition-colors focus:border-signal focus:ring-2 focus:ring-signal/35';

export const authBtn =
  'w-full min-h-[44px] inline-flex items-center justify-center rounded-lg bg-cobalt-600 px-3 py-2 text-sm font-semibold text-sheet transition-colors hover:bg-cobalt-500 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900';

export const authLink =
  'inline-flex items-center min-h-11 px-1 text-cobalt-300 underline underline-offset-4 hover:text-cobalt-400 transition-colors';

export const authError =
  'flex items-start gap-2 rounded-lg bg-error-bg p-3 text-sm text-error-fg';

export function AuthShell({ title, subtitle, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-graphite-900 px-4 py-10 font-instrument [color-scheme:dark]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" aria-label="Draftly — home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-graphite-900">
            <BrandMark className="h-11 w-11" tone="dark" />
          </Link>
          <h1 className="mt-5 font-instrument text-3xl font-bold tracking-tight text-sheet">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-[15px] leading-6 text-graphite-400">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

export function AuthSuccess({ icon, title, message, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-graphite-900 px-4 py-10 font-instrument [color-scheme:dark]">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ok-bg text-ok-fg">
          {icon}
        </div>
        <h1 className="mt-6 font-instrument text-3xl font-bold tracking-tight text-sheet">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-graphite-300">{message}</p>
        <div className="mt-8 space-y-2">{children}</div>
      </div>
    </main>
  );
}
