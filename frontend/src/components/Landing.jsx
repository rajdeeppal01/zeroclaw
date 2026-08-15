import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Activity, Shield } from 'lucide-react';

const ConsoleStream = () => {
  const [logs, setLogs] = useState([]);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    let tick = 0;
    const maxTicks = 8; // Stop at end
    let logBuffer = [];

    const generateLog = (t) => {
      const ts = new Date().toISOString().replace('T', ' ').substring(0, 23);
      if (t < 4) {
        return `[${ts}] INFO: Handshake established. Serial: 0x8F92A${t} - STATUS: ACTIVE`;
      } else if (t === 4) {
        return `[${ts}] WARN: Telemetry indicates unexpected geo-velocity for Serial: 0x8F92A3`;
      } else if (t === 5) {
        return `[${ts}] ALERT: ANOMALY_SCORE: 0.94 — QUARANTINE INITIATED`;
      } else if (t === 6) {
        setRevoked(true);
        return `[${ts}] EXEC: openssl ca -revoke client_0x8F92A3.crt`;
      } else if (t === 7) {
        return `[${ts}] EXEC: openssl ca -gencrl -out current.crl`;
      } else {
        return `[${ts}] SUCCESS: CRL propagated to edge. Connection terminated.`;
      }
    };

    const interval = setInterval(() => {
      if (tick > maxTicks) {
        clearInterval(interval);
        return;
      }
      
      const newLog = generateLog(tick);
      logBuffer.push(newLog);
      
      if (logBuffer.length > 8) logBuffer.shift();
      
      setLogs([...logBuffer]);
      tick++;
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[400px] bg-white border border-[#c9cdc4] rounded flex flex-col overflow-hidden shadow-none">
      <div className="h-10 border-b border-[#c9cdc4] flex items-center px-4 bg-[#fafaf7] justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#1b4b43] live-pulse"></div>
          <span className="text-xs font-semibold tracking-wider text-[#4b5563] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
            /var/log/zeroclaw-edge.log
          </span>
        </div>
      </div>
      
      <div className="flex-1 p-4 bg-white relative overflow-hidden flex flex-col justify-end">
        <div className="flex flex-col gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
          {logs.map((log, i) => {
            let colorClass = "text-[#4b5563]"; // default
            if (log.includes("ACTIVE")) colorClass = "text-[#1b4b43]";
            if (log.includes("WARN")) colorClass = "text-[#d97736]";
            if (log.includes("ALERT")) colorClass = "text-[#99280b] font-bold";
            if (log.includes("EXEC")) colorClass = "text-[#10151c] font-medium";
            if (log.includes("SUCCESS")) colorClass = "text-[#99280b] font-bold";
            
            return (
              <div key={i} className={`text-xs md:text-sm whitespace-pre-wrap break-all ${colorClass}`}>
                {log}
              </div>
            );
          })}
          <div className="text-xs md:text-sm text-[#4b5563] cursor-blink">█</div>
        </div>

        {/* Dramatic REVOKED Stamp */}
        {revoked && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="text-[#99280b] border-4 border-[#99280b] rounded-full px-8 py-4 font-bold text-4xl opacity-90 transform -rotate-12"
              style={{
                fontFamily: 'var(--font-display)',
                letterSpacing: '0.1em',
                boxShadow: 'inset 0 0 0 2px #99280b',
                borderStyle: 'double',
                borderWidth: '8px',
                animation: 'stampIn 150ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
              }}
            >
              REVOKED
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(() => {
    return localStorage.getItem('waitlist_joined') === 'true';
  });

  const handleWaitlistSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email) return;

    try {
      // In development it uses the proxy, in prod it resolves relative to domain
      await fetch('/api/v1/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setSubmitted(true);
      localStorage.setItem('waitlist_joined', 'true');
    } catch (err) {
      console.error("Waitlist error:", err);
      alert("Failed to join waitlist. Please try again.");
    }
  };

  return (
    <div className="min-h-screen text-[#10151c] overflow-hidden bg-[#fafaf7] bg-topology">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-8 max-w-[1200px] mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <span className="text-xl font-bold tracking-tight text-[#10151c]" style={{ fontFamily: 'var(--font-display)' }}>ZeroClaw</span>
        </div>
        <div className="flex items-center gap-8 text-sm font-medium" style={{ fontFamily: 'var(--font-body)' }}>
          <button onClick={() => navigate('/guide')} className="nav-underline text-[#4b5563] hover:text-[#10151c] transition-colors bg-transparent border-none p-0 cursor-pointer">
            Guide
          </button>
          <button onClick={() => navigate('/manual')} className="nav-underline text-[#4b5563] hover:text-[#10151c] transition-colors bg-transparent border-none p-0 cursor-pointer">
            User Manual
          </button>
          <button onClick={() => navigate('/policies')} className="nav-underline text-[#4b5563] hover:text-[#10151c] transition-colors bg-transparent border-none p-0 cursor-pointer">
            Policies
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="px-8 pt-12 md:pt-20 max-w-[1200px] mx-auto flex flex-col md:flex-row items-start justify-between gap-12">
        
        {/* Left Column: Copy & Input */}
        <div className="flex-1 w-full max-w-2xl">
          <h1 className="text-[48px] leading-[1.1] md:text-[64px] font-bold tracking-tight mb-6 text-[#10151c]" style={{ fontFamily: 'var(--font-display)' }}>
            Contain compromised endpoints at the <span className="text-[#1b4b43]">edge.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#4b5563] mb-10 font-normal" style={{ fontFamily: 'var(--font-body)' }}>
            ZeroClaw orchestrates real-time mTLS certificate revocation. Instantly sever network access for infected devices at your load balancer using zero-trust cryptographic quarantine.
          </p>
          
          {/* Email Input & CTA */}
          <div className="mb-20">
            {!submitted ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full max-w-[480px]">
                <input 
                  type="email" 
                  placeholder="name@company.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full sm:flex-1 bg-white border border-[#c9cdc4] px-4 py-3 rounded text-sm text-[#10151c] placeholder-[#4b5563] outline-none focus:border-[#10151c]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                  required
                />
                <button 
                  type="submit"
                  className="bg-[#10151c] text-white px-6 py-3 rounded text-sm font-medium hover:bg-[#2a3544] transition-colors shrink-0 w-full sm:w-auto cursor-pointer"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Request a technical briefing
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3 bg-[#fafaf7] text-[#1b4b43] px-6 py-3 rounded w-full max-w-[480px] border border-[#1b4b43] animate-fade-in" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="text-sm font-medium">Request logged. Our team will contact you shortly.</span>
              </div>
            )}
          </div>

          {/* Logo Bar (Re-styled for enterprise) */}
          <div className="flex flex-wrap items-center gap-8 md:gap-12 opacity-80" style={{ fontFamily: 'var(--font-mono)' }}>
            <span className="font-semibold text-sm tracking-tight text-[#4b5563] hover:text-[#009639] cursor-pointer transition-colors">NGINX</span>
            <span className="font-semibold text-sm tracking-tight text-[#4b5563] hover:text-[#336791] cursor-pointer transition-colors">PostgreSQL</span>
            <span className="font-semibold text-sm tracking-tight text-[#4b5563] hover:text-[#721412] cursor-pointer transition-colors">OpenSSL</span>
            <span className="font-semibold text-sm tracking-tight text-[#4b5563] hover:text-[#1b4b43] cursor-pointer transition-colors">mTLS</span>
          </div>
        </div>

        {/* Right Column: Console Log Feed */}
        <div className="flex-1 w-full md:max-w-[500px] mt-10 md:mt-0">
          <ConsoleStream />
        </div>

      </main>

      {/* Footer */}
      <footer className="max-w-[1200px] mx-auto px-8 pb-12 mt-20 flex justify-end">
        <div className="flex items-center gap-6 text-sm" style={{ fontFamily: 'var(--font-mono)' }}>
          <span className="text-[#c9cdc4] mr-2">// CONTACT</span>
          <a href="https://github.com/rajdeeppal01" target="_blank" rel="noreferrer" className="text-[#4b5563] hover:text-[#10151c] transition-colors text-decoration-none">
            GitHub
          </a>
          <a href="https://www.linkedin.com/in/rajdeep-pal01/" target="_blank" rel="noreferrer" className="text-[#4b5563] hover:text-[#10151c] transition-colors text-decoration-none">
            LinkedIn
          </a>
          <a href="mailto:rajdeeppalwork@gmail.com" className="text-[#4b5563] hover:text-[#10151c] transition-colors text-decoration-none">
            Email
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
