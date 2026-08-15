import React from 'react';
import { useNavigate } from 'react-router-dom';

const Guide = () => {
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
            Implementation Guide
          </h1>
        </div>
        
        <div className="prose prose-lg max-w-none text-[#4b5563]">
          <p className="text-lg mb-10">
            This technical document details the deployment architecture for the ZeroClaw edge quarantine system in front of internal microservices.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            1. Architectural Overview
          </h2>
          <p className="mb-6">
            ZeroClaw acts as an intelligent Certificate Revocation List (CRL) orchestrator that integrates directly with an mTLS-enabled NGINX reverse proxy. When the ZeroClaw Hub detects anomalous telemetry, it immediately revokes the client's x509 certificate and regenerates the active CRL, forcing NGINX to sever the transport connection on the subsequent packet.
          </p>
          
          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            2. Deployment Prerequisites
          </h2>
          <ul className="list-disc pl-6 mb-6 space-y-2">
            <li>A functioning NGINX reverse proxy configured for strictly validated mTLS (<code className="bg-[#fafaf7] border border-[#c9cdc4] px-1 py-0.5 rounded text-sm text-[#b3541e]" style={{ fontFamily: 'var(--font-mono)' }}>ssl_verify_client on;</code>).</li>
            <li>An OpenSSL Certificate Authority (CA) directory accessible by the ZeroClaw backend daemon.</li>
            <li>Docker and docker-compose installed on the edge gateway.</li>
          </ul>

          <h2 className="text-xl font-bold text-[#10151c] mt-10 mb-4" style={{ fontFamily: 'var(--font-display)' }}>
            3. Quickstart
          </h2>
          <p className="mb-4">Clone the repository and spin up the intelligence hub:</p>
          <pre className="bg-[#10151c] text-[#fafaf7] p-4 rounded text-sm overflow-x-auto mb-6 leading-relaxed" style={{ fontFamily: 'var(--font-mono)' }}>
            git clone https://github.com/rajdeeppal01/zeroclaw.git{'\n'}
            cd zeroclaw{'\n'}
            docker-compose up -d
          </pre>
          <p className="mb-6">
            This initialization sequence spins up the PostgreSQL state database, the Node.js API, the CRL updater sidecar, and the local NGINX proxy container.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Guide;
