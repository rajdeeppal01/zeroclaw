import React from 'react';
import { useNavigate } from 'react-router-dom';

const UserManual = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-[#10151c] bg-[#fafaf7] px-8 py-12" style={{ fontFamily: 'var(--font-body)' }}>
      <div className="max-w-[800px] mx-auto bg-white rounded border border-[#c9cdc4] p-10">
        <button 
          onClick={() => navigate('/')} 
          className="text-xs font-semibold tracking-wider text-[#4b5563] hover:text-[#10151c] mb-10 transition-colors uppercase cursor-pointer border-none bg-transparent p-0"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          [ ← RETURN TO INDEX ]
        </button>
        
        <div className="mb-10 pb-6 border-b border-[#c9cdc4]">
          <h1 className="text-4xl font-bold tracking-tight text-[#10151c]" style={{ fontFamily: 'var(--font-display)' }}>
            ZeroClaw Analyst Manual
          </h1>
        </div>
        
        <div className="prose prose-lg max-w-none text-[#4b5563]">
          <p className="text-lg mb-10">
            Standard operating procedures for security analysts monitoring and quarantining endpoint threats via the ZeroClaw Hub.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            The Triage Queue
          </h2>
          <p className="mb-6">
            When an endpoint requests access via the onboarding portal, its <code className="bg-[#fafaf7] border border-[#c9cdc4] px-1 py-0.5 rounded text-sm text-[#10151c]" style={{ fontFamily: 'var(--font-mono)' }}>CSR (Certificate Signing Request)</code> appears in the Triage Queue. As an analyst, you must cryptographically verify the device identity prior to approval. Once approved, the device is issued an mTLS certificate permitting transport-layer access to the protected network zone.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Active Feed & Monitoring
          </h2>
          <p className="mb-6">
            The Active Feed streams real-time telemetry from edge nodes. If anomalous behavior is detected from a specific certificate identity, it is flagged with an elevated <code className="bg-[#fafaf7] border border-[#c9cdc4] px-1 py-0.5 rounded text-sm text-[#b3541e]" style={{ fontFamily: 'var(--font-mono)' }}>ANOMALY_SCORE</code>. Operators may configure automated threshold quarantines or intervene manually.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Manual Quarantine Protocol
          </h2>
          <p className="mb-6">
            If an endpoint is definitively compromised, navigate to <strong>Client Health</strong> and invoke the <strong>Quarantine</strong> function adjacent to the client's identity block. This action instantly appends the certificate serial number to the active CRL and signals the load balancers to sever all established and future TCP handshakes from that device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UserManual;
