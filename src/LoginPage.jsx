import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from './api/client';
import tokenService from './api/tokenService';
import { DEMO_EMAIL, DEMO_PASSWORD, USE_HTTP_ONLY_COOKIE } from './config';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post(
        '/login',
        new URLSearchParams({
          username: email,
          password
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      if (response?.requires_verification) {
        navigate('/verified?pending=true');
        return;
      }

      if (!USE_HTTP_ONLY_COOKIE) {
        if (!response?.access_token) {
          throw new Error(t('Missing token in response.'));
        }
        tokenService.setToken(response.access_token);
      }

      navigate('/dashboard');
    } catch (err) {
      const detail = err?.data?.detail || err.message;
      setError(detail || t('Invalid credentials or server error.'));
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ float: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select onChange={(e) => i18n.changeLanguage(e.target.value)} defaultValue={i18n.language}>
            <option value="en">EN</option>
            <option value="ro">RO</option>
          </select>
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      <h2>{t('Login to Secure File Vault')}</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email-input">{t('Email')}:</label>{' '}
          <input
            id="email-input"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password-input">{t('Password')}:</label>{' '}
          <input
            id="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? t('Loading...') : t('Login')}
        </button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>

      <button onClick={fillDemoAccount} style={{ marginTop: '1rem' }}>
        {t('Use demo account')}
      </button>
      <p style={{ fontSize: '0.9rem' }}>
        <a href="https://github.com/your-org/Secure-Vault-Frontend#demo--test-account" target="_blank" rel="noreferrer">
          {t('Read the README for demo credentials and security notes.')}
        </a>
      </p>

      <p style={{ marginTop: '1rem' }}>
        <Link to="/forgot-password">{t('Forgot your password?')}</Link>
      </p>

      <p style={{ marginTop: '1rem' }}>
        {t("Don't have an account?")}{' '}
        <Link to="/register">{t('Register here')}</Link>
      </p>
    </div>
  );
}

export default LoginPage;
