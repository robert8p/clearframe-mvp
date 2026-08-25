#!/usr/bin/env python3
"""Exercise Cogni's signed-out and signed-in authentication routing on Android."""

from __future__ import annotations

import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

PACKAGE = "app.gocogni.cogni"
ACTIVITY = f"{PACKAGE}/.MainActivity"
APK_PATH = os.environ["APK_PATH"]
EMAIL = os.environ["E2E_EMAIL"]
PASSWORD = os.environ["E2E_PASSWORD"]
API_LEVEL = os.environ.get("API_LEVEL", "unknown")
OUT = Path(f"/tmp/cogni-auth-route-api-{API_LEVEL}")
OUT.mkdir(parents=True, exist_ok=True)


@dataclass
class Node:
    text: str
    description: str
    enabled: bool
    clickable: bool
    bounds: tuple[int, int, int, int]


def run(*args: str, check: bool = True, capture: bool = True) -> str:
    result = subprocess.run(
        list(args),
        check=False,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
    )
    output = result.stdout or ""
    if check and result.returncode != 0:
        print(output)
        raise RuntimeError(f"Command failed ({result.returncode}): {' '.join(args)}")
    return output


def adb(*args: str, check: bool = True) -> str:
    return run("adb", *args, check=check)


def dump_ui(label: str) -> list[Node]:
    remote = "/sdcard/cogni-auth-window.xml"
    adb("shell", "uiautomator", "dump", "--compressed", remote, check=False)
    xml_text = adb("shell", "cat", remote, check=False)
    (OUT / f"window-{label}.xml").write_text(xml_text, encoding="utf-8")
    if "<hierarchy" not in xml_text:
        return []

    root = ET.fromstring(xml_text)
    nodes: list[Node] = []
    for element in root.iter("node"):
        raw_bounds = element.attrib.get("bounds", "")
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", raw_bounds)
        if not match:
            continue
        nodes.append(
            Node(
                text=element.attrib.get("text", ""),
                description=element.attrib.get("content-desc", ""),
                enabled=element.attrib.get("enabled", "false") == "true",
                clickable=element.attrib.get("clickable", "false") == "true",
                bounds=tuple(int(value) for value in match.groups()),
            )
        )
    return nodes


def matches(node: Node, label: str) -> bool:
    return label == node.text or label == node.description or label in node.text or label in node.description


def wait_for(label: str, *, timeout: float = 35, enabled: bool | None = None) -> Node:
    deadline = time.time() + timeout
    last_nodes: list[Node] = []
    while time.time() < deadline:
        last_nodes = dump_ui("latest")
        for node in last_nodes:
            if matches(node, label) and (enabled is None or node.enabled is enabled):
                print(f"FOUND {label!r}: text={node.text!r} description={node.description!r} enabled={node.enabled} clickable={node.clickable}")
                return node
        time.sleep(1)
    print("Visible UI nodes at timeout:")
    for node in last_nodes:
        if node.text or node.description:
            print(node)
    capture_evidence(f"missing-{slug(label)}")
    raise AssertionError(f"Timed out waiting for {label!r}")


def assert_absent(label: str, *, duration: float = 4) -> None:
    deadline = time.time() + duration
    while time.time() < deadline:
        for node in dump_ui("absence-check"):
            if matches(node, label):
                capture_evidence(f"unexpected-{slug(label)}")
                raise AssertionError(f"Unexpected UI label remained visible: {label!r}")
        time.sleep(0.5)


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def tap(label: str, *, enabled: bool | None = True) -> None:
    node = wait_for(label, enabled=enabled)
    left, top, right, bottom = node.bounds
    x = (left + right) // 2
    y = (top + bottom) // 2
    print(f"TAP {label!r} at {x},{y}")
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(1)


def input_text(field_label: str, value: str) -> None:
    node = wait_for(field_label, enabled=True)
    left, top, right, bottom = node.bounds
    adb("shell", "input", "tap", str((left + right) // 2), str((top + bottom) // 2))
    time.sleep(0.4)
    adb("shell", "input", "keyevent", "KEYCODE_MOVE_END", check=False)
    escaped = value.replace("%", "%25").replace(" ", "%s")
    adb("shell", "input", "text", escaped)
    time.sleep(0.8)


def force_stop_and_launch(label: str) -> None:
    print(f"=== {label}: force stop and cold launch ===")
    adb("shell", "am", "force-stop", PACKAGE)
    adb("logcat", "-c")
    output = adb("shell", "am", "start", "-W", "-S", "-n", ACTIVITY)
    print(output)
    time.sleep(5)
    pid = adb("shell", "pidof", PACKAGE, check=False).strip()
    if not pid:
        capture_evidence(f"{slug(label)}-process-exited")
        raise AssertionError(f"Cogni exited during {label}")


def open_deep_link(url: str) -> None:
    print(f"OPEN DEEP LINK {url}")
    output = adb(
        "shell",
        "am",
        "start",
        "-W",
        "-a",
        "android.intent.action.VIEW",
        "-d",
        url,
        PACKAGE,
    )
    print(output)
    time.sleep(5)


def capture_evidence(label: str) -> None:
    safe = slug(label)
    try:
        (OUT / f"logcat-{safe}.txt").write_text(adb("logcat", "-d", "-v", "threadtime", check=False), encoding="utf-8")
        (OUT / f"activity-{safe}.txt").write_text(adb("shell", "dumpsys", "activity", "activities", check=False), encoding="utf-8")
        (OUT / f"window-{safe}.txt").write_text(adb("shell", "dumpsys", "window", "windows", check=False), encoding="utf-8")
        screenshot = subprocess.run(["adb", "exec-out", "screencap", "-p"], check=False, stdout=subprocess.PIPE).stdout
        (OUT / f"screenshot-{safe}.png").write_bytes(screenshot)
        dump_ui(safe)
    except Exception as error:  # pragma: no cover - evidence is best effort
        print(f"Could not capture all evidence for {label}: {error}")


def assert_no_fatal_crash(label: str) -> None:
    logs = adb("logcat", "-d", "-v", "threadtime", check=False)
    (OUT / f"logcat-{slug(label)}.txt").write_text(logs, encoding="utf-8")
    fatal_patterns = [
        f"Process: {PACKAGE}",
        "FATAL EXCEPTION",
        "Fatal signal",
        "Cogni startup/render error",
        "JavascriptException",
    ]
    if "FATAL EXCEPTION" in logs and f"Process: {PACKAGE}" in logs:
        raise AssertionError(f"Fatal Android exception during {label}")
    if f"Fatal signal" in logs and PACKAGE in logs:
        raise AssertionError(f"Fatal native signal during {label}")
    if any(marker in logs for marker in ["Cogni startup/render error", "JavascriptException"]):
        raise AssertionError(f"React Native startup failure during {label}")
    print(f"NO FATAL CRASH: {label}; markers checked={fatal_patterns}")


def main() -> int:
    print("=== Runtime identity ===")
    print(f"Android API: {adb('shell', 'getprop', 'ro.build.version.sdk').strip()}")
    print(f"Android release: {adb('shell', 'getprop', 'ro.build.version.release').strip()}")

    adb("uninstall", PACKAGE, check=False)
    print(adb("install", APK_PATH))
    adb("shell", "pm", "clear", PACKAGE)

    # Fresh install must open on the welcome route, never password reset.
    force_stop_and_launch("fresh install")
    wait_for("Learn smarter. Think deeper.")
    wait_for("I already have an account", enabled=True)
    assert_absent("Reset your password")

    # Visit password reset, then kill the process while that screen is active.
    tap("I already have an account")
    wait_for("Welcome back")
    tap("Forgot password?")
    wait_for("Reset your password")
    wait_for("Back to sign in", enabled=True)
    wait_for("Send recovery email", enabled=False)
    wait_for("Enter your email to enable the recovery button.")

    force_stop_and_launch("signed-out relaunch from recovery")
    wait_for("Learn smarter. Think deeper.")
    assert_absent("Reset your password")

    # The full Back to sign in button must leave recovery deterministically.
    tap("I already have an account")
    wait_for("Welcome back")
    tap("Forgot password?")
    wait_for("Reset your password")
    tap("Back to sign in")
    wait_for("Welcome back")
    assert_absent("Reset your password")

    # The recovery action must enable after input and complete successfully.
    tap("Forgot password?")
    wait_for("Reset your password")
    input_text("Email", EMAIL)
    wait_for("Send recovery email", enabled=True)
    tap("Send recovery email")
    wait_for("Recovery email sent", timeout=45)
    tap("Back to sign in")
    wait_for("Welcome back")

    # Establish a real persisted Supabase session through the app UI.
    input_text("Email", EMAIL)
    input_text("Password", PASSWORD)
    tap("Sign in")
    wait_for("Home", timeout=50)
    wait_for("Train", timeout=50)
    assert_absent("Reset your password")

    # A stale reset deep link must be rejected while signed in.
    open_deep_link("cogni://forgot-password")
    wait_for("Home", timeout=35)
    assert_absent("Reset your password")

    # Session and correct route must survive a true cold relaunch.
    force_stop_and_launch("signed-in relaunch")
    wait_for("Home", timeout=45)
    wait_for("Train", timeout=45)
    assert_absent("Reset your password")

    assert_no_fatal_crash("complete auth-route flow")
    capture_evidence("pass")
    print("PASS: welcome default, password-reset controls, recovery submission, sign-in, stale deep-link rejection and signed-in relaunch all worked.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"E2E FAILURE: {error}")
        capture_evidence("failure")
        raise
