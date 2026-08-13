#!/bin/bash
set -e

# Directories
mkdir -p certs crl
cd certs

echo "=== 1. Generating Offline Root CA ==="
openssl genrsa -out root-ca.key 4096
openssl req -new -x509 -days 3650 -key root-ca.key -out root-ca.crt -subj "/C=US/O=Syndicate/CN=Syndicate Offline Root CA"

echo "=== 2. Generating Active Intermediate CA ==="
openssl genrsa -out intermediate-ca.key 4096
openssl req -new -key intermediate-ca.key -out intermediate-ca.csr -subj "/C=US/O=Syndicate/CN=Syndicate Active Intermediate CA"
# Sign the intermediate with the Root CA (Add basicConstraints so it can act as a CA)
cat <<EOF > v3_ext.cnf
basicConstraints = critical, CA:TRUE, pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOF
openssl x509 -req -days 1825 -in intermediate-ca.csr -CA root-ca.crt -CAkey root-ca.key -CAcreateserial -extfile v3_ext.cnf -out intermediate-ca.crt

# Create CA Chain (Intermediate + Root) for Nginx to verify clients against
cat intermediate-ca.crt root-ca.crt > ca-chain.crt

echo "=== 3. Generating Nginx Server Certificate ==="
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/C=US/O=Syndicate/CN=localhost"
openssl x509 -req -days 365 -in server.csr -CA intermediate-ca.crt -CAkey intermediate-ca.key -CAcreateserial -out server.crt

echo "=== 4. Generating Client Certificate (Enterprise A) ==="
openssl genrsa -out client-ent-a.key 2048
openssl req -new -key client-ent-a.key -out client-ent-a.csr -subj "/C=US/O=Enterprise A/CN=enterprise-a"
openssl x509 -req -days 365 -in client-ent-a.csr -CA intermediate-ca.crt -CAkey intermediate-ca.key -CAcreateserial -out client-ent-a.crt

echo "=== 5. Setting up CA Databases for CRLs ==="
cd ..
mkdir -p ca_db_root ca_db_inter
touch ca_db_root/index.txt ca_db_inter/index.txt
echo "1000" > ca_db_root/crlnumber
echo "1000" > ca_db_inter/crlnumber

# Root CA Config
cat <<EOF > ca_db_root/ca.conf
[ ca ]
default_ca = CA_default
[ CA_default ]
dir             = ./ca_db_root
database        = \$dir/index.txt
crlnumber       = \$dir/crlnumber
default_md      = default
default_crl_days= 3650
certificate     = ./certs/root-ca.crt
private_key     = ./certs/root-ca.key
EOF

# Intermediate CA Config
cat <<EOF > ca_db_inter/ca.conf
[ ca ]
default_ca = CA_default
[ CA_default ]
dir             = ./ca_db_inter
database        = \$dir/index.txt
crlnumber       = \$dir/crlnumber
default_md      = default
default_crl_days= 30
certificate     = ./certs/intermediate-ca.crt
private_key     = ./certs/intermediate-ca.key
EOF

echo "=== 6. Generating Initial CRLs ==="
openssl ca -gencrl -config ca_db_root/ca.conf -out crl/root.crl
openssl ca -gencrl -config ca_db_inter/ca.conf -out crl/intermediate.crl

# Combine into a single chain for Nginx
cat crl/root.crl crl/intermediate.crl > crl/ca-chain.crl

echo "PKI setup complete. Next: manually remove certs/root-ca.key and back it up offline."
