import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';

export function LoginPage() {
  const { user, status, error, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  if (user && status === 'signedIn') return <Navigate to="/staff" replace />;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setValidation('Enter your email and password.');
      return;
    }
    setValidation(null);
    if (await login(email, password)) {
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith('/') ? from : '/staff', { replace: true });
    }
  }

  return <main className="login-layout">
    <section className="login-card" aria-labelledby="login-title">
      <div className="brand">CeylonMate <span>Staff</span></div>
      <h1 id="login-title">Sign in</h1>
      <p>Use your staff account to access the shared workspace.</p>
      <form onSubmit={submit} noValidate>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="username" required
          value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete="current-password" required
          value={password} onChange={(event) => setPassword(event.target.value)} />
        {(validation || error) && <p className="form-error" role="alert">{validation || error}</p>}
        <button type="submit" disabled={status === 'checking'}>
          {status === 'checking' ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </section>
  </main>;
}
