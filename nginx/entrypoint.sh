#!/bin/sh

# Start the CRL watcher loop in the background
/etc/nginx/scripts/reload_crl.sh &
WATCHER_PID=$!

# Start Nginx in the foreground
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for Nginx to exit (or if it crashes)
wait $NGINX_PID

# If Nginx exits, kill the watcher and exit
kill $WATCHER_PID
exit 0
