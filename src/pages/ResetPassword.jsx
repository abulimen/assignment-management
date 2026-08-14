import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { AlertCircle, CircleCheckBig } from 'lucide-react';
import {
  AuthShell, AuthSuccess, authCard, authInput, authBtn, authLink, authError,
} from '../components/AuthShell';

// Password reset. token arrives as ?token=<raw> from the emailed link.
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('This reset link is missing its token. Please request a new one.');
      return;
    }
    setLoading(true);
    try {
      await api.post('reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.message || 'This link is invalid or has expired. Please request a new one.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthSuccess
        icon={<CircleCheckBig className="h-7 w-7" aria-hidden="true" />}
        title="Password updated"
        message="You can now sign in with your new password."
      >
        <Link to="/login" className={`${authBtn} w-full`}>Go to sign in</Link>
      </AuthSuccess>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle="It must be at least 8 characters long.">
      <form onSubmit={handleSubmit} className={authCard}>
        {error && (
          <div role="alert" className={authError}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-gray-700">New password</label>
          <input
            id="reset-password"
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className={authInput}
          />
        </div>
        <div>
          <label htmlFor="reset-confirm" className="mb-1 block text-sm font-medium text-gray-700">Confirm password</label>
          <input
            id="reset-confirm"
            type="password"
            name="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className={authInput}
          />
        </div>
        <button type="submit" disabled={loading} className={authBtn}>
          {loading ? 'Updating…' : 'Reset password'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link to="/login" className={authLink}>Back to sign in</Link>
      </p>
    </AuthShell>
  );
}