import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { BookOpen, AlertCircle, MailCheck } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null); // null | { email }
  const navigate = useNavigate();

  function update(field, value) { setForm((prev) => ({ ...prev, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // The new contract does NOT auto-login: expect { user, message } only.
      const data = await api.post('register', form);
      setDone({ email: data.user.email });
    } catch (err) {
      setError(err.message || 'Unable to create your account. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Account created → verification prompt (the SPA never auto-logs in).
  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
        <div className="w-full max-w-md text-center">
          <MailCheck className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            We sent a verification link to <span className="font-medium text-gray-900">{done.email}</span>.
            Click it to activate your account, then sign in.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => navigate('/verify-email', { state: { email: done.email } })}
              className="w-full min-h-[44px] bg-primary-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              Resend verification email
            </button>
            <Link to="/login" className="block w-full min-h-[44px] flex items-center justify-center text-sm text-gray-600 hover:text-gray-800">
              Already verified? Sign in
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BookOpen className="w-12 h-12 text-primary-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 mt-2">Join Assignment Manager</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 bg-red-50 text-red-700 text-sm rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
            <input
              id="reg-name"
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              id="reg-password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              minLength={8}
              aria-describedby="reg-password-hint"
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <p id="reg-password-hint" className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="reg-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="reg-role"
              value={form.role}
              onChange={(e) => update('role', e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option value="student">Student</option>
              <option value="lecturer">Lecturer</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="w-full min-h-[44px] bg-primary-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account? <Link to="/login" className="inline-flex items-center min-h-11 px-1 text-primary-600 underline underline-offset-4">Sign in</Link>
        </p>
      </div>
    </main>
  );
}