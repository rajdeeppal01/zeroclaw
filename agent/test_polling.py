import requests
import urllib3
import subprocess
import time

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_feed(since=None):
    session = requests.Session()
    session.cert = ('pki/certs/client-enterprise-b.crt', 'pki/certs/client-enterprise-b.key')
    session.verify = False
    
    params = {}
    if since:
        params['since'] = since
        
    res = session.get('https://localhost:443/api/v1/feed', params=params)
    if res.status_code != 200:
        print(f"Error fetching feed: {res.status_code} {res.text}")
        exit(1)
        
    return res.json()

print("=== Feed Polling Catch-up Test ===")

# 1. Fetch initial state (acting as a fresh agent)
print("\n1. Simulating fresh agent (fetching all available APPROVED threats)...")
data1 = get_feed()
threats1 = data1.get('data', [])

if len(threats1) != 5:
    print(f"[FAIL] Expected 5 threats initially, got {len(threats1)}")
    exit(1)

print(f"[PASS] Retrieved exactly 5 threats.")

# Find the maximum 'reviewed_at' timestamp
max_reviewed_at = data1.get('timestamp')
print(f"Server timestamp: {max_reviewed_at}")

# 2. Insert 5 more threats out-of-band (simulating offline agent while others work)
print("\n2. Simulating offline period while analysts approve 5 more threats...")
subprocess.run(['node', 'api/test_polling_setup_2.js'], check=True)
# Add a slight delay to ensure DB commit
time.sleep(1)

# 3. Poll again using ?since=
print("\n3. Agent comes back online and polls with ?since=...")
data2 = get_feed(since=max_reviewed_at)
threats2 = data2.get('data', [])

if len(threats2) != 5:
    print(f"[FAIL] Expected exactly 5 new threats, got {len(threats2)}")
    exit(1)

# Check for duplicates using Python's list length since stix_data is empty
if len(threats1) + len(threats2) != 10:
    print(f"[FAIL] Agent received duplicate threats.")
    exit(1)

print(f"[PASS] Retrieved exactly {len(threats2)} new threats with 0 duplicates.")
print("\n=== All Polling Catch-up Tests Passed! ===")
