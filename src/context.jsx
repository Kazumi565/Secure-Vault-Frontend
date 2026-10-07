import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setCsrf } from './api';

const Context = createContext(null);
const ro = {
  'Your files': 'Fișierele tale',
  'All files': 'Toate fișierele',
  Trash: 'Coș',
  Activity: 'Activitate',
  Settings: 'Setări',
  Administration: 'Administrare',
  Folders: 'Dosare',
  'New folder': 'Dosar nou',
  Storage: 'Spațiu de stocare',
  'Sign out': 'Deconectare',
  'Upload files': 'Încarcă fișiere',
  'Search files': 'Caută fișiere',
  Name: 'Nume',
  Size: 'Dimensiune',
  Updated: 'Actualizat',
  Actions: 'Acțiuni',
  Date: 'Dată',
  Download: 'Descarcă',
  Delete: 'Șterge',
  Restore: 'Restabilește',
  'Delete permanently': 'Șterge definitiv',
  Save: 'Salvează',
  Cancel: 'Anulează',
  Close: 'Închide',
  Create: 'Creează',
  Edit: 'Editează',
  Details: 'Detalii',
  Versions: 'Versiuni',
  Share: 'Distribuie',
  Tags: 'Etichete',
  Folder: 'Dosar',
  'No files here yet': 'Nu există fișiere aici',
  'Keep your files organized, protected, and easy to find.':
    'Păstrează fișierele organizate, protejate și ușor de găsit.',
  'Drop files here or choose from your computer': 'Trage fișiere aici sau alege de pe calculator',
  'Choose files': 'Alege fișiere',
  Retry: 'Reîncearcă',
  Done: 'Finalizat',
  Uploading: 'Se încarcă',
  Cancelled: 'Anulat',
  Previous: 'Înapoi',
  Next: 'Înainte',
  'No activity yet': 'Nu există activitate',
  'Export CSV': 'Exportă CSV',
  Profile: 'Profil',
  'Full name': 'Nume complet',
  Email: 'Email',
  Password: 'Parolă',
  'New password': 'Parolă nouă',
  'Current password': 'Parola actuală',
  'Change password': 'Schimbă parola',
  'Active sessions': 'Sesiuni active',
  'This session': 'Sesiunea curentă',
  Revoke: 'Revocă',
  'Two-factor authentication': 'Autentificare în doi pași',
  Enable: 'Activează',
  Disable: 'Dezactivează',
  'Authentication code': 'Cod de autentificare',
  'Delete account': 'Șterge contul',
  'Choose avatar': 'Alege fotografia',
  'Light theme': 'Temă luminoasă',
  'Dark theme': 'Temă întunecată',
  'Sign in': 'Conectare',
  'Create account': 'Creează cont',
  'Forgot password?': 'Ai uitat parola?',
  'Welcome back': 'Bine ai revenit',
  'A home for your files.': 'Un loc pentru fișierele tale.',
  'Organize what matters. Keep control of who can access it.':
    'Organizează ce contează. Controlează cine are acces.',
  'Send reset link': 'Trimite linkul',
  'Reset password': 'Resetează parola',
  'Back to sign in': 'Înapoi la conectare',
  'Verify email': 'Verifică emailul',
  'Resend verification': 'Retrimite verificarea',
  'Verify your email to start using your vault.': 'Verifică emailul pentru a începe să folosești seiful.',
  Ascending: 'Crescător',
  Descending: 'Descrescător',
  'Filter by tag': 'Filtrează după etichetă',
  'Current version': 'Versiunea curentă',
  'Add version': 'Adaugă versiune',
  'Create link': 'Creează link',
  'Expires in hours': 'Expiră în ore',
  'Download limit': 'Limită descărcări',
  'Optional password': 'Parolă opțională',
  'Copy link': 'Copiază linkul',
  'Shared file': 'Fișier distribuit',
  'Download file': 'Descarcă fișierul',
  Users: 'Utilizatori',
  Files: 'Fișiere',
  Role: 'Rol',
  Owner: 'Proprietar',
  Refresh: 'Reîncarcă',
  Selected: 'Selectate',
  'Move to trash': 'Mută în coș',
  'No results': 'Niciun rezultat',
  Preview: 'Previzualizare',
};

export function Provider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(localStorage.getItem('vault-language') || 'en');
  const [theme, setTheme] = useState(localStorage.getItem('vault-theme') || 'light');
  const [notice, setNotice] = useState('');
  const accept = useCallback((data) => {
    setUser(data.user);
    setCsrf(data.csrf_token);
  }, []);
  const refreshUser = useCallback(async () => {
    const data = await api('/auth/session');
    accept(data);
    return data.user;
  }, [accept]);
  useEffect(() => {
    // Clear the retired bearer-token storage on upgrade.
    localStorage.removeItem('token');
    refreshUser()
      .catch(() => {})
      .finally(() => setLoading(false));
    const expired = () => {
      setUser(null);
      setCsrf('');
      setNotice('Your session expired. Please sign in again.');
    };
    window.addEventListener('vault:expired', expired);
    return () => window.removeEventListener('vault:expired', expired);
  }, [refreshUser]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('vault-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('vault-language', language);
  }, [language]);
  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setCsrf('');
  };
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        loading,
        accept,
        refreshUser,
        logout,
        language,
        setLanguage,
        theme,
        setTheme,
        t: (text) => (language === 'ro' ? ro[text] || text : text),
        notice,
        setNotice,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useVault = () => useContext(Context);
