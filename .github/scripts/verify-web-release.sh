#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/cogni-browser
npm install --no-package-lock --no-audit --no-fund
npm run build > /tmp/cogni-browser/build.txt 2>&1
npm install --global agent-browser
agent-browser install --with-deps
printf '%s\n' "$SOURCE_COMMIT" > /tmp/cogni-browser/source-sha.txt
npm run start > /tmp/cogni-browser/server.txt 2>&1 &
SERVER_PID=$!
finish() {
  agent-browser errors > /tmp/cogni-browser/browser-errors.txt || true
  agent-browser console > /tmp/cogni-browser/browser-console.txt || true
  agent-browser screenshot --full /tmp/cogni-browser/final-page.png || true
  agent-browser close || true
  kill "$SERVER_PID" || true
}
trap finish EXIT
for n in $(seq 1 40); do curl -sf http://127.0.0.1:3000/ >/dev/null && break; sleep 1; done
for width in 320 390 430 1280; do
  agent-browser set viewport "$width" 844
  agent-browser open http://127.0.0.1:3000/
  agent-browser wait --load networkidle
  agent-browser eval 'if(!document.body.innerText.includes("Get started")) throw new Error("Missing welcome action"); if(document.querySelector("[data-nextjs-dialog]")) throw new Error("Framework error"); if(document.documentElement.scrollWidth>innerWidth+1) throw new Error("Home overflow"); "Home passed"'
  agent-browser screenshot --full "/tmp/cogni-browser/home-${width}.png"
  agent-browser click '.cg-public-phone a[href="/signup"]'
  agent-browser wait --fn 'location.pathname === "/signup"'
  agent-browser wait --load networkidle
  agent-browser eval 'if(!document.querySelector("#auth-email")||!document.querySelector("#auth-password")) throw new Error("Missing signup fields"); if(document.documentElement.scrollWidth>innerWidth+1) throw new Error("Signup overflow"); "Signup passed"'
  agent-browser screenshot --full "/tmp/cogni-browser/signup-${width}.png"
  agent-browser click '.cg-auth-switch a[href="/login"]'
  agent-browser wait --fn 'location.pathname === "/login"'
  agent-browser wait --load networkidle
  agent-browser eval 'if(!document.querySelector("#auth-email")||!document.querySelector("#auth-password")) throw new Error("Missing login fields"); if(document.documentElement.scrollWidth>innerWidth+1) throw new Error("Login overflow"); "Login passed"'
  agent-browser screenshot --full "/tmp/cogni-browser/login-${width}.png"
done
printf 'PASS: production web build; Home, signup and sign-in navigation at 320/390/430/1280px; no accounts created.\n' > /tmp/cogni-browser/result.txt
