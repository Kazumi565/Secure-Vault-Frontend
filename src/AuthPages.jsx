import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Files, LockKeyhole, ShieldCheck } from 'lucide-react';
import { api, saveBlob } from './api';
import { Brand, ErrorBox } from './components';
import { useVault } from './context';

export function AuthPage({ mode = 'login' }) {
  const { user, accept, t, language, setLanguage } = useVault();
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [name, setName] = useState(''),
    [code, setCode] = useState('');
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  if (user && mode === 'login') return <Navigate to="/files" replace />;
  const title = {
    login: 'Welcome back',
    register: 'Create account',
    forgot: 'Reset password',
    reset: 'Reset password',
    verify: 'Verify email',
  }[mode];
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'login') {
        accept(await api('/auth/login', { method: 'POST', body: { email, password, code } }));
        navigate('/files');
      }
      if (mode === 'register') {
        const r = await api('/auth/register', { method: 'POST', body: { email, password, full_name: name } });
        setMessage(r.message);
        setPassword('');
      }
      if (mode === 'forgot')
        setMessage((await api('/auth/forgot-password', { method: 'POST', body: { email } })).message);
      if (mode === 'reset') {
        setMessage(
          (
            await api('/auth/reset-password', {
              method: 'POST',
              body: { token: params.get('token') || '', new_password: password },
            })
          ).message,
        );
        setPassword('');
      }
      if (mode === 'verify') {
        const r = await api('/auth/verify', { method: 'POST', body: { token: params.get('token') || '' } });
        setMessage(r.message);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">YOUR PERSONAL FILE SPACE</span>
          <h1>{t('A home for your files.')}</h1>
          <p>{t('Organize what matters. Keep control of who can access it.')}</p>
          <div className="auth-illustration">
            <div className="illustration-orbit" />
            <span className="floating-file">
              <Files size={44} />
            </span>
            <span className="floating-shield">
              <ShieldCheck size={30} />
            </span>
            <span className="floating-lock">
              <LockKeyhole size={22} />
            </span>
          </div>
        </div>
        <small>Secure Vault · File storage, thoughtfully organized.</small>
      </aside>
      <main className="auth-main">
        <select
          className="language-select"
          aria-label="Language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="ro">Română</option>
        </select>
        <div className="auth-card">
          <span className="eyebrow">SECURE VAULT</span>
          <h1>{t(title)}</h1>
          <p className="muted">
            {mode === 'login'
              ? 'Sign in to pick up where you left off.'
              : mode === 'register'
                ? 'Start with a place of your own.'
                : 'A few steps to keep your account in your hands.'}
          </p>
          <ErrorBox error={error} />
          {message && (
            <p className="alert success" role="status">
              {message}
            </p>
          )}
          <form onSubmit={submit}>
            {mode === 'register' && (
              <label>
                {t('Full name')}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  autoComplete="name"
                />
              </label>
            )}
            {['login', 'register', 'forgot'].includes(mode) && (
              <label>
                {t('Email')}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
            )}
            {['login', 'register', 'reset'].includes(mode) && (
              <label>
                {t(mode === 'reset' ? 'New password' : 'Password')}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={mode === 'login' ? 1 : 12}
                  maxLength={128}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode !== 'login' && <small>Use at least 12 characters.</small>}
              </label>
            )}
            {mode === 'login' && (
              <label>
                {t('Authentication code')} <span className="muted">(if enabled)</span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  maxLength={32}
                  placeholder="Authenticator or recovery code"
                />
              </label>
            )}
            <button
              className="primary wide"
              disabled={busy || (!!message && ['register', 'reset', 'verify'].includes(mode))}
            >
              {busy
                ? 'Please wait…'
                : t(
                    {
                      login: 'Sign in',
                      register: 'Create account',
                      forgot: 'Send reset link',
                      reset: 'Reset password',
                      verify: 'Verify email',
                    }[mode],
                  )}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="auth-links">
            {mode === 'login' ? (
              <>
                <Link to="/forgot-password">{t('Forgot password?')}</Link>
                <Link to="/register">{t('Create account')}</Link>
              </>
            ) : (
              <Link to="/login">{t('Back to sign in')}</Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export function SharedFile() {
  const { token } = useParams();
  const { t } = useVault();
  const [password, setPassword] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const download = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api(`/shared/${token}/download`, {
        method: 'POST',
        body: { password },
        blob: true,
      });
      const encoded = result.disposition?.split("filename*=UTF-8''")[1];
      saveBlob(result.blob, encoded ? decodeURIComponent(encoded) : 'download');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="shared-page">
      <Brand />
      <div className="panel">
        <span className="large-icon">
          <LockKeyhole />
        </span>
        <h1>{t('Shared file')}</h1>
        <p className="muted">This link gives you download access for a limited time.</p>
        <ErrorBox error={error} />
        <form onSubmit={download}>
          <label>
            {t('Optional password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
            />
          </label>
          <button className="primary" disabled={busy}>
            {t('Download file')}
          </button>
        </form>
      </div>
      <Link to="/login">{t('Sign in')}</Link>
    </main>
  );
}
