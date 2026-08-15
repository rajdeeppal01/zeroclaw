import React from 'react';
import { useNavigate } from 'react-router-dom';

const Policies = () => {
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
            Security Policies & Architecture
          </h1>
        </div>
        
        <div className="prose prose-lg max-w-none text-[#4b5563]">
          <p className="text-lg mb-10">
            Authoritative documentation detailing ZeroClaw's cryptographic security model and automated policy engine parameters.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Zero-Trust Access Model
          </h2>
          <p className="mb-6">
            ZeroClaw enforces a strict zero-trust network access (ZTNA) protocol. Transport-layer access to internal APIs and services is blocked by default. A connecting client is required to present a cryptographically signed <code className="bg-[#fafaf7] border border-[#c9cdc4] px-1 py-0.5 rounded text-sm text-[#10151c]" style={{ fontFamily: 'var(--font-mono)' }}>x509</code> certificate during the TLS handshake. If the certificate is missing, invalid, expired, or present on the active CRL, the connection is instantly dropped prior to HTTP layer processing.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Automated Threat Containment
          </h2>
          <p className="mb-6">
            The integrated policy engine enables administrators to define custom heuristic bounds based on ingress telemetry. Should an endpoint violate a defined policy (e.g., rapid failed authentication bursts, irregular geo-velocity, or IOC communication), the engine automatically triggers the internal <code className="bg-[#fafaf7] border border-[#c9cdc4] px-1 py-0.5 rounded text-sm text-[#b3541e]" style={{ fontFamily: 'var(--font-mono)' }}>/quarantine</code> endpoint, subsequently revoking the client's mTLS identity without human intervention.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            Cryptographic Agility
          </h2>
          <p className="mb-6">
            The infrastructure supports modern elliptical curve cryptography (<code className="bg-[#fafaf7] border border-[#c9cdc4] px-1 py-0.5 rounded text-sm text-[#10151c]" style={{ fontFamily: 'var(--font-mono)' }}>ECDSA P-256 / P-384</code>) for high-performance TLS handshakes. This guarantees minimal latency overhead at the edge while simultaneously maintaining quantum-resistant forward secrecy capabilities.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Policies;
