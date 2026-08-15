import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api';
import { AlertCircle } from 'lucide-react';
import { AuthShell, authCard, authInput, authBtn, authLink, authError } from '../components/AuthShell';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('login', { email, password });
      login(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'EMAIL_UNVERIFIED') {
        // Account exists but isn't verified yet — send them to the verify page.
        navigate('/verify-email', { state: { email } });
        return;
      }
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Sign in" subtitle="Access your assignments and reviews.">
      <form onSubmit={handleSubmit} className={authCard}>
        {error && (
          <div role="alert" className={authError}>
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <input
            id="login-email"
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
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-gray-700">Password</label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={authInput}
          />
        </div>
        <button type="submit" disabled={loading} className={authBtn}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <div className="mt-4 space-y-1 text-center text-sm text-gray-500">
        <p>
          <Link to="/forgot-password" className={authLink}>Forgot your password?</Link>
        </p>
        <p>
          Don&rsquo;t have an account? <Link to="/register" className={authLink}>Register</Link>
        </p>
      </div>
    </AuthShell>
  );
}