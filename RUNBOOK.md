# ZeroClaw | Operational Runbook

This document serves as the authoritative source of truth for the ongoing operations, maintenance, and disaster recovery of the ZeroClaw threat intelligence pipeline.

## 1. Target Architecture & Topology
ZeroClaw is deployed to a single hardened bare-metal server or VPS (e.g., AWS EC2, DigitalOcean). 
- **Port 443 (Agent Data Plane):** Terminates **mTLS** connections using a strictly offline Custom Root CA.
- **Port 8443 (Analyst Control Plane):** Terminates standard TLS via **Let's Encrypt** for browser access to the Single Page Application.
- *Note:* If a standard `https://zeroclaw.example.com` cosmetic URL is desired for analysts, place a lightweight TCP Load Balancer or front proxy to forward public 443 traffic internally to 8443, leaving the Nginx container's SNI routing untouched to preserve the hard mTLS trust boundary.

---

## 2. Bootstrap Sequence
When spinning up a new Hub instance from scratch:

1. **Start the Database:**
   ```bash
   docker compose up -d db
   ```
2. **Apply Migrations:**
   ```bash
   cd api
   npx prisma migrate deploy
   ```
3. **Initialize the Root CA (Offline):**
   *(Perform this on a secure, air-gapped machine, NOT the internet-facing Hub VPS)*
   ```bash
   ./nginx/pki/init_ca.sh
   ```
   *Upload ONLY the `ca.crt` to the VPS at `nginx/pki/ca.crt`.*
4. **Start the Services:**
   ```bash
   docker compose up -d
   ```

---

## 3. Account Management

### Analyst Onboarding
To safely create the first Analyst account (or subsequent accounts):
```bash
docker exec -it zeroclaw-api-1 node -e "
  const { PrismaClient } = require('@prisma/client');
  const bcrypt = require('bcryptjs');
  const prisma = new PrismaClient();
  bcrypt.hash('SecurePassword123!', 10).then(hash => 
    prisma.analyst.create({ data: { username: 'analyst1', password_hash: hash } })
  ).then(() => {
    console.log('Analyst created successfully');
    process.exit(0);
  });
"
```
*Ensure passwords are generated securely and securely transmitted.*

### Client Onboarding (Enterprise Provisioning)
To onboard a new enterprise node to the mTLS network:
1. Run the issuance script on the **Offline CA Machine**:
   ```bash
   ./nginx/pki/issue_client_cert.sh client_001
   ```
2. Distribute `client_001.crt`, `client_001.key`, and `ca.crt` to the enterprise node via a secure channel (e.g., encrypted USB, HashiCorp Vault).
3. Have the client place the keys in `/opt/zeroclaw/keys/` and install the agent package.

---

## 4. Client Revocation (Emergency)
If a client node is compromised, its certificate must be immediately revoked at the mTLS layer to sever its connection to the Hub.

1. **Revoke the Certificate (Offline CA Machine):**
   ```bash
   cd nginx/pki
   openssl ca -config openssl.cnf -revoke certs/client_001.crt
   ```
2. **Generate the updated CRL:**
   ```bash
   openssl ca -config openssl.cnf -gencrl -out crl.pem
   ```
3. **Deploy the CRL to the Hub VPS:**
   Upload the `crl.pem` to the `nginx/pki/crl/` directory on the Hub VPS. The `nginx-crl-updater` sidecar will automatically detect the file change, verify the PEM structure to prevent truncation failures, update the active CRL, and trigger an Nginx `reload` with zero downtime.

---

## 5. Maintenance Checklist

### Weekly Operations
- [ ] **CRL Expiry Check:** The Certificate Revocation List must be reissued every 30 days. Verify the next update window:
  ```bash
  openssl crl -in nginx/pki/crl/crl.pem -noout -nextupdate
  ```
- [ ] **Let's Encrypt Certbot Timer:** Ensure the systemd timer for automatic certificate renewal is active and firing:
  ```bash
  systemctl status certbot.timer
  ```

### Monthly Operations
- [ ] **Disk Usage Audit:** Verify the size of the `failed_triage.log` inside the `zeroclaw-api-1` container. If it exceeds 500MB, manually rotate it or implement an explicit `logrotate` rule inside the container.
  ```bash
  docker exec zeroclaw-api-1 du -sh /app/logs/failed_triage.log
  ```

---

## 6. Disaster Recovery (Database Backups)
"An untested backup is a hypothesis."

### Scheduled Backups
Set up a cron job on the Hub VPS to execute a `pg_dump` and **immediately ship it off-host** (e.g., to an S3 bucket or another secure server). On-disk backups do not protect against host failure.

**Example Cron Script (`/etc/cron.daily/zeroclaw-backup`):**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec zeroclaw-db-1 pg_dump -U postgres -d zeroclaw -F c -f /tmp/backup_$DATE.dump
docker cp zeroclaw-db-1:/tmp/backup_$DATE.dump /opt/backups/
aws s3 cp /opt/backups/backup_$DATE.dump s3://zeroclaw-dr-vault/
```

### Restore Procedure
In the event of a catastrophic failure, restore the database from an off-site dump:
1. Stop the API container to prevent mid-restore writes:
   ```bash
   docker compose stop api
   ```
2. Restore the dump into the Postgres container:
   ```bash
   cat backup_YYYYMMDD_HHMMSS.dump | docker exec -i zeroclaw-db-1 pg_restore -U postgres -d zeroclaw --clean
   ```
3. Restart the API container:
   ```bash
   docker compose start api
   ```
