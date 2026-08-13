#!/bin/sh
# This script monitors the CRL file for changes and reloads Nginx.
# In a real environment, this could be run via a cron job or a file watcher (like inotify).

# Simple cron-like loop for the Docker container
while true; do
    # Check if the CRL file has been updated in the last 60 seconds
    if find /etc/nginx/crl/ca-chain.crl -mmin -1 | grep -q '.*'; then
        echo "CRL updated. Reloading Nginx..."
        nginx -s reload
    fi
    sleep 60
done
