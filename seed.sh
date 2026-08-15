sudo docker exec -i threat-hub-api node -e "
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcrypt');
  const prisma = new PrismaClient();
  bcrypt.hash('SecurePassword123!', 10).then(hash => 
    prisma.analyst.create({ data: { username: 'admin', password_hash: hash } })
  ).then(() => {
    console.log('Analyst created successfully');
    process.exit(0);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
"
