#!/usr/bin/env bash
# apply_firewall.sh
# RUNS AS ROOT (e.g., via cron)
# Reads blocklist.txt and whitelist.txt, applies strict regex validation,
# and updates ipset atomically via swap.

set -euo pipefail

BLOCKLIST_FILE="/path/to/agent/blocklist.txt"
WHITELIST_FILE="/path/to/agent/whitelist.txt"

# Provide local defaults for testing without full paths
if [ -f "blocklist.txt" ]; then BLOCKLIST_FILE="blocklist.txt"; fi
if [ -f "whitelist.txt" ]; then WHITELIST_FILE="whitelist.txt"; fi

SET_NAME_BLOCK="zeroclaw_blocklist"
SET_NAME_WHITE="zeroclaw_whitelist"

# 1. Strict IPv4/CIDR regex to prevent command injection
# Ensures lines are purely IPs or CIDRs before ipset ever sees them.
IP_REGEX="^([0-9]{1,3}\.){3}[0-9]{1,3}(/[0-9]{1,2})?$"

# 2. Setup Whitelist ipset (Kernel-level defense-in-depth)
ipset create $SET_NAME_WHITE hash:net -exist
ipset flush $SET_NAME_WHITE
if [ -f "$WHITELIST_FILE" ]; then
    while IFS= read -r line; do
        # Ignore comments and blank lines
        [[ -z "$line" || "$line" == \#* ]] && continue
        
        # Validate regex
        if [[ $line =~ $IP_REGEX ]]; then
            ipset add $SET_NAME_WHITE "$line" -exist
        else
            echo "[-] INVALID WHITELIST ENTRY: $line" >&2
        fi
    done < "$WHITELIST_FILE"
fi

# 3. Setup Temporary Blocklist ipset for atomic swap
TEMP_SET="${SET_NAME_BLOCK}_temp"
ipset create $SET_NAME_BLOCK hash:net -exist
ipset create $TEMP_SET hash:net -exist
ipset flush $TEMP_SET

if [ -f "$BLOCKLIST_FILE" ]; then
    while IFS= read -r line; do
        # Ignore empty lines
        [[ -z "$line" ]] && continue
        
        # Strict validation! Drop anything that isn't a valid IPv4/CIDR
        if [[ $line =~ $IP_REGEX ]]; then
            # We don't need to manually check CIDR overlap in bash because 
            # iptables will evaluate the whitelist ipset first or alongside.
            # But we can still catch exact string matches if desired.
            ipset add $TEMP_SET "$line" -exist
        else
            echo "[-] DROPPED MALFORMED BLOCKLIST LINE: $line" >&2
        fi
    done < "$BLOCKLIST_FILE"
fi

# 4. Atomic Swap! This inherently handles unblocks.
ipset swap $TEMP_SET $SET_NAME_BLOCK
ipset destroy $TEMP_SET

# 5. Ensure iptables rules exist
# We DROP traffic from the blocklist, UNLESS it matches the whitelist.
if ! iptables -C INPUT -m set --match-set $SET_NAME_BLOCK src -m set ! --match-set $SET_NAME_WHITE src -j DROP 2>/dev/null; then
    iptables -I INPUT -m set --match-set $SET_NAME_BLOCK src -m set ! --match-set $SET_NAME_WHITE src -j DROP
    echo "[+] Inserted iptables rule."
fi

echo "[+] Firewall rules successfully updated."
