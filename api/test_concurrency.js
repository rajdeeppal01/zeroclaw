process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runTest() {
  const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_prod';
  
  // 1. Create a dummy analyst and threat
  let analyst = await prisma.analyst.findFirst();
  if (!analyst) {
    console.log("No analyst found. Please create one.");
    process.exit(1);
  }

  let client = await prisma.client.findFirst();
  if (!client) {
     client = await prisma.client.create({ data: { cn: 'concurrency-test' }});
  }

  const threat = await prisma.threat.create({
    data: {
      stix_id: `indicator--${crypto.randomUUID()}`,
      client_id: client.id,
      stix_data: { type: "indicator", id: "dummy" },
      status: 'pending_review'
    }
  });

  console.log(`Created threat ID: ${threat.id} (Status: pending_review)`);

  // 2. Generate a valid session token and CSRF token
  const token = jwt.sign({ analystId: analyst.id }, JWT_SECRET, { expiresIn: '8h' });
  const csrfToken = crypto.randomBytes(32).toString('hex');
  const cookie = `session=${token}; csrf_token=${csrfToken}`;

  // 3. Fire 10 concurrent requests to /approve
  const targetUrl = `https://localhost:8443/api/v1/ui/queue/${threat.id}/approve`;
  const requests = [];
  
  for (let i = 0; i < 10; i++) {
    requests.push(
      axios.post(targetUrl, {}, {
        headers: {
          'Cookie': cookie,
          'x-csrf-token': csrfToken
        },
        validateStatus: () => true // Resolve on all statuses
      })
    );
  }

  console.log("Firing 10 concurrent requests...");
  const responses = await Promise.all(requests);

  // 4. Assert response statuses and bodies
  let successCount = 0;
  let conflictCount = 0;
  let otherCount = 0;

  for (const res of responses) {
    if (res.status === 200) {
      successCount++;
    } else if (res.status === 409) {
      conflictCount++;
      if (res.data.error === 'Already approved by another analyst') {
        // Asserting the exact message
      } else {
        console.warn(`Unexpected 409 error message: ${res.data.error}`);
      }
    } else {
      otherCount++;
      console.warn(`Unexpected status: ${res.status} - ${JSON.stringify(res.data)}`);
    }
  }

  console.log(`Results: ${successCount} Successes, ${conflictCount} Conflicts, ${otherCount} Other Errors.`);
  
  if (successCount === 1 && conflictCount === 9) {
    console.log("PASS: Concurrency handled correctly. Exactly one approval succeeded, 9 cleanly rejected with 'Already approved by another analyst'.");
  } else {
    console.log("FAIL: Expected 1 success and 9 conflicts.");
  }

  // Cleanup
  await prisma.threat.delete({ where: { id: threat.id } });
  process.exit(0);
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
