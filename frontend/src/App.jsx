import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, LogOut, CheckCircle, XCircle, AlertTriangle, UserPlus, Mail } from 'lucide-react';
import api from './api';
import './index.css';

// Components
import Login from './components/Login';
import TriageQueue from './components/TriageQueue';
import ActiveFeed from './components/ActiveFeed';
import ClientHealth from './components/ClientHealth';
import ClientApprovals from './components/ClientApprovals';
import Waitlist from './components/Waitlist';
import Onboard from './components/Onboard';
import Landing from './components/Landing';
import Guide from './components/Guide';
import UserManual from './components/UserManual';
import Policies from './components/Policies';

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
          className={`nav-link ${location.pathname === '/dashboard' || location.pathname === '/dashboard/queue' ? 'active' : ''}`}
          onClick={() => handleNav('/dashboard/queue')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <Activity size={18} />
          Triage Queue
        </button>
        <button 
          className={`nav-link ${location.pathname === '/dashboard/feed' ? 'active' : ''}`}
          onClick={() => handleNav('/dashboard/feed')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <CheckCircle size={18} />
          Active Feed
        </button>
        <button 
          className={`nav-link ${location.pathname === '/dashboard/clients' ? 'active' : ''}`}
          onClick={() => handleNav('/dashboard/clients')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <Users size={18} />
          Client Health
        </button>
        <button 
          className={`nav-link ${location.pathname === '/dashboard/approvals' ? 'active' : ''}`}
          onClick={() => handleNav('/dashboard/approvals')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <UserPlus size={18} />
          Client Approvals
        </button>
        <button 
          className={`nav-link ${location.pathname === '/dashboard/waitlist' ? 'active' : ''}`}
          onClick={() => handleNav('/dashboard/waitlist')}
          style={{ background: 'transparent', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
        >
          <Mail size={18} />
          Waitlist
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

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboard" element={<Onboard />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/manual" element={<UserManual />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />
        } />
        
        {/* Protected Dashboard Routes */}
        <Route path="/dashboard/*" element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <MainLayout username={username} onLogout={handleLogout}>
              <Routes>
                <Route path="/" element={<Navigate to="queue" replace />} />
                <Route path="queue" element={<TriageQueue />} />
                <Route path="feed" element={<ActiveFeed />} />
                <Route path="clients" element={<ClientHealth />} />
                <Route path="approvals" element={<ClientApprovals />} />
                <Route path="waitlist" element={<Waitlist />} />
              </Routes>
            </MainLayout>
          )
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
