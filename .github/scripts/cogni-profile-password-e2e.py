#!/usr/bin/env python3
"""Verify the signed-in password-change route on an already installed Cogni APK."""

from __future__ import annotations

import os
import json
import urllib.request
import urllib.error
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
OUT = Path(f"/tmp/cogni-profile-password-api-{API_LEVEL}")
OUT.mkdir(parents=True, exist_ok=True)


@dataclass
class Node:
    text: str
    description: str
    enabled: bool
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
    remote = "/sdcard/cogni-profile-window.xml"
    adb("shell", "uiautomator", "dump", "--compressed", remote, check=False)
    xml_text = adb("shell", "cat", remote, check=False)
    (OUT / f"window-{label}.xml").write_text(xml_text, encoding="utf-8")
    if "<hierarchy" not in xml_text:
        return []
    root = ET.fromstring(xml_text)
    nodes: list[Node] = []
    for element in root.iter("node"):
        match = re.fullmatch(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]", element.attrib.get("bounds", ""))
        if match:
            nodes.append(
                Node(
                    text=element.attrib.get("text", ""),
                    description=element.attrib.get("content-desc", ""),
                    enabled=element.attrib.get("enabled", "false") == "true",
                    bounds=tuple(int(value) for value in match.groups()),
                )
            )
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


def wait_for(label: str, *, timeout: float = 40, enabled: bool | None = None, scroll: bool = False) -> Node:
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


def tap(label: str, *, scroll: bool = False) -> None:
    node = wait_for(label, enabled=True, scroll=scroll)
    left, top, right, bottom = node.bounds
    visible_top = max(top, 1)
    visible_bottom = min(bottom, 2338)
    if visible_bottom - visible_top < 20 and scroll:
        swipe_up()
        node = wait_for(label, enabled=True, scroll=True)
        left, top, right, bottom = node.bounds
        visible_top = max(top, 1)
        visible_bottom = min(bottom, 2338)
    adb("shell", "input", "tap", str((left + right) // 2), str((visible_top + visible_bottom) // 2))
    time.sleep(1.1)


def input_text(label: str, value: str, *, scroll: bool = False) -> None:
    node = wait_for(label, enabled=True, scroll=scroll)
    left, top, right, bottom = node.bounds
    adb("shell", "input", "tap", str((left + right) // 2), str((top + bottom) // 2))
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


def main() -> int:
    print(adb("shell", "am", "start", "-W", "-n", ACTIVITY))
    time.sleep(4)
    scroll_to_top()
    wait_for("Sharpen how you think.")
    tap("I already have an account", scroll=True)
    wait_for("Welcome back")
    input_text("Email", EMAIL)
    input_text("Password", PASSWORD, scroll=True)
    tap("Sign in", scroll=True)
    wait_for("Home", timeout=60)

    tap("Profile")
    wait_for("Cogni Route E2E", timeout=45)
    tap("Change password", scroll=True)
    wait_for("Change your password", timeout=40)
    wait_for("Save new password", enabled=True, scroll=True)
    tap("Save new password", scroll=True)
    wait_for("Use at least 8 characters.")
    changed_password = PASSWORD + "B2"
    print("::add-mask::" + changed_password)
    def auth_request(path: str, payload: dict, method: str = "POST", token: str | None = None):
        headers = {"apikey": os.environ["SUPABASE_KEY"], "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        request = urllib.request.Request(os.environ["SUPABASE_URL"].rstrip("/") + path,
            data=json.dumps(payload).encode(), headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as error:
            return error.code, json.load(error)

    try:
        input_text("New password", changed_password, scroll=True)
        input_text("Confirm password", changed_password, scroll=True)
        tap("Save new password", scroll=True)
        wait_for("Password updated", timeout=45)
        capture("password-updated-confirmation")
        tap("Back to profile", scroll=True)
        wait_for("Cogni Route E2E", timeout=45)
        assert_absent("Reset your password")
        tap("Sign out", scroll=True)
        scroll_to_top()
        wait_for("Sharpen how you think.", timeout=45)
        status, old_result = auth_request("/auth/v1/token?grant_type=password", {"email": EMAIL, "password": PASSWORD})
        assert status == 400 and not old_result.get("access_token"), "Old password still authenticates"
        tap("I already have an account", scroll=True)
        wait_for("Welcome back")
        input_text("Email", EMAIL)
        input_text("Password", changed_password, scroll=True)
        tap("Sign in", scroll=True)
        wait_for("Home", timeout=60)
        tap("Profile")
        wait_for("Cogni Route E2E", timeout=45)
        capture("new-password-sign-in")
        tap("Sign out", scroll=True)
        scroll_to_top()
        wait_for("Sharpen how you think.", timeout=45)
    finally:
        # Restore the original disposable credential even if a later UI assertion fails.
        status, result = auth_request("/auth/v1/token?grant_type=password", {"email": EMAIL, "password": changed_password})
        if status == 200 and result.get("access_token"):
            status, _ = auth_request("/auth/v1/user", {"password": PASSWORD}, "PUT", result["access_token"])
            assert status == 200, "Could not restore disposable account password"
        status, result = auth_request("/auth/v1/token?grant_type=password", {"email": EMAIL, "password": PASSWORD})
        assert status == 200 and result.get("access_token"), "Original disposable credential not restored"
    capture("pass")
    print("PASS: password-change validation, successful update confirmation, old password rejection, new password UI sign-in, sign-out, and credential restoration.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"PROFILE PASSWORD E2E FAILURE: {error}")
        capture("failure")
        raise
