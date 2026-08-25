import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MailCheck, AlertCircle } from 'lucide-react';
import {
  AuthShell, AuthSuccess, authCard, authInput, authBtn, authLink, authError,
} from '../components/AuthShell';
import { useSeo } from '../utils/seo';

// Password reset request. Always returns a generic "if registered" message —
// the server never reveals whether an account exists.
export default function ForgotPassword() {
  useSeo({ title: 'Forgot password — Draftly', description: 'Request a password reset link for your Draftly account.', canonical: '/forgot-password' });
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('forgot-password', { email });
      setSent(true);
      void data;
    } catch (err) {
      setError(err.message || 'Unable to send a reset link. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthSuccess
        icon={<MailCheck className="h-7 w-7" aria-hidden="true" />}
        title="Check your inbox"
        message="If an account exists for that email, we've sent a password reset link."
      >
        <Link to="/login" className={`${authBtn} w-full`}>Back to sign in</Link>
      </AuthSuccess>
    );
  }

  return (
    <AuthShell title="Forgot password?" subtitle="Enter your email and we'll send you a reset link.">
      <form onSubmit={handleSubmit} className={authCard}>
        {error && (
          <div role="alert" className={authError}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            id="forgot-email"
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
        <button type="submit" disabled={loading} className={authBtn}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Remembered it? <Link to="/login" className={authLink}>Sign in</Link>
      </p>
    </AuthShell>
  );
}