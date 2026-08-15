// Shared auth page shell and class recipes (light geometric public identity).
// One paper centered column with the Draftly logo, a Plus Jakarta Sans
// heading, and a raised white panel. Success states use <AuthSuccess/>
// (icon + heading + message, no card).
import { Link } from 'react-router-dom';
import { Logo } from './landing/Logo';

export const authCard =
  'bg-white rounded-xl border border-gray-200 p-6 sm:p-8 space-y-4 shadow-sm';

export const authInput =
  'w-full min-h-[44px] rounded-lg border border-gray-300 bg-[#F9F8F6] px-3 py-2 text-sm text-[#1A1A1B] placeholder:text-gray-400 outline-none transition-colors focus:border-[#0047FF] focus:ring-2 focus:ring-[#0047FF]/30';

export const authBtn =
  'w-full min-h-[44px] inline-flex items-center justify-center rounded-lg bg-[#0047FF] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0038CC] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9F8F6]';

export const authLink =
  'inline-flex items-center min-h-11 px-1 text-[#0047FF] underline underline-offset-4 hover:text-[#0038CC] transition-colors';

export const authError =
  'flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700';

export function AuthShell({ title, subtitle, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9F8F6] px-4 py-10 font-brand text-[#1A1A1B]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" aria-label="Draftly — home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0047FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F9F8F6]">
            <Logo size="lg" />
          </Link>
          <h1 className="mt-5 font-brand text-3xl font-bold tracking-tight text-[#1A1A1B]">
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
    <main className="flex min-h-screen items-center justify-center bg-[#F9F8F6] px-4 py-10 font-brand text-[#1A1A1B]">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
          {icon}
        </div>
        <h1 className="mt-6 font-brand text-3xl font-bold tracking-tight text-[#1A1A1B]">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-gray-500">{message}</p>
        <div className="mt-8 space-y-2">{children}</div>
      </div>
    </main>
  );
}
