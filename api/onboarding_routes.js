const { execFile } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const fs = require('fs');
const fsPromises = fs.promises;
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

module.exports = function(app, prisma, requireAnalyst, requireCsrf) {
  
  // Rate Limiting Map (App-level, basic)
  const rateLimits = new Map();
  function checkRateLimit(ip) {
    const now = Date.now();
    const limit = 5; // 5 per hour
    const windowMs = 60 * 60 * 1000;
    
    if (!rateLimits.has(ip)) {
      rateLimits.set(ip, { count: 1, reset: now + windowMs });
      return true;
    }
    const data = rateLimits.get(ip);
    if (now > data.reset) {
      data.count = 1;
      data.reset = now + windowMs;
      return true;
    }
    if (data.count >= limit) {
      return false;
    }
    data.count++;
    return true;
  }

  // ==========================================
  // PUBLIC ONBOARDING INGRESS
  // ==========================================
  
  app.post('/api/v1/public/onboard', async (req, res) => {
    const ip = req.ip || req.connection.remoteAddress;
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Strict validation
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-32 characters and only contain letters, numbers, underscores, or dashes.' });
    }

    const cn = `client-${username}`;
    let tmpDir;
    try {
      tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'onboard-'));
      const keyPath = path.join(tmpDir, 'client.key');
      const csrPath = path.join(tmpDir, 'client.csr');

      // Generate Private Key
      await execFileAsync('openssl', ['genrsa', '-out', keyPath, '2048']);
      
      // Generate CSR
      await execFileAsync('openssl', ['req', '-new', '-key', keyPath, '-out', csrPath, '-subj', `/CN=${cn}`]);

      const keyPem = await fsPromises.readFile(keyPath, 'utf8');
      const csrPem = await fsPromises.readFile(csrPath, 'utf8');

      const trackingToken = crypto.randomBytes(32).toString('hex');

      await prisma.onboardingRequest.create({
        data: {
          tracking_token: trackingToken,
          username,
          status: 'pending',
          csr_pem: csrPem,
          private_key_pem: keyPem
        }
      });

      res.json({ message: 'Request submitted successfully', tracking_token: trackingToken });

    } catch (err) {
      console.error('Onboarding Error:', err);
      res.status(500).json({ error: 'Failed to generate CSR' });
    } finally {
      if (tmpDir) {
        await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(console.error);
      }
    }
  });

  app.get('/api/v1/public/onboard/:token/status', async (req, res) => {
    const { token } = req.params;
    const request = await prisma.onboardingRequest.findUnique({
      where: { tracking_token: token },
      select: { status: true }
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({ status: request.status });
  });

  app.get('/api/v1/public/onboard/:token/download', async (req, res) => {
    const { token } = req.params;

    try {
      // ATOMIC CLAIM: Update status from 'signed' to 'downloaded' and return the record
      const claims = await prisma.$queryRaw`
        UPDATE "OnboardingRequest" 
        SET status = 'downloaded', updated_at = NOW() 
        WHERE tracking_token = ${token} AND status = 'signed' 
        RETURNING id, username, cert_pem, private_key_pem;
      `;
      
      if (!claims || claims.length === 0) {
        // Either not found, not signed, or already downloaded
        const check = await prisma.onboardingRequest.findUnique({ where: { tracking_token: token } });
        if (!check) return res.status(404).json({ error: 'Request not found' });
        if (check.status === 'downloaded') return res.status(410).json({ error: 'Token already consumed. Zip file already downloaded.' });
        return res.status(400).json({ error: 'Request is not yet signed and ready for download.' });
      }

      const request = claims[0];

      // Build the ZIP
      const zip = new AdmZip();
      
      const certFile = `client-${request.username}.crt`;
      const keyFile = `client-${request.username}.key`;
      
      zip.addFile(certFile, Buffer.from(request.cert_pem, 'utf8'));
      zip.addFile(keyFile, Buffer.from(request.private_key_pem, 'utf8'));

      // Read template windows_agent.py
      const agentPath = path.join(__dirname, '..', 'windows_agent', 'windows_agent.py');
      let agentCode = await fsPromises.readFile(agentPath, 'utf8');
      
      // Rewrite the hardcoded cert paths
      agentCode = agentCode.replace(
          /cert_path = os\.path\.join\(script_dir, "\.\.", "pki", "certs", ".*?"\)/g,
          `cert_path = os.path.join(script_dir, "${certFile}")`
      );
      agentCode = agentCode.replace(
          /key_path = os\.path\.join\(script_dir, "\.\.", "pki", "certs", ".*?"\)/g,
          `key_path = os.path.join(script_dir, "${keyFile}")`
      );
      
      zip.addFile('windows_agent.py', Buffer.from(agentCode, 'utf8'));

      const readmeContent = `==================================================
ZeroClaw Beta Access - Windows Endpoint Agent
Prepared for: ${request.username}
==================================================

Welcome to the ZeroClaw Threat Intelligence Beta!

This folder contains your unique, cryptographically secure mTLS 
certificates that grant you access to the live ZeroClaw Hub.

HOW TO ACTIVATE YOUR PROTECTION:
1. Install Python (if you don't have it): https://www.python.org/downloads/
2. Open your Windows Start Menu, type "PowerShell", right-click it, 
   and select "Run as Administrator".
3. Use the \`cd\` command to navigate to the folder where you extracted these files.
4. Run this command to install the required network library:
   pip install requests
5. Start the agent:
   python windows_agent.py

Your laptop is now actively syncing with the ZeroClaw B2B Threat Intelligence Hub 
and automatically locking down your Windows Defender Firewall against live threats!
`;
      zip.addFile('README.txt', Buffer.from(readmeContent, 'utf8'));

      const zipBuffer = zip.toBuffer();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="ZeroClaw_Beta_${request.username}.zip"`);
      res.setHeader('Content-Length', zipBuffer.length);
      
      // Delete the private key AFTER successful stream finish
      res.on('finish', async () => {
        try {
          await prisma.onboardingRequest.update({
            where: { id: request.id },
            data: { private_key_pem: null }
          });
          console.log(`[ONBOARDING] Successfully served zip and deleted private key for ${request.username}`);
        } catch(e) {
          console.error(`[ONBOARDING] Failed to delete private key for ${request.username}:`, e);
        }
      });

      res.send(zipBuffer);

    } catch (err) {
      console.error('Download Error:', err);
      res.status(500).json({ error: 'Failed to build package' });
    }
  });

  // ==========================================
  // ANALYST ONBOARDING QUEUE
  // ==========================================

  app.get('/api/v1/ui/onboarding', requireAnalyst, async (req, res) => {
    const requests = await prisma.onboardingRequest.findMany({
      where: { status: 'pending' },
      orderBy: { created_at: 'desc' }
    });
    
    // Parse CSR to extract public key fingerprint
    const enhanced = await Promise.all(requests.map(async req => {
      let fingerprint = "Unknown";
      let subject = "Unknown";
      try {
        const { stdout: pubout } = await execFileAsync('openssl', ['req', '-noout', '-pubkey'], {
          input: req.csr_pem
        });
        fingerprint = crypto.createHash('sha256').update(pubout).digest('hex').substring(0, 32) + "...";
        
        const { stdout: subjout } = await execFileAsync('openssl', ['req', '-noout', '-subject'], {
          input: req.csr_pem
        });
        subject = subjout.trim().replace('subject=', '');
      } catch (e) {
        console.error("Failed to parse CSR", e);
      }
      return { ...req, private_key_pem: undefined, fingerprint, subject }; // strip private key from UI payload
    }));

    res.json(enhanced);
  });

  app.post('/api/v1/ui/onboarding/:id/approve', requireAnalyst, requireCsrf, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await prisma.onboardingRequest.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'approved',
          approved_by_id: req.analystId,
          updated_at: new Date()
        }
      });

      if (result.count === 0) {
        return res.status(409).json({ error: 'Request is no longer pending.' });
      }

      res.json({ message: 'Approved' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to approve' });
    }
  });

  app.post('/api/v1/ui/onboarding/:id/reject', requireAnalyst, requireCsrf, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // We must delete the private key instantly on rejection
      const result = await prisma.onboardingRequest.updateMany({
        where: { id, status: 'pending' },
        data: {
          status: 'rejected',
          private_key_pem: null,
          approved_by_id: req.analystId,
          updated_at: new Date()
        }
      });

      if (result.count === 0) {
        return res.status(409).json({ error: 'Request is no longer pending.' });
      }

      res.json({ message: 'Rejected' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to reject' });
    }
  });
};
