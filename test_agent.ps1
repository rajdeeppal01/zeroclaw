$env:PYTHONPATH = "C:\Users\rajde\OneDrive\Desktop\projects\ZeroClaw\agent"

Write-Host "[*] Activating Python Environment..."
cd C:\Users\rajde\OneDrive\Desktop\projects\ZeroClaw\agent
.\venv\Scripts\activate

Write-Host "[*] Triaging and Transmitting Threat to Live Hub..."
python cli.py triage --log "Aug 14 09:23:12 firewall-01 kernel: [DROP] IN=eth0 OUT= SRC=185.220.101.45 DST=10.0.0.5 LEN=60 TOS=0x00 PREC=0x00 TTL=54 ID=45612 DF PROTO=TCP SPT=44532 DPT=22 WINDOW=14600 RES=0x00 SYN URGP=0" --cert ..\pki\certs\client-ent-a.crt --key ..\pki\certs\client-ent-a.key --url https://35.232.141.95:443/api/v1/threats

Write-Host "`n[*] Threat transmission complete. Check your dashboard at https://35.232.141.95:8443 !"
