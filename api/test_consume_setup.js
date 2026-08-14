const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
    let client = await prisma.client.upsert({
        where: { cn: 'client-enterprise-b' },
        update: {},
        create: { cn: 'client-enterprise-b' }
    });

    // We will create 3 threats:
    // 1. A valid external IP (should be blocked)
    // 2. An internal 10.x.x.x IP (should be whitelisted and dropped)
    // 3. A loopback IP (should be whitelisted and dropped)

    await prisma.threat.createMany({
        data: [
            {
                client_id: client.id,
                stix_id: `indicator--consume-test-1`,
                stix_data: { type: "indicator", pattern_type: "stix", pattern: "[ipv4-addr:value = '198.51.100.222']" },
                status: 'approved',
                reviewed_by_id: 1,
                reviewed_at: new Date()
            },
            {
                client_id: client.id,
                stix_id: `indicator--consume-test-2`,
                stix_data: { type: "indicator", pattern_type: "stix", pattern: "[ipv4-addr:value = '10.5.2.1']" },
                status: 'approved',
                reviewed_by_id: 1,
                reviewed_at: new Date()
            },
            {
                client_id: client.id,
                stix_id: `indicator--consume-test-3`,
                stix_data: { type: "indicator", pattern_type: "stix", pattern: "[ipv4-addr:value = '127.0.0.1']" },
                status: 'approved',
                reviewed_by_id: 1,
                reviewed_at: new Date()
            }
        ]
    });

    console.log("Consume test setup complete.");
}

setup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
