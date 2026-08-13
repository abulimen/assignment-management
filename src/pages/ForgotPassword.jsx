import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { MailCheck, AlertCircle } from 'lucide-react';

// Password reset request. Always returns a generic "if registered" message —
// the server never reveals whether an account exists.
export default function ForgotPassword() {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md text-center">
          <MailCheck className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p className="text-gray-600 text-sm mb-6">
            If an account exists for that email, we've sent a password reset link.
          </p>
          <Link to="/login"
            className="inline-flex items-center justify-center w-full min-h-[44px] bg-primary-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary-700 transition-colors">
            Back to sign in
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
          <h1 className="text-2xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-500 mt-2">
            Enter your email and we'll send you a reset link.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 text-red-600 text-sm rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="forgot-email"
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
          <button type="submit" disabled={loading}
            className="w-full min-h-[44px] bg-primary-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Remembered it? <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}