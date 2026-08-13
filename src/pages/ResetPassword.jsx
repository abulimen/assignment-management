import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api';
import { KeyRound, AlertCircle, CircleCheckBig } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md text-center">
          <CircleCheckBig className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated</h1>
          <p className="text-gray-600 text-sm mb-6">You can now sign in with your new password.</p>
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
          <KeyRound className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Choose a new password</h1>
          <p className="text-gray-500 mt-2">It must be at least 8 characters long.</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 text-red-600 text-sm rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              id="reset-password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              id="reset-confirm"
              type="password"
              name="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <button type="submit" disabled={loading}
            className="w-full min-h-[44px] bg-primary-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {loading ? 'Updating…' : 'Reset password'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/login" className="text-primary-600 hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}