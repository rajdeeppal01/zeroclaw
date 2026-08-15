import os
import time
import subprocess
import psycopg2
from psycopg2.extras import RealDictCursor

# Config
DB_URL = os.environ.get("DATABASE_URL", "postgresql://zeroclaw:zeroclaw_super_secret@postgres:5432/zeroclaw")
PKI_DIR = os.environ.get("PKI_DIR", "/pki")
POLL_INTERVAL = 5

def main():
    print("[*] Starting ZeroClaw Secure CA Signer...")
    print(f"[*] Connecting to {DB_URL}")
    
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    
    while True:
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # ATOMIC CLAIM: fetch one approved CSR and transition its status to 'signing'
                cursor.execute("""
                    UPDATE "OnboardingRequest"
                    SET status = 'signing', updated_at = NOW()
                    WHERE id = (
                        SELECT id FROM "OnboardingRequest"
                        WHERE status = 'approved'
                        ORDER BY created_at ASC
                        FOR UPDATE SKIP LOCKED
                        LIMIT 1
                    )
                    RETURNING id, username, csr_pem;
                """)
                row = cursor.fetchone()

                if row:
                    req_id = row['id']
                    username = row['username']
                    csr_pem = row['csr_pem']
                    
                    print(f"[*] Processing CSR for {username} (ID: {req_id})...")
                    
                    try:
                        # 1. Write CSR to temp file
                        csr_path = f"/tmp/{username}.csr"
                        crt_path = f"/tmp/{username}.crt"
                        
                        with open(csr_path, "w") as f:
                            f.write(csr_pem)
                        
                        # 2. Sign the CSR using the Intermediate CA
                        # Using -batch to skip interactive prompts, -notext to prevent appending human-readable cert details to PEM
                        cmd = [
                            "openssl", "ca", "-batch",
                            "-config", os.path.join(PKI_DIR, "openssl-inter.cnf"),
                            "-extensions", "client_cert",
                            "-days", "365",
                            "-notext",
                            "-md", "sha256",
                            "-in", csr_path,
                            "-out", crt_path
                        ]
                        
                        # Note: openssl ca requires the current working directory to be the PKI dir or paths correctly mapped
                        # The openssl-inter.cnf usually assumes it is in the PKI directory.
                        subprocess.run(cmd, check=True, cwd=PKI_DIR, capture_output=True, text=True)
                        
                        # 3. Read the output certificate
                        with open(crt_path, "r") as f:
                            cert_pem = f.read()
                        
                        # 4. Save to DB and mark as 'signed'
                        cursor.execute("""
                            UPDATE "OnboardingRequest"
                            SET status = 'signed', cert_pem = %s, updated_at = NOW()
                            WHERE id = %s
                        """, (cert_pem, req_id))
                        
                        print(f"[+] Successfully signed identity for {username}")
                        
                        # Cleanup temp files
                        os.remove(csr_path)
                        os.remove(crt_path)
                        
                    except subprocess.CalledProcessError as e:
                        print(f"[!] Failed to sign CSR for {username}: {e.stderr}")
                        # Mark as error in DB
                        cursor.execute("""
                            UPDATE "OnboardingRequest"
                            SET status = 'error', updated_at = NOW()
                            WHERE id = %s
                        """, (req_id,))
                    except Exception as e:
                        print(f"[!] Unexpected error processing {username}: {e}")
                        cursor.execute("""
                            UPDATE "OnboardingRequest"
                            SET status = 'error', updated_at = NOW()
                            WHERE id = %s
                        """, (req_id,))

        except Exception as e:
            print(f"[!] Database error: {e}")
            # Reconnect
            try:
                conn.close()
            except:
                pass
            time.sleep(POLL_INTERVAL)
            try:
                conn = psycopg2.connect(DB_URL)
                conn.autocommit = True
            except:
                pass
                
        time.sleep(POLL_INTERVAL)

if __name__ == "__main__":
    main()
