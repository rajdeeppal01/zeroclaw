const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
    // 1. Ensure client exists
    let client = await prisma.client.upsert({
        where: { cn: 'client-enterprise-b' },
        update: {},
        create: { cn: 'client-enterprise-b' }
    });

    // 2. Clear existing threats to have a clean slate for the polling test
    await prisma.threat.deleteMany({});

    // 3. Insert 5 approved threats
    for (let i = 0; i < 5; i++) {
        await prisma.threat.create({
            data: {
                client_id: client.id,
                stix_id: `indicator--polling-test-${i}`,
                stix_data: {},
                status: 'APPROVED',
                reviewed_by_id: 1,
                reviewed_at: new Date()
            }
        });
    }

    console.log("Setup complete. 5 approved threats inserted.");
}

setup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
