import React, { useState } from 'react';
import apiClient from './api/client';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setMessage('');
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/forgot-password', { email });
      setMessage('✅ If this email is registered, you will receive a reset link.');
    } catch (err) {
      console.error(err);
      setError('❌ Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Forgot Password</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        required
        style={{ padding: '0.5rem', width: '250px', marginBottom: '1rem' }}
      />
      <br />
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
      <p style={{ color: message ? 'green' : 'red' }}>{message || error}</p>
    </div>
  );
}

export default ForgotPassword;
