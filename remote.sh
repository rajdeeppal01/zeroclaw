cd /home/rajde/ZeroClaw
sudo docker-compose up -d postgres
sleep 10
cd api
sudo docker-compose run --rm api npx prisma migrate deploy
cd ..
sudo docker-compose up -d
sleep 5
sudo docker exec -i threat-hub-api node -e "
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();
  bcrypt.hash('SecurePassword123!', 10).then(hash => 
    prisma.analyst.create({ data: { username: 'admin', password_hash: hash } })
  ).then(() => {
    console.log('Analyst created successfully');
    process.exit(0);
  });
"
