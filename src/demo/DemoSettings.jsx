import { useEffect, useState } from 'react';
import { Camera, Monitor, ShieldCheck, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { ErrorBox } from '../components';
import { useVault } from '../context';

export default function DemoSettings() {
  const { user, refreshUser, setNotice } = useVault();
  const [name, setName] = useState(user.full_name);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');
  const [factor, setFactor] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/auth/sessions')
      .then(setSessions)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EXPLORE ACCOUNT CONTROLS</div>
          <h1>Settings</h1>
          <p>A preview of the full app’s profile and security controls.</p>
        </div>
      </div>
      <ErrorBox error={error} />
      <div className="settings-grid">
        <section className="panel">
          <div className="section-title">
            <Camera size={20} />
            <h2>Profile</h2>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              setBusy(true);
              try {
                await api('/auth/profile', { method: 'PATCH', body: { full_name: name } });
                await refreshUser();
                setNotice('Demo profile saved for this tab.');
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
            </label>
            <label>
              Email
              <input value={user.email} readOnly />
            </label>
            <button className="primary" disabled={busy}>
              Save
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="section-title">
            <ShieldCheck size={20} />
            <h2>Two-factor authentication</h2>
          </div>
          <span className="badge">Visual preview only</span>
          <p className="muted">
            The full app supports authenticator codes and single-use recovery codes. This switch only previews
            the enabled state.
          </p>
          <button role="switch" aria-checked={factor} onClick={() => setFactor(!factor)}>
            {factor ? 'Preview: enabled' : 'Preview: disabled'}
          </button>
          <p className="muted">No authenticator is connected and no account is protected in this demo.</p>
        </section>
        <section className="panel">
          <div className="section-title">
            <Monitor size={20} />
            <h2>Active sessions</h2>
          </div>
          <p className="muted">Sample sessions. Try revoking the mobile session.</p>
          <div className="session-list">
            {sessions.map((session) => (
              <div className="session-row" key={session.id}>
                <div>
                  <strong>{session.current ? 'This session' : 'Browser session'}</strong>
                  <p>{session.agent}</p>
                </div>
                {session.current ? (
                  <span className="badge">Demo</span>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        await api(`/auth/sessions/${session.id}`, { method: 'DELETE' });
                        setSessions(await api('/auth/sessions'));
                        setNotice('Sample session revoked.');
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="panel demo-security">
          <div className="section-title">
            <KeyRound size={20} />
            <h2>Security in the full app</h2>
          </div>
          <p>The running backend provides:</p>
          <ul>
            <li>AES-256-GCM file encryption with wrapped per-version keys.</li>
            <li>Argon2 password hashes and revocable cookie sessions.</li>
            <li>Email verification, CSRF checks, and two-factor authentication.</li>
            <li>Expiring share links with download limits and optional passwords.</li>
          </ul>
          <p>
            This static showcase does not run those protections. Password entry and account deletion are
            omitted.
          </p>
          <a
            href="https://github.com/Kazumi565/Secure-Vault/blob/main/docs/SECURITY.md"
            target="_blank"
            rel="noreferrer"
          >
            Read the security model ↗
          </a>
        </section>
      </div>
      <p className="muted">
        Ready to explore more? <Link to="/files">Return to your files</Link>.
      </p>
    </>
  );
}
