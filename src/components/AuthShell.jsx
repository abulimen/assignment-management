// Shared auth page shell and class recipes. One warm-canvas centered column
// with the Draftly mark, a serif heading, and a paper card. Success states
// use <AuthSuccess/> (icon + heading + message, no card).
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

export const authCard =
  'bg-surface rounded-2xl border border-line shadow-sm p-6 sm:p-8 space-y-4';

export const authInput =
  'w-full min-h-[44px] rounded-lg border border-gray-300 bg-canvas/60 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-500';

export const authBtn =
  'w-full min-h-[44px] inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

export const authLink =
  'inline-flex items-center min-h-11 px-1 text-primary-600 underline underline-offset-4 hover:text-primary-700 transition-colors';

export const authError =
  'flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700';

export function AuthShell({ title, subtitle, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" aria-label="Draftly — home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2">
            <BrandMark className="h-11 w-11" />
          </Link>
          <h1 className="mt-5 font-serif text-3xl font-semibold tracking-tight text-gray-900">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-[15px] leading-6 text-gray-500">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

export function AuthSuccess({ icon, title, message, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
          {icon}
        </div>
        <h1 className="mt-6 font-serif text-3xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-600">{message}</p>
        <div className="mt-8 space-y-2">{children}</div>
      </div>
    </main>
  );
}