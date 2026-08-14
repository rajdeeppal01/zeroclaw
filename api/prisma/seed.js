const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const seedPassword = process.env.ANALYST_SEED_PASSWORD
  
  if (!seedPassword) {
    console.error("FATAL: ANALYST_SEED_PASSWORD environment variable is required to seed the database.")
    process.exit(1)
  }

  // Create the default admin analyst
  const salt = await bcrypt.genSalt(10)
  const password_hash = await bcrypt.hash(seedPassword, salt)

  const admin = await prisma.analyst.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password_hash: password_hash,
    },
  })

  console.log(`Seeded admin analyst account (ID: ${admin.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
