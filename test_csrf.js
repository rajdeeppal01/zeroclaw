process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function runTests() {
  console.log("=== Testing CSRF Protections ===");
  
  // 1. Login to get session and csrf token
  console.log("Logging in...");
  const loginRes = await fetch('https://localhost:8443/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: process.env.ANALYST_SEED_PASSWORD || 'zeroclaw_admin_secure!' })
  });
  
  const cookies = loginRes.headers.get('set-cookie');
  if (!cookies) {
    console.error("FAIL: No cookies returned on login");
    console.error(`Status: ${loginRes.status}`);
    const text = await loginRes.text();
    console.error(`Response: ${text}`);
    return;
  }
  
  const rawCookies = cookies.split(', ');
  let sessionCookie = '';
  let csrfCookie = '';
  let csrfToken = '';
  
  rawCookies.forEach(c => {
    if (c.startsWith('session=')) sessionCookie = c.split(';')[0];
    if (c.startsWith('csrf_token=')) {
        csrfCookie = c.split(';')[0];
        csrfToken = csrfCookie.split('=')[1];
    }
  });
  
  console.log(`Session Cookie: ${sessionCookie}`);
  console.log(`CSRF Cookie: ${csrfCookie}`);
  
  // Create a dummy threat so we can approve it
  console.log("Creating dummy threat via DB push...");
  // We don't actually need the threat to exist to test CSRF middleware, 
  // because the middleware runs BEFORE the route handler. 
  // If CSRF fails, it returns 403. If it passes, it returns 500 (since threat 999 doesn't exist).
  
  async function testApprove(headers, expectedStatus, testName) {
    const res = await fetch('https://localhost:8443/api/v1/ui/queue/999/approve', {
      method: 'POST',
      headers: headers
    });
    if (res.status === expectedStatus) {
      console.log(`[PASS] ${testName} (Status: ${res.status})`);
    } else {
      console.error(`[FAIL] ${testName}. Expected ${expectedStatus}, got ${res.status}`);
      const text = await res.text();
      console.error(`Response: ${text}`);
    }
  }

  console.log("\nRunning CSRF Test Cases:");
  
  // Test 1: Missing CSRF Header
  await testApprove({
    'Cookie': `${sessionCookie}; ${csrfCookie}`
  }, 403, "Test 1: Missing CSRF Header");
  
  // Test 2: Present but Mismatched CSRF Header
  await testApprove({
    'Cookie': `${sessionCookie}; ${csrfCookie}`,
    'X-CSRF-Token': 'wrong-token-value'
  }, 403, "Test 2: Mismatched CSRF Header");
  
  // Test 3: Both Header and Cookie Absent
  await testApprove({
    'Cookie': `${sessionCookie}` // only session cookie
  }, 403, "Test 3: Both Header and CSRF Cookie Absent");
  
  // Test 4: Valid CSRF Header and Cookie
  await testApprove({
    'Cookie': `${sessionCookie}; ${csrfCookie}`,
    'X-CSRF-Token': csrfToken
  }, 500, "Test 4: Valid CSRF (Returns 500 because threat 999 doesn't exist, meaning it passed middleware)");
  
}

runTests().catch(console.error);
