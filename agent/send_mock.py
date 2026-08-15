import requests
import json
import urllib3
import sys

# Suppress insecure request warnings for our self-signed cert
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

url = "https://35.232.141.95:443/api/v1/threats"
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
cert_path = os.path.join(script_dir, "..", "pki", "certs", "client-enterprise-b.crt")
key_path = os.path.join(script_dir, "..", "pki", "certs", "client-enterprise-b.key")
cert = (cert_path, key_path)

import uuid
import datetime

stix_id = f"indicator--{uuid.uuid4()}"
now = datetime.datetime.utcnow().isoformat() + "Z"

stix_payload = {
  "type": "indicator",
  "spec_version": "2.1",
  "id": stix_id,
  "created": now,
  "modified": now,
  "name": "Malicious SSH Login Attempt",
  "description": "Dropped inbound TCP connection to port 22 from 185.220.101.45",
  "pattern": "[ipv4-addr:value = '185.220.101.45']",
  "pattern_type": "stix",
  "valid_from": now,
  "labels": ["malicious-activity", "ssh-bruteforce"]
}

print("[*] Sending mock STIX payload using client-ent-a mTLS certificate...")
try:
    response = requests.post(
        url,
        json=stix_payload,
        cert=cert,
        verify=False,
        timeout=5.0
    )
    print(f"Status: {response.status_code}")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
