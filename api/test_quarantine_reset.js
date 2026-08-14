process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runTest() {
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_prod';
  const ANOMALY_THRESHOLD = parseInt(process.env.ANOMALY_THRESHOLD || '20');

  console.log("=== Quarantine Reset Test ===");

  // Helper to submit threat (acting as Nginx)
  async function submitThreat(client) {
    const payload = {
      type: 'indicator',
      id: `indicator--${crypto.randomUUID()}`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      name: 'Test Threat',
      pattern_type: 'stix',
      pattern: "[ipv4-addr:value = '192.168.1.1']",
      valid_from: new Date().toISOString()
    };
    
    const agent = new https.Agent({
      cert: fs.readFileSync('../pki/certs/client-enterprise-b.crt'),
      key: fs.readFileSync('../pki/certs/client-enterprise-b.key'),
      rejectUnauthorized: false
    });

    return axios.post('https://localhost:443/api/v1/threats', payload, {
      httpsAgent: agent,
      headers: { 'x-client-cert-cn': client.cn }, // Optional if NGINX overrides it, but good to have
      validateStatus: () => true
    });
  }

  // Helper to act as Analyst
  let analyst = await prisma.analyst.findFirst();
  if (!analyst) {
    console.log("No analyst found. Please create one.");
    process.exit(1);
  }
  const token = jwt.sign({ analystId: analyst.id }, JWT_SECRET, { expiresIn: '8h' });
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const cookie = `session=${token}; csrf_token=${csrfToken}`;

  async function unquarantineClient(clientId) {
    return axios.post(`https://localhost:8443/api/v1/ui/clients/${clientId}/unquarantine`, {}, {
      headers: { 'Cookie': cookie, 'x-csrf-token': csrfToken },
      validateStatus: () => true
    });
  }

  // 1. Client that's never been quarantined submitting normally
  console.log("\n1. Testing never-quarantined client...");
  let clientA = await prisma.client.findFirst({ where: { cn: 'enterprise-b' } });
  if (!clientA) {
    clientA = await prisma.client.create({ data: { cn: 'enterprise-b' } });
  }
  
  // ensure it is clean
  await prisma.threat.deleteMany({ where: { client_id: clientA.id } });
  await prisma.client.update({ where: { id: clientA.id }, data: { is_quarantined: false, quarantine_reset_at: null } });
  
  let resA = await submitThreat(clientA);
  if (resA.status === 201) {
    console.log("[PASS] Never-quarantined client successfully submitted.");
  } else {
    console.log(`[FAIL] Never-quarantined client submission failed: ${resA.status} - ${JSON.stringify(resA.data)}`);
  }

  // 2. Trigger Quarantine
  console.log(`\n2. Triggering quarantine for client A (Threshold: ${ANOMALY_THRESHOLD})...`);
  let quarantineTriggered = false;
  for(let i=0; i < ANOMALY_THRESHOLD + 2; i++) {
    const r = await submitThreat(clientA);
    if (r.status === 429) {
      console.log(`[PASS] Client quarantined on attempt ${i+1}.`);
      quarantineTriggered = true;
      break;
    }
  }
  if (!quarantineTriggered) console.log("[FAIL] Client was not quarantined.");

  // Verify DB state
  clientA = await prisma.client.findUnique({ where: { id: clientA.id } });
  console.log(`DB is_quarantined: ${clientA.is_quarantined}, quarantine_reset_at: ${clientA.quarantine_reset_at}`);

  // 3. Reset-then-resubmit
  console.log("\n3. Unquarantining client A...");
  const unqRes = await unquarantineClient(clientA.id);
  if (unqRes.status === 200) {
    console.log("[PASS] Unquarantine endpoint succeeded.");
  } else {
    console.log(`[FAIL] Unquarantine failed: ${unqRes.status} ${JSON.stringify(unqRes.data)}`);
  }

  clientA = await prisma.client.findUnique({ where: { id: clientA.id } });
  console.log(`DB after unquarantine: is_quarantined: ${clientA.is_quarantined}, quarantine_reset_at: ${clientA.quarantine_reset_at}`);

  console.log("\n4. Submitting as unquarantined client A...");
  const resA2 = await submitThreat(clientA);
  if (resA2.status === 201) {
    console.log("[PASS] Reset-then-resubmit succeeded! Client wasn't instantly re-quarantined.");
  } else {
    console.log(`[FAIL] Reset-then-resubmit failed: ${resA2.status} ${JSON.stringify(resA2.data)}`);
  }

  // Cleanup
  await prisma.threat.deleteMany({ where: { client_id: clientA.id } });
  await prisma.client.delete({ where: { id: clientA.id } });
  process.exit(0);
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
