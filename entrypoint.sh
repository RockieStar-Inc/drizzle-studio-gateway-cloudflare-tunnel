#!/bin/bash

# Exit on any error
set -e

# Graceful shutdown handler
# This function will be called when the script receives a SIGTERM or SIGINT signal.
shutdown() {
  echo "Shutting down..."
  # Kill all child processes of this script.
  kill $(jobs -p) 2>/dev/null || true
  wait
  exit 0
}

trap shutdown SIGTERM SIGINT

# Start Drizzle Studio Gateway in the background
echo "Starting Drizzle Studio Gateway..."
PORT=${PORT:-4983} STORE_PATH=${STORE_PATH:-/app/data} gateway &

# Start the Cloudflare tunnel wrapper in the background
echo "Starting Cloudflare tunnel wrapper..."
bun run src/index.ts &

# Wait for any process to exit. The `wait -n` command waits for the next job to terminate.
# The script will exit, and the container will stop if either the gateway or the tunnel fails.
wait -n

# If one process exits, we trigger the shutdown to terminate the other.
shutdown