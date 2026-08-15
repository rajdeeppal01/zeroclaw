import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, X, ShieldAlert } from 'lucide-react';
import api from '../api';

function TriageQueue() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const response = await api.get('/ui/queue');
      setThreats(response.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('username');
        window.location.reload(); // Force re-login
      } else {
        setError('Failed to load triage queue.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (id, action) => {
    try {
      await api.post(`/ui/queue/${id}/${action}`);
      setThreats(threats.filter(t => t.id !== id));
    } catch (err) {
      alert(`Failed to ${action} threat. It may have already been processed.`);
      fetchQueue();
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Triage Queue</h2>
          <p>Pending threat reports from the agent network.</p>
        </div>
        <button className="btn" onClick={fetchQueue} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '20px' }}>{error}</div>}

      {!loading && threats.length === 0 && (
        <div className="empty-state glass-panel">
          <ShieldAlert className="empty-icon" />
          <p>Queue is empty. You are all caught up!</p>
        </div>
      )}

      <div className="threat-grid">
        {threats.map((threat) => (
          <div key={threat.id} className="glass-panel threat-card">
            <div className="threat-card-header">
              <div>
                <h3 className="threat-title">{threat.stix_data.name}</h3>
                <div className="threat-meta">
                  Agent: {threat.client?.cn || 'Unknown'} • {new Date(threat.created_at).toLocaleString()}
                </div>
              </div>
              {threat.client?.is_quarantined && (
                <span style={{ background: 'var(--danger-glow)', color: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                  QUARANTINED
                </span>
              )}
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
              {threat.stix_data.description || 'No description provided.'}
            </p>

            <div className="threat-pattern">
              {threat.stix_data.pattern}
            </div>

            <div className="threat-actions">
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleAction(threat.id, 'approve')}>
                <Check size={16} /> Approve
              </button>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleAction(threat.id, 'reject')}>
                <X size={16} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TriageQueue;
