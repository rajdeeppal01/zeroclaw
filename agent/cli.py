import argparse
import sys
import os
import json
from datetime import datetime
from llm.triage import extract_threat
from core.transmit import transmit_threat

def log_failure(log_line: str, error_msg: str):
    """
    Writes failed payloads to a local audit log.
    NOTE: This file is an unbounded append target and MUST be managed via logrotate
    or a size cap in a long-running daemon environment.
    """
    log_file = "failed_triage.log"
    
    # Ensure file exists with restrictive 0600 permissions to protect sensitive log contents
    # inside the enterprise boundary.
    if not os.path.exists(log_file):
        # Create empty file
        open(log_file, "a").close()
        # Restrict permissions (owner read/write only)
        os.chmod(log_file, 0o600)
        
    with open(log_file, "a") as f:
        f.write(f"[{datetime.now().isoformat()}] ERROR: {error_msg}\n")
        f.write(f"RAW LOG: {log_line}\n")
        f.write("-" * 80 + "\n")

def main():
    parser = argparse.ArgumentParser(description="OpenClaw Threat Intelligence Agent (Single-Shot Harness)")
    
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    triage_parser = subparsers.add_parser("triage", help="Triage a raw log line, validate as STIX, and transmit")
    triage_parser.add_argument("--log", required=True, help="The raw log string to parse")
    triage_parser.add_argument("--cert", required=True, help="Path to the enterprise client certificate")
    triage_parser.add_argument("--key", required=True, help="Path to the enterprise client private key")
    triage_parser.add_argument("--url", default="https://localhost/api/v1/threats", help="The Hub's ingress URL")
    
    args = parser.parse_args()
    
    if args.command == "triage":
        print("[*] Initiating OpenClaw LLM Triage...")
        try:
            stix_indicator = extract_threat(args.log)
            print("[+] Successfully parsed and validated STIX 2.1 Indicator:")
            print(stix_indicator.model_dump_json(indent=2))
        except Exception as e:
            print(f"[-] Triage Failed: {str(e)}", file=sys.stderr)
            log_failure(args.log, str(e))
            sys.exit(1)
            
        print(f"[*] Transmitting to Hub ({args.url})...")
        try:
            # Note: ca_bundle=None defaults to verify=False for localhost local testing.
            # Production deployments MUST pass the Hub's Root CA here.
            response = transmit_threat(stix_indicator, args.url, args.cert, args.key)
            print("[+] Transmission Successful!")
            print(json.dumps(response, indent=2))
        except Exception as e:
            print(f"[-] Transmission Failed: {str(e)}", file=sys.stderr)
            sys.exit(1)

if __name__ == "__main__":
    main()
