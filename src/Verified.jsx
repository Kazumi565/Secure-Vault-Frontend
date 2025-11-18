import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from './api/client';

function Verified() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('success') === 'true' ? 'success' : 'idle');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');
  const pending = searchParams.get('pending') === 'true';

  useEffect(() => {
    if (!token) return;
    let active = true;
    setStatus('loading');
    apiClient
      .post('/verify-email', { token })
      .then(() => {
        if (!active) return;
        setStatus('success');
        setMessage('Your email has been verified. You can now log in to your account.');
      })
      .catch((error) => {
        if (!active) return;
        setStatus('error');
        setMessage(error?.data?.detail || 'This verification link is invalid or has already been used.');
      });
    return () => {
      active = false;
    };
  }, [token]);

  let title = '✅ Email Verified Successfully!';
  let body = message || 'Your email has been verified. You can now log in to your account.';

  if (pending) {
    title = '📧 Verification Pending';
    body = 'Check your inbox for the verification email. Follow the link there to activate your account.';
  } else if (status === 'loading') {
    title = 'Verifying...';
    body = 'Please wait while we confirm your email.';
  } else if (status === 'error') {
    title = '❌ Verification Failed';
    body = message || 'This verification link is invalid or has already been used.';
  }

  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        color: status === 'error' ? 'red' : 'green'
      }}
    >
      <h2>{title}</h2>
      <p>{body}</p>

      <Link to="/" style={{ marginTop: '1rem', display: 'inline-block' }}>
        Go to Login
      </Link>
    </div>
  );
}

export default Verified;
