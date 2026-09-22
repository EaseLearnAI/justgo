#!/usr/bin/env bash
# Per-boot startup for the "Just Go!" dev environment.
# Idempotent: starts MongoDB, the backend API, and the frontend dev server
# only if they are not already listening. Backgrounds long-running processes
# and returns so container start can complete.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MONGO_PORT=27017
MONGO_DBPATH=/data/db
MONGO_LOG=/tmp/mongod.log
BACKEND_LOG=/tmp/justgo-backend.log
FRONTEND_LOG=/tmp/justgo-frontend.log

port_up() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

wait_for_port() {
  local port="$1" tries="${2:-30}"
  for _ in $(seq 1 "$tries"); do
    if port_up "$port"; then return 0; fi
    sleep 1
  done
  return 1
}

# --- MongoDB ---
mkdir -p "$MONGO_DBPATH" 2>/dev/null || sudo mkdir -p "$MONGO_DBPATH"
sudo chown -R "$(id -u)":"$(id -g)" "$MONGO_DBPATH" 2>/dev/null || true
if port_up "$MONGO_PORT"; then
  echo "==> MongoDB already running on ${MONGO_PORT}"
else
  echo "==> Starting MongoDB"
  nohup mongod --dbpath "$MONGO_DBPATH" --bind_ip 127.0.0.1 --port "$MONGO_PORT" \
    > "$MONGO_LOG" 2>&1 &
  wait_for_port "$MONGO_PORT" 30 || { echo "!! MongoDB not ready; see $MONGO_LOG" >&2; exit 1; }
fi
echo "==> MongoDB ready on 127.0.0.1:${MONGO_PORT}"

# --- Backend API (port 3000) ---
if port_up 3000; then
  echo "==> Backend already running on 3000"
else
  echo "==> Starting backend API"
  ( cd "$REPO_ROOT/mapbackend" && nohup npm start > "$BACKEND_LOG" 2>&1 & )
  wait_for_port 3000 30 || echo "!! Backend did not become ready; see $BACKEND_LOG" >&2
fi

# --- Frontend dev server (port 5173) ---
if port_up 5173; then
  echo "==> Frontend already running on 5173"
else
  echo "==> Starting frontend dev server"
  ( cd "$REPO_ROOT/mapvue" && nohup npm run dev > "$FRONTEND_LOG" 2>&1 & )
  wait_for_port 5173 45 || echo "!! Frontend did not become ready; see $FRONTEND_LOG" >&2
fi

echo "==> start.sh complete (mongo:27017, api:3000, web:5173)"
