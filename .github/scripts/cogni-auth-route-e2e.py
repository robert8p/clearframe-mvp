#!/usr/bin/env python3
"""Exercise Cogni's complete launch/auth/tab flow on the exact Android APK."""

from __future__ import annotations

import json
import os
import re
import subprocess
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

PACKAGE = "app.gocogni.cogni"
ACTIVITY = f"{PACKAGE}/.MainActivity"
APK_PATH = os.environ["APK_PATH"]
EMAIL = os.environ["E2E_EMAIL"]
PASSWORD = os.environ["E2E_PASSWORD"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
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


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


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


def find_node(label: str, enabled: bool | None = None) -> Node | None:
    for node in dump_ui("latest"):
        if matches(node, label) and (enabled is None or node.enabled is enabled):
            return node
    return None


def swipe_up() -> None:
    adb("shell", "input", "swipe", "540", "2050", "540", "650", "450")
    time.sleep(0.9)


def swipe_down() -> None:
    adb("shell", "input", "swipe", "540", "650", "540", "2050", "450")
    time.sleep(0.8)


def scroll_to_top() -> None:
    for _ in range(5):
        swipe_down()


def wait_for(
    label: str,
    *,
    timeout: float = 35,
    enabled: bool | None = None,
    scroll: bool = False,
) -> Node:
    deadline = time.time() + timeout
    last_nodes: list[Node] = []
    next_swipe = time.time() + 1.0
    while time.time() < deadline:
        last_nodes = dump_ui("latest")
        for node in last_nodes:
            if matches(node, label) and (enabled is None or node.enabled is enabled):
                print(
                    f"FOUND {label!r}: text={node.text!r} description={node.description!r} "
                    f"enabled={node.enabled} clickable={node.clickable} bounds={node.bounds}"
                )
                return node
        if scroll and time.time() >= next_swipe:
            swipe_up()
            next_swipe = time.time() + 1.0
        else:
            time.sleep(0.7)

    print("Visible UI nodes at timeout:")
    for node in last_nodes:
        if node.text or node.description:
            print(node)
    capture_evidence(f"missing-{slug(label)}")
    raise AssertionError(f"Timed out waiting for {label!r}")


def assert_absent(label: str, *, duration: float = 3) -> None:
    deadline = time.time() + duration
    while time.time() < deadline:
        for node in dump_ui("absence-check"):
            if matches(node, label):
                capture_evidence(f"unexpected-{slug(label)}")
                raise AssertionError(f"Unexpected UI label remained visible: {label!r}")
        time.sleep(0.5)


def tap(label: str, *, enabled: bool | None = True, scroll: bool = False) -> None:
    node = wait_for(label, enabled=enabled, scroll=scroll)
    left, top, right, bottom = node.bounds
    visible_top = max(top, 1)
    visible_bottom = min(bottom, 2338)
    if visible_bottom - visible_top < 20 and scroll:
        swipe_up()
        node = wait_for(label, enabled=enabled, scroll=True)
        left, top, right, bottom = node.bounds
        visible_top = max(top, 1)
        visible_bottom = min(bottom, 2338)
    x = (left + right) // 2
    y = (visible_top + visible_bottom) // 2
    print(f"TAP {label!r} at {x},{y}")
    adb("shell", "input", "tap", str(x), str(y))
    time.sleep(1.2)


def input_text(field_label: str, value: str, *, scroll: bool = False) -> None:
    node = wait_for(field_label, enabled=True, scroll=scroll)
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


def http_json(url: str, method: str, payload: dict[str, object], headers: dict[str, str]) -> tuple[int, dict[str, object]]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method=method,
        headers={"Content-Type": "application/json", **headers},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return response.status, json.loads(raw or "{}")
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")
        try:
            body = json.loads(raw or "{}")
        except json.JSONDecodeError:
            body = {"raw": raw}
        return error.code, body


def provision_profile() -> None:
    status, token_body = http_json(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        "POST",
        {"email": EMAIL, "password": PASSWORD},
        {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    if status != 200 or not isinstance(token_body.get("access_token"), str):
        raise AssertionError(f"Could not obtain E2E access token: status={status} body={token_body}")
    token = str(token_body["access_token"])

    status, profile_body = http_json(
        f"{SUPABASE_URL}/functions/v1/mobile-api",
        "POST",
        {
            "path": "/api/mobile/profile",
            "method": "POST",
            "body": {
                "fullName": "Cogni Route E2E",
                "audienceSegment": "casual",
                "functionArea": "everyday_decisions",
                "primaryGoal": "think_more_clearly",
            },
            "context": {"timeZone": "Europe/London"},
        },
        {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {token}"},
    )
    if status != 200:
        raise AssertionError(f"Could not provision the E2E profile: status={status} body={profile_body}")
    profile = profile_body.get("profile")
    if not isinstance(profile, dict) or profile.get("audience_segment") != "casual":
        raise AssertionError(f"E2E profile was not persisted correctly: {profile_body}")
    print("PASS: disposable E2E profile provisioned through the production mobile API.")


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
    if "FATAL EXCEPTION" in logs and f"Process: {PACKAGE}" in logs:
        raise AssertionError(f"Fatal Android exception during {label}")
    if "Fatal signal" in logs and PACKAGE in logs:
        raise AssertionError(f"Fatal native signal during {label}")
    if any(marker in logs for marker in ["Cogni startup/render error", "JavascriptException"]):
        raise AssertionError(f"React Native startup failure during {label}")
    print(f"NO FATAL CRASH: {label}")


def assert_welcome() -> None:
    scroll_to_top()
    wait_for("Learn smarter. Think deeper.", timeout=45)
    wait_for("Get started", enabled=True, scroll=True)
    wait_for("I already have an account", enabled=True, scroll=True)
    assert_absent("Reset your password")


def test_all_tabs() -> None:
    tap("Home")
    wait_for("Hello, Cogni", timeout=45, scroll=True)
    assert_absent("Something went wrong")

    tap("Skills")
    wait_for("Explore your skill map", timeout=45)
    wait_for("Skills", timeout=45)
    assert_absent("Something went wrong")

    tap("Train")
    wait_for("Find your best starting point", timeout=45)
    wait_for("Start your check", timeout=45, scroll=True)
    assert_absent("Something went wrong")

    tap("Progress")
    wait_for("See what’s changing", timeout=45)
    assert_absent("Something went wrong")

    tap("Profile")
    wait_for("Cogni Route E2E", timeout=45)
    wait_for("Learning context", timeout=45, scroll=True)
    assert_absent("Something went wrong")


def main() -> int:
    print("=== Runtime identity ===")
    print(f"Android API: {adb('shell', 'getprop', 'ro.build.version.sdk').strip()}")
    print(f"Android release: {adb('shell', 'getprop', 'ro.build.version.release').strip()}")

    provision_profile()
    adb("uninstall", PACKAGE, check=False)
    print(adb("install", APK_PATH))
    adb("shell", "pm", "clear", PACKAGE)

    # Fresh install must open on Welcome, never password reset.
    force_stop_and_launch("fresh install")
    assert_welcome()

    # The password-reset page must provide working actions, including empty-form validation.
    tap("I already have an account", scroll=True)
    wait_for("Welcome back")
    tap("Forgot password?", scroll=True)
    wait_for("Reset your password")
    wait_for("Back to sign in", enabled=True, scroll=True)
    wait_for("Send recovery email", enabled=True, scroll=True)
    tap("Send recovery email", scroll=True)
    wait_for("Enter your email address first.")

    # Killing the app on recovery must not make recovery the next default route.
    force_stop_and_launch("signed-out relaunch from recovery")
    assert_welcome()

    # Back to sign in must leave recovery deterministically.
    tap("I already have an account", scroll=True)
    wait_for("Welcome back")
    tap("Forgot password?", scroll=True)
    wait_for("Reset your password")
    tap("Back to sign in", scroll=True)
    wait_for("Welcome back")
    assert_absent("Reset your password")

    # Recovery submission must complete against live Supabase Auth.
    tap("Forgot password?", scroll=True)
    wait_for("Reset your password")
    input_text("Email", EMAIL)
    tap("Send recovery email", scroll=True)
    wait_for("Recovery email sent", timeout=45)
    tap("Back to sign in", scroll=True)
    wait_for("Welcome back")

    # Establish a real persisted session through the app UI.
    input_text("Email", EMAIL)
    input_text("Password", PASSWORD, scroll=True)
    tap("Sign in", scroll=True)
    wait_for("Home", timeout=60)
    wait_for("Train", timeout=60)
    assert_absent("Reset your password")

    # Every primary tab must load its live API-backed screen without the shared error state.
    test_all_tabs()

    # A stale signed-out reset deep link must not displace a signed-in learner.
    open_deep_link("cogni://forgot-password")
    wait_for("Home", timeout=45)
    assert_absent("Reset your password")

    # Session and correct route must survive a true cold relaunch.
    force_stop_and_launch("signed-in relaunch")
    wait_for("Home", timeout=60)
    wait_for("Train", timeout=60)
    test_all_tabs()

    # Sign-out must return to the Welcome route and keep recovery from becoming the fallback.
    tap("Profile")
    wait_for("Cogni Route E2E", timeout=45)
    tap("Sign out", scroll=True)
    assert_welcome()

    assert_no_fatal_crash("complete launch, auth and tab flow")
    capture_evidence("pass")
    print(
        "PASS: fresh launch, recovery controls, recovery email, sign-in, every tab, "
        "stale deep-link rejection, persisted relaunch and sign-out all worked on the exact APK."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"E2E FAILURE: {error}")
        capture_evidence("failure")
        raise
