#!/bin/bash
set -e

# Directories
mkdir -p certs crl
cd certs

echo "=== 1. Generating Offline Root CA ==="
# In a real production environment, this key would be generated on an airgapped machine.
openssl genrsa -out root-ca.key 4096
openssl req -new -x509 -days 3650 -key root-ca.key -out root-ca.crt -subj "/C=US/O=Syndicate/CN=Syndicate Offline Root CA"

echo "=== 2. Generating Active Intermediate CA ==="
openssl genrsa -out intermediate-ca.key 4096
openssl req -new -key intermediate-ca.key -out intermediate-ca.csr -subj "/C=US/O=Syndicate/CN=Syndicate Active Intermediate CA"
# Sign the intermediate with the Root CA
openssl x509 -req -days 1825 -in intermediate-ca.csr -CA root-ca.crt -CAkey root-ca.key -CAcreateserial -out intermediate-ca.crt

# Create CA Chain (Intermediate + Root) for Nginx to verify clients against
cat intermediate-ca.crt root-ca.crt > ca-chain.crt

echo "=== 3. Generating Nginx Server Certificate ==="
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/C=US/O=Syndicate/CN=localhost"
# Sign server cert with Intermediate CA
openssl x509 -req -days 365 -in server.csr -CA intermediate-ca.crt -CAkey intermediate-ca.key -CAcreateserial -out server.crt

echo "=== 4. Generating Client Certificate (Enterprise A) ==="
openssl genrsa -out client-ent-a.key 2048
openssl req -new -key client-ent-a.key -out client-ent-a.csr -subj "/C=US/O=Enterprise A/CN=enterprise-a"
# Sign client cert with Intermediate CA
openssl x509 -req -days 365 -in client-ent-a.csr -CA intermediate-ca.crt -CAkey intermediate-ca.key -CAcreateserial -out client-ent-a.crt

echo "=== 5. Generating Initial Empty CRL ==="
# Setup basic CA directory structure for CRL generation
cd ..
mkdir -p ca_db
touch ca_db/index.txt
echo "1000" > ca_db/crlnumber

cat <<EOF > ca_db/ca.conf
[ ca ]
default_ca = CA_default

[ CA_default ]
dir             = ./ca_db
database        = \$dir/index.txt
crlnumber       = \$dir/crlnumber
default_md      = default
default_crl_days= 30
certificate     = ./certs/intermediate-ca.crt
private_key     = ./certs/intermediate-ca.key
EOF

# Generate empty CRL
openssl ca -gencrl -config ca_db/ca.conf -out crl/intermediate.crl

echo "PKI setup complete."
