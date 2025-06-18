import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

function Verified() {
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success') === 'true';

  return (
    <div style={{
      padding: '2rem',
      textAlign: 'center',
      color: success ? 'green' : 'red'
    }}>
      <h2>{success ? '✅ Email Verified Successfully!' : '❌ Verification Failed'}</h2>
      <p>
        {success
          ? 'Your email has been verified. You can now log in to your account.'
          : 'This verification link is invalid or has already been used.'}
      </p>

      <Link to="/" style={{ marginTop: '1rem', display: 'inline-block' }}>
        Go to Login
      </Link>
    </div>
  );
}

export default Verified;
