#!/bin/sh
set -e

# Change to the directory where this script is located
cd "$(dirname "$0")"

echo "[$(date)] === Regenerating Intermediate CRL ==="
openssl ca -gencrl -config ca_db_inter/ca.conf -out crl/intermediate.crl

echo "[$(date)] === Rebuilding Combined CRL ==="
cat crl/root.crl crl/intermediate.crl > crl/ca-chain.crl.tmp.$$
openssl crl -in crl/ca-chain.crl.tmp.$$ -noout
mv crl/ca-chain.crl.tmp.$$ crl/ca-chain.crl

echo "[$(date)] CRL successfully renewed."

# Safety Net: Extract the nextUpdate date and log it.
EXPIRY_DATE=$(openssl crl -in crl/intermediate.crl -nextupdate -noout | cut -d= -f2)

# We use GNU date (coreutils) for reliable parsing
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))

echo "[$(date)] INFO: New CRL expires in $DAYS_LEFT days ($EXPIRY_DATE)"

if [ "$DAYS_LEFT" -lt 14 ]; then
  echo "[FATAL] Intermediate CRL expires in less than 14 days! Exiting non-zero to trigger failure." >&2
  exit 1
fi
