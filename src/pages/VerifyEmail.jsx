import { useEffect, useState } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { api } from '../api';
import { MailCheck, AlertCircle, Loader2 } from 'lucide-react';
import {
  AuthShell, AuthSuccess, authCard, authInput, authBtn, authLink, authError,
} from '../components/AuthShell';

// Email-verification screen.
// - With ?token= (clicked in the emailed link): verifies and shows the result.
// - Without a token: info + resend form + link to sign in.
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const location = useLocation();
  const token = params.get('token');
  const prefilledEmail = (location.state && location.state.email) || params.get('email') || '';

  const [state, setState] = useState(token ? 'verifying' : 'idle'); // idle | verifying | success | error
  const [error, setError] = useState('');
  const [email, setEmail] = useState(prefilledEmail);
  const [resendMsg, setResendMsg] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState('verifying');
    api.get(`verify-email?token=${encodeURIComponent(token)}`)
      .then(() => { if (!cancelled) setState('success'); })
      .catch((err) => {
        if (!cancelled) {
          setState('error');
          setError((err && err.message) || 'This verification link is invalid or has expired.');
        }
      });
    return () => { cancelled = true; };
  }, [token]);

  async function handleResend(e) {
    e.preventDefault();
    setError('');
    setResendMsg('');
    setResending(true);
    try {
      const data = await api.post('resend-verification', { email });
      setResendMsg(data.message);
    } catch (err) {
      setError(err.message || 'Could not resend the email. Try again shortly.');
    } finally {
      setResending(false);
    }
  }

  if (state === 'verifying') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-graphite-900 px-4 font-instrument [color-scheme:dark]">
        <div className="w-full max-w-md text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-signal" />
          <h1 className="font-instrument text-2xl font-bold tracking-tight text-sheet">
            Verifying your email&hellip;
          </h1>
        </div>
      </main>
    );
  }

  if (state === 'success') {
    return (
      <AuthSuccess
        icon={<MailCheck className="h-7 w-7" aria-hidden="true" />}
        title="Email verified!"
        message="Your account is active. You can now sign in."
      >
        <Link to="/login" className={`${authBtn} w-full`}>Go to sign in</Link>
      </AuthSuccess>
    );
  }

  return (
    <AuthShell title="Verify your email" subtitle="We'll email you a link to activate your account.">
      <div className={authCard}>
        {state === 'error' && (
          <div role="alert" className={authError}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleResend} className="space-y-4">
          <div>
            <label htmlFor="verify-email" className="mb-1 block text-sm font-medium text-graphite-300">Email</label>
            <input
              id="verify-email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={authInput}
            />
          </div>
          <button type="submit" disabled={resending} className={authBtn}>
            {resending ? 'Sending…' : 'Resend verification email'}
          </button>
        </form>
        {resendMsg && <p className="text-sm text-ok-fg">{resendMsg}</p>}
      </div>
      <p className="mt-4 text-center text-sm text-graphite-400">
        Already verified? <Link to="/login" className={authLink}>Sign in</Link>
      </p>
    </AuthShell>
  );
}