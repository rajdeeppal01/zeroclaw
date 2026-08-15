import React, { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Activity } from 'lucide-react';
import api from '../api';

function ActiveFeed() {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const response = await api.get('/ui/feed');
      setThreats(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load active feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this threat? It will be removed from the active blocklist.')) {
      return;
    }
    
    try {
      await api.post(`/ui/queue/${id}/revoke`);
      setThreats(threats.filter(t => t.id !== id));
    } catch (err) {
      alert('Failed to revoke threat.');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Active Feed</h2>
          <p>Approved threat indicators currently active in the blocklist network.</p>
        </div>
        <button className="btn" onClick={fetchFeed} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <div style={{ color: 'var(--danger)', marginBottom: '20px' }}>{error}</div>}

      {!loading && threats.length === 0 && (
        <div className="empty-state glass-panel">
          <Activity className="empty-icon" />
          <p>The active feed is empty.</p>
        </div>
      )}

      <div className="threat-grid">
        {threats.map((threat) => (
          <div key={threat.id} className="glass-panel threat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
            <div className="threat-card-header">
              <div>
                <h3 className="threat-title">{threat.stix_data.name}</h3>
                <div className="threat-meta">
                  Approved: {new Date(threat.reviewed_at).toLocaleString()}
                </div>
              </div>
              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                ACTIVE
              </span>
            </div>

            <div className="threat-pattern" style={{ color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.2)', marginBottom: 'auto' }}>
              {threat.stix_data.pattern}
            </div>

            <div className="threat-actions" style={{ marginTop: '20px' }}>
              <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={() => handleRevoke(threat.id)}>
                <Trash2 size={16} /> Revoke Indicator
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActiveFeed;
