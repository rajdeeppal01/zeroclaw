import React, { useState, useEffect } from 'react';
import { Download, Clock, CheckCircle, AlertTriangle, Key } from 'lucide-react';

const Onboard = () => {
  const [username, setUsername] = useState('');
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let interval;
    if (token && (status === 'pending' || status === 'approved')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/v1/public/onboard/${token}/status`);
          if (res.ok) {
            const data = await res.json();
            setStatus(data.status);
          }
        } catch (e) {
          console.error(e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [token, status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || username.length < 3) return;
    
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/v1/public/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to submit request');
        return;
      }

      setToken(data.tracking_token);
      setStatus('pending');
    } catch (err) {
      setStatus('error');
      setErrorMsg('Network error. Please try again.');
    }
  };

  const handleDownload = () => {
    if (!token) return;
    window.location.href = `/api/v1/public/onboard/${token}/download`;
    setTimeout(() => {
      setStatus('downloaded');
    }, 2000);
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card animate-fade-in" style={{ maxWidth: '450px' }}>
        
        <div className="login-header">
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', marginBottom: '24px', boxShadow: '0 0 20px rgba(139, 92, 246, 0.2)' }}>
            <Key size={36} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', background: 'linear-gradient(to right, #fff, var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ZeroClaw Beta</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Next-Gen Zero-Trust Endpoint Protection</p>
        </div>

        {(status === 'idle' || status === 'submitting' || status === 'error') && (
          <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <div className="form-group">
              <label>Choose your Identity</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '12px', color: 'var(--text-secondary)' }}>client-</span>
                <input
                  type="text"
                  required
                  pattern="[a-zA-Z0-9_-]{3,32}"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="john-doe"
                  style={{ paddingLeft: '64px' }}
                />
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Only letters, numbers, dashes, and underscores allowed (3-32 chars).
              </p>
            </div>

            {status === 'error' && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px' }}>
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={status === 'submitting'} style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '16px', fontWeight: '600' }}>
              {status === 'submitting' ? 'Generating Identity...' : 'Request Access'}
            </button>
          </form>
        )}

        {status === 'pending' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', marginBottom: '20px' }}>
              <Clock size={32} color="var(--warning)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Awaiting Approval</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
              Your cryptographic signing request is waiting for manual review by a ZeroClaw Analyst. Please keep this page open.
            </p>
          </div>
        )}

        {status === 'approved' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', marginBottom: '20px' }}>
              <Key size={32} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Request Approved!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
              Your request was approved! The ZeroClaw Root of Trust is currently signing your mTLS certificate in a secure enclave...
            </p>
          </div>
        )}

        {status === 'signed' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', marginBottom: '20px' }}>
              <CheckCircle size={32} color="var(--success)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Identity Minted</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Your secure mTLS identity is ready. Download your endpoint agent now.
            </p>
            <button onClick={handleDownload} className="btn" style={{ width: '100%', padding: '14px', justifyContent: 'center', background: 'var(--success)', borderColor: 'var(--success)', color: 'white', fontWeight: '600' }}>
              <Download size={18} /> Download Agent ZIP
            </button>
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--warning)', fontWeight: '500' }}>
              ⚠️ SECURITY WARNING: This download link is single-use. Your private key will be destroyed upon download.
            </p>
          </div>
        )}

        {status === 'downloaded' && (
          <div style={{ padding: '20px 0' }}>
            <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', marginBottom: '20px' }}>
              <CheckCircle size={32} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Welcome to ZeroClaw</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
              Your agent has been downloaded. Extract the ZIP file and run the PowerShell instructions inside to lock down your machine.
            </p>
          </div>
        )}

        <p style={{ marginTop: '32px', fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.5, borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
          Powered by ZeroClaw Threat Intelligence
        </p>
      </div>
    </div>
  );
};

export default Onboard;
