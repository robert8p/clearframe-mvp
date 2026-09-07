#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/cogni-browser
exec > >(tee /tmp/cogni-browser/actions.txt) 2>&1
npm install --no-package-lock --no-audit --no-fund
npm run build > /tmp/cogni-browser/build.txt 2>&1
npm install --global agent-browser
agent-browser install --with-deps
npm install --prefix /tmp/cogni-browser-tools --no-audit --no-fund playwright
/tmp/cogni-browser-tools/node_modules/.bin/playwright install chromium
printf '%s\n' "$SOURCE_COMMIT" > /tmp/cogni-browser/source-sha.txt
npm run start > /tmp/cogni-browser/server.txt 2>&1 &
SERVER_PID=$!
trap 'agent-browser close || true; kill "$SERVER_PID" || true' EXIT
for n in $(seq 1 40); do curl -sf http://127.0.0.1:3000/ >/dev/null && break; sleep 1; done
agent-browser open http://127.0.0.1:3000/
agent-browser wait --load networkidle
agent-browser snapshot -i > /tmp/cogni-browser/agent-initial-snapshot.txt
agent-browser screenshot --full /tmp/cogni-browser/agent-initial.png
agent-browser errors > /tmp/cogni-browser/agent-errors.txt
agent-browser close
node .github/scripts/verify-web-042.mjs
