import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { IconSun, IconMoon } from '../components/Icons';
import Logo from '../assets/Logo';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Backend will validate the BR email + password and return the user type.
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <button className="login-theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <div className="login-brand">
          <Logo size={64} />
          <h1>Talent Analytics</h1>
          <p className="login-subtitle">Recruitment Insights Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            <span>Email</span>
            <input
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && (
            <div className="login-error" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="login-hint">
          Sign in with your assigned credentials. Your workspace is determined by your role.
        </p>
      </div>
    </div>
  );
}
