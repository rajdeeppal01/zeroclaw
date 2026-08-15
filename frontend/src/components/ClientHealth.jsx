import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, Activity, RotateCcw } from 'lucide-react';
import api from '../api';

function ClientHealth() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = async () => {
    try {
      const response = await api.get('/ui/clients');
      setClients(response.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('username');
        window.location.reload();
      } else {
        setError('Failed to load client health data.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    const interval = setInterval(fetchClients, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleUnquarantine = async (id) => {
    try {
      await api.post(`/ui/clients/${id}/unquarantine`);
      fetchClients();
    } catch (err) {
      alert('Failed to unquarantine client.');
    }
  };

  if (loading) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>Loading client data...</div>;
  if (error) return <div style={{ padding: '40px', color: 'var(--danger)' }}>{error}</div>;

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Client Health</h2>
          <p>Monitor the health and submission rates of your connected agents. Agents that spam the network are automatically quarantined.</p>
        </div>
        <button onClick={fetchClients} className="btn">
          <RotateCcw size={16} /> Refresh
        </button>
      </div>

      <div className="threat-grid">
        {clients.length === 0 ? (
          <div className="empty-state glass-panel">
            <div className="empty-icon"><Activity size={48} /></div>
            <p>No clients connected yet.</p>
          </div>
        ) : (
          clients.map(client => (
            <div key={client.id} className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: client.is_quarantined ? 'var(--danger)' : 'var(--border)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', background: client.is_quarantined ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: client.is_quarantined ? 'var(--danger)' : 'var(--success)' }}>
                  {client.is_quarantined ? <ShieldAlert size={24} /> : <ShieldCheck size={24} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{client.cn}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={14} />
                      {client.hourly_submissions} submissions / hr
                    </span>
                    <span>
                      Reputation: {client.reputation}/100
                    </span>
                  </div>
                </div>
              </div>

              {client.is_quarantined ? (
                <button 
                  onClick={() => handleUnquarantine(client.id)}
                  className="btn btn-danger"
                >
                  Un-Quarantine
                </button>
              ) : (
                <span style={{ padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '20px', fontSize: '12px', fontWeight: '600', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  Healthy
                </span>
              )}

            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ClientHealth;
