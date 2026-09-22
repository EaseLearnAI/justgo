#!/usr/bin/env bash
# Per-boot startup: ensure a local MongoDB daemon is running and ready.
# Idempotent: does nothing if MongoDB is already listening on 27017.
set -euo pipefail

MONGO_PORT=27017
MONGO_DBPATH=/data/db
MONGO_LOG=/tmp/mongod.log

mkdir -p "$MONGO_DBPATH" 2>/dev/null || sudo mkdir -p "$MONGO_DBPATH"
# Best-effort ownership fix so mongod can write without root.
sudo chown -R "$(id -u)":"$(id -g)" "$MONGO_DBPATH" 2>/dev/null || true

is_up() { (exec 3<>"/dev/tcp/127.0.0.1/${MONGO_PORT}") 2>/dev/null; }

if is_up; then
  echo "==> MongoDB already running on ${MONGO_PORT}"
else
  echo "==> Starting MongoDB (dbpath=${MONGO_DBPATH}, log=${MONGO_LOG})"
  nohup mongod --dbpath "$MONGO_DBPATH" --bind_ip 127.0.0.1 --port "$MONGO_PORT" \
    > "$MONGO_LOG" 2>&1 &
  for _ in $(seq 1 30); do
    if is_up; then break; fi
    sleep 1
  done
fi

if is_up; then
  echo "==> MongoDB is ready on 127.0.0.1:${MONGO_PORT}"
else
  echo "!! MongoDB failed to become ready; see ${MONGO_LOG}" >&2
  exit 1
fi
