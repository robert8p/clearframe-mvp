#!/usr/bin/env bash
set -u -o pipefail

APK="/tmp/cogni-0.3.1.apk"
PACKAGE="app.gocogni.cogni"
ACTIVITY="app.gocogni.cogni/.MainActivity"
OUT="/tmp/cogni-startup-debug"
mkdir -p "$OUT"

adb wait-for-device

echo "=== Emulator ==="
echo "Android release: $(adb shell getprop ro.build.version.release | tr -d '\r')"
echo "API level: $(adb shell getprop ro.build.version.sdk | tr -d '\r')"
echo "ABI: $(adb shell getprop ro.product.cpu.abi | tr -d '\r')"

echo "=== Install ==="
adb install -r "$APK"
adb shell pm clear "$PACKAGE" || true
adb shell dumpsys package "$PACKAGE" | grep -E "versionName=|versionCode=" | head -5 || true

adb logcat -c

echo "=== Cold launch ==="
set +e
adb shell am start -W -S -n "$ACTIVITY" > "$OUT/am-start.txt" 2>&1
START_EXIT=$?
set -e
cat "$OUT/am-start.txt"
echo "am_start_exit=$START_EXIT"

sleep 8
PID_8="$(adb shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true)"
echo "pid_after_8_seconds=${PID_8:-NONE}"

sleep 22
PID_30="$(adb shell pidof "$PACKAGE" 2>/dev/null | tr -d '\r' || true)"
echo "pid_after_30_seconds=${PID_30:-NONE}"

adb exec-out screencap -p > "$OUT/screenshot.png" || true
adb shell uiautomator dump /sdcard/cogni-window.xml >/dev/null 2>&1 || true
adb pull /sdcard/cogni-window.xml "$OUT/window.xml" >/dev/null 2>&1 || true
adb shell dumpsys window windows > "$OUT/windows.txt" || true
adb shell dumpsys activity activities > "$OUT/activities.txt" || true
adb shell dumpsys activity processes > "$OUT/processes.txt" || true
adb logcat -d -v threadtime > "$OUT/logcat.txt"

echo "=== Current focus ==="
grep -E "mCurrentFocus|mFocusedApp|topResumedActivity" "$OUT/windows.txt" "$OUT/activities.txt" | tail -30 || true

echo "=== Cogni / crash markers ==="
grep -nE "FATAL EXCEPTION|AndroidRuntime|Process: app\.gocogni\.cogni|app\.gocogni\.cogni|ReactNativeJS|ReactNative|SoLoader|UnsatisfiedLinkError|NoClassDefFoundError|ClassNotFoundException|SecurityException|IllegalStateException|IllegalArgumentException|RuntimeException|SIGABRT|SIGSEGV|Fatal signal|Abort message|Expo|Hermes" "$OUT/logcat.txt" | tail -400 || true

echo "=== Final logcat tail ==="
tail -250 "$OUT/logcat.txt" || true

if [ "$START_EXIT" -ne 0 ]; then
  echo "FAIL: Android activity manager could not launch Cogni."
  exit 1
fi

if [ -z "$PID_8" ] || [ -z "$PID_30" ]; then
  echo "FAIL: Cogni did not remain alive for 30 seconds after a clean cold launch."
  exit 1
fi

echo "PASS: Cogni remained alive for 30 seconds after a clean cold launch."
