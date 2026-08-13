import { useEffect, useState } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { api } from '../api';
import { MailCheck, AlertCircle, Loader2 } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <Loader2 className="w-10 h-10 text-primary-600 mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-semibold text-gray-900">Verifying your email…</h1>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md text-center">
          <MailCheck className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified!</h1>
          <p className="text-gray-600 text-sm mb-6">Your account is active. You can now sign in.</p>
          <Link to="/login"
            className="inline-flex items-center justify-center w-full min-h-[44px] bg-primary-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-700 transition-colors">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <MailCheck className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
          <p className="text-gray-500 mt-2">
            We'll email you a link to activate your account.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {state === 'error' && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 text-red-600 text-sm rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <form onSubmit={handleResend} className="space-y-4">
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="verify-email"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <button type="submit" disabled={resending}
              className="w-full min-h-[44px] bg-primary-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          </form>
          {resendMsg && <p className="text-sm text-green-700">{resendMsg}</p>}
        </div>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already verified? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}