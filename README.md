# ZeroClaw: Enterprise Threat Intelligence Hub

![ZeroClaw Dashboard](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue)

ZeroClaw is a highly secure, enterprise-grade Threat Intelligence Sharing Platform (TIP). It allows distributed security agents (like servers running fail2ban) to securely ingest and share malicious IP data across an entire network using the STIX 2.1 standard.

If one server in your network gets attacked, ZeroClaw ensures that every other server in your network instantly downloads the attacker's IP and blocks it before they can strike again.

## 🛡️ Architecture & Security

ZeroClaw is built with **Military-Grade Security** from the ground up:

*   **Zero-Trust mTLS Authentication:** The ingestion endpoints are protected by Nginx enforcing Mutual TLS. A client *must* possess a cryptographic certificate signed by your private Root CA to even establish a TCP connection.
*   **STIX 2.1 Standard:** All threats are transmitted and stored using the STIX 2.1 standard (the global standard for cyber threat intelligence).
*   **Dynamic Quarantines:** The API tracks the ingestion rate of every agent. If a hacked or misconfigured agent starts spamming the network, the API automatically quarantines the agent and ignores its STIX payloads until an Analyst manually un-quarantines them.
*   **Decoupled Analyst Control Plane:** The beautiful, glassmorphic React dashboard is isolated from the ingestion pipeline, ensuring Analysts always have a fast, responsive UI to triage threats.

## 🚀 Quick Start (Run Locally)

You can spin up the entire ZeroClaw infrastructure (PostgreSQL database, Nginx mTLS Proxy, Express.js STIX API, and React Frontend) on your local machine using Docker.

### 1. Prerequisites
*   Docker & Docker Compose installed.
*   Python 3.9+ (for running the mock agent).

### 2. Boot the Infrastructure
Clone the repository and spin up the Docker containers.
```bash
git clone https://github.com/your-username/ZeroClaw.git
cd ZeroClaw
docker-compose up -d
```

### 3. Seed the Database
Initialize the Analyst account and seed the database.
```bash
docker exec -e ANALYST_SEED_PASSWORD=SecurePassword123! threat-hub-api sh -c 'npx prisma db push && npx prisma db seed'
```

### 4. Access the Analyst Dashboard
Open your web browser and navigate to:
**`https://localhost:8443`**

*(Note: Because we use a self-signed Root CA for local development, your browser will warn you that the connection is not private. Click "Advanced" -> "Proceed to localhost").*

**Login Credentials:**
*   Username: `admin`
*   Password: `SecurePassword123!`

## 🕵️‍♂️ Simulating an Attack

Now that the Hub is running, let's simulate a client getting attacked and reporting it to the Hub!

We have included a mock agent script that uses a pre-generated test certificate (`client-enterprise-b.crt`) to authenticate with the Hub via mTLS.

1. Open a terminal and navigate to the `ZeroClaw` folder.
2. Install the required python package:
```bash
pip install requests
```
3. Run the mock attack script:
```bash
python agent/send_mock.py
```
*You should see a `201 Created` response in your terminal.*

4. Go back to your **ZeroClaw Dashboard** in your browser.
5. Click refresh on the **Triage Queue**. You will see the new STIX threat report waiting for your approval!
6. Click **Approve**. 
7. Check the **Active Feed** tab to see the threat published to the global network.

## 🗂️ Repository Structure

*   `/api/` - The Express.js backend (handles STIX ingestion, rate-limiting, and PostgreSQL CRUD).
*   `/frontend/` - The React Vite frontend (Analyst UI).
*   `/nginx/` - Nginx configuration enforcing strict mTLS on port 443.
*   `/pki/` - The Public Key Infrastructure scripts and pre-generated test certificates.
*   `/agent/` - Python scripts simulating client agents reporting threats.

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
