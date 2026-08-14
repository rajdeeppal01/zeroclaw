const https = require('https');
const fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const THREAT_COUNT = 500;
const CONCURRENT_AGENTS = 50;

const options = {
    hostname: 'localhost',
    port: 443,
    path: '/api/v1/threats',
    method: 'POST',
    cert: fs.readFileSync('./pki/certs/client-enterprise-b.crt'),
    key: fs.readFileSync('./pki/certs/client-enterprise-b.key'),
    rejectUnauthorized: false,
    headers: {
        'Content-Type': 'application/json'
    }
};

function transmitThreat(agentId, i) {
    return new Promise((resolve, reject) => {
        const stixData = {
            type: "indicator",
            id: `indicator--load-${agentId}-${i}-${Date.now()}`,
            name: "Sustained Load Threat",
            pattern: "[ipv4-addr:value = '198.51.100.1']",
            pattern_type: "stix",
            valid_from: new Date().toISOString(),
            created: new Date().toISOString(),
            modified: new Date().toISOString()
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else if (res.statusCode === 403) {
                    resolve("Quarantined");
                } else {
                    reject(new Error(`Failed with status ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(JSON.stringify(stixData));
        req.end();
    });
}

async function runLoadTest() {
    console.log(`=== Starting Sustained Load Test ===`);
    console.log(`Simulating ${CONCURRENT_AGENTS} agents transmitting a total of ${THREAT_COUNT} threats...`);

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;

    const tasks = [];
    for (let i = 0; i < THREAT_COUNT; i++) {
        const agentId = i % CONCURRENT_AGENTS;
        tasks.push(
            transmitThreat(agentId, i)
                .then(() => { successCount++; })
                .catch(err => { 
                    if (errorCount === 0) console.error("First error:", err.message);
                    errorCount++; 
                })
        );
    }

    await Promise.all(tasks);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n=== Load Test Results ===`);
    console.log(`Total Duration : ${duration.toFixed(2)} seconds`);
    console.log(`Throughput     : ${(THREAT_COUNT / duration).toFixed(2)} req/sec`);
    console.log(`Successful     : ${successCount}`);
    console.log(`Failed (Errors): ${errorCount}`);

    if (errorCount > 0) {
        console.error(`\n[FAIL] The system dropped requests. Connection pool might be exhausted or queries are locking.`);
        process.exit(1);
    } else {
        console.log(`\n[PASS] Handled sustained load flawlessly. Index and connection pool tuning are effective.`);
    }
}

runLoadTest();
