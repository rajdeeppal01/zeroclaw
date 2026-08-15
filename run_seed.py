import subprocess

script = """sudo docker exec -i threat-hub-api node -e "
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
"""

with open("seed.sh", "w", newline='\n') as f:
    f.write(script)

subprocess.run(["scp", "-i", "zeroclaw_deploy", "-o", "StrictHostKeyChecking=no", "seed.sh", "rajde@35.232.141.95:/home/rajde/seed.sh"])
subprocess.run(["ssh", "-i", "zeroclaw_deploy", "-o", "StrictHostKeyChecking=no", "rajde@35.232.141.95", "bash /home/rajde/seed.sh"])
