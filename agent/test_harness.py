import subprocess
import time
import uuid
import sys

def run_cli_submit(text):
    cmd = [
        sys.executable, "cli.py",
        "triage",
        "--log", text,
        "--cert", "../pki/certs/client-enterprise-b.crt",
        "--key", "../pki/certs/client-enterprise-b.key"
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        return result
    except subprocess.TimeoutExpired:
        return type('obj', (object,), {'stdout': 'TIMEOUT', 'stderr': 'TIMEOUT'})

print("=== Phase 3 Verification Harness ===", flush=True)
print("1. Happy Path Submission...", flush=True)
res = run_cli_submit(f"Malicious IP detected: 192.168.1.{uuid.uuid4().hex[:4]}")
if "Threat intelligence accepted" in res.stdout:
    print("[PASS] Happy path succeeded.", flush=True)
else:
    print(f"[FAIL] Happy path failed:\n{res.stderr}\n{res.stdout}", flush=True)

print("\n2. Adversarial Flood (Triggering Quarantine)...", flush=True)
for i in range(25):
    res = run_cli_submit(f"Flood IP {i}: 10.0.0.{i}")
    if "Quarantined" in res.stderr or "Quarantined" in res.stdout:
        print(f"[PASS] Quarantine triggered on attempt {i+1}.", flush=True)
        break
else:
    print("[FAIL] Quarantine was not triggered after 25 attempts.", flush=True)

print("\n3. Post-Quarantine Submission Check...", flush=True)
res = run_cli_submit("Post-quarantine test")
if "Quarantined" in res.stderr or "Quarantined" in res.stdout:
    print("[PASS] Client remains quarantined.", flush=True)
else:
    print("[FAIL] Client bypassed quarantine.", flush=True)
