import { useState } from 'react';
import './AuthPage.css';
import { TerminalIcon } from './Icons';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
    } catch {
      // Error is handled by auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="auth-page" id="auth-page">
      {/* Background grid effect */}
      <div className="auth-grid-bg" />

      <div className="auth-container">
        {/* Logo & Branding */}
        <div className="auth-brand">
          <div className="auth-logo">
            <TerminalIcon size={32} />
          </div>
          <h1 className="auth-title mono">
            <span className="auth-bracket">&gt;</span> CTF Arena
            <span className="auth-cursor">_</span>
          </h1>
          <p className="auth-subtitle">Beginner Challenge Portal</p>
        </div>

        {/* Auth Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2 className="auth-form-title mono">
            {isLogin ? '// LOGIN' : '// REGISTER'}
          </h2>

          {error && (
            <div className="auth-error" id="auth-error">
              <span className="auth-error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label mono" htmlFor="auth-username">USERNAME</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-prompt mono">&gt;</span>
              <input
                id="auth-username"
                type="text"
                className="auth-input mono"
                placeholder="enter_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                autoComplete="username"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="auth-field">
              <label className="auth-label mono" htmlFor="auth-email">EMAIL</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-prompt mono">&gt;</span>
                <input
                  id="auth-email"
                  type="email"
                  className="auth-input mono"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label mono" htmlFor="auth-password">PASSWORD</label>
            <div className="auth-input-wrapper">
              <span className="auth-input-prompt mono">&gt;</span>
              <input
                id="auth-password"
                type="password"
                className="auth-input mono"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit mono"
            id="auth-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="auth-loading">
                <span className="auth-spinner" />
                Processing...
              </span>
            ) : (
              isLogin ? '[ LOGIN ]' : '[ REGISTER ]'
            )}
          </button>

          <div className="auth-toggle">
            <span className="auth-toggle-text">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
            </span>
            <button
              type="button"
              className="auth-toggle-btn mono"
              onClick={toggleMode}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
