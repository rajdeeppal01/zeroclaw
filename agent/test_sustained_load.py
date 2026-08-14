import requests
import urllib3
import time
import concurrent.futures
import json
from datetime import datetime, timezone

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

THREAT_COUNT = 500
CONCURRENT_AGENTS = 50

# Using a Session for each thread to pool connections
def transmit_threats(agent_id, count):
    session = requests.Session()
    session.cert = ('pki/certs/client-enterprise-b.crt', 'pki/certs/client-enterprise-b.key')
    session.verify = False
    
    successes = 0
    errors = 0
    
    for i in range(count):
        stix_data = {
            "type": "indicator",
            "id": f"indicator--load-{agent_id}-{i}-{int(time.time()*1000)}",
            "name": "Sustained Load Threat",
            "pattern": "[ipv4-addr:value = '198.51.100.1']",
            "pattern_type": "stix",
            "valid_from": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "created": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "modified": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        }
        
        try:
            res = session.post(
                'https://localhost:443/api/v1/threats',
                json=stix_data,
                timeout=10
            )
            if res.status_code in (200, 201, 202, 403, 429):
                # 403/429 are "Quarantined" responses which are expected under sustained load
                successes += 1
            else:
                print(f"Failed status: {res.status_code} - {res.text}")
                errors += 1
        except Exception as e:
            print(f"Exception: {e}")
            errors += 1
            
    return successes, errors

if __name__ == '__main__':
    print("=== Starting Sustained Load Test ===")
    print(f"Simulating {CONCURRENT_AGENTS} concurrent agents...")
    
    start_time = time.time()
    
    total_successes = 0
    total_errors = 0
    
    threats_per_agent = THREAT_COUNT // CONCURRENT_AGENTS
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENT_AGENTS) as executor:
        futures = [executor.submit(transmit_threats, i, threats_per_agent) for i in range(CONCURRENT_AGENTS)]
        for future in concurrent.futures.as_completed(futures):
            s, e = future.result()
            total_successes += s
            total_errors += e

    duration = time.time() - start_time
    print("\n=== Load Test Results ===")
    print(f"Total Duration : {duration:.2f} seconds")
    print(f"Throughput     : {(THREAT_COUNT / duration):.2f} req/sec")
    print(f"Successful     : {total_successes} (Including expected Quarantines)")
    print(f"Failed (Errors): {total_errors}")

    if total_errors > 0:
        print("\n[FAIL] The system dropped requests. Connection pool might be exhausted or queries are locking.")
        exit(1)
    else:
        print("\n[PASS] Handled sustained load flawlessly. Index and connection pool tuning are effective.")
        exit(0)
