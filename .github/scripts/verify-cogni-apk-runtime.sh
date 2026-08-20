#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${APK_PATH:?APK_PATH is required}"
PACKAGE="app.gocogni.cogni"
ACTIVITY="$PACKAGE/.MainActivity"
API_LEVEL="${API_LEVEL:-unknown}"
OUT="/tmp/cogni-runtime-api-${API_LEVEL}"
mkdir -p "$OUT"

adb wait-for-device
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global transition_animation_scale 0 || true
adb shell settings put global animator_duration_scale 0 || true

echo "=== Android runtime ==="
echo "api_level=$(adb shell getprop ro.build.version.sdk | tr -d '\r')"
echo "android_release=$(adb shell getprop ro.build.version.release | tr -d '\r')"
echo "abi=$(adb shell getprop ro.product.cpu.abi | tr -d '\r')"

adb uninstall "$PACKAGE" >/dev/null 2>&1 || true
adb install "$APK_PATH"
adb shell pm clear "$PACKAGE" >/dev/null
adb shell dumpsys package "$PACKAGE" > "$OUT/package.txt"
grep -E "versionName=|versionCode=" "$OUT/package.txt" | head -10

after_launch_evidence() {
  local label="$1"
  local wait_seconds="$2"
  local start_file="$OUT/am-start-${label}.txt"
  local log_file="$OUT/logcat-${label}.txt"
  local xml_remote="/sdcard/cogni-window-${label}.xml"
  local xml_local="$OUT/window-${label}.xml"

  adb logcat -c
  adb shell am force-stop "$PACKAGE"
  adb shell am start -W -S -n "$ACTIVITY" > "$start_file" 2>&1
  cat "$start_file"

  sleep "$wait_seconds"
  local pid
  pid="$(adb shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true)"
  echo "${label}_pid_after_${wait_seconds}_seconds=${pid:-NONE}"
  if [ -z "$pid" ]; then
    adb logcat -d -v threadtime > "$log_file" || true
    tail -300 "$log_file" || true
    echo "FAIL: Cogni exited during the ${label} launch."
    exit 1
  fi

  adb shell dumpsys activity activities > "$OUT/activities-${label}.txt" || true
  adb shell dumpsys window windows > "$OUT/windows-${label}.txt" || true
  adb exec-out screencap -p > "$OUT/screenshot-${label}.png" || true
  adb shell uiautomator dump --compressed "$xml_remote" >/dev/null 2>&1 || true
  adb pull "$xml_remote" "$xml_local" >/dev/null 2>&1 || true
  adb logcat -d -v threadtime > "$log_file" || true

  if grep -q "Process: $PACKAGE" "$log_file" && grep -q "FATAL EXCEPTION" "$log_file"; then
    grep -nE "FATAL EXCEPTION|Process: $PACKAGE|AndroidRuntime" "$log_file" | tail -120 || true
    echo "FAIL: Cogni produced a fatal Android exception during ${label}."
    exit 1
  fi
  if grep -qE "Fatal signal .*\($PACKAGE\)|Abort message:.*$PACKAGE" "$log_file"; then
    grep -nE "Fatal signal|Abort message" "$log_file" | tail -120 || true
    echo "FAIL: Cogni produced a fatal native signal during ${label}."
    exit 1
  fi
  if grep -q "Cogni startup/render error" "$log_file"; then
    grep -n "Cogni startup/render error" "$log_file" | tail -40 || true
    echo "FAIL: Cogni reached its startup error boundary during ${label}."
    exit 1
  fi

  local focus
  focus="$(grep -E "mCurrentFocus|mFocusedApp|topResumedActivity" "$OUT/windows-${label}.txt" "$OUT/activities-${label}.txt" | tail -20 || true)"
  echo "$focus"
  if ! grep -q "$PACKAGE" <<<"$focus"; then
    echo "FAIL: Cogni was alive but was not the foreground application during ${label}."
    exit 1
  fi

  if [ ! -s "$xml_local" ]; then
    echo "FAIL: Android could not read Cogni's visible UI during ${label}."
    exit 1
  fi
  if grep -Fq "This Cogni build is incomplete" "$xml_local"; then
    cat "$xml_local"
    echo "FAIL: The APK launched the incomplete-build configuration screen."
    exit 1
  fi

  local welcome_hits=0
  for text in "Learn smarter. Think deeper." "Get started" "I already have an account"; do
    if grep -Fq "$text" "$xml_local"; then
      welcome_hits=$((welcome_hits + 1))
    fi
  done
  echo "${label}_welcome_markers=$welcome_hits"
  if [ "$welcome_hits" -lt 2 ]; then
    cat "$xml_local"
    echo "FAIL: Cogni stayed alive but did not render the expected signed-out welcome experience."
    exit 1
  fi
}

after_launch_evidence "first-cold-launch" 60
after_launch_evidence "second-cold-launch" 30

echo "PASS: Cogni installed cleanly, rendered the welcome screen, remained foreground/alive for 60 seconds, and survived a second cold launch on Android API $API_LEVEL."
