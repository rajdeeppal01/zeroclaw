import os
import re
import json
import requests
import ipaddress
import urllib3
import tempfile
import sys
from typing import Set, List

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

STATE_FILE = ".zeroclaw_state.json"
BLOCKLIST_FILE = "blocklist.txt"

def load_whitelist(whitelist_path: str) -> List[ipaddress.IPv4Network]:
    """Loads CIDR ranges from the shared whitelist file, ignoring comments and blank lines."""
    networks = []
    if not os.path.exists(whitelist_path):
        print(f"[-] Whitelist file {whitelist_path} not found. Proceeding with caution.")
        return networks
        
    with open(whitelist_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            try:
                # Support both naked IPs (1.2.3.4) and CIDRs (1.2.3.0/24)
                networks.append(ipaddress.IPv4Network(line, strict=False))
            except ValueError as e:
                print(f"[-] Invalid whitelist entry skipped '{line}': {e}", file=sys.stderr)
    return networks

def is_whitelisted(ip_str: str, whitelist_networks: List[ipaddress.IPv4Network]) -> bool:
    """Returns True if the given IP is contained within any of the whitelist networks."""
    try:
        ip = ipaddress.IPv4Address(ip_str)
        for network in whitelist_networks:
            if ip in network:
                return True
        return False
    except ValueError:
        # If it's not a valid IPv4, block it anyway or fail?
        # The regex validation in bash will catch it anyway, but we should drop invalid IPs here too.
        print(f"[-] Invalid IPv4 string received: {ip_str}")
        return True # "Whitelisting" drops it from the blocklist

def extract_ip_from_stix(pattern: str) -> str:
    """Extracts the IPv4 address from a STIX 2.1 pattern like: [ipv4-addr:value = '198.51.100.1']"""
    match = re.search(r"\[ipv4-addr:value\s*=\s*'([^']+)'\]", pattern)
    if match:
        return match.group(1)
    return None

def consume_feed(url: str, cert_path: str, key_path: str, whitelist_path: str, output_path: str = BLOCKLIST_FILE):
    """Polls the API for approved threats, applies whitelist, and writes atomically."""
    state = {'cursor': None, 'active_ips': []}
    
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            try:
                state = json.load(f)
            except json.JSONDecodeError:
                print("[-] Failed to parse state file. Starting fresh.")
                
    cursor = state.get('cursor')
    active_ips = set(state.get('active_ips', []))
    
    params = {}
    if cursor:
        params['since'] = cursor

    print(f"[*] Polling feed {url} (since: {cursor or 'beginning'})...")
    
    session = requests.Session()
    session.cert = (cert_path, key_path)
    session.verify = False # Development only
    
    try:
        res = session.get(url, params=params, timeout=10)
        res.raise_for_status()
    except Exception as e:
        print(f"[-] Failed to poll feed: {e}", file=sys.stderr)
        sys.exit(1)
        
    payload = res.json()
    threats = payload.get('data', [])
    new_timestamp = payload.get('timestamp')
    
    if not threats:
        print("[+] No new threats. Feed is up to date.")
        return

    print(f"[+] Retrieved {len(threats)} new threats.")
    whitelist_networks = load_whitelist(whitelist_path)
    
    added = 0
    for t in threats:
        if t.get('type') != 'indicator' or t.get('pattern_type') != 'stix':
            continue
            
        ip = extract_ip_from_stix(t.get('pattern', ''))
        if not ip:
            continue
            
        if is_whitelisted(ip, whitelist_networks):
            print(f"[*] Skipping whitelisted IP: {ip}")
            continue
            
        active_ips.add(ip)
        added += 1

    print(f"[*] Processed new threats. Total active blocked IPs: {len(active_ips)} (+{added})")
    
    # Write atomically
    temp_fd, temp_path = tempfile.mkstemp(dir=os.path.dirname(os.path.abspath(output_path)))
    try:
        with os.fdopen(temp_fd, 'w') as f:
            for ip in sorted(active_ips):
                f.write(f"{ip}\n")
        # Atomic rename
        os.replace(temp_path, output_path)
    except Exception as e:
        print(f"[-] Failed to write blocklist: {e}")
        os.unlink(temp_path)
        sys.exit(1)
        
    # Save local state
    state['cursor'] = new_timestamp
    state['active_ips'] = list(active_ips)
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)
        
    print(f"[+] Successfully wrote {output_path} atomically.")

