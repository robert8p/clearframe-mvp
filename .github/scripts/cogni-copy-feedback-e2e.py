#!/usr/bin/env python3
"""Exercise Cogni's copy, equal-weight Train navigation and optional feedback UI."""

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
OUT = Path(f"/tmp/cogni-copy-feedback-api-{API_LEVEL}")
OUT.mkdir(parents=True, exist_ok=True)


@dataclass
class Node:
    text: str
    description: str
    enabled: bool
    clickable: bool
    checked: bool | None
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
    remote = "/sdcard/cogni-copy-feedback-window.xml"
    adb("shell", "uiautomator", "dump", "--compressed", remote, check=False)
    xml_text = adb("shell", "cat", remote, check=False)
    (OUT / f"window-{label}.xml").write_text(xml_text, encoding="utf-8")
    if "<hierarchy" not in xml_text:
        return []
    root = ET.fromstring(xml_text)
    nodes: list[Node] = []
    for element in root.iter("node"):
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", element.attrib.get("bounds", ""))
        if not match:
            continue
        checked_value = element.attrib.get("checked")
        nodes.append(Node(
            text=element.attrib.get("text", ""),
            description=element.attrib.get("content-desc", ""),
            enabled=element.attrib.get("enabled", "false") == "true",
            clickable=element.attrib.get("clickable", "false") == "true",
            checked=None if checked_value is None else checked_value == "true",
            bounds=tuple(int(value) for value in match.groups()),
        ))
    return nodes


def matches(node: Node, label: str) -> bool:
    needle = label.casefold().strip()
    return needle == node.text.casefold().strip() or needle == node.description.casefold().strip() or needle in node.text.casefold() or needle in node.description.casefold()


def swipe_up() -> None:
    adb("shell", "input", "swipe", "540", "2050", "540", "650", "450")
    time.sleep(0.8)


def scroll_to_top() -> None:
    for _ in range(5):
        adb("shell", "input", "swipe", "540", "650", "540", "2050", "450")
        time.sleep(0.4)


def wait_for(label: str, *, timeout: float = 45, enabled: bool | None = None, scroll: bool = False) -> Node:
    deadline = time.time() + timeout
    last_nodes: list[Node] = []
    while time.time() < deadline:
        last_nodes = dump_ui("latest")
        for node in last_nodes:
            if matches(node, label) and (enabled is None or node.enabled is enabled):
                return node
        if scroll:
            swipe_up()
        else:
            time.sleep(0.7)
    capture("missing-" + slug(label))
    raise AssertionError(f"Timed out waiting for {label!r}")


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
    adb("shell", "input", "tap", str((left + right) // 2), str((visible_top + visible_bottom) // 2))
    time.sleep(1.0)


def input_text(field_label: str, value: str, *, scroll: bool = False) -> None:
    node = wait_for(field_label, enabled=True, scroll=scroll)
    left, top, right, bottom = node.bounds
    adb("shell", "input", "tap", str((left + right) // 2), str((top + bottom) // 2))
    escaped = value.replace("%", "%25").replace(" ", "%s")
    adb("shell", "input", "text", escaped)
    adb("shell", "input", "keyevent", "KEYCODE_BACK", check=False)
    time.sleep(0.7)


def capture(label: str) -> None:
    safe = slug(label)
    (OUT / f"logcat-{safe}.txt").write_text(adb("logcat", "-d", "-v", "threadtime", check=False), encoding="utf-8")
    screenshot = subprocess.run(["adb", "exec-out", "screencap", "-p"], stdout=subprocess.PIPE, check=False).stdout
    (OUT / f"screenshot-{safe}.png").write_bytes(screenshot)
    dump_ui(safe)


def switch_state(label: str) -> bool:
    candidates = [node for node in dump_ui("switch-state") if node.description.casefold().strip() == label.casefold()]
    if not candidates:
        raise AssertionError(f"Could not find switch {label!r}")
    node = candidates[0]
    if node.checked is None:
        raise AssertionError(f"Switch {label!r} did not expose its checked state")
    return node.checked


def assert_no_literal_controls(label: str) -> None:
    offenders: list[str] = []
    for node in dump_ui(label):
        for value in (node.text, node.description):
            if "\\n" in value or "\\r" in value or "\\t" in value:
                offenders.append(value)
    if offenders:
        raise AssertionError(f"Visible copy contains literal escaped controls: {offenders[:3]}")


def assert_equal_navigation_destinations() -> None:
    nodes = dump_ui("train-navigation")
    labels = ["Home tab", "Skills tab", "Train tab", "Progress tab", "Profile tab"]
    destinations: list[Node] = []
    for label in labels:
        matches_for_label = [node for node in nodes if label.casefold() in node.description.casefold()]
        if not matches_for_label:
            # Some Android accessibility bridges expose the visible label instead.
            visible = label.removesuffix(" tab")
            matches_for_label = [node for node in nodes if node.text.casefold().strip() == visible.casefold()]
        if not matches_for_label:
            raise AssertionError(f"Missing bottom-navigation destination {label!r}")
        destinations.append(max(matches_for_label, key=lambda node: (node.bounds[2] - node.bounds[0]) * (node.bounds[3] - node.bounds[1])))

    centers = [((node.bounds[0] + node.bounds[2]) // 2, (node.bounds[1] + node.bounds[3]) // 2) for node in destinations]
    if [center[0] for center in centers] != sorted(center[0] for center in centers):
        raise AssertionError(f"Bottom-navigation destinations are out of order: {centers}")
    if max(center[1] for center in centers) - min(center[1] for center in centers) > 12:
        raise AssertionError(f"Train is not aligned with its peer destinations: {centers}")


def assert_no_fatal_crash() -> None:
    logs = adb("logcat", "-d", "-v", "threadtime", check=False)
    (OUT / "logcat-complete.txt").write_text(logs, encoding="utf-8")
    if "FATAL EXCEPTION" in logs and f"Process: {PACKAGE}" in logs:
        raise AssertionError("Fatal Android exception during copy/feedback flow")
    if "JavascriptException" in logs or "Cogni startup/render error" in logs:
        raise AssertionError("React Native failure during copy/feedback flow")


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
    wait_for("Sound and touch", timeout=45, scroll=True)
    initial_sound = switch_state("Sound effects")
    tap("Sound effects", scroll=True)
    time.sleep(0.5)
    if switch_state("Sound effects") is initial_sound:
        raise AssertionError("Sound-effects switch did not change state")
    tap("Sound effects", scroll=True)
    if switch_state("Sound effects") is not initial_sound:
        raise AssertionError("Sound-effects switch did not return to its original state")

    initial_haptics = switch_state("Haptic feedback")
    tap("Haptic feedback", scroll=True)
    time.sleep(0.5)
    if switch_state("Haptic feedback") is initial_haptics:
        raise AssertionError("Haptic-feedback switch did not change state")
    tap("Haptic feedback", scroll=True)
    if switch_state("Haptic feedback") is not initial_haptics:
        raise AssertionError("Haptic-feedback switch did not return to its original state")
    capture("feedback-settings")

    tap("Train")
    wait_for("Training", timeout=45)
    assert_equal_navigation_destinations()
    assert_no_literal_controls("training-copy")
    capture("train-equal-navigation-clean-copy")

    adb("shell", "am", "force-stop", PACKAGE)
    print(adb("shell", "am", "start", "-W", "-n", ACTIVITY))
    time.sleep(4)
    wait_for("Home", timeout=45)
    assert_no_literal_controls("relaunch-copy")
    assert_no_fatal_crash()
    capture("pass")
    print("PASS: Train is an aligned top-level destination, visible copy contains no escaped controls, and feedback settings operate without a crash.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"COPY/FEEDBACK E2E FAILURE: {error}")
        capture("failure")
        raise
