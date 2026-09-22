#!/usr/bin/env bash
# Idempotent repository bootstrap for the "Just Go!" project.
# Installs backend + frontend dependencies and generates the backend .env
# (which is gitignored) with local development defaults.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing backend dependencies (mapbackend)"
( cd mapbackend && npm install )

# The bundled npm (10.9.x on the default image) hits an arborist peer-resolution
# bug on this dependency graph; --legacy-peer-deps installs reliably.
echo "==> Installing frontend dependencies (mapvue)"
( cd mapvue && npm install --legacy-peer-deps )

if [ ! -f mapbackend/.env ]; then
  echo "==> Generating mapbackend/.env with development defaults"
  cat > mapbackend/.env <<'EOF'
# 服务器配置
PORT=3000
NODE_ENV=development

# MongoDB 配置
MONGODB_URI=mongodb://localhost:27017/mapbackend

# JWT 配置
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRE=7d

# 日志配置
LOG_LEVEL=dev
EOF
else
  echo "==> mapbackend/.env already exists, leaving it untouched"
fi

echo "==> install.sh complete"
