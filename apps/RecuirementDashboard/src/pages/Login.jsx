import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  IconSun, IconMoon, IconEye, IconEyeOff,
} from '../components/Icons';
import Logo from '../assets/Logo';

export default function Login() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
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
      <div className="login-bg" aria-hidden="true">
        <span className="login-bg-grid" />
        <span className="login-orb login-orb-a" />
        <span className="login-orb login-orb-b" />
      </div>

      <button
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        title="Toggle theme"
      >
        {theme === 'dark' ? <IconSun /> : <IconMoon />}
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      <div className="login-split">
        <aside className="login-aside">
          <Logo size={44} />
          <p className="login-kicker">Talent Analytics</p>
          <h2>One workspace for every hiring seat</h2>
          <p className="login-aside-lead">Sign in to the view that matches your role. Nothing extra, nothing missing.</p>

          <div className="login-persona-stack" aria-hidden="true">
            <span className="login-avatar av-sales">SA</span>
            <span className="login-avatar av-ta">TA</span>
            <span className="login-avatar av-hr">HR</span>
            <span className="login-avatar av-onb">ON</span>
          </div>

          <ul className="login-personas">
            <li>
              <span className="login-avatar av-sales">SA</span>
              <div>
                <strong>Sales &amp; Sales Lead</strong>
                <span>Raise client requirements and track ownership</span>
              </div>
            </li>
            <li>
              <span className="login-avatar av-ta">TA</span>
              <div>
                <strong>TA Owner &amp; TA Lead</strong>
                <span>Assign work, run pipeline, select candidates</span>
              </div>
            </li>
            <li>
              <span className="login-avatar av-hr">HR</span>
              <div>
                <strong>HR &amp; HR Lead</strong>
                <span>Release offers and manage CTC / DOJ</span>
              </div>
            </li>
            <li>
              <span className="login-avatar av-onb">ON</span>
              <div>
                <strong>Onboarding</strong>
                <span>Docs, BGV, and joining formalities</span>
              </div>
            </li>
          </ul>
        </aside>
        <div className="login-card">
          <div className="login-brand">
            <Logo size={52} />
            <h1>Sign in</h1>
            <p className="login-subtitle">Use your assigned work email to continue.</p>
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
                autoComplete="username"
              />
            </label>

            <label>
              <span>Password</span>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              </div>
            </label>

            {error && (
              <div className="login-error" role="alert" aria-live="assertive">
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="login-btn-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="login-hint">
            Your workspace and permissions are determined by your role.
          </p>
        </div>
      </div>
    </div>
  );
}
