# ZeroClaw Agent

The ZeroClaw Agent is a lightweight, unprivileged Python client designed to consume Threat Intelligence from the ZeroClaw Hub and locally enforce network blocklists.

## Deployment Architecture

The agent strictly adheres to the principle of least privilege:
1. **Unprivileged Data Fetching:** The Python agent runs as a standard, unprivileged service user. It connects to the ZeroClaw Hub via mutually authenticated TLS (mTLS), securely fetching the latest STIX indicators and maintaining a local `.zeroclaw_state.json`.
2. **Privileged Enforcement:** A dedicated root cron job runs `apply_firewall.sh`, which explicitly validates the data written by the agent, ensuring no malformed IP sets can crash the firewall, and executes the actual `ipset swap` with zero downtime.

## Installation

### 1. Key Placement
Ensure your enterprise-issued mTLS certificates are placed securely in the expected directory (default `/opt/zeroclaw/keys/`):
- `client.crt`
- `client.key`
- `ca.crt` (The ZeroClaw Offline Root CA)

### 2. Environment Setup
The agent requires Python 3.9+ and the `uv` package manager.

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
uv pip install pydantic requests
```

### 3. Execution (Data Fetching)
The agent should be run periodically (e.g., via a systemd timer or cron job) by an unprivileged user.

```bash
# Fetch the latest incremental updates
python cli.py --hub-url https://hub.zeroclaw.local:443 --cert /opt/zeroclaw/keys/client.crt --key /opt/zeroclaw/keys/client.key --ca /opt/zeroclaw/keys/ca.crt

# Force a full state synchronization (recommended every 1 hour)
python cli.py --hub-url https://hub.zeroclaw.local:443 --cert /opt/zeroclaw/keys/client.crt --key /opt/zeroclaw/keys/client.key --ca /opt/zeroclaw/keys/ca.crt --full-sync
```

### 4. Firewall Enforcement
Configure a root cron job to run the `apply_firewall.sh` script every 5 minutes to continuously enforce the blocklist state.

```bash
# Edit root crontab
sudo crontab -e

# Add the following entry:
*/5 * * * * /path/to/zeroclaw/agent/apply_firewall.sh >> /var/log/zeroclaw_firewall.log 2>&1
```
