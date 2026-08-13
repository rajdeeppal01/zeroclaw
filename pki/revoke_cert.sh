#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <certificate_file.crt>"
  echo "Example: $0 certs/client-ent-a.crt"
  exit 1
fi

CERT_FILE=$1

if [ ! -f "$CERT_FILE" ]; then
  echo "Error: Certificate file not found: $CERT_FILE"
  exit 1
fi

echo "=== Revoking Certificate: $CERT_FILE ==="
openssl ca -revoke "$CERT_FILE" -config ca_db_inter/ca.conf

echo "=== Regenerating Intermediate CRL ==="
openssl ca -gencrl -config ca_db_inter/ca.conf -out crl/intermediate.crl

echo "=== Rebuilding Combined CRL ==="
cat crl/root.crl crl/intermediate.crl > crl/ca-chain.crl.tmp
openssl crl -in crl/ca-chain.crl.tmp -noout
mv crl/ca-chain.crl.tmp crl/ca-chain.crl

echo "Revocation complete. The Nginx watcher should automatically reload within 60 seconds."
