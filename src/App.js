import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import Dashboard from './Dashboard';
import AdminAudit from './AdminAudit';
import UserProfile from './UserProfile';
import Register from './Register';
import Verified from './Verified';
import ForgotPassword from './ForgotPassword'; // ✅ NEW
import ResetPassword from './ResetPassword';   // ✅ NEW
import './i18n';

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage setTheme={setTheme} theme={theme} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard setTheme={setTheme} theme={theme} />} />
        <Route path="/admin/audit" element={<AdminAudit />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/verified" element={<Verified />} />
        <Route path="/forgot-password" element={<ForgotPassword />} /> {/* ✅ ADDED */}
        <Route path="/reset-password" element={<ResetPassword />} />   {/* ✅ ADDED */}
      </Routes>
    </Router>
  );
}

export default App;
