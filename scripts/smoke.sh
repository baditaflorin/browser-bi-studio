#!/usr/bin/env bash
set -euo pipefail

npm run build
node scripts/validate-pages.mjs

port="${PORT:-4173}"
while lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1; do
  port=$((port + 1))
done

PORT="${port}" node scripts/pages-server.mjs >/tmp/browser-bi-studio-smoke.log 2>&1 &
server_pid=$!
trap 'kill ${server_pid} >/dev/null 2>&1 || true' EXIT

for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:${port}/browser-bi-studio/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

PLAYWRIGHT_BASE_URL="http://127.0.0.1:${port}/" npm run smoke -- --config=playwright.config.ts
