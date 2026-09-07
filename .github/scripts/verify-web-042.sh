#!/usr/bin/env bash
set -euo pipefail
mkdir -p /tmp/cogni-browser
exec > >(tee /tmp/cogni-browser/actions.txt) 2>&1
npm install --no-package-lock --no-audit --no-fund
npm run build > /tmp/cogni-browser/build.txt 2>&1
npm install --global agent-browser
agent-browser --version > /tmp/cogni-browser/browser-version.txt
agent-browser install --with-deps
printf '%s\n' "$SOURCE_COMMIT" > /tmp/cogni-browser/source-sha.txt
npm run start > /tmp/cogni-browser/server.txt 2>&1 &
SERVER_PID=$!
finish() {
  agent-browser errors > /tmp/cogni-browser/browser-errors.txt || true
  agent-browser console > /tmp/cogni-browser/browser-console.txt || true
  agent-browser get url > /tmp/cogni-browser/final-url.txt || true
  agent-browser snapshot -i > /tmp/cogni-browser/final-snapshot.txt || true
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
  agent-browser snapshot -i > "/tmp/cogni-browser/home-${width}.txt"
  agent-browser eval 'if(!document.body.innerText.includes("Train your thinking")||!document.body.innerText.includes("Get started")) throw new Error("Missing real value proposition"); if(document.querySelector("[data-nextjs-dialog]")) throw new Error("Framework error"); if(document.documentElement.scrollWidth>innerWidth+1) throw new Error("Home overflow"); if(!document.querySelector(".cg-practice-demo .cg-full").disabled) throw new Error("Empty answer is submittable"); const shell=document.querySelector(".cg-editorial-landing"); if(shell.scrollHeight>shell.clientHeight+1 && getComputedStyle(shell).overflowY==="hidden") throw new Error("Landing clips content"); "Home passed"'
  agent-browser screenshot --full "/tmp/cogni-browser/home-${width}.png"
  agent-browser click 'a[href="#try-cogni"]'
  agent-browser eval 'document.querySelector(".cg-demo-option").scrollIntoView({block:"center"})'
  agent-browser click '.cg-demo-option:first-child'
  agent-browser wait --fn 'document.querySelector(".cg-demo-option:first-child").getAttribute("aria-checked") === "true"'
  agent-browser eval 'document.querySelector(".cg-practice-demo .cg-full").scrollIntoView({block:"center"})'
  agent-browser click '.cg-practice-demo .cg-full'
  agent-browser wait --fn 'document.querySelector(".cg-demo-feedback") !== null'
  agent-browser eval 'if(!document.querySelector("[role=status]")?.textContent.includes("Look for the evidence")) throw new Error("Missing corrective explanation"); "Review outcome passed"'
  agent-browser screenshot --full "/tmp/cogni-browser/example-review-${width}.png"
  agent-browser click '.cg-demo-reset'
  agent-browser wait --fn 'document.activeElement === document.querySelector(".cg-demo-option:first-child")'
  agent-browser press ArrowDown
  agent-browser wait --fn 'document.querySelectorAll(".cg-demo-option")[1].getAttribute("aria-checked") === "true"'
  agent-browser press ArrowDown
  agent-browser wait --fn 'document.querySelectorAll(".cg-demo-option")[2].getAttribute("aria-checked") === "true"'
  agent-browser press Tab
  agent-browser wait --fn 'document.activeElement === document.querySelector(".cg-practice-demo .cg-full")'
  agent-browser press Enter
  agent-browser wait --fn 'document.querySelector(".cg-demo-feedback") !== null'
  agent-browser eval 'if(!document.querySelector("[role=status]")?.textContent.includes("strongest next step")) throw new Error("Missing correct explanation"); if(document.documentElement.scrollWidth>innerWidth+1) throw new Error("Feedback overflow"); "Arrow keys, focus, keyboard submission and correct outcome passed"'
  agent-browser screenshot --full "/tmp/cogni-browser/example-correct-${width}.png"
  agent-browser eval 'document.querySelector(".cg-public-phone a[href=\"/signup\"]").scrollIntoView({block:"center"})'
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
agent-browser set viewport 640 900
agent-browser open http://127.0.0.1:3000/
agent-browser wait --load networkidle
agent-browser eval 'const sizes=Array.from(document.querySelectorAll("h1,h2,p,span,a,button,strong,.cg-kicker")).map(e=>({e,font:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)})); for(const {e,font,line} of sizes){e.style.setProperty("font-size",(font*2)+"px","important");if(Number.isFinite(line))e.style.setProperty("line-height",(line*2)+"px","important");} "Doubled computed text sizes without changing the viewport"'
agent-browser screenshot --full /tmp/cogni-browser/home-large-text.png
agent-browser eval 'if(document.documentElement.scrollWidth>innerWidth+1) throw new Error("Large-text overflow"); "Large-text layout probe passed"'
printf 'PASS: production build; meaningful scrollable Home at 320/390/430/1280px; empty submit blocked; corrective/correct demo outcomes; reset; arrow-key radio navigation and keyboard submission; signup/sign-in navigation; overflow checks; doubled-text layout probe at 640px; no accounts created.\n' > /tmp/cogni-browser/result.txt
