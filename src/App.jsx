import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  Files,
  Folder,
  History,
  LogOut,
  Moon,
  Settings as SettingsIcon,
  ShieldCheck,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { api, formatBytes } from './api';
import { Brand } from './components';
import { useVault } from './context';
import { AuthPage, SharedFile } from './AuthPages';
import Dashboard from './Dashboard';
import Settings from './Settings';
import Activity from './Activity';
import { DEMO_MODE } from './demo/config';
import DemoBanner from './demo/DemoBanner';
import DemoSettings from './demo/DemoSettings';

function Shell() {
  const { user, loading, t, theme, setTheme, language, setLanguage, logout, refreshUser, setNotice } =
    useVault();
  const [folders, setFolders] = useState([]),
    [storage, setStorage] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (!user?.verified) return;
    let active = true;
    const load = () =>
      Promise.all([api('/folders'), api('/storage')])
        .then(([f, s]) => {
          if (active) {
            setFolders(f);
            setStorage(s);
          }
        })
        .catch(() => {});
    load();
    window.addEventListener('vault:files-changed', load);
    return () => {
      active = false;
      window.removeEventListener('vault:files-changed', load);
    };
  }, [user?.id, user?.verified, location.pathname]);
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <p>Opening your vault…</p>
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  const links = [
    ['/files', 'All files', Files],
    ['/trash', 'Trash', Trash2],
    ['/activity', 'Activity', History],
    ['/settings', 'Settings', SettingsIcon],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/files" className="brand-link">
          <Brand />
        </Link>
        <div className="workspace-label">{DEMO_MODE ? 'DEMO WORKSPACE' : 'PERSONAL WORKSPACE'}</div>
        <nav>
          {links.map(([href, label, Icon]) => (
            <NavLink to={href} key={href}>
              <Icon size={18} />
              {t(label)}
            </NavLink>
          ))}
          {user.role === 'admin' && (
            <NavLink to="/admin">
              <ShieldCheck size={18} />
              {t('Administration')}
            </NavLink>
          )}
        </nav>
        <div className="folder-heading">
          {t('Folders')}
          <span>{folders.length}</span>
        </div>
        <div className="folder-list">
          {folders.map((f) => (
            <div className="folder-nav" key={f.id}>
              <Link to={`/files?folder=${f.id}`}>
                <Folder size={16} />
                <span>{f.name}</span>
              </Link>
              <button
                className="icon-button"
                aria-label={`Delete folder ${f.name}`}
                onClick={async () => {
                  if (!window.confirm('Remove this folder? Its files will remain in All files.')) return;
                  try {
                    await api(`/folders/${f.id}`, { method: 'DELETE' });
                    window.dispatchEvent(new Event('vault:files-changed'));
                    setNotice('Folder removed.');
                    if (new URLSearchParams(location.search).get('folder') === String(f.id))
                      navigate('/files');
                  } catch (e) {
                    setNotice(e.message);
                  }
                }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="storage-card">
          <div>
            <ShieldCheck size={17} />
            <strong>{t('Storage')}</strong>
          </div>
          <progress value={storage?.used_bytes || 0} max={storage?.limit_bytes || 104857600} />
          <p>
            {formatBytes(storage?.used_bytes)}{' '}
            <span>of {formatBytes(storage?.limit_bytes || 104857600)}</span>
          </p>
          <small>Includes trash and file versions</small>
        </div>
        <div className="sidebar-profile">
          <span className="avatar-small">{(user.full_name || user.email)[0].toUpperCase()}</span>
          <div>
            <strong>{user.full_name || 'My account'}</strong>
            <small>{user.email}</small>
          </div>
          {!DEMO_MODE && (
            <button
              className="icon-button"
              aria-label={t('Sign out')}
              onClick={() => logout().catch((e) => setNotice(e.message))}
            >
              <LogOut size={17} />
            </button>
          )}
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <span>
            <span className="status-dot" /> {DEMO_MODE ? 'Explore Secure Vault' : 'Personal vault'}
          </span>
          <div>
            {!DEMO_MODE && (
              <button
                className="icon-button mobile-signout"
                aria-label={t('Sign out')}
                onClick={() => logout().catch((e) => setNotice(e.message))}
              >
                <LogOut size={18} />
              </button>
            )}
            <select aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="en">English</option>
              <option value="ro">Română</option>
            </select>
            <button
              className="icon-button"
              aria-label={t(theme === 'light' ? 'Dark theme' : 'Light theme')}
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>
          </div>
        </header>
        <main className="content">
          {!user.verified && (
            <div className="verification-banner">
              <div>
                <strong>{t('Verify your email to start using your vault.')}</strong>
                <p>Open your verification email, then refresh your account.</p>
              </div>
              <button
                onClick={() =>
                  api('/auth/resend-verification', { method: 'POST' })
                    .then((r) => setNotice(r.message))
                    .catch((e) => setNotice(e.message))
                }
              >
                {t('Resend verification')}
              </button>
              <button onClick={() => refreshUser().catch((e) => setNotice(e.message))}>{t('Refresh')}</button>
            </div>
          )}
          <Outlet />
        </main>
        <footer className="footer">
          Secure Vault <span>Your files. Your space.</span>
        </footer>
      </div>
    </div>
  );
}

function AdminRoute() {
  const { user } = useVault();
  return user?.role === 'admin' ? <Activity admin /> : <Navigate to="/files" replace />;
}

export default function App() {
  const { notice, setNotice } = useVault();
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice, setNotice]);
  return (
    <>
      {DEMO_MODE && <DemoBanner />}
      <Routes>
        <Route path="/login" element={DEMO_MODE ? <Navigate to="/files" replace /> : <AuthPage />} />
        <Route
          path="/register"
          element={DEMO_MODE ? <Navigate to="/files" replace /> : <AuthPage mode="register" />}
        />
        <Route
          path="/forgot-password"
          element={DEMO_MODE ? <Navigate to="/files" replace /> : <AuthPage mode="forgot" />}
        />
        <Route
          path="/reset-password"
          element={DEMO_MODE ? <Navigate to="/files" replace /> : <AuthPage mode="reset" />}
        />
        <Route
          path="/verify"
          element={DEMO_MODE ? <Navigate to="/files" replace /> : <AuthPage mode="verify" />}
        />
        <Route path="/share/:token" element={<SharedFile />} />
        <Route element={<Shell />}>
          <Route path="/files" element={<Dashboard />} />
          <Route path="/trash" element={<Dashboard trash />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/settings" element={DEMO_MODE ? <DemoSettings /> : <Settings />} />
          <Route path="/admin" element={<AdminRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/files" replace />} />
      </Routes>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button className="icon-button" aria-label="Dismiss notification" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
