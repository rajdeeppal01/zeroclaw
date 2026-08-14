const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() {
    let client = await prisma.client.upsert({
        where: { cn: 'client-enterprise-b' },
        update: {},
        create: { cn: 'client-enterprise-b' }
    });

    for (let i = 5; i < 10; i++) {
        await prisma.threat.create({
            data: {
                client_id: client.id,
                stix_id: `indicator--polling-test-${i}`,
                stix_data: {},
                status: 'approved',
                reviewed_by_id: 1,
                reviewed_at: new Date()
            }
        });
    }

    console.log("5 MORE approved threats inserted.");
}

setup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
