import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function Register() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [darkMode, setDarkMode]   = useState(
    () => localStorage.getItem('theme') === 'dark'
  );

  const navigate      = useNavigate();
  const { t, i18n }   = useTranslation();

  /* ——— theme sync ——— */
  useEffect(() => {
    document.body.className = darkMode ? 'dark' : 'light';
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  /* ——— register ——— */
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('Invalid email format'));
      return;
    }
    if (password !== confirm) {
      setError(t('Passwords do not match.'));
      return;
    }

    try {
      await axios.post('http://127.0.0.1:8000/register', {
        email,
        password,
        full_name: ''
      });
      alert(t('Account created! You can now log in.'));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || t('Registration failed.'));
    }
  };

  /* ——— JSX ——— */
  return (
    <div style={{ padding: '2rem' }}>
      {/* language / theme switcher */}
      <div style={{ float: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            defaultValue={i18n.language}
            onChange={e => i18n.changeLanguage(e.target.value)}
          >
            <option value="en">EN</option>
            <option value="ro">RO</option>
          </select>
          <button onClick={() => setDarkMode(d => !d)}>
            {darkMode ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      <h2>{t('Register for Secure File Vault')}</h2>

      <form onSubmit={handleRegister}>
        <div>
          <label>{t('Email')}:</label>{' '}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>{t('Password')}:</label>{' '}
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          {/* key now matches locale file */}
          <label>{t('Confirm Password:')}</label>{' '}
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
        </div>

        <button type="submit">{t('Register')}</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>

      <p style={{ marginTop: '1rem' }}>
        {t('Already have an account?')}{' '}
        <Link to="/">{t('Login here')}</Link>
      </p>
    </div>
  );
}

export default Register;
