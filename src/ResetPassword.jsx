import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from './api/client';

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const token = new URLSearchParams(window.location.search).get('token');
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError('');

    if (!password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await apiClient.post('/reset-password', {
        token,
        new_password: password
      });

      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err) {
      if (err?.data?.detail === 'New password must be different from the old one') {
        setError('New password must be different from your previous one.');
      } else {
        setError('❌ Failed to reset password. The token may be invalid or expired.');
      }
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Reset Password</h2>

      {!success ? (
        <>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          /><br /><br />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          /><br /><br />
          <button onClick={handleSubmit}>Reset Password</button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </>
      ) : (
        <>
          <p style={{ color: 'green' }}>✅ Password reset successfully!</p>
          <p>You’ll be redirected to login shortly...</p>
          <button onClick={() => navigate('/')}>Go to Login Now</button>
        </>
      )}
    </div>
  );
}

export default ResetPassword;
