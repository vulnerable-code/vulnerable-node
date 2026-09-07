#!/usr/bin/env bash
# Local equivalent of the CI smoke job (ci-hardened.yml → smoke):
# build, boot the hardened stack, wait for HTTP 200, assert non-root, tear down.
# APP_PORT env (default 8888) selects the host port, matching compose.
set -euo pipefail

cd "$(dirname "$0")"

APP_PORT="${APP_PORT:-8888}"
BASE_URL="http://localhost:${APP_PORT}"

cleanup() {
  docker compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[smoke] building and starting stack (port ${APP_PORT})…"
docker compose up -d --build

echo "[smoke] waiting for http 200 on /login (max 60s)…"
code=""
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "${BASE_URL}/login" || true)
  [ "$code" = "200" ] && break
  [ "$i" = "60" ] && { echo "[smoke] FAIL: /login never returned 200 (last: $code)"; exit 1; }
  sleep 1
done
echo "[smoke] /login is up (200 after ${i}s)"

echo "[smoke] asserting web runs as non-root…"
user=$(docker compose exec -T web whoami)
[ "$user" = "node" ] || { echo "[smoke] FAIL: whoami='$user', expected 'node'"; exit 1; }
echo "[smoke] whoami = node ✓"

echo "[smoke] asserting read-only rootfs…"
ro=$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "$(docker compose ps -q web)")
[ "$ro" = "true" ] || { echo "[smoke] FAIL: ReadonlyRootfs=$ro"; exit 1; }
echo "[smoke] ReadonlyRootfs = true ✓"

echo "[smoke] PASS"