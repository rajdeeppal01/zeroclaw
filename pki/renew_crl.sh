#!/bin/sh
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

echo "[$(date)] === Regenerating Intermediate CRL ==="
openssl ca -gencrl -config ca_db_inter/ca.conf -out crl/intermediate.crl

echo "[$(date)] === Rebuilding Combined CRL ==="
cat crl/root.crl crl/intermediate.crl > crl/ca-chain.crl

echo "[$(date)] CRL successfully renewed."

# Safety Net: Extract the nextUpdate date and log it.
# A proper monitoring tool (like Datadog/Prometheus) would scrape this log line
# to alert if the date doesn't advance, or we can add a basic check here.
EXPIRY=$(openssl crl -in crl/intermediate.crl -nextupdate -noout)
echo "[$(date)] INFO: New CRL $EXPIRY"
