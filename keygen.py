import subprocess
subprocess.run(["ssh-keygen", "-t", "rsa", "-b", "4096", "-q", "-N", "", "-f", "zeroclaw_deploy"])
