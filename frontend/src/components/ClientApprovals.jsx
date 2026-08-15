import React, { useState, useEffect } from 'react';
import { UserPlus, Check, X, ShieldAlert, Key } from 'lucide-react';
import api from '../api';

const ClientApprovals = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/ui/onboarding');
      setRequests(res.data);
    } catch (e) {
      console.error('Failed to fetch onboarding requests', e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.post(`/ui/onboarding/${id}/approve`);
      fetchRequests();
    } catch (e) {
      console.error('Approval failed', e);
    }
  };

  const handleReject = async (id) => {
    try {
      await api.post(`/ui/onboarding/${id}/reject`);
      fetchRequests();
    } catch (e) {
      console.error('Rejection failed', e);
    }
  };

  if (loading && requests.length === 0) {
    return <div className="p-8 text-[var(--text-secondary)]">Loading requests...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <UserPlus size={32} className="text-blue-500" />
        <h1 className="text-3xl font-bold text-white tracking-tight">Client Approvals</h1>
      </div>
      
      <p className="text-[var(--text-secondary)] mb-8">
        Review pending mTLS certificate signing requests. Approving a request authorizes the CA to issue a trusted identity.
      </p>

      {requests.length === 0 ? (
        <div className="card p-8 text-center text-[var(--text-secondary)] flex flex-col items-center gap-4">
          <ShieldAlert size={48} className="opacity-20" />
          <p>No pending onboarding requests.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map(req => (
            <div key={req.id} className="card p-6 border-l-4 border-blue-500">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl font-semibold text-white">{req.username}</span>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Pending
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-[#111827] p-3 rounded-md border border-[var(--border-color)]">
                      <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold block mb-1">Subject CN</span>
                      <code className="text-sm text-green-400">{req.subject}</code>
                    </div>
                    <div className="bg-[#111827] p-3 rounded-md border border-[var(--border-color)]">
                      <div className="flex items-center gap-2 mb-1">
                        <Key size={14} className="text-[var(--text-secondary)]" />
                        <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Public Key Fingerprint (SHA-256)</span>
                      </div>
                      <code className="text-sm text-blue-400">{req.fingerprint}</code>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 ml-6">
                  <button 
                    onClick={() => handleReject(req.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                  >
                    <X size={16} />
                    Reject
                  </button>
                  <button 
                    onClick={() => handleApprove(req.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-colors"
                  >
                    <Check size={16} />
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientApprovals;
