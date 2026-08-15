import React, { useState, useEffect } from 'react';
import { Mail, Clock, Shield } from 'lucide-react';
import api from '../api';

const Waitlist = () => {
  const [waitlist, setWaitlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWaitlist = async () => {
      try {
        const response = await api.get('/ui/waitlist');
        setWaitlist(response.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch waitlist:", err);
        setError("Failed to load waitlist data. Make sure you are authenticated.");
      } finally {
        setLoading(false);
      }
    };

    fetchWaitlist();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex items-center gap-2 text-[var(--text-secondary)]">
          <Shield className="animate-spin" size={20} /> Loading waitlist...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Registered Leads</h2>
        <p>Manage users who have requested a technical briefing or access credentials.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 border border-[var(--danger)] bg-[var(--danger-glow)] text-[var(--danger)] rounded">
          {error}
        </div>
      )}

      <div className="glass-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ fontFamily: 'var(--font-body)' }}>
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--text-secondary)] text-sm">
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Registered At</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {waitlist.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <div className="empty-state" style={{ height: '200px' }}>
                      <Mail className="empty-icon" />
                      <p>No one has joined the waitlist yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                waitlist.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-panel-hover)] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Mail size={16} className="text-[var(--text-secondary)]" />
                        <span className="font-medium text-[var(--text-primary)]">{entry.email}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                        ${entry.status === 'pending' ? 'bg-[#fafafa] border border-[#c9cdc4] text-[#4b5563]' : 'bg-[#e6f4ea] border border-[#1b4b43] text-[#1b4b43]'}`}
                      >
                        {entry.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]" style={{ fontFamily: 'var(--font-mono)' }}>
                        <Clock size={14} />
                        {new Date(entry.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <button className="btn btn-primary text-xs py-1.5 px-3">
                        Send Credentials
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Waitlist;
