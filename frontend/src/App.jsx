import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, LogOut, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from './api';
import './index.css';

// Components
import Login from './components/Login';
import TriageQueue from './components/TriageQueue';
import ActiveFeed from './components/ActiveFeed';

function Sidebar({ username, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Shield size={28} color="#3b82f6" />
        <h1>ZeroClaw</h1>
      </div>
      
      <div className="nav-links">
        <button 
          className={`nav-link ${location.pathname === '/' || location.pathname === '/queue' ? 'active' : ''}`}
          onClick={() => handleNav('/queue')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <Activity size={18} />
          Triage Queue
        </button>
        <button 
          className={`nav-link ${location.pathname === '/feed' ? 'active' : ''}`}
          onClick={() => handleNav('/feed')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <CheckCircle size={18} />
          Active Feed
        </button>
        <button 
          className={`nav-link ${location.pathname === '/clients' ? 'active' : ''}`}
          onClick={() => handleNav('/clients')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <Users size={18} />
          Client Health
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="status-dot"></div>
          {username}
        </div>
        <button onClick={onLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
}

function MainLayout({ children, username, onLogout }) {
  return (
    <div className="app-container">
      <Sidebar username={username} onLogout={onLogout} />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');

  // Very basic auth check on mount - rely on actual API calls failing with 401
  // In a real app we'd verify the token on mount.
  useEffect(() => {
    const savedUser = localStorage.getItem('username');
    if (savedUser) {
      setIsAuthenticated(true);
      setUsername(savedUser);
    }
  }, []);

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setUsername(user);
    localStorage.setItem('username', user);
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthenticated(false);
      setUsername('');
      localStorage.removeItem('username');
    }
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <MainLayout username={username} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to="/queue" replace />} />
          <Route path="/queue" element={<TriageQueue />} />
          <Route path="/feed" element={<ActiveFeed />} />
          <Route path="/clients" element={<div className="page-header"><h2>Client Health</h2><p>Coming Soon</p></div>} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
