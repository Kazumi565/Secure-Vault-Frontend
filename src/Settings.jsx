import { useEffect, useState } from 'react';
import { Camera, KeyRound, Monitor, ShieldCheck } from 'lucide-react';
import { api } from './api';
import { ErrorBox, Modal } from './components';
import { useVault } from './context';

export default function Settings() {
  const { user, refreshUser, setUser, t, setNotice } = useVault();
  const [name, setName] = useState(user.full_name),
    [password, setPassword] = useState(''),
    [newPassword, setNewPassword] = useState(''),
    [code, setCode] = useState('');
  const [sessions, setSessions] = useState([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [setup, setSetup] = useState(null),
    [recovery, setRecovery] = useState([]),
    [deleting, setDeleting] = useState(false),
    [avatarVersion, setAvatarVersion] = useState(0);
  const loadSessions = () => api('/auth/sessions').then(setSessions);
  useEffect(() => {
    loadSessions().catch((e) => setError(e.message));
  }, []);
  const run = async (task) => {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const credentials = { password, code };
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR ACCOUNT</div>
          <h1>{t('Settings')}</h1>
          <p>Manage your profile, sign-ins, and account security.</p>
        </div>
      </div>
      <ErrorBox error={error} />
      <div className="settings-grid">
        <section className="panel">
          <div className="section-title">
            <Camera size={20} />
            <h2>{t('Profile')}</h2>
          </div>
          <div className="profile-avatar">
            {user.has_avatar ? (
              <img src={`/api/auth/avatar?v=${avatarVersion}`} alt="Your avatar" />
            ) : (
              <span>{(user.full_name || user.email)[0].toUpperCase()}</span>
            )}
            <label className="button file-input-button">
              {t('Choose avatar')}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file)
                    run(async () => {
                      const body = new FormData();
                      body.append('file', file);
                      await api('/auth/avatar', { method: 'POST', body });
                      await refreshUser();
                      setAvatarVersion((v) => v + 1);
                      setNotice('Avatar updated.');
                    });
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api('/auth/profile', { method: 'PATCH', body: { full_name: name } });
                await refreshUser();
                setNotice('Profile saved.');
              });
            }}
          >
            <label>
              {t('Full name')}
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <label>
              {t('Email')}
              <input readOnly value={user.email} />
            </label>
            <button className="primary" disabled={busy}>
              {t('Save')}
            </button>
          </form>
        </section>
        <section className="panel">
          <div className="section-title">
            <KeyRound size={20} />
            <h2>{t('Change password')}</h2>
          </div>
          <p className="muted">Changing your password signs out every active session.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                await api('/auth/password', {
                  method: 'POST',
                  body: { ...credentials, new_password: newPassword },
                });
                setUser(null);
                setNotice('Password changed. Sign in again.');
              });
            }}
          >
            <label>
              {t('Current password')}
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            <label>
              {t('New password')}
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
              />
            </label>
            {user.two_factor && (
              <label>
                {t('Authentication code')}
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="one-time-code"
                  maxLength={32}
                />
              </label>
            )}
            <button disabled={busy}>{t('Change password')}</button>
          </form>
        </section>
        <section className="panel">
          <div className="section-title">
            <ShieldCheck size={20} />
            <h2>{t('Two-factor authentication')}</h2>
          </div>
          <p className="muted">
            {user.two_factor
              ? 'Enabled. Your authenticator adds a second check when you sign in.'
              : 'Add an authenticator app and save recovery codes for emergencies.'}
          </p>
          <label>
            {t('Current password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              maxLength={128}
            />
          </label>
          {user.two_factor ? (
            <>
              <label>
                {t('Authentication code')}
                <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={32} />
              </label>
              <button
                disabled={busy || !password || !code}
                onClick={() =>
                  run(async () => {
                    await api('/auth/2fa/disable', { method: 'POST', body: credentials });
                    setUser(null);
                    setNotice('Two-factor authentication disabled. Sign in again.');
                  })
                }
              >
                {t('Disable')}
              </button>
            </>
          ) : (
            <button
              disabled={busy || !password}
              onClick={() =>
                run(async () =>
                  setSetup(await api('/auth/2fa/setup', { method: 'POST', body: { password } })),
                )
              }
            >
              {t('Enable')}
            </button>
          )}
          {setup && (
            <div className="factor-setup">
              <p>In your authenticator, choose “Enter a setup key”, select time-based codes, and enter:</p>
              <code className="secret-key">{setup.secret}</code>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  run(async () => {
                    const result = await api('/auth/2fa/enable', { method: 'POST', body: { code } });
                    setRecovery(result.recovery_codes);
                    setSetup(null);
                    setCode('');
                    await refreshUser();
                    await loadSessions();
                  });
                }}
              >
                <label>
                  {t('Authentication code')}
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    required
                    maxLength={6}
                  />
                </label>
                <button className="primary" disabled={busy}>
                  {t('Enable')}
                </button>
              </form>
            </div>
          )}
          {!!recovery.length && (
            <div className="recovery-codes">
              <strong>Save these recovery codes now</strong>
              <p>Each code works once. They will not be shown again.</p>
              <pre>{recovery.join('\n')}</pre>
              <button onClick={() => setRecovery([])}>I saved my codes</button>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="section-title">
            <Monitor size={20} />
            <h2>{t('Active sessions')}</h2>
          </div>
          <div className="session-list">
            {sessions.map((s) => (
              <div className="session-row" key={s.id}>
                <div>
                  <strong>{s.current ? t('This session') : 'Browser session'}</strong>
                  <p className="agent-string">{s.agent}</p>
                  <small>{new Date(s.created_at).toLocaleString()}</small>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await api(`/auth/sessions/${s.id}`, { method: 'DELETE' });
                      if (s.current) setUser(null);
                      else await loadSessions();
                    })
                  }
                >
                  {t('Revoke')}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel danger-panel">
        <div>
          <h2>{t('Delete account')}</h2>
          <p>
            Delete your account, file metadata, sessions, and sharing links. Stored objects are queued for
            removal.
          </p>
        </div>
        <button className="danger" onClick={() => setDeleting(true)}>
          {t('Delete account')}
        </button>
      </section>
      {deleting && (
        <Modal title={t('Delete account')} onClose={() => setDeleting(false)}>
          <p>This permanently deletes your account and all file versions. This cannot be undone.</p>
          <label>
            {t('Current password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
            />
          </label>
          {user.two_factor && (
            <label>
              {t('Authentication code')}
              <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={32} />
            </label>
          )}
          <ErrorBox error={error} />
          <button
            className="danger"
            disabled={busy || !password}
            onClick={() =>
              run(async () => {
                await api('/auth/account', { method: 'DELETE', body: credentials });
                setUser(null);
                setNotice('Account deleted.');
              })
            }
          >
            {t('Delete account')}
          </button>
        </Modal>
      )}
    </>
  );
}
