import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { AlertCircle, MailCheck } from 'lucide-react';
import {
  AuthShell, AuthSuccess, authCard, authInput, authBtn, authLink, authError,
} from '../components/AuthShell';

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
      <AuthSuccess
        icon={<MailCheck className="h-7 w-7" aria-hidden="true" />}
        title="Check your inbox"
        message={
          <>
            We sent a verification link to <span className="font-medium text-[#1A1A1B]">{done.email}</span>.
            Click it to activate your account, then sign in.
          </>
        }
      >
        <button
          onClick={() => navigate('/verify-email', { state: { email: done.email } })}
          className={`${authBtn} w-full`}
        >
          Resend verification email
        </button>
        <Link to="/login" className="inline-flex min-h-11 items-center pt-1 text-sm text-gray-500 transition-colors hover:text-gray-800">
          Already verified? Sign in
        </Link>
      </AuthSuccess>
    );
  }

  return (
    <AuthShell title="Create account" subtitle="Join Draftly. Your first assignment takes minutes to set up.">
      <form onSubmit={handleSubmit} className={authCard}>
        {error && (
          <div role="alert" className={authError}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-gray-700">Full name</label>
          <input
            id="reg-name"
            type="text"
            name="name"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            className={authInput}
          />
        </div>
        <div>
          <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            id="reg-email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
            className={authInput}
          />
        </div>
        <div>
          <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
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
            className={authInput}
          />
          <p id="reg-password-hint" className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="reg-role" className="mb-1 block text-sm font-medium text-gray-700">I am a</label>
          <select
            id="reg-role"
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className={authInput}
          >
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className={authBtn}>
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        Already have an account? <Link to="/login" className={authLink}>Sign in</Link>
      </p>
    </AuthShell>
  );
}