#!/usr/bin/env python3
"""Exercise Cogni 0.4.0's feedback settings and no-store-key paywall."""

from __future__ import annotations

import os
import re
import subprocess
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

PACKAGE = "app.gocogni.cogni"
ACTIVITY = f"{PACKAGE}/.MainActivity"
EMAIL = os.environ["E2E_EMAIL"]
PASSWORD = os.environ["E2E_PASSWORD"]
API_LEVEL = os.environ.get("API_LEVEL", "unknown")
OUT = Path(f"/tmp/cogni-monetization-prestore-api-{API_LEVEL}")
OUT.mkdir(parents=True, exist_ok=True)


@dataclass
class Node:
    text: str
    description: str
    enabled: bool
    checked: bool
    checkable: bool
    class_name: str
    bounds: tuple[int, int, int, int]


def run(*args: str, check: bool = True) -> str:
    result = subprocess.run(list(args), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, check=False)
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
    remote = "/sdcard/cogni-monetization-window.xml"
    adb("shell", "uiautomator", "dump", "--compressed", remote, check=False)
    xml_text = adb("shell", "cat", remote, check=False)
    (OUT / f"window-{label}.xml").write_text(xml_text, encoding="utf-8")
    if "\\n" in xml_text or "\\r" in xml_text or "\\t" in xml_text:
        raise AssertionError("Visible UI contains a literal escaped control character")
    if "<hierarchy" not in xml_text:
        return []
    root = ET.fromstring(xml_text)
    nodes: list[Node] = []
    for element in root.iter("node"):
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", element.attrib.get("bounds", ""))
        if match:
            nodes.append(Node(
                text=element.attrib.get("text", ""),
                description=element.attrib.get("content-desc", ""),
                enabled=element.attrib.get("enabled", "false") == "true",
                checked=element.attrib.get("checked", "false") == "true",
                checkable=element.attrib.get("checkable", "false") == "true",
                class_name=element.attrib.get("class", ""),
                bounds=tuple(int(value) for value in match.groups()),
            ))
    return nodes


def matches(node: Node, label: str) -> bool:
    return label == node.text or label == node.description or label in node.text or label in node.description


def swipe_up() -> None:
    adb("shell", "input", "swipe", "540", "2050", "540", "650", "450")
    time.sleep(0.8)


def scroll_to_top() -> None:
    for _ in range(5):
        adb("shell", "input", "swipe", "540", "650", "540", "2050", "450")
        time.sleep(0.5)


def wait_for(label: str, *, timeout: float = 45, enabled: bool | None = None, scroll: bool = False) -> Node:
    deadline = time.time() + timeout
    last_nodes: list[Node] = []
    while time.time() < deadline:
        last_nodes = dump_ui("latest")
        for node in last_nodes:
            if matches(node, label) and (enabled is None or node.enabled is enabled):
                print(f"FOUND {label!r}: {node}")
                return node
        if scroll:
            swipe_up()
        else:
            time.sleep(0.7)
    for node in last_nodes:
        if node.text or node.description:
            print(node)
    capture("missing-" + slug(label))
    raise AssertionError(f"Timed out waiting for {label!r}")


def wait_for_input(label: str, *, timeout: float = 45, scroll: bool = False) -> Node:
    deadline = time.time() + timeout
    last_nodes: list[Node] = []
    while time.time() < deadline:
        last_nodes = dump_ui("latest-input")
        for node in last_nodes:
            if node.description == label and node.enabled:
                print(f"FOUND INPUT {label!r}: {node}")
                return node
        if scroll:
            swipe_up()
        else:
            time.sleep(0.7)
    for node in last_nodes:
        if node.text or node.description:
            print(node)
    capture("missing-input-" + slug(label))
    raise AssertionError(f"Timed out waiting for input {label!r}")


def wait_for_switch(label: str, checked: bool, *, timeout: float = 30, scroll: bool = False) -> Node:
    deadline = time.time() + timeout
    last_nodes: list[Node] = []
    while time.time() < deadline:
        last_nodes = dump_ui("latest-switch")
        for node in last_nodes:
            is_switch = node.checkable or "Switch" in node.class_name
            if is_switch and node.enabled and matches(node, label) and node.checked is checked:
                print(f"FOUND SWITCH {label!r} checked={checked}: {node}")
                return node
        if scroll:
            swipe_up()
        else:
            time.sleep(0.7)
    for node in last_nodes:
        if node.text or node.description:
            print(node)
    capture("missing-switch-" + slug(label))
    raise AssertionError(f"Timed out waiting for {label!r} switch checked={checked}")


def tap_node(node: Node) -> None:
    left, top, right, bottom = node.bounds
    visible_top = max(top, 1)
    visible_bottom = min(bottom, 2338)
    adb("shell", "input", "tap", str((left + right) // 2), str((visible_top + visible_bottom) // 2))
    time.sleep(1.1)


def tap(label: str, *, scroll: bool = False) -> None:
    node = wait_for(label, enabled=True, scroll=scroll)
    left, top, right, bottom = node.bounds
    visible_top = max(top, 1)
    visible_bottom = min(bottom, 2338)
    if visible_bottom - visible_top < 20 and scroll:
        swipe_up()
        node = wait_for(label, enabled=True, scroll=True)
    tap_node(node)


def toggle_switch(label: str, from_value: bool, to_value: bool, *, scroll: bool = False) -> None:
    node = wait_for_switch(label, from_value, scroll=scroll)
    tap_node(node)
    wait_for_switch(label, to_value)


def input_text(label: str, value: str, *, scroll: bool = False) -> None:
    node = wait_for_input(label, scroll=scroll)
    left, top, right, bottom = node.bounds
    adb("shell", "input", "tap", str((left + right) // 2), str((top + bottom) // 2))
    adb("shell", "input", "keyevent", "KEYCODE_MOVE_END", check=False)
    escaped = value.replace("%", "%25").replace(" ", "%s")
    adb("shell", "input", "text", escaped)
    time.sleep(0.7)


def capture(label: str) -> None:
    safe = slug(label)
    (OUT / f"logcat-{safe}.txt").write_text(adb("logcat", "-d", "-v", "threadtime", check=False), encoding="utf-8")
    screenshot = subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=subprocess.PIPE, check=False).stdout
    (OUT / f"screenshot-{safe}.png").write_bytes(screenshot)
    dump_ui(safe)


def assert_absent(label: str) -> None:
    for node in dump_ui("absence"):
        if matches(node, label):
            raise AssertionError(f"Unexpected label visible: {label}")


def assert_no_fatal_crash() -> None:
    logs = adb("logcat", "-d", "-v", "threadtime", check=False)
    (OUT / "logcat-complete.txt").write_text(logs, encoding="utf-8")
    if "FATAL EXCEPTION" in logs and f"Process: {PACKAGE}" in logs:
        raise AssertionError("Fatal Android exception during feedback/paywall flow")
    if "JavascriptException" in logs or "Cogni startup/render error" in logs:
        raise AssertionError("React Native failure during feedback/paywall flow")


def main() -> int:
    adb("shell", "am", "force-stop", PACKAGE)
    adb("logcat", "-c")
    print(adb("shell", "am", "start", "-W", "-n", ACTIVITY))
    time.sleep(4)
    scroll_to_top()
    wait_for("Learn smarter. Think deeper.")
    tap("I already have an account", scroll=True)
    wait_for("Welcome back")
    input_text("Email", EMAIL)
    input_text("Password", PASSWORD, scroll=True)
    tap("Sign in", scroll=True)
    wait_for("Home", timeout=60)

    tap("Profile")
    wait_for("Cogni Route E2E", timeout=45)

    wait_for("Sound and touch", scroll=True)
    wait_for("Brief, gentle cues reinforce selections and results.", scroll=True)
    toggle_switch("Sound effects", True, False, scroll=True)
    toggle_switch("Sound effects", False, True)
    toggle_switch("Haptic feedback", True, False, scroll=True)
    toggle_switch("Haptic feedback", False, True)
    capture("feedback-settings")

    tap("Explore Cogni Pro", scroll=True)
    wait_for("Cogni Pro", timeout=45)
    wait_for("More practice. Deeper progress.", timeout=45)
    wait_for("Unlimited additional focused practice", scroll=True)
    wait_for("Your starting check, daily lesson and assigned core training stay free.", scroll=True)
    wait_for("Subscriptions are not configured for this build yet.", scroll=True)
    wait_for("Subscribe", enabled=False, scroll=True)
    wait_for("Restore purchases", enabled=False, scroll=True)
    wait_for("renews automatically", scroll=True)
    wait_for("Privacy", scroll=True)
    wait_for("Terms", scroll=True)
    wait_for("Subscription terms", scroll=True)
    capture("paywall-no-store-key")

    scroll_to_top()
    tap("Not now")
    wait_for("Cogni Route E2E", timeout=45)
    assert_absent("More practice. Deeper progress.")

    tap("Sign out", scroll=True)
    scroll_to_top()
    wait_for("Learn smarter. Think deeper.", timeout=45)
    assert_absent("Reset your password")
    assert_no_fatal_crash()
    capture("pass")
    print("PASS: exact APK exposed persistent sound/haptic controls and a dismissible, fully disclosed no-store-key Cogni Pro paywall without visible escaped copy.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"FEEDBACK/PAYWALL PRE-STORE E2E FAILURE: {error}")
        capture("failure")
        raise
