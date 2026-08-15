import os
import sys
import time
import json
import urllib3
import requests
import subprocess
import ctypes
import re

# Suppress insecure request warnings for our self-signed cert
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
HUB_URL = "https://35.232.141.95:443/api/v1/feed"
RULE_NAME = "ZeroClaw Blocklist"
POLL_INTERVAL_SECONDS = 30

# Resolve paths to the PKI certificates
script_dir = os.path.dirname(os.path.abspath(__file__))
cert_path = os.path.join(script_dir, "..", "pki", "certs", "client-client-personal-laptop.crt")
key_path = os.path.join(script_dir, "..", "pki", "certs", "client-client-personal-laptop.key")
CERT = (cert_path, key_path)

def is_admin():
    """Check if the script is running with Administrator privileges."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def extract_ip_from_stix(stix_pattern):
    """Extract the IP address from a STIX 2.1 pattern."""
    # Matches: [ipv4-addr:value = '192.168.1.1']
    match = re.search(r"value\s*=\s*'([^']+)'", stix_pattern)
    if match:
        return match.group(1)
    return None

def fetch_feed():
    """Fetch the active threat feed from the ZeroClaw Hub."""
    try:
        response = requests.get(HUB_URL, cert=CERT, verify=False, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[!] Failed to fetch feed from Hub: {e}")
        return []

def update_windows_firewall(ips):
    """Update the Windows Defender Firewall rule with the list of malicious IPs."""
    if not ips:
        print("[*] No active threats to block.")
        return

    # Join IPs with comma for the remoteip parameter
    ip_list_str = ",".join(ips)
    
    print(f"[*] Enforcing blocklist for {len(ips)} IP addresses...")

    # Check if rule exists
    check_cmd = f'netsh advfirewall firewall show rule name="{RULE_NAME}"'
    result = subprocess.run(check_cmd, capture_output=True, text=True, shell=True)

    if "No rules match the specified criteria" in result.stdout:
        # Create the rule if it doesn't exist
        print(f"[*] Creating master firewall rule: {RULE_NAME}")
        create_cmd = (
            f'netsh advfirewall firewall add rule name="{RULE_NAME}" '
            f'dir=in action=block remoteip="{ip_list_str}" enable=yes'
        )
        subprocess.run(create_cmd, shell=True, check=True, stdout=subprocess.DEVNULL)
        
        create_out_cmd = (
            f'netsh advfirewall firewall add rule name="{RULE_NAME}_OUT" '
            f'dir=out action=block remoteip="{ip_list_str}" enable=yes'
        )
        subprocess.run(create_out_cmd, shell=True, check=True, stdout=subprocess.DEVNULL)
    else:
        # Update the existing rule
        update_cmd = (
            f'netsh advfirewall firewall set rule name="{RULE_NAME}" '
            f'new remoteip="{ip_list_str}"'
        )
        subprocess.run(update_cmd, shell=True, check=True, stdout=subprocess.DEVNULL)

        update_out_cmd = (
            f'netsh advfirewall firewall set rule name="{RULE_NAME}_OUT" '
            f'new remoteip="{ip_list_str}"'
        )
        subprocess.run(update_out_cmd, shell=True, check=True, stdout=subprocess.DEVNULL)

    print("[+] Firewall successfully updated and locked down.")

def main():
    print("=======================================")
    print("   ZeroClaw Windows Endpoint Agent")
    print("=======================================")
    
    if not is_admin():
        print("[!] FATAL: This agent requires Administrator privileges to configure the Windows Firewall.")
        print("    Please right-click your terminal and select 'Run as Administrator'.")
        sys.exit(1)

    if not os.path.exists(cert_path):
        print(f"[!] FATAL: Client certificate not found at {cert_path}")
        print("    Please ensure you have generated the certificate for this laptop.")
        sys.exit(1)

    print("[*] Agent authenticated and running. Press Ctrl+C to stop.\n")
    
    try:
        while True:
            feed_data = fetch_feed()
            malicious_ips = []
            
            for item in feed_data.get("data", []):
                if item.get("pattern"):
                    ip = extract_ip_from_stix(item["pattern"])
                    if ip:
                        malicious_ips.append(ip)

            update_windows_firewall(malicious_ips)
            
            # Poll every 30 seconds
            time.sleep(POLL_INTERVAL_SECONDS)
            
    except KeyboardInterrupt:
        print("\n[*] Agent shutting down.")
        sys.exit(0)

if __name__ == "__main__":
    main()
