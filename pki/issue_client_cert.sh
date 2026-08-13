#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <enterprise-name>"
  echo "Example: $0 enterprise-b"
  exit 1
fi

ENT_NAME=$1
ENT_O="Enterprise ${ENT_NAME^}"

echo "=== Issuing Client Certificate for ${ENT_O} (CN=${ENT_NAME}) ==="

# Generate Private Key
openssl genrsa -out "certs/client-${ENT_NAME}.key" 2048

# Generate CSR
openssl req -new \
    -key "certs/client-${ENT_NAME}.key" \
    -out "certs/client-${ENT_NAME}.csr" \
    -subj "/C=US/ST=State/L=City/O=${ENT_O}/CN=${ENT_NAME}"

# Sign with Intermediate CA
openssl x509 -req -days 365 \
    -in "certs/client-${ENT_NAME}.csr" \
    -CA certs/intermediate-ca.crt \
    -CAkey certs/intermediate-ca.key \
    -CAcreateserial \
    -out "certs/client-${ENT_NAME}.crt"

echo "=== Certificate successfully issued! ==="
echo "Private Key: certs/client-${ENT_NAME}.key"
echo "Certificate: certs/client-${ENT_NAME}.crt"
