# Implementation Plan: Pragmatic Threat Intelligence Syndicate

This plan breaks down the construction of the architecture into two distinct, manageable bodies of work. It has been refined to address hosting constraints (specifically Vercel's lack of inbound mTLS support) and operational realities.

## Open Questions for the User
> [!IMPORTANT]
> **Does this updated plan correctly capture all the fixes and the ZeroClaw repository initialization?** 
> If approved, I will immediately execute Phase 0 (Repo Creation) and the Phase 1 Fixes.

## Phase 0: Foundation (ZeroClaw)
*   **Directory & Repo Setup:** Rename/move `threat-intel-hub` to `ZeroClaw` in the `projects` directory.
*   **Problem Statement:** Write `problem_statement.md` clearly defining the GIGO, privacy, and architectural challenges this pragmatic STIX/mTLS design solves.
*   **Version Control:** Initialize git, create a `.gitignore` (specifically ignoring `pki/**/*.key`), and use the `gh` CLI to create and push to a new GitHub repository named `ZeroClaw`.

## Phase 1: The Central Hub (Fixes & SaaS Infrastructure)

Because Vercel's serverless environment does not support inbound mTLS client certificate verification on their standard tiers, we must self-host the Hub using a traditional VPS (e.g., DigitalOcean, AWS EC2) with a reverse proxy terminating the TLS.

### Step 1.0: PKI & Certificate Authority Setup
*   Initialize a local Certificate Authority.
*   **Security Standard (Offline Root):** The `generate_certs.sh` script will output the Root CA key, but documentation and scripts will explicitly mandate moving the Root CA key off-server after creation.
*   **Revocation Script:** Create a dedicated `pki/revoke_cert.sh` script to streamline OpenSSL revocation and CRL generation.
*   Establish the workflow for generating client `.pem` and `.key` files for onboarding new enterprises.

### Step 1.1: mTLS Reverse Proxy (Nginx)
*   Configure Nginx as a reverse proxy to terminate the mTLS connection.
*   **Strict Volume Mounts:** Ensure `docker-compose.yml` only mounts the public certs and the CRL into the Nginx container, explicitly excluding any private keys (except `server.key`).
*   **Regex CN Mapping:** Update `nginx.conf` with a `map` block to correctly extract the `$ssl_client_s_dn_cn` variable from `$ssl_client_s_dn` using regex, as Nginx does not provide it natively.
*   **Process Supervisor:** Create a custom `entrypoint.sh` for the Nginx container that runs the CRL watcher loop in the background and then `exec nginx -g "daemon off;"`, ensuring both processes survive and terminate cleanly.
*   If valid, Nginx strips the TLS and forwards the request to the backend Node.js API, injecting the verified Common Name (CN).

### Step 1.2: Backend API & Database (Express + PostgreSQL)
*   Build a Node/Express REST API.
*   **Header Spoofing Mitigation:** Ensure the Express server is bound **strictly to `127.0.0.1`** (or an isolated internal Docker network).
*   **Documentation:** Add a permanent comment in `docker-compose.yml` explaining why the Express port is intentionally NOT mapped to the host, preventing future regressions.
*   Define the ORM schema (Prisma/Drizzle) for storing IOCs.
*   Tables: `Clients` (mapped to the CN header from Nginx), `ThreatReports` (raw submissions), and `ValidatedIOCs` (the finalized feed).

### Step 1.3: Scoped STIX Validation
*   Create a `POST /api/v1/threats` endpoint.
*   Implement strict schema validation (using Zod or JSON Schema). 
*   **Scope:** Restrict the schema to a tight subset of STIX 2.1 — specifically `Indicator` objects limited to `ipv4-addr`, `domain-name`, and file hashes (SHA-256).

### Step 1.4: The Admin Dashboard (HITL Queue)
*   Build a simple React/Next.js UI (which *can* be hosted on Vercel, reading from the Postgres DB) for the Human-in-the-Loop review process.
*   Display newly submitted IOCs with an "Approve" or "Reject" button.

## Phase 2: The Edge Agent (OpenClaw + LLM)

This phase builds the deployable Docker container that enterprises will run on their own hardware.

### Step 2.1: The Local Environment Setup
*   Create a Dockerfile that installs OpenClaw, Python 3.11, and Ollama (or vLLM).
*   Enforce security policies (`USER nonroot`, read-only filesystem).

### Step 2.2: Log Ingestion & Prompt Engineering
*   Write a Python script that acts as an OpenClaw "Skill."
*   It tails a local WAF log file (e.g., Nginx access logs or generic syslog).
*   Design the strict system prompt for the LLM: *"You are a SOC analyst. Analyze this log. If it is a threat, extract the IP. Output ONLY valid JSON matching this specific STIX Indicator format."*

### Step 2.3: Pydantic Schema Validation (Anti-Injection)
*   Implement a Pydantic model representing the scoped STIX 2.1 subset.
*   Pipe the LLM's raw text response into the Pydantic validator. If it throws a validation error (e.g., due to a structural prompt injection), log the error and drop the payload.

### Step 2.4: Secure Transmission
*   Configure the Python script to package the validated JSON.
*   Use the `requests` library to POST the data to the Hub's Nginx endpoint, explicitly loading the enterprise's client `.pem` and `.key` files for mTLS authentication.
