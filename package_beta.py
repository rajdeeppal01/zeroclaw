import os
import sys
import shutil
import subprocess
import zipfile

def main():
    if len(sys.argv) < 2:
        print("Usage: python package_beta.py <client_name>")
        print("Example: python package_beta.py john-doe")
        sys.exit(1)

    client_name = sys.argv[1].strip()
    
    # 1. Generate the certificates
    print(f"[*] Generating ZeroClaw certificates for client: {client_name}...")
    try:
        subprocess.run(["python", "keygen.py", "generate", "client", client_name], check=True)
    except subprocess.CalledProcessError:
        print("[!] Failed to generate certificates. Check keygen.py.")
        sys.exit(1)

    # 2. Setup package directory
    pkg_dir = os.path.join("beta_packages", client_name)
    os.makedirs(pkg_dir, exist_ok=True)

    cert_file = f"client-{client_name}.crt"
    key_file = f"client-{client_name}.key"
    
    src_cert = os.path.join("pki", "certs", cert_file)
    src_key = os.path.join("pki", "certs", key_file)
    src_agent = os.path.join("windows_agent", "windows_agent.py")

    if not os.path.exists(src_cert) or not os.path.exists(src_key):
        print(f"[!] Could not find generated certs in pki/certs/ for {client_name}")
        sys.exit(1)

    # 3. Copy files
    print("[*] Assembling package files...")
    shutil.copy(src_cert, os.path.join(pkg_dir, cert_file))
    shutil.copy(src_key, os.path.join(pkg_dir, key_file))

    # 4. Read and modify windows_agent.py to use local cert paths
    with open(src_agent, "r") as f:
        agent_code = f.read()

    # Replace the hardcoded cert paths with local paths
    import re
    # Find the block where cert_path is defined and replace it
    agent_code = re.sub(
        r'cert_path = os\.path\.join\(script_dir, "\.\.", "pki", "certs", ".*?"\)',
        f'cert_path = os.path.join(script_dir, "{cert_file}")',
        agent_code
    )
    agent_code = re.sub(
        r'key_path = os\.path\.join\(script_dir, "\.\.", "pki", "certs", ".*?"\)',
        f'key_path = os.path.join(script_dir, "{key_file}")',
        agent_code
    )

    with open(os.path.join(pkg_dir, "windows_agent.py"), "w") as f:
        f.write(agent_code)

    # 5. Write a friendly README for the end-user
    readme_content = f"""==================================================
ZeroClaw Beta Access - Windows Endpoint Agent
Prepared for: {client_name}
==================================================

Welcome to the ZeroClaw Threat Intelligence Beta!

This folder contains your unique, cryptographically secure mTLS 
certificates that grant you access to the live ZeroClaw Hub.

HOW TO ACTIVATE YOUR PROTECTION:
1. Install Python (if you don't have it): https://www.python.org/downloads/
2. Open your Windows Start Menu, type "PowerShell", right-click it, 
   and select "Run as Administrator".
3. Use the `cd` command to navigate to the folder where you extracted these files.
4. Run this command to install the required network library:
   pip install requests
5. Start the agent:
   python windows_agent.py

Your laptop is now actively syncing with the ZeroClaw B2B Threat Intelligence Hub 
and automatically locking down your Windows Defender Firewall against live threats!
"""
    with open(os.path.join(pkg_dir, "README.txt"), "w") as f:
        f.write(readme_content)

    # 6. Zip the package
    zip_filename = f"ZeroClaw_Beta_{client_name}.zip"
    zip_path = os.path.join("beta_packages", zip_filename)
    
    print(f"[*] Compressing package into {zip_filename}...")
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(pkg_dir):
            for file in files:
                abs_path = os.path.join(root, file)
                rel_path = os.path.relpath(abs_path, pkg_dir)
                zipf.write(abs_path, rel_path)

    # 7. Cleanup temp folder
    shutil.rmtree(pkg_dir)

    print(f"\n[+] SUCCESS! The beta package is ready.")
    print(f"[+] Send this file to your user: {zip_path}")

if __name__ == "__main__":
    main()
