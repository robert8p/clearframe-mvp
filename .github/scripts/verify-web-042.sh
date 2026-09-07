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
python3 - <<'PY'
from pathlib import Path
import json,re,struct
root=Path('/tmp/cogni-browser');results=[]
for p in sorted(root.glob('*.png')):
    match=re.search(r'-(320|390|430|1280)\.png$',p.name)
    expected=int(match.group(1)) if match else 640 if p.name=='home-large-text.png' else None
    if expected is None:continue
    data=p.read_bytes()
    assert data[:8]==b'\x89PNG\r\n\x1a\n',p.name+' is not PNG'
    width,height=struct.unpack('>II',data[16:24])
    assert width==expected,f'Actual screenshot overflow: {p.name} width {width}, expected {expected}'
    results.append({'file':p.name,'width':width,'height':height})
assert len(results)==21
(root/'screenshot-boundaries.json').write_text(json.dumps({'status':'PASS','screenshots':results},indent=2))
print('PASS: all 21 full-page screenshots match the exact viewport width, including doubled text.')
PY
